import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
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
  PASSWORD_AUTH_ENABLED,
  loginOrRegisterUser,
  loginWithPassword,
  requireAuth,
  signSession,
  verifyGoogleIdToken,
} from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---------- Public: 활성 인증 방식 광고 ----------
  app.get("/api/auth/config", (_req, res) => {
    res.json({
      googleClientId: GOOGLE_CLIENT_ID,
      passwordAuthEnabled: PASSWORD_AUTH_ENABLED,
    });
  });

  // ---------- Auth: Google 로그인 ----------
  app.post("/api/auth/google", async (req, res) => {
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
      console.error("auth error", err);
      res.status(401).json({ error: "auth failed", detail: err?.message });
    }
  });

  // ---------- Auth: 비밀번호 로그인 (단일 사용자) ----------
  app.post("/api/auth/password", async (req, res) => {
    try {
      const { password } = req.body || {};
      if (!password) return res.status(400).json({ error: "missing password" });
      const { user } = await loginWithPassword(String(password));
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
      const msg = err?.message || "auth failed";
      const code = msg === "password auth not configured" ? 503 : 401;
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
    await storage.deleteStudyLog(req.auth!.userId, Number(req.params.id));
    res.json({ ok: true });
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
    const ep = await storage.updatePeppaEpisode(
      req.auth!.userId,
      Number(req.params.id),
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
    const s = await storage.updateToeicSentence(
      req.auth!.userId,
      Number(req.params.id),
      partial.data
    );
    res.json(s);
  });

  // 퀴즈 답변 기록 (SRS 자동 갱신)
  app.post("/api/toeic/:id/quiz", async (req, res) => {
    const correct = Boolean(req.body?.correct);
    const s = await storage.recordQuizAnswer(
      req.auth!.userId,
      Number(req.params.id),
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
    const p = await storage.updatePhrase(
      req.auth!.userId,
      Number(req.params.id),
      partial.data
    );
    res.json(p);
  });

  app.delete("/api/phrases/:id", async (req, res) => {
    await storage.deletePhrase(req.auth!.userId, Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/phrases/:id/review", async (req, res) => {
    const p = await storage.recordPhraseReview(req.auth!.userId, Number(req.params.id));
    res.json(p);
  });

  return httpServer;
}
