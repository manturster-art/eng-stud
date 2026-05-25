import { useMemo } from "react";
import type { StudyLog, Settings } from "@shared/schema";
import { fmt, totalActivityMin, dailyTargetMin } from "@/lib/utils-study";
import { parseISO, addDays, differenceInCalendarDays, format } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 잔디 학습 캘린더 (GitHub 스타일)
 * - 학습 기간 전체를 주(가로) × 요일(세로)로 시각화
 * - 학습량에 따라 색상 단계: 0, 1-30, 31-60, 61-89, 90+ 분
 */
export function StudyHeatmap({
  logs,
  settings,
}: {
  logs: StudyLog[];
  settings: Settings | null;
}) {
  const cells = useMemo(() => {
    if (!settings) return null;
    const start = parseISO(settings.startDate);
    const end = parseISO(settings.endDate);
    const target = dailyTargetMin(settings);
    const totalDays = differenceInCalendarDays(end, start) + 1;

    // 시작일이 속한 주의 월요일부터 시작 (정렬을 위함)
    const startDow = start.getDay(); // 0=일,1=월
    const offset = startDow === 0 ? 6 : startDow - 1;
    const gridStart = addDays(start, -offset);
    const totalGridDays = totalDays + offset;
    const weeks = Math.ceil(totalGridDays / 7);

    const logMap = new Map(logs.map((l) => [l.date, totalActivityMin(l)]));

    const grid: { date: string; minutes: number; level: number; outOfRange: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: typeof grid[0] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = addDays(gridStart, w * 7 + d);
        const iso = fmt(cellDate);
        const minutes = logMap.get(iso) ?? 0;
        const outOfRange = cellDate < start || cellDate > end;
        let level = 0;
        if (!outOfRange) {
          if (minutes >= target * 1.2) level = 4;
          else if (minutes >= target) level = 3;
          else if (minutes >= target * 0.5) level = 2;
          else if (minutes > 0) level = 1;
        }
        col.push({ date: iso, minutes, level, outOfRange });
      }
      grid.push(col);
    }
    return { grid, target };
  }, [logs, settings]);

  if (!cells) return null;

  const levelClass = [
    "bg-muted/40", // 0
    "bg-primary/20",
    "bg-primary/40",
    "bg-primary/70",
    "bg-primary",
  ];

  // 월 라벨: 매 주 시작일이 새로운 달이면 표시
  const monthLabels = cells.grid.map((col, i) => {
    const date = parseISO(col[0].date);
    const prev = i > 0 ? parseISO(cells.grid[i - 1][0].date) : null;
    const showLabel = !prev || date.getMonth() !== prev.getMonth();
    return showLabel ? format(date, "M월", { locale: ko }) : "";
  });

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        <div className="flex flex-col gap-[3px] pr-1.5 text-[9px] text-muted-foreground tabular justify-around">
          <span>월</span>
          <span>수</span>
          <span>금</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-[3px] text-[9px] text-muted-foreground tabular h-3">
            {monthLabels.map((m, i) => (
              <span key={i} className="w-[10px] text-left">
                {m}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {cells.grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell, j) => (
                  <div
                    key={j}
                    className={`w-[10px] h-[10px] rounded-sm ${
                      cell.outOfRange ? "bg-transparent" : levelClass[cell.level]
                    }`}
                    title={
                      cell.outOfRange
                        ? ""
                        : `${cell.date} · ${cell.minutes}분 학습`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular pl-6">
        <span>적음</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`size-2.5 rounded-sm ${levelClass[l]}`} />
        ))}
        <span>많음 (목표 {cells.target}분 이상)</span>
      </div>
    </div>
  );
}
