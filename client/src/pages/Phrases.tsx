import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Phrase } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, Check, Search, Volume2, Film, Bookmark, RotateCcw, Trash2, CheckCircle2,
} from "lucide-react";
import { speakEnglish, todayISO } from "@/lib/utils-study";
import { PlayPhraseModal } from "@/components/PlayPhraseModal";
import { useToast } from "@/hooks/use-toast";

const SOURCE_LABEL: Record<string, string> = {
  seed: "기본",
  peppa: "Peppa",
  toeic: "TOEIC",
  friends: "Friends",
  business: "Business",
};
const SOURCE_TONE: Record<string, string> = {
  seed: "bg-muted text-muted-foreground",
  peppa: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  toeic: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  friends: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  business: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export default function PhrasesPage() {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<Phrase[]>({ queryKey: ["/api/phrases"] });

  const [source, setSource] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [modalPhrase, setModalPhrase] = useState<Phrase | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(list.map((p) => p.category).filter(Boolean))),
    [list]
  );

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (source === "bookmarked" && !p.bookmarked) return false;
      if (source !== "all" && source !== "bookmarked" && p.source !== source) return false;
      if (category !== "all" && p.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.phraseEn.toLowerCase().includes(q) &&
          !p.phraseKo.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [list, source, category, query]);

  const stats = useMemo(() => {
    const total = list.length;
    const reviewed = list.filter((p) => p.reviewCount > 0).length;
    const mastered = list.filter((p) => p.masteryLevel >= 3).length;
    const bookmarked = list.filter((p) => p.bookmarked).length;
    return { total, reviewed, mastered, bookmarked };
  }, [list]);

  const onMutError = (e: any) =>
    toast({ title: "처리 실패", description: e?.message ?? "다시 시도해 주세요.", variant: "destructive" });

  const updateMut = useMutation({
    mutationFn: async ({ id, partial }: { id: number; partial: Partial<Phrase> }) => {
      const res = await apiRequest("PATCH", `/api/phrases/${id}`, partial);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/phrases"] }),
    onError: onMutError,
  });

  const reviewMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/phrases/${id}/review`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/phrases"] }),
    onError: onMutError,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/phrases/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrases"] });
      toast({ title: "삭제되었습니다" });
    },
    onError: onMutError,
  });

  const onBookmark = (p: Phrase) =>
    updateMut.mutate({ id: p.id, partial: { bookmarked: !p.bookmarked } });

  const onSetMastery = (p: Phrase, level: number) => {
    // 같은 값 재클릭이면 0으로 토글
    const next = p.masteryLevel === level ? 0 : level;
    updateMut.mutate({ id: p.id, partial: { masteryLevel: next, lastReviewedAt: todayISO() } });
  };

  const onReset = (p: Phrase) =>
    updateMut.mutate({
      id: p.id,
      partial: { reviewCount: 0, masteryLevel: 0, lastReviewedAt: null },
    });

  const onModalNewTabOpen = (p: Phrase) => {
    updateMut.mutate({
      id: p.id,
      partial: { playphraseOpenedCount: p.playphraseOpenedCount + 1 },
    });
  };

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">표현 학습 (PlayPhrase)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          영어 표현을 PlayPhrase.me 영화·드라마 클립으로 실제 발화 상황과 함께 익히고, 마스터리(0~4)로 학습 상태를 관리합니다.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="전체 표현" value={stats.total} />
        <KPI label="복습 시작" value={stats.reviewed} accent="blue" />
        <KPI label="마스터 (★3+)" value={stats.mastered} accent="primary" />
        <KPI label="북마크" value={stats.bookmarked} accent="amber" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">전체 마스터 진척률</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2 tabular">
            {stats.mastered} / {stats.total} 표현 마스터 (
            {stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%)
          </p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto -mx-1 px-1">
        <Tabs value={source} onValueChange={setSource}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-source-all">전체</TabsTrigger>
            <TabsTrigger value="seed" data-testid="tab-source-seed">기본</TabsTrigger>
            <TabsTrigger value="peppa" data-testid="tab-source-peppa">Peppa</TabsTrigger>
            <TabsTrigger value="friends" data-testid="tab-source-friends">Friends</TabsTrigger>
            <TabsTrigger value="business" data-testid="tab-source-business">Business</TabsTrigger>
            <TabsTrigger value="toeic" data-testid="tab-source-toeic">TOEIC</TabsTrigger>
            <TabsTrigger value="bookmarked" data-testid="tab-source-bookmark">북마크</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            data-testid="input-search-phrase"
            placeholder="영어 또는 한글 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-9" data-testid="select-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">조건에 맞는 표현이 없습니다.</p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              data-testid={`row-phrase-${p.id}`}
              className="border rounded-lg p-3 sm:p-4 hover-elevate"
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SOURCE_TONE[p.source] || SOURCE_TONE.seed}`}
                  >
                    {SOURCE_LABEL[p.source] || p.source}
                  </span>
                  {p.sourceLabel && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal max-w-[180px] sm:max-w-[260px] truncate"
                      title={p.sourceLabel}
                    >
                      {p.sourceLabel}
                    </Badge>
                  )}
                  {p.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {p.category}
                    </Badge>
                  )}
                </div>
                <button
                  data-testid={`button-bookmark-${p.id}`}
                  onClick={() => onBookmark(p)}
                  className={p.bookmarked ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}
                  title="북마크"
                >
                  <Bookmark className={`size-4 ${p.bookmarked ? "fill-amber-400" : ""}`} />
                </button>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex items-start gap-2">
                  <p className="text-base font-medium leading-relaxed flex-1">{p.phraseEn}</p>
                  <button
                    type="button"
                    onClick={() => speakEnglish(p.phraseEn)}
                    data-testid={`button-speak-${p.id}`}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover-elevate active-elevate-2"
                    title="영어 발음 듣기"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
                {p.phraseKo && (
                  <p className="text-sm text-muted-foreground">{p.phraseKo}</p>
                )}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">마스터리</span>
                  <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="마스터리 선택">
                    {[1, 2, 3, 4].map((n) => {
                      const active = n === p.masteryLevel;
                      return (
                        <button
                          key={n}
                          type="button"
                          data-testid={`mastery-${p.id}-${n}`}
                          onClick={() => onSetMastery(p, n)}
                          title={`마스터리 ${n}점`}
                          className={`h-7 w-7 text-xs tabular flex items-center justify-center border-r last:border-r-0 hover-elevate active-elevate-2 transition-colors ${
                            active
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                              : n <= p.masteryLevel
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {p.masteryLevel >= 3 && <CheckCircle2 className="size-3.5 text-primary" />}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground tabular mr-1">
                    복습 {p.reviewCount}회
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setModalPhrase(p)}
                    data-testid={`button-playphrase-${p.id}`}
                    title="PlayPhrase 클립 보기"
                  >
                    <Film className="size-3" /> PlayPhrase
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => reviewMut.mutate(p.id)}
                    disabled={reviewMut.isPending}
                    data-testid={`button-review-${p.id}`}
                    title="복습 완료 (+1)"
                  >
                    <Check className="size-3" /> 복습
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onReset(p)}
                    data-testid={`button-reset-${p.id}`}
                    title="초기화"
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                  {p.source === "toeic" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMut.mutate(p.id)}
                      data-testid={`button-delete-${p.id}`}
                      title="삭제"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>

              {p.playphraseOpenedCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 tabular">
                  PlayPhrase 열람 {p.playphraseOpenedCount}회
                  {p.lastReviewedAt && ` · 최근 복습 ${p.lastReviewedAt}`}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {modalPhrase && (
        <PlayPhraseModal
          open={!!modalPhrase}
          onOpenChange={(o) => !o && setModalPhrase(null)}
          phraseEn={modalPhrase.phraseEn}
          phraseKo={modalPhrase.phraseKo}
          sourceLabel={modalPhrase.sourceLabel}
          onOpenedInNewTab={() => onModalNewTabOpen(modalPhrase)}
        />
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "amber" | "blue";
}) {
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
