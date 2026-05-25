import {
  format,
  parseISO,
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  isWithinInterval,
} from "date-fns";
import type { StudyLog, Settings, ToeicSentence, PeppaEpisode, Phrase } from "@shared/schema";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function fmt(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
}

/** 일일 총 학습시간 (분) — 시간 기반 활동만 */
export function totalMin(log: StudyLog): number {
  return log.listeningMin + log.shadowingMin + log.conversationMin;
}

/** 일일 총 활동량 (분 환산) — 시간 + 표현 복습(1개당 1분 가산) */
export function totalActivityMin(log: StudyLog): number {
  return totalMin(log) + (log.phrasesReviewed ?? 0);
}

/** 일일 목표 (분) */
export function dailyTargetMin(s: Settings): number {
  return s.dailyListeningTarget + s.dailyShadowingTarget + s.dailyConversationTarget;
}

/** 주차별 집계 — 월요일 시작 */
export function aggregateByWeek(logs: StudyLog[], settings: Settings | null) {
  if (!settings) return [];
  const start = parseISO(settings.startDate);
  const end = parseISO(settings.endDate);
  const weeks = eachWeekOfInterval(
    { start, end },
    { weekStartsOn: 1 }
  );
  const target = settings ? dailyTargetMin(settings) * 7 : 7 * 90;
  const peppaTarget = settings.weeklyPeppaTarget;
  const toeicTarget = settings.weeklyToeicTarget;

  return weeks.map((wkStart, idx) => {
    const wkEnd = endOfWeek(wkStart, { weekStartsOn: 1 });
    const inRange = logs.filter((l) =>
      isWithinInterval(parseISO(l.date), { start: wkStart, end: wkEnd })
    );
    const minutes = inRange.reduce((a, b) => a + totalMin(b), 0);
    const peppa = inRange.reduce((a, b) => a + b.peppaEpisodes, 0);
    const toeic = inRange.reduce((a, b) => a + b.toeicSentences, 0);
    return {
      weekIdx: idx + 1,
      weekStart: fmt(wkStart),
      weekEnd: fmt(wkEnd),
      label: `W${idx + 1}`,
      minutes,
      target,
      achievement: target > 0 ? Math.round((minutes / target) * 100) : 0,
      peppa,
      peppaTarget,
      toeic,
      toeicTarget,
    };
  });
}

/** 최근 N일 */
export function lastNDays(logs: StudyLog[], n: number): StudyLog[] {
  const today = new Date();
  const cutoff = new Date(today.getTime() - n * 86400000);
  return logs
    .filter((l) => parseISO(l.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 학습 진행 일수 / 총 일수 */
export function progressDays(settings: Settings | null) {
  if (!settings) return { elapsed: 0, total: 0, remaining: 0 };
  const start = parseISO(settings.startDate);
  const end = parseISO(settings.endDate);
  const today = new Date();
  const elapsed = Math.max(0, differenceInCalendarDays(today, start) + 1);
  const total = differenceInCalendarDays(end, start) + 1;
  const remaining = Math.max(0, total - elapsed);
  return { elapsed, total, remaining };
}

/** 연속 학습 일수 (streak) */
export function currentStreak(logs: StudyLog[]): number {
  const set = new Set(logs.filter((l) => totalMin(l) > 0).map((l) => l.date));
  let streak = 0;
  let cursor = new Date();
  // 오늘 학습이 없으면 어제부터 카운트
  for (let i = 0; i < 365; i++) {
    const key = fmt(cursor);
    if (set.has(key)) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else if (i === 0) {
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

/* ============================================================
 * 회화 목표 달성 예측 알고리즘
 * - 입력: 누적 학습 시간, 토익 마스터리, 페파피그 진도, 자체평가 추이
 * - 출력: 12월 31일 시점 예측 점수(0-100), 도달 확률(%)
 *
 * 모델 (휴리스틱, 투명한 가중합):
 *   필요총시간(h) = 7개월 × 4주 × 7일 × 1.5h ≈ 280h (CEFR A2→B1 표준)
 *   진척률(P_time) = 누적학습시간 / 필요총시간
 *   진척률(P_toeic) = 마스터된 문장 수 / 400
 *   진척률(P_peppa) = 쉐도잉 완료 에피소드 수 / 50
 *   주간 일관성(Consistency) = 최근 4주 중 목표 80% 달성한 주 / 4
 *   자체평가 평균 (recent) / 5
 *
 *   현재점수 = 100 × (0.40·P_time + 0.25·P_toeic + 0.15·P_peppa + 0.15·Consistency + 0.05·SelfRating)
 *   최근 7일 평균 학습량 → 남은 일수에 외삽 → 예측점수 = 동일 가중합으로 재계산
 * ============================================================ */

export interface Prediction {
  currentScore: number; // 0-100
  predictedScore: number; // 0-100 (예상 12/31 점수)
  probability: number; // 0-100 (목표 70+ 점 도달 확률)
  recentDailyAvgMin: number;
  requiredDailyAvgMin: number;
  breakdown: {
    timeProgress: number;
    toeicProgress: number;
    peppaProgress: number;
    phrasesProgress: number;
    consistency: number;
    selfRating: number;
  };
  message: string;
  trend: "ahead" | "ontrack" | "behind";
}

const TARGET_TOTAL_HOURS = 280; // CEFR A2→B1 표준
const TARGET_PEPPA_EPISODES = 50; // 쉐도잉 완성 목표
const TARGET_MASTERED_PHRASES = 50; // 마스터(★3 이상) 표현 목표
const PASS_THRESHOLD = 70; // 일반회화 도달 문턱

// 가중치 (합계 1.0)
const W_TIME = 0.35;
const W_TOEIC = 0.20;
const W_PEPPA = 0.12;
const W_PHRASES = 0.10;
const W_CONSISTENCY = 0.15;
const W_SELF = 0.08;

export function predictGoal(
  logs: StudyLog[],
  toeic: ToeicSentence[],
  peppa: PeppaEpisode[],
  settings: Settings | null,
  phrases: Phrase[] = []
): Prediction {
  const totalCurrentMin = logs.reduce((a, b) => a + totalMin(b), 0);
  const totalCurrentHours = totalCurrentMin / 60;
  const masteredToeic = toeic.filter((t) => t.masteryLevel >= 4).length;
  const shadowedPeppa = peppa.filter(
    (p) => p.status === "shadowing" || p.status === "mastered"
  ).length;
  const masteredPhrases = phrases.filter((p) => p.masteryLevel >= 3).length;

  // 진척률 (0-1)
  const P_time = Math.min(1, totalCurrentHours / TARGET_TOTAL_HOURS);
  const P_toeic = Math.min(1, masteredToeic / 400);
  const P_peppa = Math.min(1, shadowedPeppa / TARGET_PEPPA_EPISODES);
  const P_phrases = Math.min(1, masteredPhrases / TARGET_MASTERED_PHRASES);

  // 주간 일관성: 최근 4주 중 목표 80% 달성한 주
  const weeks = settings ? aggregateByWeek(logs, settings) : [];
  const recentWeeks = weeks.filter((w) => {
    const start = parseISO(w.weekStart);
    const today = new Date();
    return start <= today;
  });
  const last4 = recentWeeks.slice(-4);
  const consistency = last4.length > 0
    ? last4.filter((w) => w.achievement >= 80).length / Math.max(1, last4.length)
    : 0;

  // 자체평가 평균 (최근 14일)
  const recent14 = lastNDays(logs, 14);
  const ratings = recent14.filter((l) => l.selfRating > 0).map((l) => l.selfRating);
  const selfRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length / 5 : 0;

  const breakdown = {
    timeProgress: P_time,
    toeicProgress: P_toeic,
    peppaProgress: P_peppa,
    phrasesProgress: P_phrases,
    consistency,
    selfRating,
  };

  const currentScore =
    100 *
    (W_TIME * P_time +
      W_TOEIC * P_toeic +
      W_PEPPA * P_peppa +
      W_PHRASES * P_phrases +
      W_CONSISTENCY * consistency +
      W_SELF * selfRating);

  // 미래 외삽: 최근 7일 일평균 학습 분
  const recent7 = lastNDays(logs, 7);
  const recentDailyAvgMin =
    recent7.length > 0
      ? recent7.reduce((a, b) => a + totalMin(b), 0) / recent7.length
      : 0;

  const { remaining } = progressDays(settings);
  const projectedExtraHours = (recentDailyAvgMin * remaining) / 60;
  const projectedTotalHours = totalCurrentHours + projectedExtraHours;
  const projectedP_time = Math.min(1, projectedTotalHours / TARGET_TOTAL_HOURS);

  // 토익/페파도 같은 페이스로 외삽 (최근 7일 평균 → 남은 일수)
  const recentToeicPerDay =
    recent7.length > 0 ? recent7.reduce((a, b) => a + b.toeicSentences, 0) / recent7.length : 0;
  const recentPeppaPerDay =
    recent7.length > 0 ? recent7.reduce((a, b) => a + b.peppaEpisodes, 0) / recent7.length : 0;
  // 마스터 비율 가정: 연습한 문장의 60%가 마스터 도달
  const projectedMasteredToeic = Math.min(
    400,
    masteredToeic + recentToeicPerDay * remaining * 0.6
  );
  const projectedShadowed = Math.min(
    TARGET_PEPPA_EPISODES,
    shadowedPeppa + recentPeppaPerDay * remaining * 0.4
  );
  const projP_toeic = projectedMasteredToeic / 400;
  const projP_peppa = projectedShadowed / TARGET_PEPPA_EPISODES;

  // 표현 외삽: 최근 7일 phrasesReviewed 평균 → 잔여 일수
  const recentPhrasePerDay =
    recent7.length > 0
      ? recent7.reduce((a, b) => a + (b.phrasesReviewed ?? 0), 0) / recent7.length
      : 0;
  // 복습한 표현의 25%가 마스터로 도달한다고 가정
  const projectedMasteredPhrases = Math.min(
    TARGET_MASTERED_PHRASES,
    masteredPhrases + recentPhrasePerDay * remaining * 0.25
  );
  const projP_phrases = projectedMasteredPhrases / TARGET_MASTERED_PHRASES;

  const predictedScore =
    100 *
    (W_TIME * projectedP_time +
      W_TOEIC * projP_toeic +
      W_PEPPA * projP_peppa +
      W_PHRASES * projP_phrases +
      W_CONSISTENCY * consistency +
      W_SELF * selfRating);

  // 도달 확률: 시그모이드 (predictedScore - 70) / 8 → 0-100%
  const probability = Math.round(
    100 / (1 + Math.exp(-(predictedScore - PASS_THRESHOLD) / 8))
  );

  // 일평균 필요량 (남은 일수 동안 280h 도달)
  const remainHours = Math.max(0, TARGET_TOTAL_HOURS - totalCurrentHours);
  const requiredDailyAvgMin = remaining > 0 ? (remainHours * 60) / remaining : 0;

  let trend: "ahead" | "ontrack" | "behind" = "ontrack";
  if (recentDailyAvgMin >= requiredDailyAvgMin * 1.1) trend = "ahead";
  else if (recentDailyAvgMin < requiredDailyAvgMin * 0.85) trend = "behind";

  let message = "";
  if (trend === "ahead") {
    message = `현재 페이스(일 ${Math.round(recentDailyAvgMin)}분)가 목표를 ${Math.round((recentDailyAvgMin / requiredDailyAvgMin) * 100 - 100)}% 초과하고 있습니다. 12월 목표 도달이 매우 유망합니다.`;
  } else if (trend === "ontrack") {
    message = `현재 페이스(일 ${Math.round(recentDailyAvgMin)}분)가 권장량(일 ${Math.round(requiredDailyAvgMin)}분)에 근접합니다. 일관성을 유지하시면 목표 도달이 가능합니다.`;
  } else {
    const deficit = Math.round(requiredDailyAvgMin - recentDailyAvgMin);
    message = `목표 달성을 위해 일 평균 ${deficit}분의 추가 학습이 필요합니다. 페파피그 1편(약 5분) 또는 쉐도잉 시간을 늘려보시는 것을 권장드립니다.`;
  }

  return {
    currentScore: Math.round(currentScore),
    predictedScore: Math.round(predictedScore),
    probability,
    recentDailyAvgMin: Math.round(recentDailyAvgMin),
    requiredDailyAvgMin: Math.round(requiredDailyAvgMin),
    breakdown,
    message,
    trend,
  };
}

/** 대상 복습 문장 추출 (오늘 또는 과거 만기 + 마스터리 4★ 이상) */
export function getDueQuizSentences(
  toeic: ToeicSentence[],
  limit: number = 20
): ToeicSentence[] {
  const today = todayISO();
  // 추출 대상: 마스터리 4★ 이상 + (다음 복습일이 오늘 이전이거나 아직 퀴즈 미장건)
  const due = toeic.filter((s) => {
    if (s.masteryLevel < 4) return false;
    if (!s.nextReviewAt) return true; // 아직 퀴즈 미장건
    return s.nextReviewAt <= today;
  });
  // 우선순위: 만기일이 오래된 것 먼저, 그 다음 연속 정답 적은 것 (취약한 문장)
  const sorted = [...due].sort((a, b) => {
    const aDue = a.nextReviewAt ?? "0000-00-00";
    const bDue = b.nextReviewAt ?? "0000-00-00";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return a.consecutiveCorrect - b.consecutiveCorrect;
  });
  return sorted.slice(0, limit);
}

/** 주간 회고 데이터 (지난 주 월-일) */
export function lastWeekSummary(logs: StudyLog[], settings: Settings | null) {
  if (!settings) return null;
  const today = new Date();
  const dow = today.getDay(); // 0=일, 1=월
  const offsetToMon = dow === 0 ? 6 : dow - 1;
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - offsetToMon);
  thisMon.setHours(0, 0, 0, 0);
  const lastMon = new Date(thisMon.getTime() - 7 * 86400000);
  const lastSun = new Date(thisMon.getTime() - 1);
  const inRange = logs.filter((l) => {
    const d = parseISO(l.date);
    return d >= lastMon && d <= lastSun;
  });
  const minutes = inRange.reduce((a, b) => a + totalMin(b), 0);
  const studiedDays = inRange.filter((l) => totalMin(l) > 0).length;
  const target = dailyTargetMin(settings) * 7;
  const peppa = inRange.reduce((a, b) => a + b.peppaEpisodes, 0);
  const toeic = inRange.reduce((a, b) => a + b.toeicSentences, 0);
  const quizTotal = inRange.reduce((a, b) => a + (b.quizTotal || 0), 0);
  const quizCorrect = inRange.reduce((a, b) => a + (b.quizCorrect || 0), 0);
  return {
    weekStart: fmt(lastMon),
    weekEnd: fmt(lastSun),
    minutes,
    target,
    achievement: target > 0 ? Math.round((minutes / target) * 100) : 0,
    studiedDays,
    peppa,
    toeic,
    quizAccuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null,
    quizTotal,
  };
}

/** 페파피그 YouTube 검색 링크 (공식 Peppa Pig 채널 우선) */
export function peppaVideoUrl(season: number, episode: number, titleEn: string): string {
  const q = encodeURIComponent(
    `Peppa Pig Season ${season} Episode ${episode} ${titleEn} full episode`
  );
  return `https://www.youtube.com/results?search_query=${q}`;
}

/** 브라우저 내장 TTS 재생 (별도 라이브러리 불필요) */
export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch (_) {
    // 일부 브라우저에서 소리지 않을 수 있으니 조용히 넘어갑니다.
  }
}

/** CEFR 환산 */
export function scoreToCEFR(score: number): { level: string; description: string } {
  if (score < 25) return { level: "A1", description: "기초 입문" };
  if (score < 45) return { level: "A2", description: "초급 (TOEIC 400~500)" };
  if (score < 65) return { level: "A2+", description: "초중급 (TOEIC 500~650)" };
  if (score < 80) return { level: "B1", description: "일반 회화 (TOEIC 650~800)" };
  if (score < 92) return { level: "B1+", description: "유창한 일상회화" };
  return { level: "B2", description: "비즈니스 회화" };
}
