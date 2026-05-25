import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings = null } = useQuery<Settings | null>({ queryKey: ["/api/settings"] });

  const [form, setForm] = useState<Partial<Settings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        startDate: form.startDate,
        endDate: form.endDate,
        dailyListeningTarget: form.dailyListeningTarget,
        dailyShadowingTarget: form.dailyShadowingTarget,
        dailyConversationTarget: form.dailyConversationTarget,
        weeklyToeicTarget: form.weeklyToeicTarget,
        weeklyPeppaTarget: form.weeklyPeppaTarget,
        goalLevel: form.goalLevel,
      };
      const res = await apiRequest("POST", "/api/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "설정이 저장되었습니다" });
    },
  });

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">학습 설정</h1>
        <p className="text-sm text-muted-foreground mt-0.5">학습 기간과 일일·주간 목표량을 조정하십시오.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">학습 기간</CardTitle>
          <CardDescription>전체 8개월 일정을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">시작일</Label>
            <Input
              data-testid="input-start-date"
              type="date"
              value={form.startDate ?? ""}
              onChange={(e) => set("startDate", e.target.value)}
              className="h-9 mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs">종료일</Label>
            <Input
              data-testid="input-end-date"
              type="date"
              value={form.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value)}
              className="h-9 mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">목표 회화 레벨</Label>
            <Input
              data-testid="input-goal-level"
              value={form.goalLevel ?? ""}
              onChange={(e) => set("goalLevel", e.target.value)}
              className="h-9 mt-1.5"
              placeholder="예: 일반회화 (CEFR B1)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">일일 목표 (분)</CardTitle>
          <CardDescription>매일 학습할 시간을 활동별로 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <NumberField
            label="리스닝"
            value={form.dailyListeningTarget ?? 0}
            onChange={(v) => set("dailyListeningTarget", v)}
            testId="input-target-listening"
          />
          <NumberField
            label="쉐도잉"
            value={form.dailyShadowingTarget ?? 0}
            onChange={(v) => set("dailyShadowingTarget", v)}
            testId="input-target-shadowing"
          />
          <NumberField
            label="회화"
            value={form.dailyConversationTarget ?? 0}
            onChange={(v) => set("dailyConversationTarget", v)}
            testId="input-target-conversation"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">주간 목표</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <NumberField
            label="토익 문장 (개/주)"
            value={form.weeklyToeicTarget ?? 0}
            onChange={(v) => set("weeklyToeicTarget", v)}
            testId="input-target-toeic"
          />
          <NumberField
            label="페파피그 (편/주)"
            value={form.weeklyPeppaTarget ?? 0}
            onChange={(v) => set("weeklyPeppaTarget", v)}
            testId="input-target-peppa"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          data-testid="button-save-settings"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {saveMut.isPending ? "저장 중..." : "설정 저장"}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
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
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        data-testid={testId}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-9 mt-1.5 tabular"
      />
    </div>
  );
}
