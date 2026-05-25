import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { peppaSeed } from "./seed-peppa";
import { toeicSeed } from "./seed-toeic";
import { phrasesSeed } from "./seed-phrases";
import { peppaPhrasesSeed } from "./seed-peppa-phrases";

export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "396652579079-rpp833005t1upvjo6dqfg8r99663e2fq.apps.googleusercontent.com";

const JWT_SECRET =
  process.env.JWT_SECRET || "eng-dashboard-secret-2026-please-change";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

    // 첫 사용자인 경우 기존 orphan(user_id=0) 데이터를 이 계정에 귀속
    if (isFirstUser && (await storage.hasOrphanData())) {
      await storage.reassignOrphanData(user.id);
      // orphan 데이터 인수 후에도 표현 시드는 비어있을 수 있으므로 함께 시드
      await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed);
    } else {
      // 그 외 사용자는 새 시드 데이터 생성
      await storage.seedUserData(user.id, peppaSeed, toeicSeed, phrasesSeed, peppaPhrasesSeed);
    }
  }
  return { user, isFirstUser };
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
