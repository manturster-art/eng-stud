import { useQuery } from "@tanstack/react-query";
import type { StudyLog, Settings, ToeicSentence, PeppaEpisode, Phrase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { predictGoal, scoreToCEFR, progressDays, totalMin, aggregateByWeek } from "@/lib/utils-study";
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, addDays, parseISO } from "date-fns";

export default function PredictPage() {
  const { data: logs = [] } = useQuery<StudyLog[]>({ queryKey: ["/api/study-logs"] });
  const { data: settings = null } = useQuery<Settings | null>({ queryKey: ["/api/settings"] });
  const { data: toeic = [] } = useQuery<ToeicSentence[]>({ queryKey: ["/api/toeic"] });
  const { data: peppa = [] } = useQuery<PeppaEpisode[]>({ queryKey: ["/api/peppa"] });
  const { data: phrases = [] } = useQuery<Phrase[]>({ queryKey: ["/api/phrases"] });

  const pred = predictGoal(logs, toeic, peppa, settings, phrases);
  const cefrCurrent = scoreToCEFR(pred.currentScore);
  const cefrPredicted = scoreToCEFR(pred.predictedScore);
  const days = progressDays(settings);

  // 누적 학습시간 곡선 + 미래 외삽
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  const past = sorted.map((l) => {
    cum += totalMin(l) / 60;
    return { date: l.date, hours: Number(cum.toFixed(1)), kind: "actual" as const };
  });
  // 미래 외삽: 최근 7일 일평균 분
  const futurePoints: { date: string; hours: number; kind: "projected" }[] = [];
  if (settings) {
    const start = parseISO(settings.startDate);
    const today = new Date();
    let cumProj = cum;
    for (let i = 1; i <= days.remaining; i += 7) {
      const d = addDays(today, i);
      cumProj += (pred.recentDailyAvgMin * 7) / 60;
      futurePoints.push({
        date: format(d, "yyyy-MM-dd"),
        hours: Number(cumProj.toFixed(1)),
        kind: "projected",
      });
    }
  }
  const merged = [
    ...past.map((p) => ({ ...p, actual: p.hours, projected: null as number | null })),
    ...futurePoints.map((p, i) => ({
      ...p,
      actual: i === 0 ? past[past.length - 1]?.hours ?? null : null,
      projected: p.hours,
    })),
  ];

  // 주간 일관성
  const weeks = settings ? aggregateByWeek(logs, settings) : [];
  const elapsedWeeks = weeks.filter((w) => parseISO(w.weekStart) <= new Date());

  const breakdownItems = [
    { label: "학습 시간 진척", value: pred.breakdown.timeProgress, weight: 35 },
    { label: "토익 마스터", value: pred.breakdown.toeicProgress, weight: 20 },
    { label: "페파피그 쉐도잉", value: pred.breakdown.peppaProgress, weight: 12 },
    { label: "표현 마스터", value: pred.breakdown.phrasesProgress, weight: 10 },
    { label: "주간 일관성", value: pred.breakdown.consistency, weight: 15 },
    { label: "자체 평가", value: pred.breakdown.selfRating, weight: 8 },
  ];

  const trendIcon = pred.trend === "ahead" ? TrendingUp : pred.trend === "behind" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendLabel = pred.trend === "ahead" ? "목표 초과" : pred.trend === "behind" ? "목표 미달" : "정상 페이스";
  const trendTone = pred.trend === "ahead" ? "text-primary" : pred.trend === "behind" ? "text-destructive" : "text-amber-600 dark:text-amber-400";

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">목표 달성 예측</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          현재 학습 페이스를 기반으로 12월 31일 시점 회화 실력을 추정합니다.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 현재 점수 / 예측 점수 / 도달 확률 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">현재 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tabular tracking-tight">{pred.currentScore}</div>
            <Badge variant="outline" className="mt-2">{cefrCurrent.level} · {cefrCurrent.description}</Badge>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">12월 31일 예측 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tabular tracking-tight text-primary">{pred.predictedScore}</div>
            <Badge className="mt-2">{cefrPredicted.level} · {cefrPredicted.description}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">목표 도달 확률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tabular tracking-tight">{pred.probability}%</div>
            <p className="text-xs text-muted-foreground mt-1.5">일반 회화(B1·70점 이상) 도달</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">누적 학습시간 — 실제 및 예측</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={merged} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="h" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={280} stroke="hsl(var(--chart-1))" strokeDasharray="3 3" label={{ value: "목표 280h", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Area type="monotone" dataKey="actual" name="실제" stroke="hsl(var(--chart-1))" fill="url(#ga)" connectNulls />
                  <Area type="monotone" dataKey="projected" name="예측" stroke="hsl(var(--chart-3))" fill="url(#gp)" strokeDasharray="4 4" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">현재 페이스 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-2 ${trendTone}`}>
              <TrendIcon className="size-5" />
              <span className="text-sm font-semibold">{trendLabel}</span>
            </div>
            <div className="space-y-2.5">
              <Row label="최근 7일 일평균" value={`${pred.recentDailyAvgMin}분`} />
              <Row label="권장 일평균" value={`${pred.requiredDailyAvgMin}분`} />
              <Row label="잔여 일수" value={`${days.remaining}일`} />
              <Row label="진행 주차" value={`${elapsedWeeks.length} / ${weeks.length}주`} />
            </div>
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] leading-relaxed flex gap-2">
              <Lightbulb className="size-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{pred.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">예측 점수 구성요소 (가중치별 진척률)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {breakdownItems.map((b) => (
              <div key={b.label}>
                <div className="h-32 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      data={[{ name: b.label, value: Math.round(b.value * 100), fill: "hsl(var(--primary))" }]}
                      innerRadius="60%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={4} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-20 relative pointer-events-none">
                  <div className="text-base font-semibold tabular">{Math.round(b.value * 100)}%</div>
                </div>
                <div className="text-center mt-12">
                  <div className="text-xs font-medium">{b.label}</div>
                  <div className="text-[10px] text-muted-foreground">가중치 {b.weight}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">예측 알고리즘 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            예측 점수 = 학습시간(35%) + 토익 마스터(20%) + 페파피그 쉐도잉(12%) + 표현 마스터(10%) + 주간 일관성(15%) + 자체평가(8%)
          </p>
          <p>
            CEFR A2(TOEIC 400~500)에서 B1(일반회화)까지 도달에 필요한 표준 학습량 280시간을 기준으로 산정됩니다.
            남은 일수에 최근 7일 일평균 학습량을 외삽하여 12월 31일 예상 점수를 산출합니다.
          </p>
          <p>
            도달 확률은 시그모이드 함수로 70점 문턱과의 거리를 변환한 값입니다. 휴리스틱 모델이므로 절대적 수치가 아닌
            추세 지표로 활용해 주십시오.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}
