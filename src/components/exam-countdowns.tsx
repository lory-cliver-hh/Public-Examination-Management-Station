"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExamCountdown } from "@/lib/mock-data";
import { useCountdowns } from "@/components/countdown-provider";

function formatExamCountdown(date: string, now: number) {
  const diff = new Date(date).getTime() - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { days, hours, expired: false };
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date));
}

const emphasisStyles: Record<ExamCountdown["emphasis"], string> = {
  primary:
    "border-accent/30 bg-[linear-gradient(135deg,rgba(182,95,51,0.16),rgba(255,249,243,0.88))]",
  secondary:
    "border-sage/30 bg-[linear-gradient(135deg,rgba(89,112,98,0.14),rgba(255,250,244,0.88))]",
  supporting:
    "border-navy/20 bg-[linear-gradient(135deg,rgba(32,52,73,0.10),rgba(255,251,245,0.88))]",
};

export function ExamCountdowns() {
  const { countdowns: sourceCountdowns, hydrated } = useCountdowns();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const countdownCards = useMemo(
    () =>
      sourceCountdowns.map((item) => ({
        ...item,
        ...formatExamCountdown(item.date, now),
      })),
    [sourceCountdowns, now],
  );

  return (
    <section className="panel relative overflow-hidden rounded-[32px] p-6">
      <div className="absolute right-5 top-5 h-24 w-24 rounded-full border border-accent/20 bg-accent/10 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Countdown</p>
            <h2 className="display-title mt-2 text-3xl leading-tight text-ink">
              目标考试倒计时
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {countdownCards.map((exam) => (
            <article
              key={exam.id}
              className={`rounded-[26px] border p-4 ${emphasisStyles[exam.emphasis]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">{exam.name}</p>
                  <p className="text-xs leading-6 text-muted">{exam.note}</p>
                </div>
                <div className="text-right">
                  <div className="numeric-display display-title text-4xl leading-none text-ink">
                    {hydrated ? (exam.expired ? "0" : exam.days) : "--"}
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.28em] text-muted">
                    Days
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-4 text-xs text-muted">
                <span>{hydrated ? formatDateLabel(exam.date) : "正在读取"}</span>
                <span className="numeric-display">
                  {hydrated
                    ? exam.expired
                      ? "已到期"
                      : `剩余 ${exam.hours} 小时`
                    : "--"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
