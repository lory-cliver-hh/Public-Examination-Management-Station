"use client";

import { useMemo } from "react";
import { useLearningRecords } from "@/components/learning-records-provider";
import { weeklyReview } from "@/lib/mock-data";

const statusStyle = {
  学习中: "border-accent/30 bg-accent/10 text-accent-deep",
  已完成: "border-sage/30 bg-sage/10 text-sage",
} as const;

export default function RecordsPage() {
  const { records, hydrated } = useLearningRecords();

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

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="panel rounded-[34px] p-6 lg:p-8">
          <p className="eyebrow">Study Records</p>
          <h1 className="display-title mt-3 text-4xl leading-tight text-ink md:text-[3.1rem]">
            课程状态变更会自动沉淀到这里。
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted md:text-base">
            点击“打开夸克继续学习”后会记录一条开始学习的事件，点击“标记已完成”后会再追加一条完成记录。
          </p>
        </section>

        {!hydrated ? (
          <section className="panel rounded-[30px] p-6">
            <p className="text-sm text-muted">正在读取学习记录...</p>
          </section>
        ) : groupedRecords.length === 0 ? (
          <section className="panel rounded-[30px] p-6">
            <p className="eyebrow">No Records</p>
            <h2 className="display-title mt-2 text-3xl text-ink">还没有学习记录</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              去课程页点击一节课“打开夸克继续学习”，这里就会自动出现对应记录。
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
                <p className="text-sm text-muted">共 {dateRecords.length} 条学习记录</p>
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
          <p className="eyebrow">Record Flow</p>
          <h2 className="display-title mt-2 text-2xl text-ink">自动记录规则</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>打开夸克继续学习：自动记录为“学习中”。</p>
            <p>点击标记已完成：自动记录为“已完成”。</p>
            <p>重置为未开始：不追加记录。</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
