"use client";

import { useMemo, useState } from "react";
import {
  usePracticeHub,
  type MockExamRecord,
} from "@/components/practice-hub-provider";

type MockExamDraft = {
  title: string;
  date: string;
  totalScore: string;
  aptitudeScore: string;
  essayScore: string;
  note: string;
};

type ChartGeometry = {
  width: number;
  height: number;
  polyline: string;
  points: Array<{
    id: string;
    x: number;
    y: number;
    score: number;
    date: string;
  }>;
  guideLines: Array<{
    y: number;
    label: string;
  }>;
};

function createDraft(todayKey: string): MockExamDraft {
  return {
    title: "",
    date: todayKey,
    totalScore: "",
    aptitudeScore: "",
    essayScore: "",
    note: "",
  };
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatScore(value: number | null) {
  if (value === null) {
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sortByDateAscending(records: MockExamRecord[]) {
  return [...records].sort((left, right) => {
    const dateDiff = left.date.localeCompare(right.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function buildChartGeometry(records: MockExamRecord[]): ChartGeometry | null {
  if (records.length === 0) {
    return null;
  }

  const width = 620;
  const height = 240;
  const paddingTop = 24;
  const paddingRight = 24;
  const paddingBottom = 34;
  const paddingLeft = 16;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const scores = records.map((record) => record.totalScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const buffer = Math.max(6, (maxScore - minScore) * 0.25 || 8);
  const topScore = maxScore + buffer;
  const bottomScore = Math.max(0, minScore - buffer);
  const range = Math.max(1, topScore - bottomScore);

  const points = records.map((record, index) => {
    const x =
      records.length === 1
        ? width / 2
        : paddingLeft + (usableWidth / (records.length - 1)) * index;
    const y =
      paddingTop + ((topScore - record.totalScore) / range) * usableHeight;

    return {
      id: record.id,
      x,
      y,
      score: record.totalScore,
      date: record.date,
    };
  });

  return {
    width,
    height,
    polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    points,
    guideLines: [topScore, bottomScore + range / 2, bottomScore].map((value) => ({
      y: paddingTop + ((topScore - value) / range) * usableHeight,
      label: formatScore(Math.round(value)),
    })),
  };
}

export function MockExamBoard() {
  const { todayKey, mockExams, addMockExam, deleteMockExam } = usePracticeHub();
  const [draft, setDraft] = useState<MockExamDraft>(() => createDraft(todayKey));
  const [errorMessage, setErrorMessage] = useState("");

  const sortedForChart = useMemo(
    () => sortByDateAscending(mockExams).slice(-8),
    [mockExams],
  );
  const chartGeometry = useMemo(
    () => buildChartGeometry(sortedForChart),
    [sortedForChart],
  );
  const latestRecord = mockExams[0] ?? null;
  const previousRecord = mockExams[1] ?? null;
  const bestRecord = useMemo(
    () =>
      mockExams.reduce<MockExamRecord | null>(
        (best, current) =>
          !best || current.totalScore > best.totalScore ? current : best,
        null,
      ),
    [mockExams],
  );
  const averageScore = useMemo(() => {
    if (mockExams.length === 0) {
      return null;
    }

    const total = mockExams.reduce((sum, record) => sum + record.totalScore, 0);
    return Math.round((total / mockExams.length) * 10) / 10;
  }, [mockExams]);

  function updateDraft<Key extends keyof MockExamDraft>(
    key: Key,
    value: MockExamDraft[Key],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function parseScoreInput(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draft.title.trim();
    const totalScore = parseScoreInput(draft.totalScore);

    if (!title) {
      setErrorMessage("请先填写模考名称。");
      return;
    }

    if (!draft.date) {
      setErrorMessage("请先填写模考日期。");
      return;
    }

    if (totalScore === null) {
      setErrorMessage("总分需要是大于等于 0 的数字。");
      return;
    }

    addMockExam({
      title,
      date: draft.date,
      totalScore,
      aptitudeScore: parseScoreInput(draft.aptitudeScore),
      essayScore: parseScoreInput(draft.essayScore),
      note: draft.note,
    });

    setDraft(createDraft(todayKey));
    setErrorMessage("");
  }

  return (
    <section className="panel rounded-[32px] p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="eyebrow">Mock Exam</p>
            <h2 className="display-title text-3xl leading-tight text-ink">模考记录与成绩曲线</h2>
            <p className="max-w-3xl text-sm leading-7 text-muted">
              把阶段模考成绩和备注沉淀下来，后面更容易看出提分还是震荡。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-[24px] border border-line bg-white/72 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">最近一次</p>
              <p className="numeric-display display-title mt-3 text-4xl text-ink">
                {latestRecord ? formatScore(latestRecord.totalScore) : "--"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {latestRecord
                  ? `${latestRecord.title} · ${formatDateLabel(latestRecord.date)}`
                  : "还没有录入模考成绩。"}
              </p>
            </article>

            <article className="rounded-[24px] border border-line bg-white/72 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">相较上次</p>
              <p className="numeric-display display-title mt-3 text-4xl text-ink">
                {latestRecord && previousRecord
                  ? `${latestRecord.totalScore - previousRecord.totalScore > 0 ? "+" : ""}${formatScore(latestRecord.totalScore - previousRecord.totalScore)}`
                  : "--"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {latestRecord && previousRecord
                  ? `上一次：${formatScore(previousRecord.totalScore)}`
                  : "录入两次以上后开始比较波动。"}
              </p>
            </article>

            <article className="rounded-[24px] border border-line bg-white/72 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">最高 / 平均</p>
              <p className="numeric-display display-title mt-3 text-4xl text-ink">
                {bestRecord ? formatScore(bestRecord.totalScore) : "--"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                平均 {averageScore === null ? "--" : formatScore(averageScore)}
              </p>
            </article>
          </div>

          <div className="rounded-[30px] border border-line bg-[linear-gradient(180deg,rgba(255,253,248,0.96),rgba(243,237,228,0.9))] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">最近模考走势</p>
                <p className="mt-1 text-xs leading-6 text-muted">默认展示最近 8 次记录。</p>
              </div>
            </div>

            {chartGeometry ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-dashed border-line bg-white/76 px-3 py-4">
                <svg
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  className="h-[240px] w-full"
                  aria-label="模考成绩曲线"
                  role="img"
                >
                  {chartGeometry.guideLines.map((line) => (
                    <g key={line.label}>
                      <line
                        x1="0"
                        x2={chartGeometry.width}
                        y1={line.y}
                        y2={line.y}
                        stroke="rgba(58,69,55,0.12)"
                        strokeDasharray="4 6"
                      />
                      <text
                        x="4"
                        y={line.y - 6}
                        fill="rgba(103,112,100,0.92)"
                        fontSize="12"
                      >
                        {line.label}
                      </text>
                    </g>
                  ))}

                  <polyline
                    fill="none"
                    stroke="#203449"
                    strokeWidth="3"
                    points={chartGeometry.polyline}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {chartGeometry.points.map((point) => (
                    <g key={point.id}>
                      <circle cx={point.x} cy={point.y} r="6" fill="#b65f33" />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="11"
                        fill="rgba(182,95,51,0.12)"
                      />
                      <text
                        x={point.x}
                        y={point.y - 14}
                        textAnchor="middle"
                        fill="#1f2c25"
                        fontSize="12"
                      >
                        {formatScore(point.score)}
                      </text>
                      <text
                        x={point.x}
                        y={chartGeometry.height - 8}
                        textAnchor="middle"
                        fill="rgba(103,112,100,0.92)"
                        fontSize="11"
                      >
                        {formatDateLabel(point.date)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-dashed border-line bg-white/76 px-4 py-8 text-sm leading-7 text-muted">
                还没有模考数据。录入第一条成绩后，这里会开始生成曲线。
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-[30px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.94),rgba(53,81,107,0.9))] p-5 text-white"
          >
            <p className="eyebrow text-white/55">Add Record</p>
            <h3 className="display-title mt-2 text-2xl">录入一次模考</h3>

            <div className="mt-5 space-y-3">
              <label className="block space-y-2 text-sm text-white/78">
                <span>模考名称</span>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  className="w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-white/40"
                  placeholder="例如：3 月阶段模考"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 text-sm text-white/78">
                  <span>模考日期</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraft("date", event.target.value)}
                    className="w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40"
                  />
                </label>

                <label className="block space-y-2 text-sm text-white/78">
                  <span>总分</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.totalScore}
                    onChange={(event) => updateDraft("totalScore", event.target.value)}
                    className="w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40"
                    placeholder="输入总分"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 text-sm text-white/78">
                  <span>行测</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.aptitudeScore}
                    onChange={(event) =>
                      updateDraft("aptitudeScore", event.target.value)
                    }
                    className="w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40"
                    placeholder="可选"
                  />
                </label>

                <label className="block space-y-2 text-sm text-white/78">
                  <span>申论</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.essayScore}
                    onChange={(event) => updateDraft("essayScore", event.target.value)}
                    className="w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40"
                    placeholder="可选"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm text-white/78">
                <span>备注</span>
                <textarea
                  value={draft.note}
                  onChange={(event) => updateDraft("note", event.target.value)}
                  className="min-h-24 w-full rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-white/40"
                  placeholder="记录波动原因、失分点或下一次调整计划。"
                />
              </label>

              {errorMessage ? (
                <p className="text-sm leading-6 text-[#ffd9c2]">{errorMessage}</p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
              >
                保存本次模考
              </button>
            </div>
          </form>

          <section className="rounded-[28px] border border-line bg-white/74 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Recent Scores</p>
                <h3 className="display-title mt-2 text-2xl text-ink">最近成绩</h3>
              </div>
              <span className="text-sm text-muted">共 {mockExams.length} 条</span>
            </div>

            <div className="mt-4 space-y-3">
              {mockExams.length > 0 ? (
                mockExams.slice(0, 5).map((record) => (
                  <article
                    key={record.id}
                    className="rounded-[24px] border border-line bg-background/65 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{record.title}</p>
                        <p className="mt-1 text-xs leading-6 text-muted">
                          {formatDateLabel(record.date)}
                          {record.aptitudeScore !== null || record.essayScore !== null
                            ? ` · 行测 ${formatScore(record.aptitudeScore)} / 申论 ${formatScore(record.essayScore)}`
                            : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="numeric-display text-2xl font-semibold text-ink">
                          {formatScore(record.totalScore)}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteMockExam(record.id)}
                          className="mt-2 text-xs text-muted transition hover:text-accent"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    {record.note ? (
                      <p className="mt-3 text-sm leading-7 text-muted">{record.note}</p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-line bg-background/65 px-4 py-5 text-sm leading-7 text-muted">
                  这里会保留最近几次模考记录，方便你看波动和对比。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
