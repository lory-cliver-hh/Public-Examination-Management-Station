"use client";

import { useState } from "react";
import { useCountdowns } from "@/components/countdown-provider";
import { useCourses } from "@/components/course-provider";
import { useMaterials } from "@/components/materials-provider";
import type { ExamCountdown } from "@/lib/mock-data";
import { parseCourseWorkbook } from "@/lib/course-import";
import { parseMaterialWorkbook } from "@/lib/material-import";

function toDateTimeLocal(date: string) {
  const parsed = new Date(date);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function createEmptyCountdown(): ExamCountdown {
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: "",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    emphasis: "supporting",
    note: "",
  };
}

export default function SettingsPage() {
  const { countdowns, setCountdowns, resetCountdowns } = useCountdowns();
  const { importCatalog, importMeta, resetCatalog } = useCourses();
  const {
    importCatalog: importMaterialsCatalog,
    importMeta: materialsImportMeta,
    resetCatalog: resetMaterialsCatalog,
  } = useMaterials();
  const [importMessage, setImportMessage] = useState<string>("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [materialsImportMessage, setMaterialsImportMessage] = useState<string>("");
  const [materialsImportWarnings, setMaterialsImportWarnings] = useState<string[]>([]);
  const [isMaterialsImporting, setIsMaterialsImporting] = useState(false);

  function updateCountdown(
    id: string,
    key: keyof ExamCountdown,
    value: ExamCountdown[keyof ExamCountdown],
  ) {
    setCountdowns((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  function removeCountdown(id: string) {
    setCountdowns((current) => current.filter((item) => item.id !== id));
  }

  async function handleCourseImport(file: File | null) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportWarnings([]);
    setImportMessage("正在解析 Excel...");

    try {
      const result = await parseCourseWorkbook(file);
      importCatalog(result.catalog, {
        fileName: file.name,
        rowCount: result.rowCount,
        importedAt: new Date().toISOString(),
        warnings: result.warnings,
      });
      setImportMessage(`导入完成：${file.name}，共解析 ${result.rowCount} 行。`);
      setImportWarnings(result.warnings);
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "导入失败，请检查 Excel 格式。",
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleMaterialsImport(file: File | null) {
    if (!file) {
      return;
    }

    setIsMaterialsImporting(true);
    setMaterialsImportWarnings([]);
    setMaterialsImportMessage("正在解析 Excel...");

    try {
      const result = await parseMaterialWorkbook(file);
      importMaterialsCatalog(result.catalog, {
        fileName: file.name,
        rowCount: result.rowCount,
        importedAt: new Date().toISOString(),
        warnings: result.warnings,
      });
      setMaterialsImportMessage(`导入完成：${file.name}，共解析 ${result.rowCount} 行。`);
      setMaterialsImportWarnings(result.warnings);
    } catch (error) {
      setMaterialsImportMessage(
        error instanceof Error ? error.message : "导入失败，请检查 Excel 格式。",
      );
    } finally {
      setIsMaterialsImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="panel rounded-[34px] p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <p className="eyebrow">Settings</p>
            <h1 className="display-title text-4xl leading-tight text-ink md:text-[3.1rem]">
              管理考试节点和课程导入。
            </h1>
            <p className="max-w-3xl text-sm leading-8 text-muted md:text-base">
              修改后会自动保存到当前浏览器，并同步到首页和侧栏。
            </p>
          </div>

          <aside className="rounded-[28px] border border-line bg-white/72 p-5">
            <p className="eyebrow">Status</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <li>考试节点修改后即时生效。</li>
              <li>支持恢复默认倒计时。</li>
              <li>课程和资料文件都支持 `.xlsx`、`.xls`、`.csv`。</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Countdown Manager</p>
            <h2 className="display-title mt-2 text-3xl text-ink">考试节点设置</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setCountdowns((current) => [...current, createEmptyCountdown()])
              }
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
            >
              新增考试节点
            </button>
            <button
              type="button"
              onClick={resetCountdowns}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/70"
            >
              恢复默认倒计时
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {countdowns.map((countdown, index) => (
            <article
              key={countdown.id}
              className={`rounded-[28px] border p-5 ${
                index === 0
                  ? "border-accent/30 bg-[linear-gradient(135deg,rgba(182,95,51,0.12),rgba(255,251,246,0.90))]"
                  : "border-line bg-white/72"
              }`}
            >
              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_180px]">
                <label className="space-y-2 text-sm text-muted">
                  <span className="font-semibold text-ink">考试名称</span>
                  <input
                    className="w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 outline-none transition focus:border-accent"
                    value={countdown.name}
                    onChange={(event) =>
                      updateCountdown(countdown.id, "name", event.target.value)
                    }
                    placeholder="例如：2026 国考目标日"
                  />
                </label>

                <label className="space-y-2 text-sm text-muted">
                  <span className="font-semibold text-ink">考试时间</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 outline-none transition focus:border-accent"
                    value={toDateTimeLocal(countdown.date)}
                    onChange={(event) =>
                      updateCountdown(
                        countdown.id,
                        "date",
                        new Date(event.target.value).toISOString(),
                      )
                    }
                  />
                </label>

                <label className="space-y-2 text-sm text-muted">
                  <span className="font-semibold text-ink">强调级别</span>
                  <select
                    className="w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 outline-none transition focus:border-accent"
                    value={countdown.emphasis}
                    onChange={(event) =>
                      updateCountdown(
                        countdown.id,
                        "emphasis",
                        event.target.value as ExamCountdown["emphasis"],
                      )
                    }
                  >
                    <option value="primary">主目标</option>
                    <option value="secondary">次目标</option>
                    <option value="supporting">补充目标</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_140px]">
                <label className="space-y-2 text-sm text-muted">
                  <span className="font-semibold text-ink">说明</span>
                  <textarea
                    className="min-h-28 w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 outline-none transition focus:border-accent"
                    value={countdown.note}
                    onChange={(event) =>
                      updateCountdown(countdown.id, "note", event.target.value)
                    }
                    placeholder="例如：当前主目标，倒推刷题和申论节奏。"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeCountdown(countdown.id)}
                  className="h-fit rounded-full border border-dashed border-line px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
                >
                  删除该节点
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Course Import</p>
            <h2 className="display-title mt-2 text-3xl text-ink">
              课程 Excel 导入
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              导入课程文件后，课程页会按科目和模块展示。
            </p>
          </div>

          <a
            href="/templates/course-import-template.csv"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/70"
          >
            下载模板 CSV
          </a>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-line bg-white/72 p-5">
            <p className="text-sm font-semibold text-ink">建议表头</p>
            <div className="mt-3 rounded-[22px] bg-background/70 px-4 py-4 text-sm leading-7 text-muted">
              `subject, module, chapter, lesson_title, duration, status, share_url, share_code, note`
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              也兼容中文表头：科目、模块、章节、课时标题、时长、状态、夸克链接、提取码、备注。
            </p>

            <label className="mt-5 flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-line bg-background/60 px-4 py-8 text-center text-sm leading-7 text-muted transition hover:border-accent">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) =>
                  handleCourseImport(event.target.files?.[0] ?? null)
                }
              />
              {isImporting ? "正在导入..." : "点击选择 Excel / CSV 文件"}
            </label>

            {importMessage ? (
              <p className="mt-4 text-sm leading-7 text-muted">{importMessage}</p>
            ) : null}

            {importWarnings.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {importWarnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded-[18px] border border-dashed border-line bg-background/70 px-4 py-3 text-sm leading-7 text-muted"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(32,52,73,0.92),rgba(89,112,98,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Import Status</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <p>
                {importMeta
                  ? `当前文件：${importMeta.fileName}`
                  : "当前使用默认课程文件。"}
              </p>
              <p>
                {importMeta
                  ? `数据行数：${importMeta.rowCount}，导入时间：${new Date(importMeta.importedAt).toLocaleString("zh-CN")}`
                  : "等待导入课程文件。"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetCatalog();
                setImportMessage("已恢复默认课程数据。");
                setImportWarnings([]);
              }}
              className="mt-5 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              恢复默认课程
            </button>
          </aside>
        </div>
      </section>

      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Materials Import</p>
            <h2 className="display-title mt-2 text-3xl text-ink">
              资料 Excel 导入
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              导入资料文件后，资料页会按科目和模块展示。
            </p>
          </div>

          <a
            href="/templates/material-import-template.csv"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/70"
          >
            下载资料模板 CSV
          </a>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-line bg-white/72 p-5">
            <p className="text-sm font-semibold text-ink">建议表头</p>
            <div className="mt-3 rounded-[22px] bg-background/70 px-4 py-4 text-sm leading-7 text-muted">
              `subject, module, chapter, material_title, share_url, share_code, note`
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              也兼容中文表头：科目、模块、章节、资料标题、夸克链接、提取码、备注。
            </p>

            <label className="mt-5 flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-line bg-background/60 px-4 py-8 text-center text-sm leading-7 text-muted transition hover:border-accent">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) =>
                  handleMaterialsImport(event.target.files?.[0] ?? null)
                }
              />
              {isMaterialsImporting ? "正在导入..." : "点击选择 Excel / CSV 文件"}
            </label>

            {materialsImportMessage ? (
              <p className="mt-4 text-sm leading-7 text-muted">{materialsImportMessage}</p>
            ) : null}

            {materialsImportWarnings.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {materialsImportWarnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded-[18px] border border-dashed border-line bg-background/70 px-4 py-3 text-sm leading-7 text-muted"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className="rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(89,112,98,0.92),rgba(32,52,73,0.88))] p-5 text-white">
            <p className="eyebrow text-white/55">Import Status</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <p>
                {materialsImportMeta
                  ? `当前文件：${materialsImportMeta.fileName}`
                  : "当前使用默认资料文件。"}
              </p>
              <p>
                {materialsImportMeta
                  ? `数据行数：${materialsImportMeta.rowCount}，导入时间：${new Date(materialsImportMeta.importedAt).toLocaleString("zh-CN")}`
                  : "等待导入资料文件。"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetMaterialsCatalog();
                setMaterialsImportMessage("已恢复默认资料数据。");
                setMaterialsImportWarnings([]);
              }}
              className="mt-5 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              恢复默认资料
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
