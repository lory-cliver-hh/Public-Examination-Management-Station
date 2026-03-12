import * as XLSX from "xlsx";
import type { MaterialCatalog, MaterialItem } from "@/lib/mock-data";

type RowRecord = Record<string, unknown>;

type ParsedMaterialWorkbook = {
  catalog: MaterialCatalog[];
  rowCount: number;
  warnings: string[];
};

const FIELD_ALIASES = {
  subject: ["科目", "subject"],
  module: ["模块", "module"],
  chapter: ["章节", "chapter"],
  title: [
    "资料标题",
    "标题",
    "material_title",
    "resource_title",
    "lesson_title",
    "课时标题",
    "视频标题",
  ],
  shareUrl: ["夸克链接", "分享链接", "share_url", "shareUrl", "链接"],
  shareCode: ["提取码", "share_code", "shareCode", "code"],
  note: ["备注", "note"],
} as const;

function readField(row: RowRecord, aliases: readonly string[]) {
  for (const alias of aliases) {
    if (alias in row) {
      return row[alias];
    }
  }

  return "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function applyDerivedMaterialState(catalog: MaterialCatalog[]) {
  return catalog.map((subject) => {
    const totalItems = subject.modules.reduce(
      (sum, moduleGroup) => sum + moduleGroup.items.length,
      0,
    );

    return {
      ...subject,
      summary: `共 ${totalItems} 份资料，按模块集中整理。`,
      modules: subject.modules.map((moduleGroup) => ({
        ...moduleGroup,
        emphasis: `已导入 ${moduleGroup.items.length} 份资料`,
      })),
    };
  });
}

export function buildMaterialCatalogFromRows(rows: RowRecord[]) {
  const warnings: string[] = [];
  const catalogMap = new Map<string, MaterialCatalog>();

  rows.forEach((row, index) => {
    const subject = normalizeText(readField(row, FIELD_ALIASES.subject));
    const moduleName = normalizeText(readField(row, FIELD_ALIASES.module));
    const chapter = normalizeText(readField(row, FIELD_ALIASES.chapter));
    const title = normalizeText(readField(row, FIELD_ALIASES.title));
    const shareUrl = normalizeText(readField(row, FIELD_ALIASES.shareUrl));

    if (!subject || !moduleName || !title) {
      warnings.push(`第 ${index + 2} 行缺少科目、模块或资料标题，已跳过。`);
      return;
    }

    const item: MaterialItem = {
      id: `${subject}-${moduleName}-${chapter}-${title}-${index}`,
      title,
      chapter: chapter || undefined,
      shareUrl: shareUrl || undefined,
      shareCode: normalizeText(readField(row, FIELD_ALIASES.shareCode)) || undefined,
      note: normalizeText(readField(row, FIELD_ALIASES.note)) || "已从 Excel 导入。",
    };

    if (!catalogMap.has(subject)) {
      catalogMap.set(subject, {
        subject,
        summary: "",
        modules: [],
      });
    }

    const subjectBucket = catalogMap.get(subject);
    if (!subjectBucket) {
      return;
    }

    let moduleBucket = subjectBucket.modules.find((entry) => entry.name === moduleName);
    if (!moduleBucket) {
      moduleBucket = {
        name: moduleName,
        emphasis: "",
        items: [],
      };
      subjectBucket.modules.push(moduleBucket);
    }

    moduleBucket.items.push(item);
  });

  return {
    catalog: applyDerivedMaterialState([...catalogMap.values()]),
    warnings,
  };
}

export async function parseMaterialWorkbook(file: File): Promise<ParsedMaterialWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("Excel 中没有可读取的工作表。");
  }

  const rows = XLSX.utils.sheet_to_json<RowRecord>(worksheet, { defval: "" });
  const { catalog, warnings } = buildMaterialCatalogFromRows(rows);

  if (catalog.length === 0) {
    throw new Error("没有解析到有效资料。请检查表头和内容是否完整。");
  }

  return {
    catalog,
    rowCount: rows.length,
    warnings,
  };
}
