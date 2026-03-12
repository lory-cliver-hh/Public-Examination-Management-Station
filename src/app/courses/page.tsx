"use client";

import { useCourses } from "@/components/course-provider";

const statusStyle = {
  未开始: "border-line bg-white/70 text-muted",
  学习中: "border-accent/30 bg-accent/10 text-accent-deep",
  已完成: "border-sage/30 bg-sage/10 text-sage",
} as const;

export default function CoursesPage() {
  const { catalog, importMeta, hydrated, setLessonStatus } = useCourses();
  const totalModules = catalog.reduce((sum, subject) => sum + subject.modules.length, 0);
  const totalLessons = catalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, module) => moduleSum + module.lessons.length, 0),
    0,
  );

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
              按科目、模块、课时浏览课程，并直接打开对应资源。
            </p>
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.92),rgba(89,112,98,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Catalog</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>已导入 {catalog.length} 个科目。</li>
              <li>共 {totalModules} 个模块，{totalLessons} 节课时。</li>
              <li>
                {hydrated && importMeta
                  ? `当前使用导入文件：${importMeta.fileName}`
                  : "当前使用默认课程数据。"}
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <div className="space-y-4">
        {catalog.map((subject) => (
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
                        共 {module.lessons.length} 节课时
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
        ))}
      </div>
    </div>
  );
}
