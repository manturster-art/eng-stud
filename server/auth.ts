import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { peppaSeed } from "./seed-peppa";
import { toeicSeed } from "./seed-toeic";
import { phrasesSeed } from "./seed-phrases";
import { peppaPhrasesSeed } from "./seed-peppa-phrases";
import { friendsPhrasesSeed } from "./seed-friends-phrases";
import { businessPhrasesSeed } from "./seed-business-phrases";

export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "396652579079-rpp833005t1upvjo6dqfg8r99663e2fq.apps.googleusercontent.com";

// JWT 서명 시크릿. production에서 미설정 시 토큰 위조로 전 계정 탈취가 가능하므로
// 폴백을 두지 않고 부팅을 중단한다. 개발 환경에서만 고정 기본값 허용.
const JWT_SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: JWT_SECRET 환경변수가 설정되지 않았습니다. " +
      "production에서는 반드시 강력한 랜덤 시크릿(openssl rand -hex 48)을 지정해야 합니다."
    );
  }
  // 개발 전용 — production이 아닐 때만 도달
  return "dev-only-insecure-secret-do-not-use-in-production";
})();

// 가입 게이팅: INVITE_CODE 설정 시에만 신규 가입 허용
export const INVITE_CODE = process.env.INVITE_CODE || "";
export const SIGNUP_ENABLED = INVITE_CODE.length > 0;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// timing-safe 비교를 위한 더미 해시 (사용자 미존재 시 동일 시간 소요)
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstuvwxyz12";

export interface AuthPayload {
  userId: number;
  email: string;
  name: string;
  picture: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

export function signSession(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("invalid google token");
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || "",
    picture: payload.picture || "",
  };
}

export async function loginOrRegisterUser(googleProfile: {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}) {
  let user = await storage.getUserByGoogleId(googleProfile.googleId);
  let isFirstUser = false;
  if (!user) {
    const userCount = await storage.countUsers();
    isFirstUser = userCount === 0;
    user = await storage.createUser({
      googleId: googleProfile.googleId,
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
      createdAt: new Date().toISOString(),
    });

    if (isFirstUser && (await storage.hasOrphanData())) {
      await storage.reassignOrphanData(user.id);
      await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed, friendsPhrasesSeed, businessPhrasesSeed);
    } else {
      await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed, friendsPhrasesSeed, businessPhrasesSeed);
    }
  }
  return { user, isFirstUser };
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function registerUser(input: {
  username: string;
  password: string;
  inviteCode: string;
}) {
  if (!SIGNUP_ENABLED) throw new Error("signup is disabled");
  if (input.inviteCode !== INVITE_CODE) throw new Error("invalid invite code");
  if (!USERNAME_RE.test(input.username)) {
    throw new Error("username must be 3-32 chars (a-z, A-Z, 0-9, _, -)");
  }
  if (input.password.length < 6) {
    throw new Error("password must be at least 6 chars");
  }

  const existing = await storage.getUserByUsername(input.username);
  if (existing) throw new Error("username already taken");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const userCount = await storage.countUsers();
  const isFirstUser = userCount === 0;

  const user = await storage.createUser({
    googleId: `pw:${input.username}`,
    email: `${input.username}@local`,
    name: input.username,
    picture: "",
    username: input.username,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  if (isFirstUser && (await storage.hasOrphanData())) {
    await storage.reassignOrphanData(user.id);
    await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed, friendsPhrasesSeed, businessPhrasesSeed);
  } else {
    await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed, friendsPhrasesSeed, businessPhrasesSeed);
  }

  return { user, isFirstUser };
}

export async function loginUser(input: { username: string; password: string }) {
  const user = await storage.getUserByUsername(input.username);
  if (!user || !user.passwordHash) {
    // 사용자 미존재 시에도 bcrypt 비용을 소모하여 timing attack 방지
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw new Error("invalid credentials");
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new Error("invalid credentials");
  return { user };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const payload = verifySession(token);
  if (!payload) return res.status(401).json({ error: "unauthorized" });
  req.auth = payload;
  next();
}
