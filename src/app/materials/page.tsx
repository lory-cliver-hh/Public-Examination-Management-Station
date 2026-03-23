"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMaterials } from "@/components/materials-provider";
import type { MaterialCatalog } from "@/lib/mock-data";

const ALL_SUBJECTS = "全部科目";
const ALL_MODULES = "全部模块";

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

export default function MaterialsPage() {
  const { catalog, importMeta, hydrated } = useMaterials();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECTS);
  const [selectedModule, setSelectedModule] = useState(ALL_MODULES);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const keyword = normalizeSearchKeyword(deferredSearchTerm);
  const totalModules = catalog.reduce((sum, subject) => sum + subject.modules.length, 0);
  const totalItems = catalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, moduleGroup) => moduleSum + moduleGroup.items.length, 0),
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
          subject.modules.map((moduleGroup) => moduleGroup.name),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right, "zh-CN"));
  }, [catalog, selectedSubject]);

  const activeModule =
    selectedModule === ALL_MODULES || moduleOptions.includes(selectedModule)
      ? selectedModule
      : ALL_MODULES;

  const filteredCatalog = useMemo<MaterialCatalog[]>(() => {
    return catalog
      .filter(
        (subject) =>
          selectedSubject === ALL_SUBJECTS || subject.subject === selectedSubject,
      )
      .map((subject) => {
        const modules = subject.modules
          .filter(
            (moduleGroup) =>
              activeModule === ALL_MODULES || moduleGroup.name === activeModule,
          )
          .map((moduleGroup) => {
            const moduleMatchesKeyword = matchesKeyword(
              [subject.subject, moduleGroup.name, moduleGroup.emphasis],
              keyword,
            );

            const items = moduleGroup.items.filter((item) => {
              return (
                moduleMatchesKeyword ||
                matchesKeyword(
                  [item.title, item.chapter, item.note, item.shareCode],
                  keyword,
                )
              );
            });

            return {
              ...moduleGroup,
              items,
            };
          })
          .filter((moduleGroup) => moduleGroup.items.length > 0);

        return {
          ...subject,
          modules,
        };
      })
      .filter((subject) => subject.modules.length > 0);
  }, [activeModule, catalog, keyword, selectedSubject]);

  const visibleModules = filteredCatalog.reduce(
    (sum, subject) => sum + subject.modules.length,
    0,
  );
  const visibleItems = filteredCatalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, moduleGroup) => moduleSum + moduleGroup.items.length, 0),
    0,
  );
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedSubject !== ALL_SUBJECTS ||
    selectedModule !== ALL_MODULES;

  function resetFilters() {
    setSearchTerm("");
    setSelectedSubject(ALL_SUBJECTS);
    setSelectedModule(ALL_MODULES);
  }

  return (
    <div className="space-y-4">
      <section className="panel rounded-[34px] p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <p className="eyebrow">Materials</p>
            <h1 className="display-title text-4xl leading-tight text-ink md:text-[3.2rem]">
              资料中心按科目和模块整理，点击就能直达夸克。
            </h1>
            <p className="max-w-3xl text-sm leading-8 text-muted md:text-base">
              现在支持按关键词、科目和模块筛选资料，不用再手动翻完整列表。
            </p>
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.92),rgba(89,112,98,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Library</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>已导入 {catalog.length} 个科目。</li>
              <li>总计 {totalModules} 个模块，{totalItems} 份资料。</li>
              <li>当前显示 {visibleModules} 个模块，{visibleItems} 份资料。</li>
              <li>
                {hydrated && importMeta
                  ? `当前使用导入文件：${importMeta.fileName}`
                  : "当前使用默认资料数据。"}
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Filters</p>
            <h2 className="display-title mt-2 text-3xl text-ink">按条件快速筛资料</h2>
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

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,220px))]">
          <label className="space-y-2 text-sm text-muted">
            <span className="font-semibold text-ink">关键词</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索资料标题、章节、备注"
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
        </div>

        <div className="mt-4 rounded-[24px] border border-line bg-white/68 px-5 py-4 text-sm leading-7 text-muted">
          当前显示 {filteredCatalog.length} 个科目，{visibleModules} 个模块，{visibleItems} 份资料。
          {deferredSearchTerm !== searchTerm ? " 正在应用关键词筛选..." : ""}
        </div>
      </section>

      {filteredCatalog.length === 0 ? (
        <section className="panel rounded-[32px] p-6">
          <div className="rounded-[28px] border border-dashed border-line bg-white/60 p-8 text-center">
            <p className="eyebrow">No Result</p>
            <h2 className="display-title mt-3 text-3xl text-ink">没有匹配的资料</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              可以调整关键词或筛选项，或者直接清空筛选重新查看全部资料。
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
            const subjectItemCount = subject.modules.reduce(
              (sum, moduleGroup) => sum + moduleGroup.items.length,
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
                    <p className="mt-3 text-sm leading-7 text-muted">{subject.summary}</p>

                    {hasActiveFilters ? (
                      <p className="mt-4 text-sm leading-7 text-muted">
                        当前命中 {subject.modules.length} 个模块，{subjectItemCount} 份资料。
                      </p>
                    ) : null}
                  </aside>

                  <div className="grid gap-4">
                    {subject.modules.map((moduleGroup) => (
                      <article
                        key={moduleGroup.name}
                        className="rounded-[28px] border border-line bg-white/72 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="eyebrow">{moduleGroup.emphasis}</p>
                            <h3 className="mt-2 text-2xl font-semibold text-ink">
                              {moduleGroup.name}
                            </h3>
                          </div>
                          <p className="text-sm text-muted">
                            {hasActiveFilters
                              ? `命中 ${moduleGroup.items.length} 份资料`
                              : `共 ${moduleGroup.items.length} 份资料`}
                          </p>
                        </div>

                        <div className="mt-5 space-y-3">
                          {moduleGroup.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[24px] border border-line/80 bg-background/60 p-4"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                  {item.chapter ? (
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                      {item.chapter}
                                    </p>
                                  ) : null}
                                  <h4 className="text-lg font-semibold text-ink">
                                    {item.title}
                                  </h4>
                                  <p className="text-sm leading-7 text-muted">{item.note}</p>
                                  {item.shareCode ? (
                                    <p className="text-xs text-muted">
                                      提取码：{item.shareCode}
                                    </p>
                                  ) : null}
                                </div>

                                {item.shareUrl ? (
                                  <a
                                    href={item.shareUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                                  >
                                    打开夸克查看资料
                                  </a>
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
