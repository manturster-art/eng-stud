import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StudyLog, PeppaEpisode } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { todayISO, totalMin, peppaVideoUrl } from "@/lib/utils-study";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Star, Save, Trash2, Calendar as CalendarIcon, Tv2, Play, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function StudyLogPage() {
  const { toast } = useToast();
  const { data: logs = [] } = useQuery<StudyLog[]>({ queryKey: ["/api/study-logs"] });
  const { data: peppaList = [] } = useQuery<PeppaEpisode[]>({ queryKey: ["/api/peppa"] });

  const [date, setDate] = useState<string>(todayISO());
  const existing = logs.find((l) => l.date === date);

  const [listening, setListening] = useState<number>(0);
  const [shadowing, setShadowing] = useState<number>(0);
  const [conversation, setConversation] = useState<number>(0);
  const [toeic, setToeic] = useState<number>(0);
  const [peppa, setPeppa] = useState<number>(0);
  const [phrases, setPhrases] = useState<number>(0);
  const [rating, setRating] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const [watchedIds, setWatchedIds] = useState<number[]>([]);
  const [showEpisodePicker, setShowEpisodePicker] = useState<boolean>(false);

  // 주어진 날짜의 기존 로그로 폼 필드를 채운다 (없으면 초기값).
  const fillFormFromLog = (l: StudyLog | undefined) => {
    if (l) {
      setListening(l.listeningMin);
      setShadowing(l.shadowingMin);
      setConversation(l.conversationMin);
      setToeic(l.toeicSentences);
      setPeppa(l.peppaEpisodes);
      setPhrases(l.phrasesReviewed ?? 0);
      setRating(l.selfRating || 3);
      setNotes(l.notes || "");
      try {
        const ids = JSON.parse(l.watchedEpisodeIds || "[]") as number[];
        setWatchedIds(Array.isArray(ids) ? ids : []);
      } catch {
        setWatchedIds([]);
      }
    } else {
      setListening(0);
      setShadowing(0);
      setConversation(0);
      setToeic(0);
      setPeppa(0);
      setPhrases(0);
      setRating(3);
      setNotes("");
      setWatchedIds([]);
    }
  };

  // 날짜 변경 또는 logs(서버 데이터) 도착 시 폼을 동기화한다.
  // 렌더 중 setState를 피하기 위해 useEffect로 처리.
  useEffect(() => {
    fillFormFromLog(logs.find((x) => x.date === date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, logs]);

  const onDateChange = (d: string) => {
    setDate(d);
  };

  const toggleEpisode = (epId: number) => {
    setWatchedIds((prev) => {
      const next = prev.includes(epId) ? prev.filter((x) => x !== epId) : [...prev, epId];
      // 자동으로 페파 카운트 동기화
      setPeppa(next.length);
      return next;
    });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/study-logs", {
        date,
        listeningMin: listening,
        shadowingMin: shadowing,
        conversationMin: conversation,
        toeicSentences: toeic,
        peppaEpisodes: peppa,
        phrasesReviewed: phrases,
        selfRating: rating,
        notes,
        watchedEpisodeIds: JSON.stringify(watchedIds),
      });
      // 선택된 에피소드에 대해 시청 카운트 +1 (이미 다른 날에 포함되지 않은 경우)
      const existing = logs.find((l) => l.date === date);
      let prevIds: number[] = [];
      try {
        prevIds = JSON.parse(existing?.watchedEpisodeIds || "[]");
      } catch {}
      const newlyAdded = watchedIds.filter((id) => !prevIds.includes(id));
      for (const epId of newlyAdded) {
        const ep = peppaList.find((p) => p.id === epId);
        if (!ep) continue;
        await apiRequest("PATCH", `/api/peppa/${epId}`, {
          watchedCount: ep.watchedCount + 1,
          status: ep.status === "pending" ? "watching" : ep.status,
          lastStudiedAt: date,
        });
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/peppa"] });
      toast({ title: "저장되었습니다", description: `${date} 학습 기록이 반영되었습니다.` });
    },
    onError: (e: any) => {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/study-logs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-logs"] });
      toast({ title: "삭제되었습니다" });
    },
  });

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  return (
    <div className="px-5 sm:px-8 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">일일 학습 기록</h1>
        <p className="text-sm text-muted-foreground mt-0.5">날짜별 리스닝/쉐도잉/회화 시간과 학습 내용을 기록해 주세요.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">{format(parseISO(date), "yyyy년 M월 d일 (EEE)", { locale: ko })} 기록</CardTitle>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <Input
                data-testid="input-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => onDateChange(e.target.value)}
                className="h-9 w-44"
              />
            </div>
          </div>
          <CardDescription>
            {existing ? "기존 기록을 수정합니다" : "새 기록을 작성합니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <NumField label="리스닝 (분)" value={listening} onChange={setListening} testId="input-listening" />
            <NumField label="쉐도잉 (분)" value={shadowing} onChange={setShadowing} testId="input-shadowing" />
            <NumField label="회화 (분)" value={conversation} onChange={setConversation} testId="input-conversation" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <NumField label="토익 문장 연습 (개)" value={toeic} onChange={setToeic} testId="input-toeic-count" />
            <NumField label="페파피그 에피소드 (편)" value={peppa} onChange={setPeppa} testId="input-peppa-count" />
            <NumField label="복습한 표현 (개)" value={phrases} onChange={setPhrases} testId="input-phrases-count" />
          </div>

          {/* 페파피그 에피소드 체크 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Tv2 className="size-3.5" />
                오늘 확인한 페파피그 에피소드 <span className="text-muted-foreground">({watchedIds.length}편)</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowEpisodePicker((v) => !v)}
                data-testid="button-toggle-episode-picker"
              >
                {showEpisodePicker ? "닫기" : "에피소드 선택"}
              </Button>
            </div>

            {watchedIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-md border bg-muted/30">
                {watchedIds.map((id) => {
                  const ep = peppaList.find((p) => p.id === id);
                  if (!ep) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1.5 pr-1"
                      data-testid={`chip-episode-${id}`}
                    >
                      <span className="tabular text-[10px]">
                        S{ep.season}E{String(ep.episode).padStart(2, "0")}
                      </span>
                      <span className="text-xs">{ep.titleEn}</span>
                      <a
                        href={ep.videoUrl || peppaVideoUrl(ep.season, ep.episode, ep.titleEn)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                        title="영상 열기"
                      >
                        <Play className="size-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleEpisode(id)}
                        className="hover:text-destructive"
                        title="제거"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {showEpisodePicker && (
              <div className="border rounded-md max-h-72 overflow-y-auto">
                {peppaList.map((ep) => {
                  const checked = watchedIds.includes(ep.id);
                  return (
                    <label
                      key={ep.id}
                      className={`flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0 cursor-pointer hover-elevate ${checked ? "bg-primary/5" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEpisode(ep.id)}
                        className="size-3.5 accent-primary"
                        data-testid={`checkbox-episode-${ep.id}`}
                      />
                      <Badge variant="outline" className="tabular text-[10px] px-1.5 py-0 shrink-0">
                        S{ep.season}E{String(ep.episode).padStart(2, "0")}
                      </Badge>
                      <span className="flex-1 truncate">{ep.titleEn}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">{ep.titleKo}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">자체 평가 (오늘의 컨디션)</Label>
            <div className="flex items-center gap-3">
              <Slider
                data-testid="slider-rating"
                value={[rating]}
                onValueChange={(v) => setRating(v[0])}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`size-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">메모</Label>
            <Textarea
              data-testid="input-notes"
              placeholder="오늘 배운 표현, 인상 깊은 문장, 약점 등을 기록해 보세요."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              총 학습 <span className="tabular font-semibold text-foreground">{listening + shadowing + conversation}</span>분
            </div>
            <Button
              data-testid="button-save-log"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="gap-1.5"
            >
              <Save className="size-4" />
              {saveMut.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 기록 (최대 30일)</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 기록이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {sortedLogs.map((l) => (
                <div
                  key={l.id}
                  data-testid={`row-log-${l.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-md border hover-elevate"
                >
                  <div className="text-xs tabular w-24 text-muted-foreground">
                    {format(parseISO(l.date), "M.d (EEE)", { locale: ko })}
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-3 text-xs">
                    <span className="tabular">리 {l.listeningMin}<span className="text-muted-foreground">분</span></span>
                    <span className="tabular">쉐 {l.shadowingMin}<span className="text-muted-foreground">분</span></span>
                    <span className="tabular">회 {l.conversationMin}<span className="text-muted-foreground">분</span></span>
                  </div>
                  <div className="text-xs text-muted-foreground tabular w-16 text-right">
                    합 {totalMin(l)}분
                  </div>
                  <button
                    data-testid={`button-edit-${l.id}`}
                    onClick={() => onDateChange(l.date)}
                    className="text-xs text-primary hover:underline px-2 py-1 rounded-md hover-elevate"
                    title="이 날짜로 편집"
                  >
                    편집
                  </button>
                  <button
                    data-testid={`button-delete-${l.id}`}
                    onClick={() => deleteMut.mutate(l.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover-elevate"
                    title="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  testId?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange(Math.max(0, value - 5))} type="button">
          −
        </Button>
        <Input
          data-testid={testId}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-9 text-center tabular"
        />
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange(value + 5)} type="button">
          +
        </Button>
      </div>
    </div>
  );
}
