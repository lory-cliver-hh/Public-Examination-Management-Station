import * as XLSX from "xlsx";
import type { CourseCatalog, Lesson } from "@/lib/mock-data";

type RowRecord = Record<string, unknown>;

type ParsedCourseWorkbook = {
  catalog: CourseCatalog[];
  rowCount: number;
  warnings: string[];
};

const FIELD_ALIASES = {
  subject: ["科目", "subject"],
  module: ["模块", "module"],
  chapter: ["章节", "chapter"],
  lessonTitle: ["课时", "课时标题", "视频标题", "lesson", "lesson_title"],
  duration: ["时长", "时长(分钟)", "duration"],
  status: ["状态", "学习状态", "status"],
  shareUrl: ["夸克链接", "分享链接", "share_url", "shareUrl", "链接"],
  shareCode: ["提取码", "share_code", "shareCode", "code"],
  note: ["备注", "note"],
} as const;

function normalizeFieldName(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function readField(row: RowRecord, aliases: readonly string[]) {
  for (const alias of aliases) {
    if (alias in row) {
      return row[alias];
    }
  }

  const normalizedAliases = new Set(aliases.map(normalizeFieldName));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeFieldName(key))) {
      return value;
    }
  }

  return "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeDuration(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return "待补";
  }

  return /^\d+$/.test(text) ? `${text} 分钟` : text;
}

function decodeCsvText(buffer: ArrayBuffer) {
  const utf8Text = new TextDecoder("utf-8").decode(buffer);

  if (!utf8Text.includes("�")) {
    return utf8Text;
  }

  return new TextDecoder("gb18030").decode(buffer);
}

async function readWorkbookRows(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isZipWorkbook = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const isCsvFile = file.name.toLowerCase().endsWith(".csv");
  const workbook = isCsvFile && !isZipWorkbook
    ? XLSX.read(decodeCsvText(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("Excel 中没有可读取的工作表。");
  }

  return XLSX.utils.sheet_to_json<RowRecord>(worksheet, { defval: "" });
}

function normalizeStatus(value: unknown): Lesson["status"] {
  const text = normalizeText(value);

  if (text === "已完成" || text === "完成") {
    return "已完成";
  }

  if (text === "学习中" || text === "进行中" || text === "未学完") {
    return "学习中";
  }

  return "未开始";
}

function applyDerivedCatalogState(catalog: CourseCatalog[]) {
  return catalog.map((subject) => {
    const allLessons = subject.modules.flatMap((module) => module.lessons);
    const completed = allLessons.filter((lesson) => lesson.status === "已完成").length;
    const active = allLessons.filter((lesson) => lesson.status === "学习中").length;
    const total = allLessons.length || 1;

    return {
      ...subject,
      weeklyGoal: `共 ${allLessons.length} 节课时，当前 ${active} 节学习中，${completed} 节已完成。`,
      progress: Math.round((completed / total) * 100),
      modules: subject.modules.map((module) => ({
        ...module,
        emphasis: module.lessons.some((lesson) => lesson.status === "学习中")
          ? "当前有课时正在推进"
          : module.lessons.some((lesson) => lesson.status === "未开始")
            ? "已导入待推进"
            : "模块已完成",
      })),
    };
  });
}

export function buildCatalogFromRows(rows: RowRecord[]) {
  const warnings: string[] = [];
  const catalogMap = new Map<string, CourseCatalog>();

  rows.forEach((row, index) => {
    const subject = normalizeText(readField(row, FIELD_ALIASES.subject));
    const moduleName = normalizeText(readField(row, FIELD_ALIASES.module));
    const chapter = normalizeText(readField(row, FIELD_ALIASES.chapter));
    const lessonTitle = normalizeText(readField(row, FIELD_ALIASES.lessonTitle));
    const shareUrl = normalizeText(readField(row, FIELD_ALIASES.shareUrl));

    if (!subject || !moduleName || !lessonTitle) {
      warnings.push(`第 ${index + 2} 行缺少科目、模块或课时标题，已跳过。`);
      return;
    }

    const status = normalizeStatus(readField(row, FIELD_ALIASES.status));
    const lesson: Lesson = {
      id: `${subject}-${moduleName}-${chapter}-${lessonTitle}-${index}`,
      title: lessonTitle,
      duration: normalizeDuration(readField(row, FIELD_ALIASES.duration)),
      status,
      chapter: chapter || undefined,
      shareUrl: shareUrl || undefined,
      shareCode: normalizeText(readField(row, FIELD_ALIASES.shareCode)) || undefined,
      note: normalizeText(readField(row, FIELD_ALIASES.note)) || "已从 Excel 导入。",
    };

    if (!catalogMap.has(subject)) {
      catalogMap.set(subject, {
        subject,
        weeklyGoal: "",
        progress: 0,
        modules: [],
      });
    }

    const subjectBucket = catalogMap.get(subject);
    if (!subjectBucket) {
      return;
    }

    let moduleBucket = subjectBucket.modules.find((item) => item.name === moduleName);
    if (!moduleBucket) {
      moduleBucket = {
        name: moduleName,
        emphasis: "Excel 导入模块",
        lessons: [],
      };
      subjectBucket.modules.push(moduleBucket);
    }

    moduleBucket.lessons.push(lesson);
  });

  const catalog = applyDerivedCatalogState([...catalogMap.values()]);

  return { catalog, warnings };
}

export function syncCatalogStatus(catalog: CourseCatalog[]) {
  return applyDerivedCatalogState(catalog);
}

export async function parseCourseWorkbook(file: File): Promise<ParsedCourseWorkbook> {
  const rows = await readWorkbookRows(file);
  const { catalog, warnings } = buildCatalogFromRows(rows);

  if (catalog.length === 0) {
    throw new Error("没有解析到有效课时。请检查表头和内容是否完整。");
  }

  return {
    catalog,
    rowCount: rows.length,
    warnings,
  };
}
