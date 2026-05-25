import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PeppaEpisode } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Mic, CheckCircle2, RotateCcw, Play, ExternalLink } from "lucide-react";
import { todayISO, peppaVideoUrl } from "@/lib/utils-study";

const STATUS_LABEL: Record<string, string> = {
  pending: "예정",
  watching: "시청",
  shadowing: "쉐도잉",
  mastered: "마스터",
};
const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  watching: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  shadowing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  mastered: "bg-primary/15 text-primary",
};

export default function PeppaPage() {
  const { data: list = [] } = useQuery<PeppaEpisode[]>({ queryKey: ["/api/peppa"] });
  const [season, setSeason] = useState<string>("all");

  const seasons = useMemo(() => Array.from(new Set(list.map((e) => e.season))).sort((a, b) => a - b), [list]);
  const filtered = season === "all" ? list : list.filter((e) => String(e.season) === season);

  const stats = useMemo(() => {
    const total = list.length;
    const watching = list.filter((e) => e.watchedCount > 0).length;
    const shadowing = list.filter((e) => e.status === "shadowing" || e.status === "mastered").length;
    const mastered = list.filter((e) => e.status === "mastered").length;
    return { total, watching, shadowing, mastered };
  }, [list]);

  const updateMut = useMutation({
    mutationFn: async ({ id, partial }: { id: number; partial: Partial<PeppaEpisode> }) => {
      const res = await apiRequest("PATCH", `/api/peppa/${id}`, partial);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/peppa"] }),
  });

  const onWatch = (e: PeppaEpisode) => {
    const newCount = e.watchedCount + 1;
    let status = e.status;
    if (status === "pending") status = "watching";
    updateMut.mutate({
      id: e.id,
      partial: { watchedCount: newCount, status, lastStudiedAt: todayISO() },
    });
  };

  const onPlay = (e: PeppaEpisode) => {
    const url = e.videoUrl && e.videoUrl.length > 0 ? e.videoUrl : peppaVideoUrl(e.season, e.episode, e.titleEn);
    // 새 탭에 영상 열고 시청 카운트 동시 갱신
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    onWatch(e);
  };
  const onShadow = (e: PeppaEpisode) => {
    const newCount = e.shadowedCount + 1;
    let status: PeppaEpisode["status"] = e.status === "pending" || e.status === "watching" ? "shadowing" : e.status;
    if (newCount >= 3) status = "mastered";
    updateMut.mutate({
      id: e.id,
      partial: { shadowedCount: newCount, status, lastStudiedAt: todayISO() },
    });
  };
  const onReset = (e: PeppaEpisode) => {
    updateMut.mutate({
      id: e.id,
      partial: { watchedCount: 0, shadowedCount: 0, status: "pending", lastStudiedAt: null },
    });
  };

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">페파피그 진도</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          시청 → 쉐도잉(3회 이상) → 마스터 단계로 진행됩니다. 문장이 짧고 발음이 또렷하여 입문자 쉐도잉에 가장 효과적입니다.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="전체 에피소드" value={stats.total} />
        <KPI label="시청 시작" value={stats.watching} accent="blue" />
        <KPI label="쉐도잉 진행" value={stats.shadowing} accent="amber" />
        <KPI label="마스터" value={stats.mastered} accent="primary" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">전체 진척률</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={stats.total > 0 ? (stats.shadowing / stats.total) * 100 : 0}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2 tabular">
            {stats.shadowing} / {stats.total} 편 쉐도잉 (
            {stats.total > 0 ? Math.round((stats.shadowing / stats.total) * 100) : 0}%)
          </p>
        </CardContent>
      </Card>

      <div>
        <Tabs value={season} onValueChange={setSeason}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-season-all">전체</TabsTrigger>
            {seasons.map((s) => (
              <TabsTrigger key={s} value={String(s)} data-testid={`tab-season-${s}`}>
                시즌 {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-2">
        {filtered.map((e) => (
          <div
            key={e.id}
            data-testid={`row-peppa-${e.id}`}
            className="border rounded-lg p-3 sm:p-4 hover-elevate flex flex-wrap items-center gap-3"
          >
            {/* 타이틀 영역 클릭 시 영상 바로 열기 */}
            <button
              type="button"
              onClick={() => onPlay(e)}
              data-testid={`link-play-${e.id}`}
              className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-md hover-elevate active-elevate-2 px-1.5 py-1 -mx-1.5 -my-1"
              title="영상으로 이동 (YouTube 새 탭)"
            >
              <Badge variant="outline" className="tabular text-[10px] px-1.5 py-0 shrink-0">
                S{e.season}E{String(e.episode).padStart(2, "0")}
              </Badge>
              <Play className="size-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1">
                  {e.titleEn}
                  <ExternalLink className="size-3 text-muted-foreground/60" />
                </div>
                <div className="text-xs text-muted-foreground truncate">{e.titleKo}</div>
              </div>
            </button>

            <div className="flex items-center gap-3 text-xs tabular text-muted-foreground">
              <span className="flex items-center gap-1" title="시청 횟수">
                <Eye className="size-3" />
                {e.watchedCount}
              </span>
              <span className="flex items-center gap-1" title="쉐도잉 횟수">
                <Mic className="size-3" />
                {e.shadowedCount}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_TONE[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => onShadow(e)}
                data-testid={`button-shadow-${e.id}`}
                title="쉐도잉 횟수 +1"
              >
                <Mic className="size-3" /> 쉐도잉
              </Button>
              {e.status === "mastered" && (
                <CheckCircle2 className="size-4 text-primary" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onReset(e)}
                data-testid={`button-reset-${e.id}`}
                title="초기화"
              >
                <RotateCcw className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        제목을 클릭하시면 YouTube에서 해당 에피소드 검색 결과로 이동하며 시청 횟수가 자동으로 +1 증가합니다.
      </p>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number; accent?: "primary" | "amber" | "blue" }) {
  const tone = accent
    ? {
        primary: "text-primary",
        amber: "text-amber-600 dark:text-amber-400",
        blue: "text-sky-600 dark:text-sky-400",
      }[accent]
    : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold tabular mt-1 ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
