"use client";

import { useMemo, useState } from "react";
import { usePracticeHub } from "@/components/practice-hub-provider";
import { useStudyTracker } from "@/components/study-tracker-provider";

type CalendarCell = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatSelectedLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(dateKey));
}

function createCalendarCells(monthDate: Date): CalendarCell[] {
  const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (startOfMonth.getDay() + 6) % 7;
  const firstVisible = new Date(startOfMonth);
  firstVisible.setDate(startOfMonth.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstVisible);
    cellDate.setDate(firstVisible.getDate() + index);

    return {
      dateKey: toDateKey(cellDate),
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthDate.getMonth(),
    };
  });
}

function formatAccuracy(totalQuestions: number | null, correctQuestions: number | null) {
  if (!totalQuestions || correctQuestions === null) {
    return "--";
  }

  const accuracy = Math.round((correctQuestions / totalQuestions) * 1000) / 10;
  return `${Number.isInteger(accuracy) ? accuracy : accuracy.toFixed(1)}%`;
}

export function SidebarStudyCalendar() {
  const { todayKey, dailyHoursByDate, checkInDates } = useStudyTracker();
  const { dailyPracticeByDate } = usePracticeHub();
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = parseDateKey(todayKey);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const checkInSet = useMemo(() => new Set(checkInDates), [checkInDates]);
  const cells = useMemo(() => createCalendarCells(monthCursor), [monthCursor]);
  const selectedPractice = dailyPracticeByDate[selectedDate];
  const selectedHours = dailyHoursByDate[selectedDate] ?? "";

  return (
    <section className="paper-note relative overflow-hidden rounded-[28px] border border-line/70 p-4">
      <div className="paper-tape paper-tape-left" />
      <div className="paper-tape paper-tape-right" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Study Calendar</p>
          <h2 className="display-title mt-2 text-[1.35rem] leading-tight text-ink">
            学习日历
          </h2>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            className="rounded-full border border-line bg-white/78 px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            上月
          </button>
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            className="rounded-full border border-line bg-white/78 px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            下月
          </button>
        </div>
      </div>

      <p className="calendar-note-title mt-3 text-sm text-muted">{formatMonthLabel(monthCursor)}</p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white/76 px-2 py-1 text-[10px] text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-[#315d85] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
          学时
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white/76 px-2 py-1 text-[10px] text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ce6a35] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
          刷题
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white/76 px-2 py-1 text-[10px] text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-[#62804f] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
          打卡
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] tracking-[0.18em] text-muted">
        {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
          <div key={weekday}>{weekday}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const practice = dailyPracticeByDate[cell.dateKey];
          const hasPractice = Boolean(practice?.totalQuestions);
          const hasHours = Boolean(dailyHoursByDate[cell.dateKey]);
          const isCheckedIn = checkInSet.has(cell.dateKey);
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDate;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate(cell.dateKey)}
              className={`rounded-[16px] border px-1 py-2 text-center transition ${
                isSelected
                  ? "border-accent/40 bg-accent/12 shadow-[0_10px_24px_rgba(182,95,51,0.12)]"
                  : cell.isCurrentMonth
                    ? "border-line/60 bg-white/70 hover:border-sage/40"
                    : "border-transparent bg-transparent text-muted/55"
              }`}
            >
              <div
                className={`calendar-note-title text-sm ${
                  isToday ? "text-accent" : cell.isCurrentMonth ? "text-ink" : "text-muted/55"
                }`}
                style={{
                  transform: `rotate(${cell.dayNumber % 2 === 0 ? -2.8 : 2.1}deg)`,
                }}
              >
                {cell.dayNumber}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1">
                {hasHours ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#315d85] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
                ) : null}
                {hasPractice ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ce6a35] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
                ) : null}
                {isCheckedIn ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#62804f] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-dashed border-line bg-white/72 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="display-title text-lg text-ink">
              {formatSelectedLabel(selectedDate)}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">点选任意日期查看当天的学习痕迹。</p>
          </div>
          <div className="calendar-note-title text-3xl text-accent">
            {selectedDate.slice(-2)}
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-[18px] bg-background/72 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">学习时长</p>
            <p className="numeric-display mt-2 text-lg font-semibold text-ink">
              {selectedHours ? `${selectedHours}h` : "--"}
            </p>
          </div>

          <div className="rounded-[18px] bg-background/72 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">刷题正确率</p>
            <p className="numeric-display mt-2 text-lg font-semibold text-ink">
              {formatAccuracy(
                selectedPractice?.totalQuestions ?? null,
                selectedPractice?.correctQuestions ?? null,
              )}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-6 text-muted">
          {checkInSet.has(selectedDate) ? "这一天已经打卡。" : "这一天还没打卡。"}
          {selectedPractice?.totalQuestions
            ? ` 共做 ${selectedPractice.totalQuestions} 题，正确 ${selectedPractice.correctQuestions ?? 0} 题。`
            : " 暂未录入刷题数据。"}
        </p>
      </div>
    </section>
  );
}
