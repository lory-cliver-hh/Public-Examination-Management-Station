"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  MISTAKE_IMAGE_BUCKET,
  buildMistakeStoragePath,
  requireUser,
  selectUserState,
  updateUserState,
} from "@/lib/supabase/user-state";

export const MISTAKE_STORAGE_GUIDE_COUNT = 100;
export const UNCATEGORIZED_MISTAKE_LABEL = "未分类";

export type MistakeRecord = {
  id: string;
  subject: string;
  moduleName: string;
  date: string;
  note: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
  storagePath: string;
};

type AddMistakeInput = {
  subject: string;
  moduleName: string;
  date: string;
  note: string;
  files: File[];
};

type MistakeNotebookContextValue = {
  items: MistakeRecord[];
  totalStorageBytes: number;
  addMistakes: (input: AddMistakeInput) => Promise<void>;
  deleteMistake: (id: string) => Promise<void>;
  clearAllMistakes: () => Promise<void>;
  getMistakeImageBlob: (id: string) => Promise<Blob | null>;
  hydrated: boolean;
  supported: boolean;
};

type StoredMistakeImage = {
  record: MistakeRecord;
  blob: Blob;
};

const MistakeNotebookContext = createContext<MistakeNotebookContextValue | null>(null);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeCategory(value: string) {
  const normalized = value.trim();
  return normalized || UNCATEGORIZED_MISTAKE_LABEL;
}

function createMistakeId() {
  return `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortMistakeRecords(records: MistakeRecord[]) {
  return [...records].sort((left, right) => {
    const dateDiff = right.date.localeCompare(left.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function normalizeMistakeRecord(raw: unknown): MistakeRecord | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.date !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.fileName !== "string" ||
    typeof record.mimeType !== "string" ||
    typeof record.storagePath !== "string"
  ) {
    return null;
  }

  const width = Number(record.width);
  const height = Number(record.height);
  const sizeBytes = Number(record.sizeBytes);

  return {
    id: record.id,
    subject:
      typeof record.subject === "string"
        ? normalizeCategory(record.subject)
        : UNCATEGORIZED_MISTAKE_LABEL,
    moduleName:
      typeof record.moduleName === "string"
        ? normalizeCategory(record.moduleName)
        : UNCATEGORIZED_MISTAKE_LABEL,
    date: isDateKey(record.date) ? record.date : getLocalDateKey(),
    note: typeof record.note === "string" ? record.note.trim() : "",
    fileName: record.fileName,
    mimeType: record.mimeType,
    width: Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0,
    height: Number.isFinite(height) ? Math.max(0, Math.round(height)) : 0,
    sizeBytes: Number.isFinite(sizeBytes) ? Math.max(0, Math.round(sizeBytes)) : 0,
    createdAt: record.createdAt,
    storagePath: record.storagePath,
  };
}

async function loadImageSource(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);

    return {
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return new Promise<{
    width: number;
    height: number;
    cleanup: () => void;
  }>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(imageUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("图片读取失败"));
    };

    image.src = imageUrl;
  });
}

async function prepareMistakeImage(file: File) {
  const source = await loadImageSource(file);

  try {
    return {
      blob: file,
      width: Math.max(1, Math.round(source.width)),
      height: Math.max(1, Math.round(source.height)),
    };
  } finally {
    source.cleanup();
  }
}

export function MistakeNotebookProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [items, setItems] = useState<MistakeRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [supported, setSupported] = useState(true);
  const itemsRef = useRef<MistakeRecord[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined" || typeof File === "undefined") {
      if (!cancelled) {
        setSupported(false);
        setHydrated(true);
      }

      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const { data } = await selectUserState<{ mistake_records: unknown }>(
          supabase,
          "mistake_records",
        );

        if (!cancelled) {
          setItems(
            sortMistakeRecords(
              Array.isArray(data.mistake_records)
                ? data.mistake_records
                    .map((item) => normalizeMistakeRecord(item))
                    .filter((item): item is MistakeRecord => item !== null)
                : [],
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setSupported(false);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const value = useMemo<MistakeNotebookContextValue>(
    () => ({
      items,
      totalStorageBytes: items.reduce((total, item) => total + item.sizeBytes, 0),
      addMistakes: async (input) => {
        const validFiles = input.files.filter((file) => file.type.startsWith("image/"));

        if (validFiles.length === 0) {
          return;
        }

        const user = await requireUser(supabase);
        const normalizedDate = isDateKey(input.date) ? input.date : getLocalDateKey();
        const normalizedSubject = normalizeCategory(input.subject);
        const normalizedModule = normalizeCategory(input.moduleName);
        const normalizedNote = input.note.trim();
        const uploadedPaths: string[] = [];

        try {
          const preparedItems: StoredMistakeImage[] = [];

          for (const file of validFiles) {
            const preparedImage = await prepareMistakeImage(file);
            const id = createMistakeId();
            const mimeType = preparedImage.blob.type || file.type || "image/png";
            const storagePath = buildMistakeStoragePath(user.id, id, file.name, mimeType);

            const record: MistakeRecord = {
              id,
              subject: normalizedSubject,
              moduleName: normalizedModule,
              date: normalizedDate,
              note: normalizedNote,
              fileName: file.name || "错题截图",
              mimeType,
              width: preparedImage.width,
              height: preparedImage.height,
              sizeBytes: preparedImage.blob.size,
              createdAt: new Date().toISOString(),
              storagePath,
            };

            const { error } = await supabase.storage
              .from(MISTAKE_IMAGE_BUCKET)
              .upload(storagePath, preparedImage.blob, {
                contentType: mimeType,
                upsert: false,
              });

            if (error) {
              throw error;
            }

            uploadedPaths.push(storagePath);
            preparedItems.push({
              record,
              blob: preparedImage.blob,
            });
          }

          const mergedItems = sortMistakeRecords([
            ...preparedItems.map((item) => item.record),
            ...itemsRef.current,
          ]);

          await updateUserState(supabase, {
            mistake_records: mergedItems,
          });
          setItems(mergedItems);
        } catch (error) {
          if (uploadedPaths.length > 0) {
            await supabase.storage.from(MISTAKE_IMAGE_BUCKET).remove(uploadedPaths);
          }

          throw error;
        }
      },
      deleteMistake: async (id) => {
        const nextItems = itemsRef.current.filter((item) => item.id !== id);
        const target = itemsRef.current.find((item) => item.id === id);

        await updateUserState(supabase, {
          mistake_records: nextItems,
        });
        setItems(nextItems);

        if (target?.storagePath) {
          await supabase.storage.from(MISTAKE_IMAGE_BUCKET).remove([target.storagePath]);
        }
      },
      clearAllMistakes: async () => {
        const paths = itemsRef.current
          .map((item) => item.storagePath)
          .filter((item) => item.length > 0);

        await updateUserState(supabase, {
          mistake_records: [],
        });
        setItems([]);

        if (paths.length > 0) {
          await supabase.storage.from(MISTAKE_IMAGE_BUCKET).remove(paths);
        }
      },
      getMistakeImageBlob: async (id) => {
        const target = itemsRef.current.find((item) => item.id === id);

        if (!target?.storagePath) {
          return null;
        }

        const { data, error } = await supabase.storage
          .from(MISTAKE_IMAGE_BUCKET)
          .download(target.storagePath);

        if (error) {
          return null;
        }

        return data;
      },
      hydrated,
      supported,
    }),
    [hydrated, items, supported, supabase],
  );

  return (
    <MistakeNotebookContext.Provider value={value}>
      {children}
    </MistakeNotebookContext.Provider>
  );
}

export function useMistakeNotebook() {
  const context = useContext(MistakeNotebookContext);

  if (!context) {
    throw new Error("useMistakeNotebook must be used within MistakeNotebookProvider");
  }

  return context;
}
