import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { buildMaterialCatalogFromRows } from "@/lib/material-import";
import { materialsCatalog, type MaterialCatalog } from "@/lib/mock-data";

export type MaterialImportMeta = {
  fileName: string;
  rowCount: number;
  importedAt: string;
  warnings: string[];
};

type MaterialTemplatePayload = {
  catalog: MaterialCatalog[];
  importMeta: MaterialImportMeta | null;
};

const TEMPLATE_FILE = "material-import-template.csv";

function parseCsvLine(line: string) {
  return line.split(",");
}

function decodeTemplateContent(filePath: string) {
  const buffer = readFileSync(filePath);
  const utf8Content = new TextDecoder("utf-8").decode(buffer);

  if (!utf8Content.includes("�")) {
    return utf8Content;
  }

  return new TextDecoder("gb18030").decode(buffer);
}

export function loadMaterialTemplatePayload(): MaterialTemplatePayload {
  const filePath = path.join(process.cwd(), TEMPLATE_FILE);

  if (!existsSync(filePath)) {
    return {
      catalog: materialsCatalog,
      importMeta: null,
    };
  }

  const content = decodeTemplateContent(filePath);
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {
      catalog: materialsCatalog,
      importMeta: null,
    };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
  });

  const { catalog, warnings } = buildMaterialCatalogFromRows(rows);
  const stats = statSync(filePath);

  return {
    catalog: catalog.length > 0 ? catalog : materialsCatalog,
    importMeta: {
      fileName: TEMPLATE_FILE,
      rowCount: rows.length,
      importedAt: stats.mtime.toISOString(),
      warnings,
    },
  };
}
