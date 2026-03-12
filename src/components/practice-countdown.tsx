"use client";

import { useEffect, useMemo, useState } from "react";
import { usePracticeHub } from "@/components/practice-hub-provider";

type TimerMode = "idle" | "running" | "paused" | "finished";

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getModeLabel(mode: TimerMode) {
  if (mode === "running") {
    return "正在计时";
  }

  if (mode === "paused") {
    return "已暂停";
  }

  if (mode === "finished") {
    return "已到时";
  }

  return "待开始";
}

export function PracticeCountdown() {
  const { timerDurationMinutes, setTimerDurationMinutes } = usePracticeHub();
  const [durationDraft, setDurationDraft] = useState(String(timerDurationMinutes));
  const [remainingSeconds, setRemainingSeconds] = useState(timerDurationMinutes * 60);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [targetTime, setTargetTime] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== "running" || targetTime === null) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      setRemainingSeconds(nextSeconds);

      if (nextSeconds === 0) {
        setMode("finished");
        setTargetTime(null);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [mode, targetTime]);

  const totalSeconds = useMemo(() => {
    const parsed = Number(durationDraft);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return timerDurationMinutes * 60;
    }

    return Math.round(parsed) * 60;
  }, [durationDraft, timerDurationMinutes]);
  const displaySeconds =
    mode === "running" || mode === "paused" || mode === "finished"
      ? remainingSeconds
      : totalSeconds;

  const ratio = totalSeconds > 0 ? displaySeconds / totalSeconds : 0;
  const progressWidth = `${Math.max(6, Math.round(ratio * 100))}%`;
  const isUrgent = ratio <= 0.25;

  function applyDuration(minutes: string | number) {
    const normalized = setTimerDurationMinutes(minutes);
    setDurationDraft(String(normalized));
    setRemainingSeconds(normalized * 60);
    setTargetTime(null);
    setMode("idle");
  }

  function startTimer() {
    const normalized = setTimerDurationMinutes(durationDraft);
    setDurationDraft(String(normalized));
    setRemainingSeconds(normalized * 60);
    setTargetTime(Date.now() + normalized * 60 * 1000);
    setMode("running");
  }

  function pauseTimer() {
    if (targetTime === null) {
      return;
    }

    setRemainingSeconds(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)));
    setTargetTime(null);
    setMode("paused");
  }

  function resumeTimer() {
    if (remainingSeconds <= 0) {
      startTimer();
      return;
    }

    setTargetTime(Date.now() + remainingSeconds * 1000);
    setMode("running");
  }

  function resetTimer() {
    applyDuration(durationDraft);
  }

  return (
    <section className="panel rounded-[32px] p-5">
      <p className="eyebrow">Practice Timer</p>
      <h2 className="display-title mt-2 text-3xl leading-tight text-ink">限时刷题倒计时</h2>

      <div className="mt-5 rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(255,252,247,0.95),rgba(248,241,232,0.88))] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{getModeLabel(mode)}</p>
            <p className="mt-1 text-xs leading-6 text-muted">刷题前设定时长，专门用来卡节奏。</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isUrgent
                ? "bg-accent text-white"
                : "border border-line bg-white/78 text-muted"
            }`}
          >
            {Math.max(0, Math.round(ratio * 100))}% 剩余
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="numeric-display display-title text-5xl leading-none text-ink">
              {formatClock(displaySeconds)}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {mode === "finished"
                ? "时间到，先停笔看正确率和卡点。"
                : "适合做资料分析、判断推理或整套小练习。"}
            </p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-background-strong">
          <div
            className={`h-full rounded-full ${
              isUrgent
                ? "bg-[linear-gradient(90deg,#b65f33,#8c3f18)]"
                : "bg-[linear-gradient(90deg,#203449,#597062)]"
            }`}
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[15, 25, 40].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => applyDuration(minutes)}
              className="rounded-full border border-line bg-white/72 px-4 py-2 text-sm text-ink transition hover:border-accent hover:text-accent"
            >
              {minutes} 分钟
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="300"
            step="1"
            value={durationDraft}
            onChange={(event) => setDurationDraft(event.target.value)}
            className="w-full rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
            placeholder="输入分钟数"
          />
          <button
            type="button"
            onClick={() => applyDuration(durationDraft)}
            className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/70"
          >
            设定
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {mode === "running" ? (
            <button
              type="button"
              onClick={pauseTimer}
              className="rounded-full border border-line bg-white/78 px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              暂停
            </button>
          ) : (
            <button
              type="button"
              onClick={mode === "paused" ? resumeTimer : startTimer}
              className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              {mode === "paused" ? "继续" : "开始"}
            </button>
          )}

          <button
            type="button"
            onClick={resetTimer}
            className="rounded-full border border-line bg-white/78 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white"
          >
            重置
          </button>

          <div className="flex items-center justify-center rounded-full border border-dashed border-line px-4 py-3 text-xs text-muted">
            当前设定 {timerDurationMinutes} 分钟
          </div>
        </div>
      </div>
    </section>
  );
}
