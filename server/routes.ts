import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertStudyLogSchema,
  insertPeppaSchema,
  insertToeicSchema,
  insertSettingsSchema,
  insertPhraseSchema,
} from "@shared/schema";
import {
  GOOGLE_CLIENT_ID,
  SIGNUP_ENABLED,
  loginOrRegisterUser,
  loginUser,
  registerUser,
  requireAuth,
  signSession,
  verifyGoogleIdToken,
} from "./auth";

// 인증 엔드포인트 brute force / 무한 가입 방어. IP당 15분에 20회.
// register/login에만 적용 (config/me는 제외).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many attempts, please try again later" },
});

// 안전한 :id 파싱 — 정수가 아니면 null
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---------- Public: 활성 인증 방식 광고 ----------
  app.get("/api/auth/config", (_req, res) => {
    res.json({
      googleClientId: GOOGLE_CLIENT_ID,
      signupEnabled: SIGNUP_ENABLED,
    });
  });

  // ---------- Auth: Google 로그인 ----------
  app.post("/api/auth/google", authLimiter, async (req, res) => {
    try {
      const { credential } = req.body || {};
      if (!credential) return res.status(400).json({ error: "missing credential" });
      const profile = await verifyGoogleIdToken(credential);
      const { user } = await loginOrRegisterUser(profile);
      const token = signSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      });
    } catch (err: any) {
      // 상세 오류는 서버 로그에만, 클라이언트에는 일반화된 메시지
      console.error("google auth error", err);
      res.status(401).json({ error: "auth failed" });
    }
  });

  // ---------- Auth: 사용자명+비밀번호 로그인 ----------
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: "missing credentials" });
      }
      const { user } = await loginUser({ username: String(username), password: String(password) });
      const token = signSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      });
    } catch (err: any) {
      // loginUser는 미존재/오답 모두 "invalid credentials"로 통일 (사용자 열거 방지)
      res.status(401).json({ error: "invalid credentials" });
    }
  });

  // ---------- Auth: 회원가입 (초대코드 필요) ----------
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { username, password, inviteCode } = req.body || {};
      if (!username || !password || !inviteCode) {
        return res.status(400).json({ error: "missing fields" });
      }
      const { user } = await registerUser({
        username: String(username),
        password: String(password),
        inviteCode: String(inviteCode),
      });
      const token = signSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      });
    } catch (err: any) {
      const msg = err?.message || "register failed";
      const code = msg === "signup is disabled" ? 503 : 400;
      res.status(code).json({ error: msg });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({ user: req.auth });
  });

  // ---------- 모든 학습 데이터 라우트는 인증 필요 ----------
  app.use("/api/study-logs", requireAuth);
  app.use("/api/peppa", requireAuth);
  app.use("/api/toeic", requireAuth);
  app.use("/api/settings", requireAuth);
  app.use("/api/phrases", requireAuth);

  // ---------- Study Logs ----------
  app.get("/api/study-logs", async (req, res) => {
    const logs = await storage.listStudyLogs(req.auth!.userId);
    res.json(logs);
  });

  app.post("/api/study-logs", async (req, res) => {
    const parsed = insertStudyLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const log = await storage.upsertStudyLog(req.auth!.userId, parsed.data);
    res.json(log);
  });

  app.delete("/api/study-logs/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    await storage.deleteStudyLog(req.auth!.userId, id);
    res.json({ ok: true });
  });

  // 퀴즈 통계 원자적 증분 (클라이언트 누적 중복 방지)
  app.post("/api/study-logs/quiz-increment", async (req, res) => {
    const correctDelta = Number(req.body?.correctDelta);
    const totalDelta = Number(req.body?.totalDelta);
    if (!Number.isInteger(correctDelta) || !Number.isInteger(totalDelta) || totalDelta < 0 || correctDelta < 0) {
      return res.status(400).json({ error: "invalid deltas" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const log = await storage.incrementQuizStats(req.auth!.userId, today, correctDelta, totalDelta);
    res.json(log);
  });

  // ---------- Peppa ----------
  app.get("/api/peppa", async (req, res) => {
    const list = await storage.listPeppaEpisodes(req.auth!.userId);
    res.json(list);
  });

  app.patch("/api/peppa/:id", async (req, res) => {
    const partial = insertPeppaSchema.partial().safeParse(req.body);
    if (!partial.success) {
      return res.status(400).json({ error: partial.error.issues });
    }
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    const ep = await storage.updatePeppaEpisode(
      req.auth!.userId,
      id,
      partial.data
    );
    res.json(ep);
  });

  // ---------- TOEIC sentences ----------
  app.get("/api/toeic", async (req, res) => {
    const list = await storage.listToeicSentences(req.auth!.userId);
    res.json(list);
  });

  app.patch("/api/toeic/:id", async (req, res) => {
    const partial = insertToeicSchema.partial().safeParse(req.body);
    if (!partial.success) {
      return res.status(400).json({ error: partial.error.issues });
    }
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    const s = await storage.updateToeicSentence(
      req.auth!.userId,
      id,
      partial.data
    );
    res.json(s);
  });

  // 퀴즈 답변 기록 (SRS 자동 갱신)
  app.post("/api/toeic/:id/quiz", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    const correct = Boolean(req.body?.correct);
    const s = await storage.recordQuizAnswer(
      req.auth!.userId,
      id,
      correct
    );
    res.json(s);
  });

  // ---------- Settings ----------
  app.get("/api/settings", async (req, res) => {
    const s = await storage.getSettings(req.auth!.userId);
    res.json(s ?? null);
  });

  app.post("/api/settings", async (req, res) => {
    const parsed = insertSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const s = await storage.saveSettings(req.auth!.userId, parsed.data);
    res.json(s);
  });

  // ---------- Phrases (PlayPhrase 학습) ----------
  app.get("/api/phrases", async (req, res) => {
    const list = await storage.listPhrases(req.auth!.userId);
    res.json(list);
  });

  app.post("/api/phrases", async (req, res) => {
    const parsed = insertPhraseSchema.safeParse({
      ...req.body,
      createdAt: req.body?.createdAt || new Date().toISOString(),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const p = await storage.createPhrase(req.auth!.userId, parsed.data);
    res.json(p);
  });

  app.patch("/api/phrases/:id", async (req, res) => {
    const partial = insertPhraseSchema.partial().safeParse(req.body);
    if (!partial.success) {
      return res.status(400).json({ error: partial.error.issues });
    }
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    const p = await storage.updatePhrase(
      req.auth!.userId,
      id,
      partial.data
    );
    res.json(p);
  });

  app.delete("/api/phrases/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    await storage.deletePhrase(req.auth!.userId, id);
    res.json({ ok: true });
  });

  app.post("/api/phrases/:id/review", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "invalid id" });
    const p = await storage.recordPhraseReview(req.auth!.userId, id);
    res.json(p);
  });

  return httpServer;
}
