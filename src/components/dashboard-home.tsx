"use client";

import { useEffect, useMemo, useState } from "react";
import { ExamCountdowns } from "@/components/exam-countdowns";
import { MockExamBoard } from "@/components/mock-exam-board";
import { PoliticalBriefing } from "@/components/political-briefing";
import { PracticeCountdown } from "@/components/practice-countdown";
import { useCourses } from "@/components/course-provider";
import { usePracticeHub } from "@/components/practice-hub-provider";
import { useStudyTracker } from "@/components/study-tracker-provider";
import {
  getCourseSummary,
  getFocusLessons,
  getSubjectSnapshots,
} from "@/lib/dashboard-analytics";
import { infoUpdatePlaceholder } from "@/lib/mock-data";

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function parseCountDraft(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed);
}

function getPracticeSummary(totalQuestions: number | null, correctQuestions: number | null) {
  const safeTotal = totalQuestions ?? correctQuestions ?? null;
  const safeCorrect =
    correctQuestions === null
      ? null
      : safeTotal === null
        ? correctQuestions
        : Math.min(correctQuestions, safeTotal);

  if (!safeTotal || safeCorrect === null) {
    return {
      accuracyLabel: "--",
      wrongQuestions: null,
      note: "录入今日总题量和正确题量后，这里会自动算出正确率。",
    };
  }

  const accuracy = Math.round((safeCorrect / safeTotal) * 1000) / 10;

  return {
    accuracyLabel: `${Number.isInteger(accuracy) ? accuracy : accuracy.toFixed(1)}%`,
    wrongQuestions: Math.max(safeTotal - safeCorrect, 0),
    note: `共做 ${safeTotal} 题，正确 ${safeCorrect} 题，错误 ${Math.max(
      safeTotal - safeCorrect,
      0,
    )} 题。`,
  };
}

export function DashboardHome() {
  const { catalog, setLessonStatus, hydrated: courseHydrated } = useCourses();
  const {
    todayPractice,
    saveTodayPractice,
    hydrated: practiceHydrated,
  } = usePracticeHub();
  const {
    todayKey,
    todayHours,
    setTodayHours,
    checkInDates,
    hasCheckedInToday,
    streak,
    latestCheckIn,
    toggleTodayCheckIn,
    hydrated: trackerHydrated,
  } = useStudyTracker();
  const [hourDraft, setHourDraft] = useState("");
  const [practiceDraft, setPracticeDraft] = useState({
    totalQuestions: "",
    correctQuestions: "",
  });

  useEffect(() => {
    setHourDraft(todayHours);
  }, [todayHours]);

  useEffect(() => {
    setPracticeDraft({
      totalQuestions:
        todayPractice.totalQuestions === null ? "" : String(todayPractice.totalQuestions),
      correctQuestions:
        todayPractice.correctQuestions === null
          ? ""
          : String(todayPractice.correctQuestions),
    });
  }, [todayPractice.correctQuestions, todayPractice.totalQuestions]);

  const courseSummary = useMemo(() => getCourseSummary(catalog), [catalog]);
  const focusLessons = useMemo(() => getFocusLessons(catalog), [catalog]);
  const subjectSnapshots = useMemo(() => getSubjectSnapshots(catalog), [catalog]);
  const ready = courseHydrated && trackerHydrated;
  const progressWidth = `${Math.max(courseSummary.completionRate, 6)}%`;
  const parsedPracticeTotal = parseCountDraft(practiceDraft.totalQuestions);
  const parsedPracticeCorrect = parseCountDraft(practiceDraft.correctQuestions);
  const practiceSummary = useMemo(
    () => getPracticeSummary(parsedPracticeTotal, parsedPracticeCorrect),
    [parsedPracticeCorrect, parsedPracticeTotal],
  );
  const practiceWarning =
    parsedPracticeTotal !== null &&
    parsedPracticeCorrect !== null &&
    parsedPracticeCorrect > parsedPracticeTotal
      ? "正确题数会按总题量自动校正。"
      : null;
  const statLabelClass = "text-[15px] font-semibold tracking-[0.06em] text-muted";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="space-y-4">
        <section className="panel relative overflow-hidden rounded-[34px] p-6 lg:p-8">
          <div className="paper-grid absolute inset-0 opacity-30" />
          <div className="relative space-y-5">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="eyebrow">Dashboard</p>
                <span className="rounded-full border border-line bg-white/72 px-3 py-1 text-xs text-muted">
                  {formatDateLabel(todayKey)}
                </span>
              </div>
              <h1 className="display-title text-4xl leading-tight text-ink md:text-[3.2rem]">
                今天的学习面先盯住四件事：学时、打卡、刷题、课程推进。
              </h1>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,1fr)]">
              <article className="rounded-[26px] border border-accent/25 bg-[linear-gradient(135deg,rgba(182,95,51,0.15),rgba(255,251,246,0.95))] p-5 xl:row-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`whitespace-nowrap ${statLabelClass}`}>
                      今日刷题正确率
                    </p>
                    <p className="numeric-display display-title mt-4 text-[3.4rem] leading-none text-ink sm:text-[3.8rem]">
                      {practiceHydrated ? practiceSummary.accuracyLabel : "--"}
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-white/72 px-3 py-2 text-right">
                    <p className="text-[11px] tracking-[0.12em] text-muted">错题</p>
                    <p className="numeric-display mt-2 text-2xl font-semibold text-accent">
                      {practiceHydrated && practiceSummary.wrongQuestions !== null
                        ? practiceSummary.wrongQuestions
                        : "--"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted">{practiceSummary.note}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-muted">
                    <span className="font-semibold text-ink">总题量</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={practiceDraft.totalQuestions}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          totalQuestions: event.target.value,
                        }))
                      }
                      placeholder="例如 25"
                      className="w-full rounded-[18px] border border-line bg-white/76 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-muted">
                    <span className="font-semibold text-ink">正确题量</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={practiceDraft.correctQuestions}
                      onChange={(event) =>
                        setPracticeDraft((current) => ({
                          ...current,
                          correctQuestions: event.target.value,
                        }))
                      }
                      placeholder="例如 19"
                      className="w-full rounded-[18px] border border-line bg-white/76 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs leading-6 text-muted">
                    {practiceWarning ?? "适合记录纸质题本、平板练习或整套专项。"}
                  </p>
                  <button
                    type="button"
                    onClick={() => saveTodayPractice(practiceDraft)}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                  >
                    保存刷题数据
                  </button>
                </div>
              </article>

              <div className="space-y-3">
                <article className="rounded-[28px] border border-navy/12 bg-[linear-gradient(135deg,rgba(32,52,73,0.08),rgba(255,253,247,0.96))] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 xl:max-w-[240px]">
                      <p className={statLabelClass}>
                        今日学习时长
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        只记录今天的净学习时长。
                      </p>
                      <div className="mt-5 flex items-end gap-2">
                        <p className="numeric-display display-title text-[3.2rem] leading-none text-ink">
                          {ready ? (todayHours || "--") : "--"}
                        </p>
                        <span className="mb-1 text-lg font-semibold text-muted">h</span>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-line/70 bg-white/82 p-3 xl:w-[250px]">
                      <p className="mb-3 text-[11px] tracking-[0.12em] text-muted">手动记录</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={hourDraft}
                          onChange={(event) => setHourDraft(event.target.value)}
                          placeholder="输入小时数"
                          className="w-full rounded-[16px] border border-line bg-background/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setTodayHours(hourDraft)}
                          className="rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-[28px] border border-sage/20 bg-[linear-gradient(135deg,rgba(89,112,98,0.14),rgba(255,252,246,0.96))] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 xl:max-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={statLabelClass}>
                          连续打卡
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] ${
                            hasCheckedInToday
                              ? "border border-sage/30 bg-white/76 text-sage"
                              : "border border-accent/20 bg-white/76 text-accent"
                          }`}
                        >
                          {hasCheckedInToday ? "今日已打卡" : "待打卡"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        把节奏先守住，再谈拉长单日时长。
                      </p>
                      <div className="mt-5 flex items-end gap-2">
                        <p className="numeric-display display-title text-[3.2rem] leading-none text-ink">
                          {ready ? streak : "--"}
                        </p>
                        <span className="mb-1 text-lg font-semibold text-muted">天</span>
                      </div>
                    </div>

                    <div className="xl:w-[250px]">
                      <button
                        type="button"
                        onClick={toggleTodayCheckIn}
                        className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                          hasCheckedInToday
                            ? "border border-sage/30 bg-sage/10 text-sage hover:border-sage/50"
                            : "bg-accent text-white hover:bg-accent-deep"
                        }`}
                      >
                        {hasCheckedInToday ? "取消今日打卡" : "完成今日打卡"}
                      </button>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {ready
                          ? hasCheckedInToday
                            ? `最近一次打卡：${latestCheckIn ? formatDateLabel(latestCheckIn) : "今天"}`
                            : `今天还没打卡${latestCheckIn ? `，最近一次是 ${formatDateLabel(latestCheckIn)}` : ""}`
                          : "正在读取打卡记录"}
                      </p>
                      {checkInDates.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {checkInDates.slice(0, 4).map((date) => (
                            <span
                              key={date}
                              className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                            >
                              {formatShortDate(date)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </div>

              <article className="rounded-[26px] border border-line bg-white/72 p-5 xl:col-span-2">
                <p className={statLabelClass}>
                  课程完成率
                </p>
                <p className="numeric-display display-title mt-4 text-4xl leading-none text-ink">
                  {courseSummary.completedLessons} / {courseSummary.totalLessons}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-background-strong">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#203449,#b65f33)]"
                    style={{ width: progressWidth }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  已完成 {courseSummary.completionRate}% ，当前 {courseSummary.activeLessons} 节学习中，
                  {courseSummary.pendingLessons} 节未开始。
                </p>
              </article>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="panel rounded-[32px] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Today Focus</p>
                <h2 className="display-title mt-2 text-3xl leading-tight text-ink">
                  今日重点课程
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {focusLessons.map((item, index) => (
                <article
                  key={item.id}
                  className={`rounded-[28px] border p-4 transition md:p-5 ${
                    index === 0
                      ? "border-accent/30 bg-[linear-gradient(135deg,rgba(182,95,51,0.14),rgba(255,251,246,0.92))]"
                      : "border-line bg-white/70"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                          {item.module}
                        </span>
                        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold leading-8 text-ink">
                        {item.lesson}
                      </h3>
                      <p className="text-sm leading-7 text-muted">{item.note}</p>
                    </div>

                    {item.shareUrl ? (
                      <a
                        className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                        href={item.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (item.lessonStatus !== "已完成") {
                            setLessonStatus(item.id, "学习中");
                          }
                        }}
                      >
                        {item.actionLabel}
                      </a>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full border border-dashed border-line px-5 py-3 text-sm text-muted">
                        待补链接
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-muted rounded-[32px] p-5">
            <p className="eyebrow">Info Update</p>
            <h2 className="display-title mt-2 text-2xl text-ink">公考信息更新</h2>

            <ul className="mt-5 space-y-3">
              {infoUpdatePlaceholder.map((item) => (
                <li
                  key={item}
                  className="rounded-[22px] border border-dashed border-line bg-white/55 px-4 py-3 text-sm leading-7 text-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel rounded-[32px] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Course Pulse</p>
              <h2 className="display-title mt-2 text-3xl leading-tight text-ink">
                科目推进脉冲
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {subjectSnapshots.map((subject, index) => (
              <article
                key={subject.subject}
                className={`rounded-[26px] border p-4 ${
                  index === 0
                    ? "border-sage/35 bg-[linear-gradient(135deg,rgba(89,112,98,0.14),rgba(255,250,244,0.90))] md:col-span-2"
                    : "border-line bg-white/72"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{subject.subject}</p>
                    <p className="mt-1 text-sm text-muted">{subject.target}</p>
                  </div>
                  <div className="numeric-display display-title text-4xl text-ink">
                    {subject.progress}%
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-background-strong">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#597062,#b65f33)]"
                    style={{ width: `${Math.max(subject.progress, 6)}%` }}
                  />
                </div>

                <p className="mt-3 text-sm leading-7 text-muted">{subject.note}</p>
              </article>
            ))}
          </div>
        </section>

        <MockExamBoard />
      </div>

      <div className="space-y-4">
        <PracticeCountdown />
        <ExamCountdowns />
        <PoliticalBriefing />
      </div>
    </div>
  );
}
