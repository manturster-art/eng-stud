import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 사용자 (Google OAuth 또는 사용자명+비밀번호)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  picture: text("picture").notNull().default(""),
  username: text("username"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// 일일 학습 로그 (리스닝/쉐도잉/회화 시간, 분 단위)
export const studyLogs = sqliteTable("study_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD — (userId, date) unique
  listeningMin: integer("listening_min").notNull().default(0),
  shadowingMin: integer("shadowing_min").notNull().default(0),
  conversationMin: integer("conversation_min").notNull().default(0),
  toeicSentences: integer("toeic_sentences").notNull().default(0),
  peppaEpisodes: integer("peppa_episodes").notNull().default(0),
  selfRating: integer("self_rating").notNull().default(0),
  notes: text("notes").default(""),
  watchedEpisodeIds: text("watched_episode_ids").default("[]"),
  quizCorrect: integer("quiz_correct").notNull().default(0),
  quizTotal: integer("quiz_total").notNull().default(0),
  phrasesReviewed: integer("phrases_reviewed").notNull().default(0),
});

export const insertStudyLogSchema = createInsertSchema(studyLogs).omit({ id: true, userId: true });
export type InsertStudyLog = z.infer<typeof insertStudyLogSchema>;
export type StudyLog = typeof studyLogs.$inferSelect;

// 페파피그 에피소드 진도
export const peppaEpisodes = sqliteTable("peppa_episodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  season: integer("season").notNull(),
  episode: integer("episode").notNull(),
  titleEn: text("title_en").notNull(),
  titleKo: text("title_ko").notNull(),
  watchedCount: integer("watched_count").notNull().default(0),
  shadowedCount: integer("shadowed_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  lastStudiedAt: text("last_studied_at"),
  videoUrl: text("video_url").default(""),
});

export const insertPeppaSchema = createInsertSchema(peppaEpisodes).omit({ id: true, userId: true });
export type InsertPeppa = z.infer<typeof insertPeppaSchema>;
export type PeppaEpisode = typeof peppaEpisodes.$inferSelect;

// 토익 스피킹 400문장
export const toeicSentences = sqliteTable("toeic_sentences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  sentenceNo: integer("sentence_no").notNull(),
  category: text("category").notNull(),
  korean: text("korean").notNull(),
  english: text("english").notNull(),
  practiceCount: integer("practice_count").notNull().default(0),
  masteryLevel: integer("mastery_level").notNull().default(0),
  lastPracticedAt: text("last_practiced_at"),
  bookmarked: integer("bookmarked", { mode: "boolean" }).notNull().default(false),
  nextReviewAt: text("next_review_at"),
  consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalWrong: integer("total_wrong").notNull().default(0),
});

export const insertToeicSchema = createInsertSchema(toeicSentences).omit({ id: true, userId: true });
export type InsertToeic = z.infer<typeof insertToeicSchema>;
export type ToeicSentence = typeof toeicSentences.$inferSelect;

// 학습자 설정 (목표 시간, 시작일)
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  dailyListeningTarget: integer("daily_listening_target").notNull().default(40),
  dailyShadowingTarget: integer("daily_shadowing_target").notNull().default(30),
  dailyConversationTarget: integer("daily_conversation_target").notNull().default(20),
  weeklyToeicTarget: integer("weekly_toeic_target").notNull().default(50),
  weeklyPeppaTarget: integer("weekly_peppa_target").notNull().default(7),
  goalLevel: text("goal_level").notNull().default("일반회화"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, userId: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// 영어 표현 (PlayPhrase 검색 + 마스터리 추적)
export const phrases = sqliteTable("phrases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  phraseEn: text("phrase_en").notNull(),
  phraseKo: text("phrase_ko").notNull().default(""),
  source: text("source").notNull().default("seed"), // 'seed' | 'peppa' | 'toeic' | 'friends' | 'business'
  sourceRefId: integer("source_ref_id"),
  sourceLabel: text("source_label").notNull().default(""),
  category: text("category").notNull().default("daily"),
  masteryLevel: integer("mastery_level").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  playphraseOpenedCount: integer("playphrase_opened_count").notNull().default(0),
  bookmarked: integer("bookmarked", { mode: "boolean" }).notNull().default(false),
  lastReviewedAt: text("last_reviewed_at"),
  createdAt: text("created_at").notNull(),
});

export const insertPhraseSchema = createInsertSchema(phrases).omit({ id: true, userId: true });
export type InsertPhrase = z.infer<typeof insertPhraseSchema>;
export type Phrase = typeof phrases.$inferSelect;
