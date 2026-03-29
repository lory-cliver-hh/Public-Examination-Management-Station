import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import {
  ALL_MISTAKE_SUBJECTS_LABEL,
  MISTAKE_EXPORT_DIRECTORY_SEGMENTS,
  buildMistakeExportFileName,
  type MistakeExportRecord,
} from "@/lib/mistake-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportManifestRecord = MistakeExportRecord & {
  imagePath: string;
};

type ExportManifest = {
  title: string;
  scopeLabel: string;
  exportedAt: string;
  records: ExportManifestRecord[];
};

function inferFileExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension) {
    return extension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return ".img";
  }
}

function normalizeRelativePath(filePath: string, cwd: string) {
  return path.relative(cwd, filePath).split(path.sep).join("/");
}

async function runPythonPdfExport(manifestPath: string, outputPath: string, cwd: string) {
  const scriptPath = path.join(cwd, "scripts", "export_mistakes_pdf.py");

  return new Promise<void>((resolve, reject) => {
    const processHandle = spawn("python", [scriptPath, manifestPath, outputPath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    processHandle.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    processHandle.on("error", (error) => {
      reject(error);
    });

    processHandle.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `PDF 导出脚本退出码 ${code}`));
    });
  });
}

function isMistakeExportRecord(value: unknown): value is MistakeExportRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.subject === "string" &&
    typeof record.moduleName === "string" &&
    typeof record.date === "string" &&
    typeof record.note === "string" &&
    typeof record.fileName === "string" &&
    typeof record.mimeType === "string" &&
    typeof record.createdAt === "string"
  );
}

export async function POST(request: Request) {
  const cwd = process.cwd();
  const exportRoot = path.join(cwd, ...MISTAKE_EXPORT_DIRECTORY_SEGMENTS);
  const tempRoot = path.join(cwd, "tmp", "pdfs");
  const tempDir = path.join(
    tempRoot,
    `mistake-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  try {
    const formData = await request.formData();
    const rawRecords = formData.get("records");
    const scopeLabel =
      typeof formData.get("scopeLabel") === "string" && formData.get("scopeLabel")
        ? String(formData.get("scopeLabel"))
        : ALL_MISTAKE_SUBJECTS_LABEL;

    if (typeof rawRecords !== "string") {
      return NextResponse.json({ message: "缺少导出记录数据。" }, { status: 400 });
    }

    const parsedRecords = JSON.parse(rawRecords) as unknown;

    if (!Array.isArray(parsedRecords) || parsedRecords.length === 0) {
      return NextResponse.json({ message: "没有可导出的错题记录。" }, { status: 400 });
    }

    const records = parsedRecords.filter(isMistakeExportRecord);

    if (records.length !== parsedRecords.length) {
      return NextResponse.json({ message: "导出记录格式不正确。" }, { status: 400 });
    }

    const uploadedImages = new Map<string, File>();

    formData.getAll("images").forEach((value) => {
      if (!(value instanceof File)) {
        return;
      }

      const imageId = path.parse(value.name).name;
      uploadedImages.set(imageId, value);
    });

    await fs.mkdir(exportRoot, { recursive: true });
    await fs.mkdir(tempDir, { recursive: true });

    const manifestRecords: ExportManifestRecord[] = [];

    for (const [index, record] of records.entries()) {
      const imageFile = uploadedImages.get(record.id);

      if (!imageFile) {
        throw new Error(`缺少错题截图：${record.fileName}`);
      }

      const extension = inferFileExtension(imageFile.name, imageFile.type || record.mimeType);
      const imagePath = path.join(
        tempDir,
        `${String(index + 1).padStart(3, "0")}_${record.id}${extension}`,
      );

      await fs.writeFile(imagePath, Buffer.from(await imageFile.arrayBuffer()));
      manifestRecords.push({
        ...record,
        imagePath,
      });
    }

    const exportDate = new Date();
    const outputFileName = buildMistakeExportFileName(scopeLabel, exportDate);
    const outputPath = path.join(exportRoot, outputFileName);
    const manifestPath = path.join(tempDir, "manifest.json");
    const manifest: ExportManifest = {
      title: "公考错题本导出",
      scopeLabel,
      exportedAt: exportDate.toISOString(),
      records: manifestRecords,
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    await runPythonPdfExport(manifestPath, outputPath, cwd);

    return NextResponse.json({
      fileName: outputFileName,
      count: manifestRecords.length,
      absolutePath: outputPath,
      relativePath: normalizeRelativePath(outputPath, cwd),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "错题本 PDF 导出失败。",
      },
      { status: 500 },
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

