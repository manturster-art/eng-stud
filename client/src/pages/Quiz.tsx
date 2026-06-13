import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ToeicSentence, StudyLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDueQuizSentences, speakEnglish, todayISO } from "@/lib/utils-study";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  Trophy,
  Sparkles,
} from "lucide-react";

type QuizMode = "ko-to-en" | "en-to-ko";

interface QuizItem {
  sentence: ToeicSentence;
  mode: QuizMode;
  options: string[]; // 4지선다
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(due: ToeicSentence[], pool: ToeicSentence[]): QuizItem[] {
  return due.map((sentence) => {
    const mode: QuizMode = Math.random() < 0.5 ? "ko-to-en" : "en-to-ko";
    const correct = mode === "ko-to-en" ? sentence.english : sentence.korean;
    const textOf = (s: ToeicSentence) => (mode === "ko-to-en" ? s.english : s.korean);

    // 같은 카테고리 우선, 부족하면 다른 카테고리로 채움
    const sameCategory = pool.filter((s) => s.id !== sentence.id && s.category === sentence.category);
    const others = pool.filter((s) => s.id !== sentence.id && s.category !== sentence.category);
    const ordered = [...shuffle(sameCategory), ...shuffle(others)];

    // 정답과 텍스트가 같은 오답은 제외 (정답이 두 개처럼 보이는 것 방지) + 보기 텍스트 중복 제거
    const distractors: string[] = [];
    const seen = new Set<string>([correct]);
    for (const s of ordered) {
      const t = textOf(s);
      if (seen.has(t)) continue;
      seen.add(t);
      distractors.push(t);
      if (distractors.length === 3) break;
    }

    const allOptions = shuffle([correct, ...distractors]);
    return {
      sentence,
      mode,
      options: allOptions,
      correctIndex: allOptions.indexOf(correct),
    };
  });
}

export default function QuizPage() {
  const { data: toeic = [] } = useQuery<ToeicSentence[]>({ queryKey: ["/api/toeic"] });
  const { data: logs = [] } = useQuery<StudyLog[]>({ queryKey: ["/api/study-logs"] });

  // 오늘 만기 + 마스터리 4★ 이상 → 최대 20문제
  const dueSentences = useMemo(() => getDueQuizSentences(toeic, 20), [toeic]);

  const [items, setItems] = useState<QuizItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ id: number; correct: boolean }[]>([]);
  const [completed, setCompleted] = useState(false);

  // 초기 빌드
  useEffect(() => {
    if (toeic.length > 0 && items.length === 0 && dueSentences.length > 0) {
      setItems(buildQuiz(dueSentences, toeic));
    }
  }, [toeic, dueSentences, items.length]);

  const todayLog = logs.find((l) => l.date === todayISO());

  const answerMut = useMutation({
    mutationFn: async ({ id, correct }: { id: number; correct: boolean }) => {
      const res = await apiRequest("POST", `/api/toeic/${id}/quiz`, { correct });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/toeic"] }),
  });

  const saveLogMut = useMutation({
    mutationFn: async (data: { quizCorrect: number; quizTotal: number }) => {
      // 서버에서 원자적 증분 — 클라이언트 캐시 누적(stale 시 중복) 제거
      const res = await apiRequest("POST", "/api/study-logs/quiz-increment", {
        correctDelta: data.quizCorrect,
        totalDelta: data.quizTotal,
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/study-logs"] }),
  });

  const current = items[currentIdx];

  const onSelect = (idx: number) => {
    if (revealed || !current) return;
    setSelected(idx);
    setRevealed(true);
    const correct = idx === current.correctIndex;
    setResults((r) => [...r, { id: current.sentence.id, correct }]);
    answerMut.mutate({ id: current.sentence.id, correct });
  };

  const onNext = () => {
    if (currentIdx + 1 >= items.length) {
      // 완료 → 학습 로그에 합산 저장
      const correctCount = results.filter((r) => r.correct).length;
      saveLogMut.mutate({ quizCorrect: correctCount, quizTotal: results.length });
      setCompleted(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const onRestart = () => {
    setItems(buildQuiz(dueSentences, toeic));
    setCurrentIdx(0);
    setSelected(null);
    setRevealed(false);
    setResults([]);
    setCompleted(false);
  };

  // ---- 빈 상태 ----
  if (toeic.length === 0) {
    return (
      <div className="px-5 sm:px-8 py-12 max-w-3xl mx-auto text-center">
        <p className="text-sm text-muted-foreground">데이터를 불러오는 중입니다…</p>
      </div>
    );
  }

  if (dueSentences.length === 0) {
    return (
      <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">오늘의 복습 퀴즈</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            마스터리 4★ 이상 문장을 망각곡선(SRS)에 따라 매일 재점검합니다.
          </p>
        </header>
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Sparkles className="size-10 text-primary mx-auto" />
            <p className="text-base font-medium">오늘은 복습할 문장이 없습니다.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              토익 400문장 페이지에서 문장의 마스터리를 4★ 이상으로 올리시면, 다음 복습 일정에 자동으로 이 페이지에 등록됩니다.
            </p>
            <p className="text-xs text-muted-foreground">
              퀴즈 정답 시 마스터리가 자동으로 +1 상승하고, 다음 복습일은 1일 → 2일 → 4일 → 7일 → 14일 → 30일 → 60일 간격으로 늘어납니다.
            </p>
          </CardContent>
        </Card>

        {todayLog && todayLog.quizTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Trophy className="size-4 text-amber-500" />
                오늘의 퀴즈 누적
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm tabular">
                <span className="font-semibold">{todayLog.quizCorrect}</span> /{" "}
                <span className="text-muted-foreground">{todayLog.quizTotal}문</span>{" "}
                <span className="ml-2 text-primary font-medium">
                  정답률 {Math.round((todayLog.quizCorrect / todayLog.quizTotal) * 100)}%
                </span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ---- 완료 화면 ----
  if (completed) {
    const correctCount = results.filter((r) => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    return (
      <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto space-y-5">
        <Card>
          <CardHeader className="text-center">
            <Trophy className="size-12 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-base">퀴즈를 완료하셨습니다</CardTitle>
            <CardDescription>오늘의 SRS 복습이 모두 반영되었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-semibold tabular text-primary">{accuracy}%</p>
              <p className="text-sm text-muted-foreground mt-1 tabular">
                {correctCount} / {results.length}문 정답
              </p>
            </div>
            <Progress value={accuracy} className="h-2" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-3 text-center">
                <p className="text-[11px] text-muted-foreground">정답</p>
                <p className="text-lg font-semibold tabular text-primary">{correctCount}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-[11px] text-muted-foreground">오답</p>
                <p className="text-lg font-semibold tabular text-destructive">
                  {results.length - correctCount}
                </p>
              </div>
            </div>
            <Button
              onClick={onRestart}
              className="w-full gap-1.5"
              data-testid="button-restart-quiz"
              disabled={dueSentences.length === 0}
            >
              <RotateCcw className="size-4" />
              새로 시작
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              정답한 문장은 다음 복습일까지 자동으로 잠시 휴면 상태가 되며, 오답 문장은 내일 다시 출제됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- 진행 화면 ----
  if (!current) return null;
  const progress = ((currentIdx + (revealed ? 1 : 0)) / items.length) * 100;
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="size-5 text-primary" />
            오늘의 복습 퀴즈
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentIdx + 1} / {items.length}문 · 정답 {correctCount}문
          </p>
        </div>
        <Badge variant="outline" className="tabular text-xs">
          {current.sentence.category}
        </Badge>
      </header>

      <Progress value={progress} className="h-1.5" />

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-[11px] uppercase tracking-wider">
            {current.mode === "ko-to-en" ? "한국어 → 영어" : "영어 → 한국어"}
          </CardDescription>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base sm:text-lg leading-relaxed font-medium">
              {current.mode === "ko-to-en" ? current.sentence.korean : current.sentence.english}
            </CardTitle>
            {current.mode === "en-to-ko" && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => speakEnglish(current.sentence.english)}
                title="발음 듣기"
                data-testid="button-speak-question"
              >
                <Volume2 className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {current.options.map((opt, idx) => {
            const isCorrectOption = idx === current.correctIndex;
            const isSelected = idx === selected;
            let tone =
              "border bg-card hover-elevate active-elevate-2";
            if (revealed) {
              if (isCorrectOption)
                tone = "border-primary bg-primary/10 text-primary";
              else if (isSelected)
                tone = "border-destructive bg-destructive/10 text-destructive";
              else tone = "border bg-card opacity-60";
            } else if (isSelected) {
              tone = "border-primary/60 bg-primary/5";
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelect(idx)}
                disabled={revealed}
                data-testid={`option-${idx}`}
                className={`w-full text-left px-4 py-3 rounded-md text-sm transition-colors ${tone} flex items-center justify-between gap-3`}
              >
                <span className="flex-1">{opt}</span>
                {revealed && isCorrectOption && (
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                )}
                {revealed && isSelected && !isCorrectOption && (
                  <XCircle className="size-4 text-destructive shrink-0" />
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {revealed && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">정답 해설</div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => speakEnglish(current.sentence.english)}
                title="영어 발음 듣기"
                data-testid="button-speak-answer"
              >
                <Volume2 className="size-4" />
              </Button>
            </div>
            <p className="text-sm font-medium">{current.sentence.english}</p>
            <p className="text-sm text-muted-foreground">{current.sentence.korean}</p>
            <p className="text-xs text-muted-foreground pt-1">
              연속 정답 {current.sentence.consecutiveCorrect}회 · 마스터리 ★{current.sentence.masteryLevel}/5
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!revealed}
          className="gap-1.5"
          data-testid="button-next-question"
        >
          {currentIdx + 1 >= items.length ? "완료" : "다음 문제"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
