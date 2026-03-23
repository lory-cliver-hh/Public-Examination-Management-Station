import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT_DIR = process.cwd();
const RESOURCE_DIR = path.join(ROOT_DIR, "resources_class");
const VIDEO_DIR = path.join(RESOURCE_DIR, "视频资源");
const MATERIAL_DIR = path.join(RESOURCE_DIR, "资料资源");

const COURSE_HEADERS = [
  "subject",
  "module",
  "chapter",
  "lesson_title",
  "duration",
  "status",
  "share_url",
  "share_code",
  "note",
];

const MATERIAL_HEADERS = [
  "subject",
  "module",
  "chapter",
  "material_title",
  "share_url",
  "share_code",
  "note",
];
const UTF8_BOM = "\uFEFF";

function normalizeText(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeCsvValue(value) {
  return normalizeText(value).replace(/,/g, "，").replace(/"/g, "”");
}

function listSourceFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((fileName) => !fileName.startsWith("~$"))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function readWorkbookRows(filePath) {
  const buffer = fs.readFileSync(filePath);
  const isZipFile = buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  const workbook = isZipFile
    ? XLSX.read(buffer, { type: "buffer" })
    : XLSX.read(buffer.toString("utf8"), { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function normalizeHeaderRow(row) {
  return row.map((cell) => normalizeText(cell));
}

function rowsToObjects(rows) {
  if (rows.length === 0) {
    return [];
  }

  const headers = normalizeHeaderRow(rows[0]);
  return rows.slice(1).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {});
  });
}

function extractShareUrl(text) {
  const match = String(text ?? "").match(/https:\/\/pan\.quark\.cn\/s\/[a-zA-Z0-9]+/);
  return match ? match[0] : "";
}

function extractShareTitle(text) {
  const match = String(text ?? "").match(/分享了「(.+?)」/);
  return match ? match[1].trim() : "";
}

function formatShareTime(rawValue) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const parsed = XLSX.SSF.parse_date_code(rawValue);

    if (!parsed) {
      return "";
    }

    const year = parsed.y;
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    const hour = String(parsed.H).padStart(2, "0");
    const minute = String(parsed.M).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return normalizeText(rawValue);
}

function cleanModuleName(fileName) {
  return path.basename(fileName, path.extname(fileName)).replace(/-\d{10,}$/, "");
}

function deriveSubject(moduleName) {
  if (moduleName === "申论") {
    return "申论";
  }

  if (moduleName === "政治理论") {
    return "政治理论";
  }

  return "行测";
}

function cleanTitle(rawTitle) {
  return normalizeText(rawTitle)
    .replace(/\.[a-zA-Z0-9]{2,4}$/u, "")
    .replace(/^(\d{8})[\s_-]*/u, "")
    .trim();
}

function deriveCourseChapter(rawTitle) {
  const text = normalizeText(rawTitle);
  const match = text.match(/^(\d{8})/u);

  if (!match) {
    return "";
  }

  const dateText = match[1];
  return `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`;
}

function buildStandardShareItems(rows) {
  return rowsToObjects(rows)
    .map((row) => {
      const status = normalizeText(row["创建分享状态"] ?? row["﻿创建分享状态"]);
      const title = normalizeText(row["分享名"]);
      const shareUrl = extractShareUrl(row["分享地址"]);

      if (!title || !shareUrl) {
        return null;
      }

      return {
        status,
        title,
        shareUrl,
        shareCode: normalizeText(row["提取码"]),
        shareTime: formatShareTime(row["分享时间"]),
      };
    })
    .filter((item) => item && (!item.status || item.status === "成功"));
}

function buildSingleShareItem(rows, fallbackTitle) {
  const cells = rows.flat().map((cell) => normalizeText(cell)).filter(Boolean);
  const combinedText = cells.join(" ");
  const shareUrl = extractShareUrl(combinedText);
  const title = extractShareTitle(combinedText) || fallbackTitle;

  if (!shareUrl) {
    return [];
  }

  return [
    {
      status: "成功",
      title,
      shareUrl,
      shareCode: "",
      shareTime: "",
    },
  ];
}

function parseSourceItems(filePath) {
  const rows = readWorkbookRows(filePath);

  if (rows.length === 0) {
    return [];
  }

  const headers = normalizeHeaderRow(rows[0]);
  if (headers.includes("分享名") || headers.includes("﻿创建分享状态") || headers.includes("创建分享状态")) {
    return buildStandardShareItems(rows);
  }

  return buildSingleShareItem(rows, cleanModuleName(path.basename(filePath)));
}

function buildCourseRows() {
  const rows = [];

  for (const fileName of listSourceFiles(VIDEO_DIR)) {
    const moduleName = cleanModuleName(fileName);
    const subject = deriveSubject(moduleName);
    const sourceItems = parseSourceItems(path.join(VIDEO_DIR, fileName));

    for (const item of sourceItems) {
      rows.push({
        subject,
        module: moduleName,
        chapter: deriveCourseChapter(item.title),
        lesson_title: cleanTitle(item.title),
        duration: "",
        status: "未开始",
        share_url: item.shareUrl,
        share_code: item.shareCode,
        note: item.shareTime
          ? `来源：视频资源/${fileName} 分享时间：${item.shareTime}`
          : `来源：视频资源/${fileName}`,
      });
    }
  }

  return rows;
}

function buildMaterialRows() {
  const rows = [];

  for (const fileName of listSourceFiles(MATERIAL_DIR)) {
    const moduleName = cleanModuleName(fileName);
    const subject = deriveSubject(moduleName);
    const sourceItems = parseSourceItems(path.join(MATERIAL_DIR, fileName));

    for (const item of sourceItems) {
      rows.push({
        subject,
        module: moduleName,
        chapter: "",
        material_title: cleanTitle(item.title),
        share_url: item.shareUrl,
        share_code: item.shareCode,
        note: item.shareTime
          ? `来源：资料资源/${fileName} 分享时间：${item.shareTime}`
          : `来源：资料资源/${fileName}`,
      });
    }
  }

  return rows;
}

function toCsv(headers, rows) {
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => sanitizeCsvValue(row[header])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function writeTemplate(relativePath, content, warnings, optional = false) {
  const filePath = path.join(ROOT_DIR, relativePath);

  try {
    fs.writeFileSync(filePath, `${UTF8_BOM}${content}`, "utf8");
  } catch (error) {
    if (
      optional &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EBUSY" || error.code === "EPERM")
    ) {
      warnings.push(`跳过写入 ${relativePath}，文件当前被占用。`);
      return;
    }

    throw error;
  }
}

function main() {
  const courseRows = buildCourseRows();
  const materialRows = buildMaterialRows();
  const warnings = [];

  const courseCsv = toCsv(COURSE_HEADERS, courseRows);
  const materialCsv = toCsv(MATERIAL_HEADERS, materialRows);

  writeTemplate("course-import-template.csv", courseCsv, warnings);
  writeTemplate("material-import-template.csv", materialCsv, warnings);
  writeTemplate(
    path.join("resources_class", "course-import-template.csv"),
    courseCsv,
    warnings,
    true,
  );
  writeTemplate(
    path.join("resources_class", "material-import-template.csv"),
    materialCsv,
    warnings,
    true,
  );

  console.log(
    JSON.stringify(
      {
        courseRows: courseRows.length,
        materialRows: materialRows.length,
        courseOutput: "course-import-template.csv",
        materialOutput: "material-import-template.csv",
        warnings,
      },
      null,
      2,
    ),
  );
}

main();
