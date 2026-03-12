"use client";

import { useMaterials } from "@/components/materials-provider";

export default function MaterialsPage() {
  const { catalog, importMeta, hydrated } = useMaterials();
  const totalModules = catalog.reduce((sum, subject) => sum + subject.modules.length, 0);
  const totalItems = catalog.reduce(
    (sum, subject) =>
      sum + subject.modules.reduce((moduleSum, moduleGroup) => moduleSum + moduleGroup.items.length, 0),
    0,
  );

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
              讲义、题册、模板和补充资料都可以放在这里，和课程分开管理。
            </p>
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.92),rgba(89,112,98,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Library</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>已导入 {catalog.length} 个科目。</li>
              <li>共 {totalModules} 个模块，{totalItems} 份资料。</li>
              <li>
                {hydrated && importMeta
                  ? `当前使用导入文件：${importMeta.fileName}`
                  : "当前使用默认资料数据。"}
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
                <p className="mt-3 text-sm leading-7 text-muted">{subject.summary}</p>
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
                        共 {moduleGroup.items.length} 份资料
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
                              <h4 className="text-lg font-semibold text-ink">{item.title}</h4>
                              <p className="text-sm leading-7 text-muted">{item.note}</p>
                              {item.shareCode ? (
                                <p className="text-xs text-muted">提取码：{item.shareCode}</p>
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
        ))}
      </div>
    </div>
  );
}
