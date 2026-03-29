"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
} from "react";
import { useCourses } from "@/components/course-provider";
import {
  MISTAKE_STORAGE_GUIDE_COUNT,
  UNCATEGORIZED_MISTAKE_LABEL,
  type MistakeRecord,
  useMistakeNotebook,
} from "@/components/mistake-notebook-provider";
import {
  ALL_MISTAKE_SUBJECTS_LABEL,
  MISTAKE_EXPORT_ENDPOINT,
  buildMistakeExportFileName,
  getMistakeExportRelativeDirectory,
  type MistakeExportRecord,
} from "@/lib/mistake-export";

const fieldClass =
  "mt-2 w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent";

type PendingMistakeImage = {
  id: string;
  file: File;
  previewUrl: string;
  source: "paste" | "upload";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    const kilobytes = value / 1024;
    return `${kilobytes >= 100 ? Math.round(kilobytes) : kilobytes.toFixed(1)} KB`;
  }

  const megabytes = value / (1024 * 1024);
  return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function createPendingMistakeId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractImageFilesFromClipboard(clipboardData: DataTransfer | null) {
  if (!clipboardData) {
    return [] as File[];
  }

  return Array.from(clipboardData.items)
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea";
}

function MistakeImagePreview({ item }: { item: MistakeRecord }) {
  const { getMistakeImageBlob } = useMistakeNotebook();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let nextImageUrl: string | null = null;

    void getMistakeImageBlob(item.id).then((blob) => {
      if (!active || !blob) {
        return;
      }

      nextImageUrl = URL.createObjectURL(blob);
      setImageUrl(nextImageUrl);
    });

    return () => {
      active = false;

      if (nextImageUrl) {
        URL.revokeObjectURL(nextImageUrl);
      }
    };
  }, [getMistakeImageBlob, item.id]);

  if (!imageUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[22px] border border-dashed border-line bg-background/72 text-sm text-muted">
        正在加载截图...
      </div>
    );
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-[22px] border border-line bg-white/72"
      title="点击查看大图"
    >
      <Image
        src={imageUrl}
        alt={item.fileName}
        width={item.width || 1200}
        height={item.height || 900}
        unoptimized
        className="h-48 w-full object-cover"
      />
    </a>
  );
}

export function MistakeBoard() {
  const { catalog } = useCourses();
  const {
    items,
    totalStorageBytes,
    addMistakes,
    deleteMistake,
    clearAllMistakes,
    getMistakeImageBlob,
    hydrated,
    supported,
  } = useMistakeNotebook();
  const boardRef = useRef<HTMLElement | null>(null);
  const pendingImagesRef = useRef<PendingMistakeImage[]>([]);
  const [subject, setSubject] = useState(UNCATEGORIZED_MISTAKE_LABEL);
  const [moduleName, setModuleName] = useState(UNCATEGORIZED_MISTAKE_LABEL);
  const [date, setDate] = useState(() => getTodayDateKey());
  const [note, setNote] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingMistakeImage[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [filterSubject, setFilterSubject] = useState(ALL_MISTAKE_SUBJECTS_LABEL);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{
    tone: "success" | "error";
    message: string;
    action?: "clear_after_export";
  } | null>(null);

  const subjectOptions = useMemo(
    () => [UNCATEGORIZED_MISTAKE_LABEL, ...catalog.map((item) => item.subject)],
    [catalog],
  );
  const moduleOptions = useMemo(() => {
    if (subject === UNCATEGORIZED_MISTAKE_LABEL) {
      return [UNCATEGORIZED_MISTAKE_LABEL];
    }

    const matchedSubject = catalog.find((item) => item.subject === subject);
    const modules = matchedSubject
      ? Array.from(new Set(matchedSubject.modules.map((module) => module.name))).sort(
          (left, right) => left.localeCompare(right, "zh-CN"),
        )
      : [];

    return [UNCATEGORIZED_MISTAKE_LABEL, ...modules];
  }, [catalog, subject]);
  const subjectCounts = useMemo(
    () =>
      items.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.subject] = (accumulator[item.subject] ?? 0) + 1;
        return accumulator;
      }, {}),
    [items],
  );
  const visibleItems = useMemo(
    () =>
      filterSubject === ALL_MISTAKE_SUBJECTS_LABEL
        ? items
        : items.filter((item) => item.subject === filterSubject),
    [filterSubject, items],
  );
  const groupedItems = useMemo(() => {
    const groups = visibleItems.reduce<Record<string, MistakeRecord[]>>((accumulator, item) => {
      const groupKey = `${item.subject}｜${item.moduleName}`;
      accumulator[groupKey] ??= [];
      accumulator[groupKey].push(item);
      return accumulator;
    }, {});

    return Object.entries(groups).sort((left, right) => {
      const leftCreatedAt = left[1][0]?.createdAt ?? "";
      const rightCreatedAt = right[1][0]?.createdAt ?? "";
      return rightCreatedAt.localeCompare(leftCreatedAt);
    });
  }, [visibleItems]);
  const filterSubjects = useMemo(() => {
    const sortedSubjects = Object.keys(subjectCounts).sort((left, right) =>
      left.localeCompare(right, "zh-CN"),
    );

    return [ALL_MISTAKE_SUBJECTS_LABEL, ...sortedSubjects];
  }, [subjectCounts]);
  const exportScopeLabel = filterSubject || ALL_MISTAKE_SUBJECTS_LABEL;
  const exportFileNamePreview = useMemo(
    () => buildMistakeExportFileName(exportScopeLabel),
    [exportScopeLabel],
  );
  const storageGuidePercent = Math.min(
    Math.round((items.length / MISTAKE_STORAGE_GUIDE_COUNT) * 100),
    100,
  );
  const storageGuideTone =
    items.length >= MISTAKE_STORAGE_GUIDE_COUNT
      ? "danger"
      : items.length >= Math.round(MISTAKE_STORAGE_GUIDE_COUNT * 0.8)
        ? "warn"
        : "safe";
  const storageGuideMessage =
    storageGuideTone === "danger"
      ? "已达到建议上限，建议先导出 PDF，再做一次清理。"
      : storageGuideTone === "warn"
        ? "接近建议上限，可以准备本周导出。"
        : "当前容量还比较从容，继续记录即可。";

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    if (!moduleOptions.includes(moduleName)) {
      setModuleName(moduleOptions[0] ?? UNCATEGORIZED_MISTAKE_LABEL);
    }
  }, [moduleName, moduleOptions]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const appendPendingImages = useCallback((
    filesToAppend: File[],
    source: PendingMistakeImage["source"],
  ) => {
    const imageFiles = filesToAppend.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      return 0;
    }

    const nextItems = imageFiles.map((file) => ({
      id: createPendingMistakeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      source,
    }));

    setPendingImages((current) => [...current, ...nextItems]);
    return nextItems.length;
  }, []);

  function clearPendingImages() {
    pendingImagesRef.current.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });
    pendingImagesRef.current = [];
    setPendingImages([]);
  }

  function removePendingImage(id: string) {
    setPendingImages((current) => {
      const target = current.find((item) => item.id === id);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  const handleClipboardPaste = useCallback((clipboardData: DataTransfer | null) => {
    const appendedCount = appendPendingImages(
      extractImageFilesFromClipboard(clipboardData),
      "paste",
    );

    if (appendedCount > 0) {
      setExportFeedback({
        tone: "success",
        message: `已接收 ${appendedCount} 张剪贴板截图，确认分类后直接保存即可。`,
      });
      return true;
    }

    return false;
  }, [appendPendingImages]);

  useEffect(() => {
    function handleWindowPaste(event: ClipboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      const activeElement = document.activeElement;
      const boardContainsActive =
        activeElement instanceof Node ? boardRef.current?.contains(activeElement) : false;

      if (isEditableElement(activeElement) && !boardContainsActive) {
        return;
      }

      if (!handleClipboardPaste(event.clipboardData)) {
        return;
      }

      event.preventDefault();
    }

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [handleClipboardPaste]);

  function handlePasteAreaPaste(event: ReactClipboardEvent<HTMLDivElement>) {
    if (!handleClipboardPaste(event.clipboardData)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pendingImages.length === 0 || saving) {
      return;
    }

    setSaving(true);

    try {
      await addMistakes({
        subject,
        moduleName,
        date,
        note,
        files: pendingImages.map((item) => item.file),
      });
      setNote("");
      clearPendingImages();
      setFileInputKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定删除这张错题截图吗？")) {
      return;
    }

    await deleteMistake(id);
  }

  async function handleClearAllSaved() {
    if (items.length === 0) {
      return;
    }

    if (!window.confirm("确定清空所有已保存的错题截图吗？建议先导出 PDF 再执行清理。")) {
      return;
    }

    await clearAllMistakes();
    setExportFeedback({
      tone: "success",
      message: "已清空全部已保存错题截图。后续可以继续从 0 开始累计本周错题。",
    });
  }

  async function handleExportPdf() {
    if (visibleItems.length === 0 || exporting) {
      return;
    }

    setExporting(true);
    setExportFeedback(null);

    try {
      const recordsWithBlobs = await Promise.all(
        visibleItems.map(async (item) => {
          const blob = await getMistakeImageBlob(item.id);

          if (!blob) {
            throw new Error(`缺少截图文件：${item.fileName}`);
          }

          const exportRecord: MistakeExportRecord = {
            id: item.id,
            subject: item.subject,
            moduleName: item.moduleName,
            date: item.date,
            note: item.note,
            fileName: item.fileName,
            mimeType: item.mimeType,
            createdAt: item.createdAt,
          };

          return {
            record: exportRecord,
            blob,
          };
        }),
      );

      const formData = new FormData();
      formData.append("scopeLabel", exportScopeLabel);
      formData.append(
        "records",
        JSON.stringify(recordsWithBlobs.map((item) => item.record)),
      );
      recordsWithBlobs.forEach(({ record, blob }) => {
        const extension =
          record.fileName.lastIndexOf(".") >= 0
            ? record.fileName.slice(record.fileName.lastIndexOf("."))
            : record.mimeType === "image/png"
              ? ".png"
              : record.mimeType === "image/jpeg"
                ? ".jpg"
                : record.mimeType === "image/gif"
                  ? ".gif"
                  : ".webp";

        formData.append("images", blob, `${record.id}${extension}`);
      });

      const response = await fetch(MISTAKE_EXPORT_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        message?: string;
        relativePath?: string;
        count?: number;
      };

      if (!response.ok) {
        throw new Error(result.message || "错题本 PDF 导出失败。");
      }

      setExportFeedback({
        tone: "success",
        message: `已导出 ${result.count ?? visibleItems.length} 张截图到 ${result.relativePath ?? getMistakeExportRelativeDirectory()}`,
        action: "clear_after_export",
      });
    } catch (error) {
      setExportFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "错题本 PDF 导出失败。",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <section ref={boardRef} className="panel rounded-[30px] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">Mistake Notebook</p>
          <h2 className="display-title mt-2 text-3xl text-ink">错题本</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            刷题后可以把错题截图直接放进来，按科目和模块沉淀，后续复盘就不用再翻聊天记录或相册。
          </p>
          <p className="mt-2 text-xs leading-6 text-muted">
            导出目录固定为 `{getMistakeExportRelativeDirectory()}`，当前导出名预览：`{exportFileNamePreview}`
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-line bg-white/72 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">截图数量</p>
            <p className="numeric-display mt-2 text-2xl font-semibold text-ink">
              {hydrated ? items.length : "--"}
            </p>
          </div>
          <div className="rounded-[22px] border border-line bg-white/72 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">本地占用</p>
            <p className="numeric-display mt-2 text-2xl font-semibold text-ink">
              {hydrated ? formatBytes(totalStorageBytes) : "--"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-line bg-white/68 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Weekly Capacity</p>
            <h3 className="display-title mt-2 text-2xl text-ink">错题容量提醒</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              这里的 `100` 是建议值，不是硬限制。更适合按周导出、按周清理。
            </p>
          </div>

          <div className="rounded-[22px] border border-line bg-background/72 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">建议容量</p>
            <p className="numeric-display mt-2 text-3xl font-semibold text-ink">
              {hydrated ? `${items.length}/${MISTAKE_STORAGE_GUIDE_COUNT}` : "--"}
            </p>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-background-strong">
          <div
            className={`h-full rounded-full transition-all ${
              storageGuideTone === "danger"
                ? "bg-[linear-gradient(90deg,#b65f33,#8c3f18)]"
                : storageGuideTone === "warn"
                  ? "bg-[linear-gradient(90deg,#d1aa59,#b65f33)]"
                  : "bg-[linear-gradient(90deg,#597062,#203449)]"
            }`}
            style={{ width: `${Math.max(storageGuidePercent, 6)}%` }}
          />
        </div>

        <p className="mt-3 text-sm leading-7 text-muted">{storageGuideMessage}</p>
      </div>

      {!supported ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-line bg-white/60 px-5 py-4 text-sm leading-7 text-muted">
          当前浏览器环境不支持本地错题本存储，暂时无法保存截图。
        </div>
      ) : (
        <>
          <div className="mt-5">
            <form
              onSubmit={handleSubmit}
              className="rounded-[26px] border border-line bg-white/70 p-5 lg:p-6"
            >
              <div
                tabIndex={0}
                onPaste={handlePasteAreaPaste}
                className="rounded-[22px] border border-dashed border-accent/30 bg-accent/6 px-4 py-4 outline-none transition focus:border-accent focus:bg-accent/10"
              >
                <p className="text-sm font-semibold text-ink">截图后可直接 Ctrl+V 粘贴到这里</p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  不必先保存到本地。系统截图、微信截图、QQ 截图等只要把图片放进剪贴板，这里都可以直接接收。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  <span className="font-semibold text-ink">科目</span>
                  <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className={fieldClass}
                  >
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-muted">
                  <span className="font-semibold text-ink">模块</span>
                  <select
                    value={moduleName}
                    onChange={(event) => setModuleName(event.target.value)}
                    className={fieldClass}
                  >
                    {moduleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-muted">
                  <span className="font-semibold text-ink">刷题日期</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="text-sm text-muted">
                  <span className="font-semibold text-ink">截图上传</span>
                  <input
                    key={fileInputKey}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => {
                      appendPendingImages(Array.from(event.target.files ?? []), "upload");
                      setFileInputKey((current) => current + 1);
                    }}
                    className={fieldClass}
                  />
                  <p className="mt-2 text-xs leading-6 text-muted">
                    {pendingImages.length > 0
                      ? `当前待保存 ${pendingImages.length} 张截图。`
                      : "支持文件上传，也支持直接粘贴截图。"}
                  </p>
                </label>

                <label className="text-sm text-muted md:col-span-2">
                  <span className="font-semibold text-ink">备注</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="记录错因、陷阱、同类题思路"
                    rows={4}
                    className={`${fieldClass} resize-none`}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs leading-6 text-muted">
                  保存时会保留原图并写入浏览器本地 IndexedDB，不走 localStorage。
                </p>
                <button
                  type="submit"
                  disabled={pendingImages.length === 0 || saving}
                  className="inline-flex min-w-[10rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? "正在保存..." : "保存到错题本"}
                </button>
              </div>

              {pendingImages.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                      待保存截图 {pendingImages.length} 张
                    </p>
                    <button
                      type="button"
                      onClick={clearPendingImages}
                      className="rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
                    >
                      清空待保存
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {pendingImages.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-line bg-background/60 p-3"
                      >
                        <Image
                          src={item.previewUrl}
                          alt={item.file.name || "待保存截图"}
                          width={1200}
                          height={900}
                          unoptimized
                          className="h-40 w-full rounded-[18px] object-cover"
                        />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {item.source === "paste" ? "来自剪贴板" : "来自文件上传"}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {item.file.name || "未命名截图"} · {formatBytes(item.file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingImage(item.id)}
                            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
                          >
                            移除
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
          </div>

          {!hydrated ? (
            <div className="mt-5 rounded-[24px] border border-line bg-white/60 px-5 py-4 text-sm text-muted">
              正在读取错题本...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-line bg-white/60 px-5 py-4 text-sm leading-7 text-muted">
              还没有错题截图。刷题后直接把截图丢进来，后面按科目回看会更省时间。
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {filterSubjects.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilterSubject(item)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        filterSubject === item
                          ? "bg-accent text-white"
                          : "border border-line bg-white/72 text-muted hover:border-accent/40 hover:text-accent"
                      }`}
                    >
                      {item}
                      {item !== ALL_MISTAKE_SUBJECTS_LABEL ? ` · ${subjectCounts[item] ?? 0}` : ""}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={visibleItems.length === 0 || exporting}
                    className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {exporting ? "正在导出 PDF..." : `导出当前范围 PDF（${visibleItems.length}）`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearAllSaved()}
                    disabled={items.length === 0}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-muted transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    一键清空已保存错题
                  </button>
                </div>
              </div>

              {exportFeedback ? (
                <div
                  className={`rounded-[22px] border px-4 py-3 text-sm leading-7 ${
                    exportFeedback.tone === "success"
                      ? "border-sage/30 bg-sage/10 text-sage"
                      : "border-accent/30 bg-accent/10 text-accent-deep"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p>{exportFeedback.message}</p>
                    {exportFeedback.action === "clear_after_export" && items.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleClearAllSaved()}
                        className="rounded-full border border-sage/30 bg-white/72 px-4 py-2 text-xs font-semibold text-sage transition hover:border-sage/50"
                      >
                        已导出，立即清空
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[22px] border border-line bg-white/60 px-4 py-3 text-sm leading-7 text-muted">
                当前导出范围：{exportScopeLabel}。导出后会在项目根目录生成 PDF，适合阶段性回顾、打印或长期归档。
              </div>
              <div className="space-y-4">
                {groupedItems.map(([groupKey, groupItems]) => (
                  <div
                    key={groupKey}
                    className="rounded-[28px] border border-line bg-white/60 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="eyebrow">Mistake Group</p>
                        <h3 className="display-title mt-2 text-2xl text-ink">{groupKey}</h3>
                      </div>
                      <p className="text-sm text-muted">共 {groupItems.length} 张截图</p>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      {groupItems.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-[24px] border border-line bg-background/60 p-4"
                        >
                          <MistakeImagePreview item={item} />

                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {formatDateLabel(item.date)}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                {formatCreatedAt(item.createdAt)} · {formatBytes(item.sizeBytes)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDelete(item.id)}
                              className="rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
                            >
                              删除
                            </button>
                          </div>

                          <p className="mt-3 text-sm leading-7 text-muted">
                            {item.note || "未填写备注，可后续补充错因、考点或解题方法。"}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
