"use client";

import { useMemo, useState } from "react";
import { useLearningRecords } from "@/components/learning-records-provider";
import { MistakeBoard } from "@/components/mistake-board";
import { usePracticeHub } from "@/components/practice-hub-provider";
import { weeklyReview } from "@/lib/mock-data";

const statusStyle = {
  学习中: "border-accent/30 bg-accent/10 text-accent-deep",
  已完成: "border-sage/30 bg-sage/10 text-sage",
} as const;
const DEFAULT_VISIBLE_PRACTICE_DAYS = 7;

function formatPracticeAccuracy(totalQuestions: number | null, wrongQuestions: number | null) {
  if (!totalQuestions || wrongQuestions === null) {
    return "--";
  }

  const correctQuestions = Math.max(totalQuestions - Math.min(wrongQuestions, totalQuestions), 0);
  const accuracy = Math.round((correctQuestions / totalQuestions) * 1000) / 10;
  return `${Number.isInteger(accuracy) ? accuracy : accuracy.toFixed(1)}%`;
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "尚未更新";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚未更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function RecordsPage() {
  const [showAllPracticeRecords, setShowAllPracticeRecords] = useState(false);
  const { records, hydrated } = useLearningRecords();
  const {
    dailyPracticeByDate,
    practiceDates,
    hydrated: practiceHydrated,
  } = usePracticeHub();

  const groupedRecords = useMemo(
    () =>
      Object.entries(
        records.reduce<Record<string, typeof records>>((accumulator, record) => {
          accumulator[record.date] ??= [];
          accumulator[record.date].push(record);
          return accumulator;
        }, {}),
      ).sort((left, right) => right[0].localeCompare(left[0])),
    [records],
  );
  const practiceRecords = useMemo(
    () =>
      practiceDates
        .map((date) => ({
          date,
          ...dailyPracticeByDate[date],
        }))
        .filter((item) => item.totalQuestions !== null || item.wrongQuestions !== null),
    [dailyPracticeByDate, practiceDates],
  );
  const visiblePracticeRecords = useMemo(
    () =>
      showAllPracticeRecords
        ? practiceRecords
        : practiceRecords.slice(0, DEFAULT_VISIBLE_PRACTICE_DAYS),
    [practiceRecords, showAllPracticeRecords],
  );
  const hiddenPracticeRecordCount = Math.max(
    practiceRecords.length - DEFAULT_VISIBLE_PRACTICE_DAYS,
    0,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="panel rounded-[34px] p-6 lg:p-8">
          <p className="eyebrow">Study Records</p>
          <h1 className="display-title mt-3 text-4xl leading-tight text-ink md:text-[3.1rem]">
            课程流水、刷题数据和错题截图都会沉淀到这里。
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted md:text-base">
            点击“打开夸克继续学习”会记录课程进度，首页保存的刷题数据会按日期归档，错题截图则会保留原图后存到本地错题本。
          </p>
        </section>

        <section className="panel rounded-[30px] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Practice Records</p>
              <h2 className="display-title mt-2 text-3xl text-ink">刷题记录</h2>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-muted md:items-end">
              <p>默认展示最近 7 天，历史刷题记录仍会保留。</p>
              {practiceRecords.length > DEFAULT_VISIBLE_PRACTICE_DAYS ? (
                <button
                  type="button"
                  onClick={() => setShowAllPracticeRecords((current) => !current)}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/40 hover:text-accent-deep"
                >
                  {showAllPracticeRecords
                    ? "收起历史记录"
                    : `查看全部 ${practiceRecords.length} 天记录`}
                </button>
              ) : null}
            </div>
          </div>

          {!practiceHydrated ? (
            <div className="mt-5 rounded-[24px] border border-line bg-white/60 px-5 py-4 text-sm text-muted">
              正在读取刷题记录...
            </div>
          ) : practiceRecords.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-line bg-white/60 px-5 py-4 text-sm leading-7 text-muted">
              还没有刷题记录。去总览页录入总题量和错题量后，这里会自动出现按日期整理的记录。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {hiddenPracticeRecordCount > 0 && !showAllPracticeRecords ? (
                <div className="rounded-[24px] border border-dashed border-line bg-white/60 px-5 py-4 text-sm leading-7 text-muted">
                  已折叠更早的 {hiddenPracticeRecordCount} 天刷题记录，需要时可展开查看全部。
                </div>
              ) : null}

              <div className="grid gap-3">
                {visiblePracticeRecords.map((item, index) => {
                  const safeTotal = item.totalQuestions ?? item.wrongQuestions ?? 0;
                  const wrongQuestions =
                    item.wrongQuestions === null
                    ? null
                    : Math.min(item.wrongQuestions, safeTotal);
                const correctQuestions =
                  wrongQuestions === null ? null : Math.max(safeTotal - wrongQuestions, 0);

                  return (
                    <article
                      key={item.date}
                      className={`rounded-[26px] border p-5 ${
                        index === 0
                          ? "border-accent/30 bg-[linear-gradient(135deg,rgba(182,95,51,0.12),rgba(255,251,245,0.92))]"
                          : "border-line bg-white/72"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="eyebrow">Practice Day</p>
                          <h3 className="display-title mt-2 text-2xl text-ink">
                            {formatDateLabel(item.date)}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-muted">
                            最近更新：{formatUpdatedAt(item.updatedAt)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-line bg-background/72 px-4 py-3 text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">
                            正确率
                          </p>
                          <p className="numeric-display mt-2 text-3xl font-semibold text-ink">
                            {formatPracticeAccuracy(item.totalQuestions, item.wrongQuestions)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[18px] bg-background/72 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">
                            总题量
                          </p>
                          <p className="numeric-display mt-2 text-xl font-semibold text-ink">
                            {item.totalQuestions ?? "--"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-background/72 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">
                            正确题量
                          </p>
                          <p className="numeric-display mt-2 text-xl font-semibold text-ink">
                            {correctQuestions ?? "--"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-background/72 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">
                            错题数
                          </p>
                          <p className="numeric-display mt-2 text-xl font-semibold text-ink">
                            {wrongQuestions ?? "--"}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <MistakeBoard />

        <section className="panel rounded-[30px] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Course Timeline</p>
              <h2 className="display-title mt-2 text-3xl text-ink">课程记录</h2>
            </div>
            <p className="text-sm text-muted">只保留最近 7 天的课程状态变更。</p>
          </div>
        </section>

        {!hydrated ? (
          <section className="panel rounded-[30px] p-6">
            <p className="text-sm text-muted">正在读取学习记录...</p>
          </section>
        ) : groupedRecords.length === 0 ? (
          <section className="panel rounded-[30px] p-6">
            <p className="eyebrow">No Records</p>
            <h2 className="display-title mt-2 text-3xl text-ink">还没有课程记录</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              去课程页点击一节课“打开夸克继续学习”，这里就会自动出现对应记录。超过 7 天的旧记录会自动清理。
            </p>
          </section>
        ) : (
          groupedRecords.map(([date, dateRecords]) => (
            <section key={date} className="panel rounded-[30px] p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Date</p>
                  <h2 className="display-title mt-2 text-3xl text-ink">{date}</h2>
                </div>
                <p className="text-sm text-muted">共 {dateRecords.length} 条课程记录</p>
              </div>

              <div className="mt-5 space-y-3">
                {dateRecords.map((record, index) => (
                  <article
                    key={record.id}
                    className={`rounded-[26px] border p-4 ${
                      index === 0
                        ? "border-navy/20 bg-[linear-gradient(135deg,rgba(32,52,73,0.10),rgba(255,251,245,0.88))]"
                        : "border-line bg-white/72"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-navy px-3 py-1 text-xs font-medium text-white">
                            {record.timeLabel}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle[record.status]}`}
                          >
                            {record.status}
                          </span>
                          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                            {record.duration}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-ink">{record.lesson}</h3>
                        <p className="text-sm leading-7 text-muted">{record.outcome}</p>
                      </div>

                      <div className="max-w-sm rounded-[22px] border border-line bg-background/70 px-4 py-3 text-sm leading-7 text-muted">
                        {record.note}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <aside className="space-y-4">
        <section className="panel rounded-[30px] p-5">
          <p className="eyebrow">Weekly Review</p>
          <h2 className="display-title mt-2 text-3xl text-ink">本周复盘</h2>

          <ul className="mt-5 space-y-3">
            {weeklyReview.map((item, index) => (
              <li
                key={item}
                className={`rounded-[24px] border px-4 py-4 text-sm leading-7 ${
                  index === 0
                    ? "border-accent/30 bg-accent/10 text-ink"
                    : "border-line bg-white/72 text-muted"
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-muted rounded-[30px] p-5">
          <p className="eyebrow">Data Flow</p>
          <h2 className="display-title mt-2 text-2xl text-ink">自动沉淀规则</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>打开夸克继续学习：自动记录为“学习中”。</p>
            <p>点击标记已完成：自动记录为“已完成”。</p>
            <p>总览页保存刷题数据：按日期沉淀到刷题记录。</p>
            <p>错题截图：保留原图后保存到浏览器本地 IndexedDB，不走 localStorage。</p>
            <p>课程记录：只保留最近 7 天，旧记录会自动清理。</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
