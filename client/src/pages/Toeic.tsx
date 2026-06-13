import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ToeicSentence } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Bookmark, Plus, Star, Check, Search, Volume2, Pin } from "lucide-react";
import { todayISO, speakEnglish } from "@/lib/utils-study";
import { useToast } from "@/hooks/use-toast";

export default function ToeicPage() {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<ToeicSentence[]>({ queryKey: ["/api/toeic"] });
  const [category, setCategory] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all"); // all | bookmarked | not_mastered
  const [query, setQuery] = useState<string>("");
  const [pickFor, setPickFor] = useState<ToeicSentence | null>(null);
  const [pickEn, setPickEn] = useState("");
  const [pickKo, setPickKo] = useState("");

  const categories = useMemo(() => Array.from(new Set(list.map((s) => s.category))), [list]);

  const filtered = useMemo(() => {
    return list.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (filter === "bookmarked" && !s.bookmarked) return false;
      if (filter === "not_mastered" && s.masteryLevel >= 4) return false;
      if (query && !s.korean.includes(query) && !s.english.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [list, category, filter, query]);

  const stats = useMemo(() => {
    const total = list.length;
    const practiced = list.filter((s) => s.practiceCount > 0).length;
    const mastered = list.filter((s) => s.masteryLevel >= 4).length;
    const bookmarked = list.filter((s) => s.bookmarked).length;
    return { total, practiced, mastered, bookmarked };
  }, [list]);

  const updateMut = useMutation({
    mutationFn: async ({ id, partial }: { id: number; partial: Partial<ToeicSentence> }) => {
      const res = await apiRequest("PATCH", `/api/toeic/${id}`, partial);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/toeic"] }),
    onError: (e: any) =>
      toast({ title: "처리 실패", description: e?.message ?? "다시 시도해 주세요.", variant: "destructive" }),
  });

  const onPractice = (s: ToeicSentence) => {
    updateMut.mutate({
      id: s.id,
      partial: {
        practiceCount: s.practiceCount + 1,
        lastPracticedAt: todayISO(),
      },
    });
  };
  const onSetMastery = (s: ToeicSentence, level: number) => {
    // 같은 값 재클릭이면 0으로 토글 (레벨 낮추는 수단 + 불필요 PATCH 방지)
    const next = s.masteryLevel === level ? 0 : level;
    updateMut.mutate({
      id: s.id,
      partial: {
        masteryLevel: next,
        lastPracticedAt: todayISO(),
      },
    });
  };
  const onBookmark = (s: ToeicSentence) => {
    updateMut.mutate({ id: s.id, partial: { bookmarked: !s.bookmarked } });
  };

  const savePhraseMut = useMutation({
    mutationFn: async (body: { phraseEn: string; phraseKo: string; sourceRefId: number; sourceLabel: string; category: string }) => {
      const res = await apiRequest("POST", "/api/phrases", {
        phraseEn: body.phraseEn,
        phraseKo: body.phraseKo,
        source: "toeic",
        sourceRefId: body.sourceRefId,
        sourceLabel: body.sourceLabel,
        category: body.category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phrases"] });
      toast({ title: "표현이 추가되었습니다", description: "표현 학습 페이지에서 PlayPhrase로 확인하실 수 있습니다." });
      setPickFor(null);
      setPickEn("");
      setPickKo("");
    },
    onError: (e: any) => {
      toast({ title: "추가 실패", description: e.message, variant: "destructive" });
    },
  });

  const openPicker = (s: ToeicSentence) => {
    // 영문 앞 4-6단어를 기본 추천으로 채워둠
    const words = s.english.replace(/[?.!,]/g, "").split(/\s+/).slice(0, 5).join(" ");
    setPickEn(words);
    setPickKo(s.korean.length > 30 ? s.korean.slice(0, 30) : s.korean);
    setPickFor(s);
  };

  const savePhrase = () => {
    if (!pickFor) return;
    const phrase = pickEn.trim();
    if (!phrase) {
      toast({ title: "영어 표현을 입력해 주세요", variant: "destructive" });
      return;
    }
    savePhraseMut.mutate({
      phraseEn: phrase,
      phraseKo: pickKo.trim(),
      sourceRefId: pickFor.id,
      sourceLabel: `TOEIC #${pickFor.sentenceNo}`,
      category: pickFor.category || "daily",
    });
  };

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">토익 스피킹 400문장</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          카테고리별 핵심 표현을 반복 연습하고, 숙달도(0~5)로 학습 상태를 관리합니다.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="전체 문장" value={stats.total} />
        <KPI label="연습한 문장" value={stats.practiced} accent="blue" />
        <KPI label="마스터 (★4 이상)" value={stats.mastered} accent="primary" />
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
            {stats.mastered} / {stats.total} 문장 마스터 (
            {stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%)
          </p>
        </CardContent>
      </Card>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="한글 또는 영문 검색"
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
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 h-9" data-testid="select-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 보기</SelectItem>
            <SelectItem value="bookmarked">북마크만</SelectItem>
            <SelectItem value="not_mastered">미마스터만</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">조건에 맞는 문장이 없습니다.</p>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              data-testid={`row-toeic-${s.id}`}
              className="border rounded-lg p-3 sm:p-4 hover-elevate"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="tabular text-[10px] px-1.5 py-0">
                    #{s.sentenceNo}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {s.category}
                  </Badge>
                </div>
                <button
                  data-testid={`button-bookmark-${s.id}`}
                  onClick={() => onBookmark(s)}
                  title={s.bookmarked ? "북마크 해제" : "북마크"}
                  className={s.bookmarked ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}
                >
                  <Bookmark className={`size-4 ${s.bookmarked ? "fill-amber-400" : ""}`} />
                </button>
              </div>

              <div className="space-y-1 mb-3">
                <p className="text-sm text-muted-foreground">{s.korean}</p>
                <div className="flex items-start gap-2">
                  <p className="text-base font-medium leading-relaxed flex-1">{s.english}</p>
                  <button
                    type="button"
                    onClick={() => speakEnglish(s.english)}
                    data-testid={`button-speak-${s.id}`}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover-elevate active-elevate-2"
                    title="영어 발음 듣기"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">숙달도</span>
                  <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="숙달도 선택">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = n === s.masteryLevel;
                      return (
                        <button
                          key={n}
                          data-testid={`star-${s.id}-${n}`}
                          onClick={() => onSetMastery(s, n)}
                          title={`숙달도 ${n}점`}
                          className={`h-7 w-7 text-xs tabular flex items-center justify-center border-r last:border-r-0 hover-elevate active-elevate-2 transition-colors ${
                            active
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                              : n <= s.masteryLevel
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {s.masteryLevel >= 4 && <Check className="size-3.5 text-primary" />}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular">연습 {s.practiceCount}회</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => openPicker(s)}
                    data-testid={`button-pick-phrase-${s.id}`}
                    title="짧은 표현으로 발췌해서 표현 학습에 추가"
                  >
                    <Pin className="size-3" /> 표현 발췌
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => onPractice(s)}
                    data-testid={`button-practice-${s.id}`}
                  >
                    <Plus className="size-3" /> +1회
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!pickFor} onOpenChange={(o) => !o && setPickFor(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-pick-phrase">
          <DialogHeader>
            <DialogTitle className="text-base">짧은 표현으로 발췌</DialogTitle>
            <DialogDescription className="text-xs">
              긴 문장에서 PlayPhrase로 검색하기 좋은 3~6단어 핵심 표현만 추출해 보세요.
            </DialogDescription>
          </DialogHeader>
          {pickFor && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-2.5 text-xs">
                <p className="text-muted-foreground">원문 #{pickFor.sentenceNo} · {pickFor.category}</p>
                <p className="mt-1">{pickFor.english}</p>
                <p className="text-muted-foreground mt-0.5">{pickFor.korean}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">영어 표현</Label>
                <Input
                  data-testid="input-pick-en"
                  value={pickEn}
                  onChange={(e) => setPickEn(e.target.value)}
                  placeholder="예: I'm so glad to meet you"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">한글 뜻 (선택)</Label>
                <Input
                  data-testid="input-pick-ko"
                  value={pickKo}
                  onChange={(e) => setPickKo(e.target.value)}
                  placeholder="번역 또는 메모"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickFor(null)} type="button">취소</Button>
            <Button onClick={savePhrase} disabled={savePhraseMut.isPending} data-testid="button-save-pick">
              {savePhraseMut.isPending ? "저장 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
