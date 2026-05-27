import {
  users,
  studyLogs,
  peppaEpisodes,
  toeicSentences,
  settings,
  phrases,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  StudyLog,
  InsertStudyLog,
  PeppaEpisode,
  InsertPeppa,
  ToeicSentence,
  InsertToeic,
  Settings,
  InsertSettings,
  Phrase,
  InsertPhrase,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DATABASE_PATH || "data.db";
// 모듈 로드 시점에 부모 디렉토리가 없으면 better-sqlite3가 즉시 throw → 앱 크래시 루프.
// 영구 볼륨(/data 등) 첫 부팅 시 디렉토리만 존재하고 비어있는 케이스 + 로컬 첫 실행 모두 안전.
mkdirSync(dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// 자동으로 테이블 생성 (마이그레이션 없이 즉시 사용 가능)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    picture TEXT NOT NULL DEFAULT '',
    username TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    listening_min INTEGER NOT NULL DEFAULT 0,
    shadowing_min INTEGER NOT NULL DEFAULT 0,
    conversation_min INTEGER NOT NULL DEFAULT 0,
    toeic_sentences INTEGER NOT NULL DEFAULT 0,
    peppa_episodes INTEGER NOT NULL DEFAULT 0,
    self_rating INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    watched_episode_ids TEXT DEFAULT '[]',
    quiz_correct INTEGER NOT NULL DEFAULT 0,
    quiz_total INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS peppa_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    title_en TEXT NOT NULL,
    title_ko TEXT NOT NULL,
    watched_count INTEGER NOT NULL DEFAULT 0,
    shadowed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    last_studied_at TEXT,
    video_url TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS toeic_sentences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    sentence_no INTEGER NOT NULL,
    category TEXT NOT NULL,
    korean TEXT NOT NULL,
    english TEXT NOT NULL,
    practice_count INTEGER NOT NULL DEFAULT 0,
    mastery_level INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TEXT,
    bookmarked INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    total_wrong INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    daily_listening_target INTEGER NOT NULL DEFAULT 40,
    daily_shadowing_target INTEGER NOT NULL DEFAULT 30,
    daily_conversation_target INTEGER NOT NULL DEFAULT 20,
    weekly_toeic_target INTEGER NOT NULL DEFAULT 50,
    weekly_peppa_target INTEGER NOT NULL DEFAULT 7,
    goal_level TEXT NOT NULL DEFAULT '일반회화'
  );
  CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    phrase_en TEXT NOT NULL,
    phrase_ko TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'seed',
    source_ref_id INTEGER,
    source_label TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'daily',
    mastery_level INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    playphrase_opened_count INTEGER NOT NULL DEFAULT 0,
    bookmarked INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TEXT,
    created_at TEXT NOT NULL
  );
`);

// 기존 DB 호환을 위한 idempotent 마이그레이션
function safeAlter(sql: string) {
  try { sqlite.exec(sql); } catch (_) { /* column already exists */ }
}
// 기존 컬럼 추가 (이전 세션에서 추가한 것들)
safeAlter("ALTER TABLE study_logs ADD COLUMN watched_episode_ids TEXT DEFAULT '[]'");
safeAlter("ALTER TABLE study_logs ADD COLUMN quiz_correct INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE study_logs ADD COLUMN quiz_total INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE peppa_episodes ADD COLUMN video_url TEXT DEFAULT ''");
safeAlter("ALTER TABLE toeic_sentences ADD COLUMN next_review_at TEXT");
safeAlter("ALTER TABLE toeic_sentences ADD COLUMN consecutive_correct INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE toeic_sentences ADD COLUMN total_correct INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE toeic_sentences ADD COLUMN total_wrong INTEGER NOT NULL DEFAULT 0");
// 신규: 사용자 분리를 위한 user_id 컬럼 추가 (default 0 = 미할당, 첫 로그인 시 마이그레이션)
safeAlter("ALTER TABLE study_logs ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE peppa_episodes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE toeic_sentences ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
safeAlter("ALTER TABLE settings ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
// 표현 학습 모듈 컬럼
safeAlter("ALTER TABLE study_logs ADD COLUMN phrases_reviewed INTEGER NOT NULL DEFAULT 0");
// 사용자명/비밀번호 인증 컬럼
safeAlter("ALTER TABLE users ADD COLUMN username TEXT");
safeAlter("ALTER TABLE users ADD COLUMN password_hash TEXT");

// 인덱스
function safeIndex(s: string) { try { sqlite.exec(s); } catch (_) {} }
safeIndex("CREATE INDEX IF NOT EXISTS idx_study_logs_user_date ON study_logs(user_id, date)");
safeIndex("CREATE INDEX IF NOT EXISTS idx_peppa_user ON peppa_episodes(user_id, season, episode)");
safeIndex("CREATE INDEX IF NOT EXISTS idx_toeic_user_no ON toeic_sentences(user_id, sentence_no)");
safeIndex("CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id)");
safeIndex("CREATE INDEX IF NOT EXISTS idx_phrases_user ON phrases(user_id, source, created_at)");
safeIndex("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL");

// 일회성 마이그레이션: 이전 ACCESS_PASSWORD 단일 사용자(user@local)의 데이터를
// orphan(user_id=0)으로 옮기고 사용자 레코드 삭제. 첫 신규 가입자가 인수받음.
// 안전장치: 다른 사용자가 이미 존재하면 마이그레이션 안 함 (다중 사용자 환경 보호).
const LEGACY_GOOGLE_ID = "password-user-singleton";
const legacyUser = sqlite.prepare("SELECT id FROM users WHERE google_id = ?").get(LEGACY_GOOGLE_ID) as { id: number } | undefined;
if (legacyUser) {
  const others = sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE id != ?").get(legacyUser.id) as { c: number };
  if (others.c === 0) {
    const tx = sqlite.transaction(() => {
      sqlite.prepare("UPDATE study_logs SET user_id = 0 WHERE user_id = ?").run(legacyUser.id);
      sqlite.prepare("UPDATE peppa_episodes SET user_id = 0 WHERE user_id = ?").run(legacyUser.id);
      sqlite.prepare("UPDATE toeic_sentences SET user_id = 0 WHERE user_id = ?").run(legacyUser.id);
      sqlite.prepare("UPDATE settings SET user_id = 0 WHERE user_id = ?").run(legacyUser.id);
      sqlite.prepare("UPDATE phrases SET user_id = 0 WHERE user_id = ?").run(legacyUser.id);
      sqlite.prepare("DELETE FROM users WHERE id = ?").run(legacyUser.id);
    });
    tx();
    console.log("[storage] migrated legacy single-password user data → orphan for re-assignment");
  }
}

export interface IStorage {
  // users
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  countUsers(): Promise<number>;
  hasOrphanData(): Promise<boolean>;
  reassignOrphanData(userId: number): Promise<void>;
  seedUserData(
    userId: number,
    peppaSeed: any[],
    toeicSeed: any[],
    phrasesSeed: any[],
    peppaPhrasesSeed: any[],
    friendsPhrasesSeed: any[]
  ): Promise<void>;

  // study logs
  listStudyLogs(userId: number): Promise<StudyLog[]>;
  getStudyLogByDate(userId: number, date: string): Promise<StudyLog | undefined>;
  upsertStudyLog(userId: number, log: InsertStudyLog): Promise<StudyLog>;
  deleteStudyLog(userId: number, id: number): Promise<void>;

  // peppa episodes
  listPeppaEpisodes(userId: number): Promise<PeppaEpisode[]>;
  upsertPeppaEpisode(userId: number, ep: InsertPeppa): Promise<PeppaEpisode>;
  updatePeppaEpisode(userId: number, id: number, partial: Partial<InsertPeppa>): Promise<PeppaEpisode>;

  // toeic sentences
  listToeicSentences(userId: number): Promise<ToeicSentence[]>;
  upsertToeicSentence(userId: number, s: InsertToeic): Promise<ToeicSentence>;
  updateToeicSentence(userId: number, id: number, partial: Partial<InsertToeic>): Promise<ToeicSentence>;
  recordQuizAnswer(userId: number, id: number, correct: boolean): Promise<ToeicSentence>;

  // settings
  getSettings(userId: number): Promise<Settings | undefined>;
  saveSettings(userId: number, s: InsertSettings): Promise<Settings>;

  // phrases (PlayPhrase 학습)
  listPhrases(userId: number): Promise<Phrase[]>;
  createPhrase(userId: number, data: InsertPhrase): Promise<Phrase>;
  updatePhrase(userId: number, id: number, partial: Partial<InsertPhrase>): Promise<Phrase>;
  deletePhrase(userId: number, id: number): Promise<void>;
  recordPhraseReview(userId: number, id: number): Promise<Phrase>;
}

export class DatabaseStorage implements IStorage {
  // ----- users -----
  async getUserByGoogleId(googleId: string) {
    return db.select().from(users).where(eq(users.googleId, googleId)).get();
  }
  async getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async createUser(user: InsertUser) {
    return db.insert(users).values(user).returning().get();
  }
  async countUsers() {
    const r = sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
    return r.c;
  }
  async hasOrphanData() {
    const r = sqlite.prepare(
      "SELECT (SELECT COUNT(*) FROM peppa_episodes WHERE user_id = 0) +" +
      " (SELECT COUNT(*) FROM toeic_sentences WHERE user_id = 0) +" +
      " (SELECT COUNT(*) FROM study_logs WHERE user_id = 0) +" +
      " (SELECT COUNT(*) FROM settings WHERE user_id = 0) as total"
    ).get() as { total: number };
    return r.total > 0;
  }
  async reassignOrphanData(userId: number) {
    sqlite.prepare("UPDATE study_logs SET user_id = ? WHERE user_id = 0").run(userId);
    sqlite.prepare("UPDATE peppa_episodes SET user_id = ? WHERE user_id = 0").run(userId);
    sqlite.prepare("UPDATE toeic_sentences SET user_id = ? WHERE user_id = 0").run(userId);
    sqlite.prepare("UPDATE settings SET user_id = ? WHERE user_id = 0").run(userId);
    sqlite.prepare("UPDATE phrases SET user_id = ? WHERE user_id = 0").run(userId);
  }
  async seedUserData(
    userId: number,
    peppaSeed: any[],
    toeicSeed: any[],
    phrasesSeedData: any[] = [],
    peppaPhrasesSeedData: any[] = [],
    friendsPhrasesSeedData: any[] = []
  ) {
    const peppaCount = sqlite.prepare("SELECT COUNT(*) as c FROM peppa_episodes WHERE user_id = ?").get(userId) as { c: number };
    if (peppaCount.c === 0) {
      const insert = sqlite.prepare(
        "INSERT INTO peppa_episodes (user_id, season, episode, title_en, title_ko, watched_count, shadowed_count, status, video_url) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', '')"
      );
      const tx = sqlite.transaction((rows: any[]) => {
        for (const r of rows) {
          insert.run(userId, r.season, r.episode, r.titleEn, r.titleKo);
        }
      });
      tx(peppaSeed);
    }
    const toeicCount = sqlite.prepare("SELECT COUNT(*) as c FROM toeic_sentences WHERE user_id = ?").get(userId) as { c: number };
    if (toeicCount.c === 0) {
      const insert = sqlite.prepare(
        "INSERT INTO toeic_sentences (user_id, sentence_no, category, korean, english, practice_count, mastery_level, bookmarked, consecutive_correct, total_correct, total_wrong) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0)"
      );
      const tx = sqlite.transaction((rows: any[]) => {
        for (const r of rows) {
          insert.run(userId, r.sentenceNo, r.category, r.korean, r.english);
        }
      });
      tx(toeicSeed);
    }
    const s = sqlite.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId);
    if (!s) {
      sqlite.prepare(
        "INSERT INTO settings (user_id, start_date, end_date, daily_listening_target, daily_shadowing_target, daily_conversation_target, weekly_toeic_target, weekly_peppa_target, goal_level) VALUES (?, ?, ?, 40, 30, 20, 50, 7, ?)"
      ).run(userId, "2026-04-25", "2026-12-31", "일반회화 (CEFR B1)");
    }

    // 표현 시드 — 사용자별로 한 번만 INSERT
    const phraseCount = sqlite.prepare("SELECT COUNT(*) as c FROM phrases WHERE user_id = ?").get(userId) as { c: number };
    if (phraseCount.c === 0) {
      const nowIso = new Date().toISOString();
      const insertSeed = sqlite.prepare(
        "INSERT INTO phrases (user_id, phrase_en, phrase_ko, source, source_ref_id, source_label, category, created_at) VALUES (?, ?, ?, 'seed', NULL, '', ?, ?)"
      );
      const insertPeppa = sqlite.prepare(
        "INSERT INTO phrases (user_id, phrase_en, phrase_ko, source, source_ref_id, source_label, category, created_at) VALUES (?, ?, ?, 'peppa', ?, ?, ?, ?)"
      );
      const insertFriends = sqlite.prepare(
        "INSERT INTO phrases (user_id, phrase_en, phrase_ko, source, source_ref_id, source_label, category, created_at) VALUES (?, ?, ?, 'friends', NULL, ?, ?, ?)"
      );
      const seedTx = sqlite.transaction(() => {
        for (const p of phrasesSeedData) {
          insertSeed.run(userId, p.phraseEn, p.phraseKo, p.category, nowIso);
        }
        // Peppa 에피소드 매핑 (season, episode → user별 peppa_episodes.id)
        const epLookup = sqlite.prepare(
          "SELECT id, title_en FROM peppa_episodes WHERE user_id = ? AND season = ? AND episode = ?"
        );
        for (const p of peppaPhrasesSeedData) {
          const ep = epLookup.get(userId, p.season, p.episode) as { id: number; title_en: string } | undefined;
          if (!ep) continue;
          const label = `Peppa S${p.season}E${String(p.episode).padStart(2, "0")} ${ep.title_en}`;
          insertPeppa.run(userId, p.phraseEn, p.phraseKo, ep.id, label, p.category, nowIso);
        }
        // Friends 시드 (전용 에피소드 테이블 없음, sourceRefId=NULL, sourceLabel에 에피소드 정보 직접 인코딩)
        for (const p of friendsPhrasesSeedData) {
          const label = `Friends S1E${String(p.episode).padStart(2, "0")} ${p.episodeTitle}`;
          insertFriends.run(userId, p.phraseEn, p.phraseKo, label, p.category, nowIso);
        }
      });
      seedTx();
    }
  }

  // ----- study logs -----
  async listStudyLogs(userId: number) {
    return db.select().from(studyLogs).where(eq(studyLogs.userId, userId)).orderBy(asc(studyLogs.date)).all();
  }
  async getStudyLogByDate(userId: number, date: string) {
    return db.select().from(studyLogs)
      .where(and(eq(studyLogs.userId, userId), eq(studyLogs.date, date)))
      .get();
  }
  async upsertStudyLog(userId: number, log: InsertStudyLog) {
    const existing = await this.getStudyLogByDate(userId, log.date);
    if (existing) {
      return db.update(studyLogs).set({ ...log, userId })
        .where(eq(studyLogs.id, existing.id))
        .returning().get();
    }
    return db.insert(studyLogs).values({ ...log, userId }).returning().get();
  }
  async deleteStudyLog(userId: number, id: number) {
    db.delete(studyLogs)
      .where(and(eq(studyLogs.userId, userId), eq(studyLogs.id, id)))
      .run();
  }

  // ----- peppa -----
  async listPeppaEpisodes(userId: number) {
    return db.select().from(peppaEpisodes)
      .where(eq(peppaEpisodes.userId, userId))
      .orderBy(asc(peppaEpisodes.season), asc(peppaEpisodes.episode))
      .all();
  }
  async upsertPeppaEpisode(userId: number, ep: InsertPeppa) {
    return db.insert(peppaEpisodes).values({ ...ep, userId }).returning().get();
  }
  async updatePeppaEpisode(userId: number, id: number, partial: Partial<InsertPeppa>) {
    return db.update(peppaEpisodes).set(partial)
      .where(and(eq(peppaEpisodes.userId, userId), eq(peppaEpisodes.id, id)))
      .returning().get();
  }

  // ----- toeic -----
  async listToeicSentences(userId: number) {
    return db.select().from(toeicSentences)
      .where(eq(toeicSentences.userId, userId))
      .orderBy(asc(toeicSentences.sentenceNo)).all();
  }
  async upsertToeicSentence(userId: number, s: InsertToeic) {
    return db.insert(toeicSentences).values({ ...s, userId }).returning().get();
  }
  async updateToeicSentence(userId: number, id: number, partial: Partial<InsertToeic>) {
    return db.update(toeicSentences).set(partial)
      .where(and(eq(toeicSentences.userId, userId), eq(toeicSentences.id, id)))
      .returning().get();
  }

  async recordQuizAnswer(userId: number, id: number, correct: boolean) {
    const sentence = db.select().from(toeicSentences)
      .where(and(eq(toeicSentences.userId, userId), eq(toeicSentences.id, id)))
      .get();
    if (!sentence) throw new Error("sentence not found");
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    let mastery = sentence.masteryLevel;
    let consecutive = sentence.consecutiveCorrect;
    let totalC = sentence.totalCorrect;
    let totalW = sentence.totalWrong;
    let nextReviewDays = 1;
    if (correct) {
      consecutive += 1;
      totalC += 1;
      if (mastery < 5) mastery = Math.min(5, mastery + 1);
      const intervals = [1, 2, 4, 7, 14, 30, 60];
      nextReviewDays = intervals[Math.min(intervals.length - 1, consecutive)];
    } else {
      consecutive = 0;
      totalW += 1;
      mastery = Math.max(0, mastery - 1);
      nextReviewDays = 1;
    }
    const next = new Date(today.getTime() + nextReviewDays * 86400000);
    const nextISO = next.toISOString().slice(0, 10);
    return db.update(toeicSentences)
      .set({
        masteryLevel: mastery,
        consecutiveCorrect: consecutive,
        totalCorrect: totalC,
        totalWrong: totalW,
        lastPracticedAt: todayISO,
        nextReviewAt: nextISO,
        practiceCount: sentence.practiceCount + 1,
      })
      .where(and(eq(toeicSentences.userId, userId), eq(toeicSentences.id, id)))
      .returning().get();
  }

  // ----- settings -----
  async getSettings(userId: number) {
    return db.select().from(settings).where(eq(settings.userId, userId)).get();
  }
  async saveSettings(userId: number, s: InsertSettings) {
    const existing = await this.getSettings(userId);
    if (existing) {
      return db.update(settings).set({ ...s, userId })
        .where(eq(settings.id, existing.id))
        .returning().get();
    }
    return db.insert(settings).values({ ...s, userId }).returning().get();
  }

  // ----- phrases -----
  async listPhrases(userId: number) {
    return db.select().from(phrases)
      .where(eq(phrases.userId, userId))
      .orderBy(desc(phrases.createdAt))
      .all();
  }
  async createPhrase(userId: number, data: InsertPhrase) {
    const createdAt = data.createdAt || new Date().toISOString();
    return db.insert(phrases).values({ ...data, userId, createdAt }).returning().get();
  }
  async updatePhrase(userId: number, id: number, partial: Partial<InsertPhrase>) {
    return db.update(phrases).set(partial)
      .where(and(eq(phrases.userId, userId), eq(phrases.id, id)))
      .returning().get();
  }
  async deletePhrase(userId: number, id: number) {
    db.delete(phrases)
      .where(and(eq(phrases.userId, userId), eq(phrases.id, id)))
      .run();
  }
  async recordPhraseReview(userId: number, id: number) {
    const current = db.select().from(phrases)
      .where(and(eq(phrases.userId, userId), eq(phrases.id, id)))
      .get();
    if (!current) throw new Error("phrase not found");
    const newReviewCount = current.reviewCount + 1;
    // 매 3회 복습마다 마스터리 +1 (최대 4)
    let newMastery = current.masteryLevel;
    if (newReviewCount > 0 && newReviewCount % 3 === 0 && newMastery < 4) {
      newMastery = newMastery + 1;
    }
    return db.update(phrases)
      .set({
        reviewCount: newReviewCount,
        masteryLevel: newMastery,
        lastReviewedAt: new Date().toISOString().slice(0, 10),
      })
      .where(and(eq(phrases.userId, userId), eq(phrases.id, id)))
      .returning().get();
  }
}

export const storage = new DatabaseStorage();
