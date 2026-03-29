export const ALL_MISTAKE_SUBJECTS_LABEL = "全部科目";
export const MISTAKE_EXPORT_ENDPOINT = "/api/mistakes/export";
export const MISTAKE_EXPORT_DIRECTORY_SEGMENTS = [
  "output",
  "pdf",
  "mistake-notebooks",
] as const;

export type MistakeExportRecord = {
  id: string;
  subject: string;
  moduleName: string;
  date: string;
  note: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimestamp(date: Date) {
  return [
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("_");
}

export function sanitizeFileSegment(value: string) {
  const normalized = value.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  const collapsed = normalized.replace(/\s+/g, "");
  return collapsed || "未命名";
}

export function buildMistakeExportFileName(scopeLabel: string, date = new Date()) {
  return `错题本_${sanitizeFileSegment(scopeLabel)}_${formatTimestamp(date)}.pdf`;
}

export function getMistakeExportRelativeDirectory() {
  return MISTAKE_EXPORT_DIRECTORY_SEGMENTS.join("/");
}

