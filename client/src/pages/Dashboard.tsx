import { useQuery } from "@tanstack/react-query";
import type { StudyLog, Settings, ToeicSentence, PeppaEpisode, Phrase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  todayISO,
  totalMin,
  dailyTargetMin,
  aggregateByWeek,
  lastNDays,
  progressDays,
  currentStreak,
  predictGoal,
  scoreToCEFR,
  getDueQuizSentences,
  lastWeekSummary,
} from "@/lib/utils-study";
import { Clock, Flame, Target, TrendingUp, Headphones, Mic, MessageCircle, Tv2, Languages, CalendarRange, Brain, Award, ArrowRight, MessageSquareQuote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { StudyHeatmap } from "@/components/StudyHeatmap";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  hint,
  tone = "primary",
  testId,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  hint?: string;
  tone?: "primary" | "amber" | "blue" | "purple";
  testId?: string;
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    blue: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    purple: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  }[tone];

  return (
    <Card data-testid={testId} className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular tracking-tight">{value}</span>
              {unit && <span className="text-xs text-muted-foreground tabular">{unit}</span>}
            </div>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <div className={`rounded-md p-2 ${toneClass}`}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: logs = [], isLoading: l1 } = useQuery<StudyLog[]>({ queryKey: ["/api/study-logs"] });
  const { data: settings = null, isLoading: l2 } = useQuery<Settings | null>({ queryKey: ["/api/settings"] });
  const { data: toeic = [] } = useQuery<ToeicSentence[]>({ queryKey: ["/api/toeic"] });
  const { data: peppa = [] } = useQuery<PeppaEpisode[]>({ queryKey: ["/api/peppa"] });
  const { data: phrases = [] } = useQuery<Phrase[]>({ queryKey: ["/api/phrases"] });

  const loading = l1 || l2;
  const today = todayISO();
  const todayLog = logs.find((l) => l.date === today);
  const days = progressDays(settings);
  const streak = currentStreak(logs);
  const totalCum = logs.reduce((a, b) => a + totalMin(b), 0);
  const totalCumHours = (totalCum / 60).toFixed(1);
  const weekly = aggregateByWeek(logs, settings);
  const recent14 = lastNDays(logs, 14).map((l) => ({
    date: format(parseISO(l.date), "M/d"),
    리스닝: l.listeningMin,
    쉐도잉: l.shadowingMin,
    회화: l.conversationMin,
  }));

  const masteredToeic = toeic.filter((t) => t.masteryLevel >= 4).length;
  const practicedToeic = toeic.filter((t) => t.practiceCount > 0).length;
  const shadowedPeppa = peppa.filter((p) => p.status === "shadowing" || p.status === "mastered").length;
  const watchedPeppa = peppa.filter((p) => p.watchedCount > 0).length;
  const masteredPhrases = phrases.filter((p) => p.masteryLevel >= 3).length;
  const reviewedPhrases = phrases.filter((p) => p.reviewCount > 0).length;
  const prediction = predictGoal(logs, toeic, peppa, settings, phrases);
  const cefr = scoreToCEFR(prediction.predictedScore);

  const todayTarget = settings ? dailyTargetMin(settings) : 90;
  const todayMin = todayLog ? totalMin(todayLog) : 0;
  const todayPct = Math.min(100, Math.round((todayMin / todayTarget) * 100));

  // 오늘 복습해야 할 문장 수 (SRS 만기)
  const dueQuizCount = getDueQuizSentences(toeic, 999).length;
  const lastWeek = lastWeekSummary(logs, settings);

  return (
    <div className="px-5 sm:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 pb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">학습 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {settings ? (
              <>
                {format(parseISO(settings.startDate), "yyyy.M.d", { locale: ko })} ~ {format(parseISO(settings.endDate), "yyyy.M.d", { locale: ko })} ·
                <span className="ml-1.5 text-foreground tabular">{days.elapsed}</span> / {days.total}일차
              </>
            ) : (
              "시작일을 설정해 주세요"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 tabular">
            <Flame className="size-3 text-amber-500" />
            연속 {streak}일
          </Badge>
          <Badge variant="outline" className="gap-1 tabular">
            <CalendarRange className="size-3 text-primary" />
            잔여 {days.remaining}일
          </Badge>
          <Badge className="gap-1 tabular">
            <TrendingUp className="size-3" />
            예측 {cefr.level}
          </Badge>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* 오늘의 액션 — 학습 시작 신호. dueQuizCount > 0 일 때만 강조 노출 */}
          {dueQuizCount > 0 && (
            <Card className="bg-primary/5 border-primary/40" data-testid="card-today-action">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Brain className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      오늘 복습할 문장 <span className="tabular text-primary">{dueQuizCount}</span>개
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SRS 망각곡선에 따라 재점검이 대기 중입니다.
                    </p>
                  </div>
                </div>
                <Link
                  href="/quiz"
                  data-testid="link-today-quiz"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover-elevate active-elevate-2"
                >
                  지금 시작 <ArrowRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              testId="stat-today"
              label="오늘 학습"
              value={todayMin}
              unit={`/ ${todayTarget}분`}
              hint={`${todayPct}% 달성`}
              icon={Clock}
            />
            <StatCard
              testId="stat-total"
              label="누적 학습"
              value={totalCumHours}
              unit="시간"
              hint="목표 280시간"
              icon={Target}
              tone="amber"
            />
            <StatCard
              testId="stat-toeic"
              label="토익 마스터"
              value={`${masteredToeic} / 400`}
              hint={`연습 ${practicedToeic}문장`}
              icon={Languages}
              tone="blue"
            />
            <StatCard
              testId="stat-peppa"
              label="페파피그 진도"
              value={`${shadowedPeppa} / ${peppa.length}`}
              hint={`시청 ${watchedPeppa}편`}
              icon={Tv2}
              tone="purple"
            />
            <StatCard
              testId="stat-phrases"
              label="표현 마스터"
              value={`${masteredPhrases} / 50`}
              hint={`복습 ${reviewedPhrases}개`}
              icon={MessageSquareQuote}
            />
          </div>

          {/* Today progress bar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">오늘의 목표 달성률</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5"><Headphones className="size-3.5" />리스닝</span>
                  <span className="tabular text-muted-foreground">
                    {todayLog?.listeningMin ?? 0} / {settings?.dailyListeningTarget ?? 40}분
                  </span>
                </div>
                <Progress value={Math.min(100, ((todayLog?.listeningMin ?? 0) / (settings?.dailyListeningTarget ?? 40)) * 100)} className="h-1.5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5"><Mic className="size-3.5" />쉐도잉</span>
                  <span className="tabular text-muted-foreground">
                    {todayLog?.shadowingMin ?? 0} / {settings?.dailyShadowingTarget ?? 30}분
                  </span>
                </div>
                <Progress value={Math.min(100, ((todayLog?.shadowingMin ?? 0) / (settings?.dailyShadowingTarget ?? 30)) * 100)} className="h-1.5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5"><MessageCircle className="size-3.5" />회화</span>
                  <span className="tabular text-muted-foreground">
                    {todayLog?.conversationMin ?? 0} / {settings?.dailyConversationTarget ?? 20}분
                  </span>
                </div>
                <Progress value={Math.min(100, ((todayLog?.conversationMin ?? 0) / (settings?.dailyConversationTarget ?? 20)) * 100)} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">최근 14일 일일 학습량 (분)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={recent14} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="리스닝" stackId="1" stroke="hsl(var(--chart-1))" fill="url(#g1)" />
                      <Area type="monotone" dataKey="쉐도잉" stackId="1" stroke="hsl(var(--chart-2))" fill="url(#g2)" />
                      <Area type="monotone" dataKey="회화" stackId="1" stroke="hsl(var(--chart-3))" fill="url(#g3)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">12월 31일 예측 점수</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center pt-2">
                  <div className="text-4xl font-bold tabular tracking-tight">{prediction.predictedScore}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">/ 100점</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {cefr.level} · {cefr.description}
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">목표 도달 확률</span>
                    <span className="tabular font-semibold">{prediction.probability}%</span>
                  </div>
                  <Progress value={prediction.probability} className="h-2" />
                </div>
                <div className="rounded-md bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {prediction.message}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 오늘의 퀴즈 + 주간 회고 */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Brain className="size-4 text-primary" />
                  오늘의 복습 퀴즈
                </CardTitle>
                <Link
                  href="/quiz"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="link-go-quiz"
                >
                  이동 <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular text-primary">{dueQuizCount}</span>
                  <span className="text-sm text-muted-foreground">문장</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dueQuizCount > 0
                    ? "마스터리 4★ 이상 문장이 망각곱선에 따라 재점검을 기다리고 있습니다."
                    : "오늘 복습할 문장이 없습니다. 토익 페이지에서 마스터리를 높이시면 자동 등록됩니다."}
                </p>
                {todayLog && todayLog.quizTotal > 0 && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    오늘 이미 <span className="text-foreground tabular font-semibold">{todayLog.quizCorrect}/{todayLog.quizTotal}</span>문 완료 중
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Award className="size-4 text-amber-500" />
                  지난 주 회고
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastWeek && lastWeek.minutes > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold tabular">{lastWeek.minutes}<span className="text-xs text-muted-foreground ml-1">분</span></span>
                      <span className="text-xs text-muted-foreground tabular">목표 {lastWeek.target}분</span>
                    </div>
                    <Progress value={Math.min(100, lastWeek.achievement)} className="h-1.5" />
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                      <div>
                        <p className="text-muted-foreground">학습일수</p>
                        <p className="tabular font-semibold">{lastWeek.studiedDays}일</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">페파피그</p>
                        <p className="tabular font-semibold">{lastWeek.peppa}편</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">토익</p>
                        <p className="tabular font-semibold">{lastWeek.toeic}문</p>
                      </div>
                    </div>
                    {lastWeek.quizAccuracy !== null && (
                      <p className="text-[11px] text-muted-foreground pt-1.5 border-t">
                        퀴즈 정답률 <span className="text-foreground tabular font-medium">{lastWeek.quizAccuracy}%</span> ({lastWeek.quizTotal}문 응시)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4">
                    지난 주 학습 기록이 아직 없습니다. 이번 주부터 꾸준히 기록해 가시면 주간 요약이 자동으로 집계됩니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 잔디 학습 캘린더 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">학습 캘린더 (251일 전체)</CardTitle>
            </CardHeader>
            <CardContent>
              <StudyHeatmap logs={logs} settings={settings} />
            </CardContent>
          </Card>

          {/* Weekly bar */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">주간 목표 달성률</CardTitle>
              <span className="text-[11px] text-muted-foreground tabular">주당 목표 {(dailyTargetMin(settings ?? ({} as Settings)) * 7) || 630}분</span>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={weekly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any, _n, p: any) => [
                        `${v}% (${p.payload.minutes}분)`,
                        "달성률",
                      ]}
                      labelFormatter={(v: any, p: any) => {
                        const w = p?.[0]?.payload;
                        return w ? `${w.label} · ${w.weekStart} ~ ${w.weekEnd}` : v;
                      }}
                    />
                    <ReferenceLine y={100} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                    <Bar dataKey="achievement" radius={[3, 3, 0, 0]}>
                      {weekly.map((w, i) => (
                        <Cell
                          key={i}
                          fill={
                            w.achievement >= 100
                              ? "hsl(var(--chart-1))"
                              : w.achievement >= 70
                              ? "hsl(var(--chart-3))"
                              : w.achievement > 0
                              ? "hsl(var(--chart-5))"
                              : "hsl(var(--muted))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
