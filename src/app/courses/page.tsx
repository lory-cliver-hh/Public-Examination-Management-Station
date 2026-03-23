"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useCourses } from "@/components/course-provider";
import type { CourseCatalog } from "@/lib/mock-data";

const statusStyle = {
  未开始: "border-line bg-white/70 text-muted",
  学习中: "border-accent/30 bg-accent/10 text-accent-deep",
  已完成: "border-sage/30 bg-sage/10 text-sage",
} as const;

const ALL_SUBJECTS = "全部科目";
const ALL_MODULES = "全部模块";
const ALL_STATUS = "全部状态";
const COURSE_STATUS_OPTIONS = [
  ALL_STATUS,
  "未开始",
  "学习中",
  "已完成",
] as const;

type CourseStatusFilter = (typeof COURSE_STATUS_OPTIONS)[number];

const filterFieldClass =
  "mt-2 w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent";

function normalizeSearchKeyword(value: string) {
  return value.trim().toLowerCase();
}

function matchesKeyword(values: Array<string | undefined>, keyword: string) {
  if (!keyword) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(keyword));
}

export default function CoursesPage() {
  const { catalog, importMeta, hydrated, setLessonStatus } = useCourses();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECTS);
  const [selectedModule, setSelectedModule] = useState(ALL_MODULES);
  const [selectedStatus, setSelectedStatus] =
    useState<CourseStatusFilter>(ALL_STATUS);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const keyword = normalizeSearchKeyword(deferredSearchTerm);
  const totalModules = catalog.reduce((sum, subject) => sum + subject.modules.length, 0);
  const totalLessons = catalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, module) => moduleSum + module.lessons.length, 0),
    0,
  );

  const subjectOptions = useMemo(
    () => catalog.map((subject) => subject.subject),
    [catalog],
  );

  const moduleOptions = useMemo(() => {
    const visibleSubjects =
      selectedSubject === ALL_SUBJECTS
        ? catalog
        : catalog.filter((subject) => subject.subject === selectedSubject);

    return Array.from(
      new Set(
        visibleSubjects.flatMap((subject) =>
          subject.modules.map((module) => module.name),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right, "zh-CN"));
  }, [catalog, selectedSubject]);

  const activeModule =
    selectedModule === ALL_MODULES || moduleOptions.includes(selectedModule)
      ? selectedModule
      : ALL_MODULES;

  const filteredCatalog = useMemo<CourseCatalog[]>(() => {
    return catalog
      .filter(
        (subject) =>
          selectedSubject === ALL_SUBJECTS || subject.subject === selectedSubject,
      )
      .map((subject) => {
        const modules = subject.modules
          .filter(
            (module) => activeModule === ALL_MODULES || module.name === activeModule,
          )
          .map((module) => {
            const moduleMatchesKeyword = matchesKeyword(
              [subject.subject, module.name, module.emphasis],
              keyword,
            );

            const lessons = module.lessons.filter((lesson) => {
              if (selectedStatus !== ALL_STATUS && lesson.status !== selectedStatus) {
                return false;
              }

              return (
                moduleMatchesKeyword ||
                matchesKeyword(
                  [
                    lesson.title,
                    lesson.chapter,
                    lesson.note,
                    lesson.duration,
                    lesson.shareCode,
                  ],
                  keyword,
                )
              );
            });

            return {
              ...module,
              lessons,
            };
          })
          .filter((module) => module.lessons.length > 0);

        return {
          ...subject,
          modules,
        };
      })
      .filter((subject) => subject.modules.length > 0);
  }, [activeModule, catalog, keyword, selectedStatus, selectedSubject]);

  const visibleModules = filteredCatalog.reduce(
    (sum, subject) => sum + subject.modules.length,
    0,
  );
  const visibleLessons = filteredCatalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, module) => moduleSum + module.lessons.length, 0),
    0,
  );
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedSubject !== ALL_SUBJECTS ||
    selectedModule !== ALL_MODULES ||
    selectedStatus !== ALL_STATUS;

  function resetFilters() {
    setSearchTerm("");
    setSelectedSubject(ALL_SUBJECTS);
    setSelectedModule(ALL_MODULES);
    setSelectedStatus(ALL_STATUS);
  }

  return (
    <div className="space-y-4">
      <section className="panel rounded-[34px] p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <p className="eyebrow">Course Center</p>
            <h1 className="display-title text-4xl leading-tight text-ink md:text-[3.2rem]">
              课程中心按课时组织，点击后就能直达夸克。
            </h1>
            <p className="max-w-3xl text-sm leading-8 text-muted md:text-base">
              现在可以按关键词、科目、模块和状态筛选，找具体课程会快很多。
            </p>
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.92),rgba(89,112,98,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Catalog</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>已导入 {catalog.length} 个科目。</li>
              <li>总计 {totalModules} 个模块，{totalLessons} 节课时。</li>
              <li>当前显示 {visibleModules} 个模块，{visibleLessons} 节课时。</li>
              <li>
                {hydrated && importMeta
                  ? `当前使用导入文件：${importMeta.fileName}`
                  : "当前使用默认课程数据。"}
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Filters</p>
            <h2 className="display-title mt-2 text-3xl text-ink">按条件快速筛课</h2>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-45"
          >
            清空筛选
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,220px))]">
          <label className="space-y-2 text-sm text-muted">
            <span className="font-semibold text-ink">关键词</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索课时、章节、备注"
              className={filterFieldClass}
            />
          </label>

          <label className="space-y-2 text-sm text-muted">
            <span className="font-semibold text-ink">科目</span>
            <select
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              className={filterFieldClass}
            >
              <option value={ALL_SUBJECTS}>{ALL_SUBJECTS}</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-muted">
            <span className="font-semibold text-ink">模块</span>
            <select
              value={activeModule}
              onChange={(event) => setSelectedModule(event.target.value)}
              className={filterFieldClass}
            >
              <option value={ALL_MODULES}>{ALL_MODULES}</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-muted">
            <span className="font-semibold text-ink">状态</span>
            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as CourseStatusFilter)
              }
              className={filterFieldClass}
            >
              {COURSE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-[24px] border border-line bg-white/68 px-5 py-4 text-sm leading-7 text-muted">
          当前显示 {filteredCatalog.length} 个科目，{visibleModules} 个模块，{visibleLessons} 节课时。
          {deferredSearchTerm !== searchTerm ? " 正在应用关键词筛选..." : ""}
        </div>
      </section>

      {filteredCatalog.length === 0 ? (
        <section className="panel rounded-[32px] p-6">
          <div className="rounded-[28px] border border-dashed border-line bg-white/60 p-8 text-center">
            <p className="eyebrow">No Result</p>
            <h2 className="display-title mt-3 text-3xl text-ink">没有匹配的课程</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              可以换个关键词，或者直接清空筛选重新查看全部课时。
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              清空筛选
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {filteredCatalog.map((subject) => {
            const subjectLessonCount = subject.modules.reduce(
              (sum, module) => sum + module.lessons.length,
              0,
            );

            return (
              <section key={subject.subject} className="panel rounded-[32px] p-6">
                <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <aside className="rounded-[28px] border border-line bg-white/68 p-5">
                    <p className="eyebrow">Subject</p>
                    <h2 className="display-title mt-2 text-3xl text-ink">
                      {subject.subject}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted">{subject.weeklyGoal}</p>

                    <div className="mt-5 rounded-[22px] bg-background-strong p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        当前推进
                      </p>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#203449,#b65f33)]"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                      <p className="numeric-display mt-3 text-sm font-semibold text-ink">
                        {subject.progress}% 已完成
                      </p>
                    </div>

                    {hasActiveFilters ? (
                      <p className="mt-4 text-sm leading-7 text-muted">
                        当前命中 {subject.modules.length} 个模块，{subjectLessonCount} 节课时。
                      </p>
                    ) : null}
                  </aside>

                  <div className="grid gap-4">
                    {subject.modules.map((module) => (
                      <article
                        key={module.name}
                        className="rounded-[28px] border border-line bg-white/72 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="eyebrow">{module.emphasis}</p>
                            <h3 className="mt-2 text-2xl font-semibold text-ink">
                              {module.name}
                            </h3>
                          </div>
                          <p className="text-sm text-muted">
                            {hasActiveFilters
                              ? `命中 ${module.lessons.length} 节课时`
                              : `共 ${module.lessons.length} 节课时`}
                          </p>
                        </div>

                        <div className="mt-5 space-y-3">
                          {module.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="rounded-[24px] border border-line/80 bg-background/60 p-4"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle[lesson.status]}`}
                                    >
                                      {lesson.status}
                                    </span>
                                    <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                                      {lesson.duration}
                                    </span>
                                  </div>
                                  <h4 className="text-lg font-semibold text-ink">
                                    {lesson.title}
                                  </h4>
                                  {lesson.chapter ? (
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                      {lesson.chapter}
                                    </p>
                                  ) : null}
                                  <p className="text-sm leading-7 text-muted">{lesson.note}</p>
                                  {lesson.shareCode ? (
                                    <p className="text-xs text-muted">
                                      提取码：{lesson.shareCode}
                                    </p>
                                  ) : null}
                                </div>

                                {lesson.shareUrl ? (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <a
                                      href={lesson.shareUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => {
                                        if (lesson.status !== "已完成") {
                                          setLessonStatus(lesson.id, "学习中");
                                        }
                                      }}
                                      className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                                    >
                                      打开夸克继续学习
                                    </a>
                                    {lesson.status !== "已完成" ? (
                                      <button
                                        type="button"
                                        onClick={() => setLessonStatus(lesson.id, "已完成")}
                                        className="inline-flex items-center justify-center rounded-full border border-sage/30 bg-sage/10 px-4 py-3 text-sm font-semibold text-sage transition hover:border-sage/50"
                                      >
                                        标记已完成
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setLessonStatus(lesson.id, "未开始")}
                                        className="inline-flex items-center justify-center rounded-full border border-line px-4 py-3 text-sm text-muted transition hover:bg-white/70"
                                      >
                                        重置状态
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-full border border-dashed border-line px-5 py-3 text-sm text-muted">
                                    待补链接
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
