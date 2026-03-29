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

const DB_NAME = "gongkao-manager:mistake-notebook";
const DB_VERSION = 1;
const MISTAKES_STORE = "mistakes";
const IMAGES_STORE = "mistake-images";
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
    typeof record.mimeType !== "string"
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
  };
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("数据库操作失败"));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("数据库事务已中断"));
    transaction.onerror = () => reject(transaction.error ?? new Error("数据库事务失败"));
  });
}

function openMistakeNotebookDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(MISTAKES_STORE)) {
        const mistakeStore = database.createObjectStore(MISTAKES_STORE, {
          keyPath: "id",
        });

        mistakeStore.createIndex("date", "date");
        mistakeStore.createIndex("subject", "subject");
      }

      if (!database.objectStoreNames.contains(IMAGES_STORE)) {
        database.createObjectStore(IMAGES_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("错题本数据库打开失败"));
    request.onblocked = () => reject(new Error("错题本数据库当前被占用"));
  });
}

async function readAllMistakes(database: IDBDatabase) {
  const transaction = database.transaction(MISTAKES_STORE, "readonly");
  const rawItems = await requestToPromise(transaction.objectStore(MISTAKES_STORE).getAll());
  await waitForTransaction(transaction);

  return sortMistakeRecords(
    rawItems
      .map((item) => normalizeMistakeRecord(item))
      .filter((item): item is MistakeRecord => item !== null),
  );
}

async function writeMistakeChanges(
  database: IDBDatabase,
  input: {
    add: StoredMistakeImage[];
    removeIds: string[];
  },
) {
  const transaction = database.transaction([MISTAKES_STORE, IMAGES_STORE], "readwrite");
  const mistakeStore = transaction.objectStore(MISTAKES_STORE);
  const imageStore = transaction.objectStore(IMAGES_STORE);

  input.add.forEach((item) => {
    mistakeStore.put(item.record);
    imageStore.put(item.blob, item.record.id);
  });

  input.removeIds.forEach((id) => {
    mistakeStore.delete(id);
    imageStore.delete(id);
  });

  await waitForTransaction(transaction);
}

async function readMistakeImageBlob(database: IDBDatabase, id: string) {
  const transaction = database.transaction(IMAGES_STORE, "readonly");
  const rawBlob = await requestToPromise(transaction.objectStore(IMAGES_STORE).get(id));
  await waitForTransaction(transaction);

  return rawBlob instanceof Blob ? rawBlob : null;
}

async function clearMistakeStores(database: IDBDatabase) {
  const transaction = database.transaction([MISTAKES_STORE, IMAGES_STORE], "readwrite");
  transaction.objectStore(MISTAKES_STORE).clear();
  transaction.objectStore(IMAGES_STORE).clear();
  await waitForTransaction(transaction);
}

async function loadImageSource(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);

    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return new Promise<{
    source: CanvasImageSource;
    width: number;
    height: number;
    cleanup: () => void;
  }>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        source: image,
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
  const [items, setItems] = useState<MistakeRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [supported, setSupported] = useState(true);
  const databaseRef = useRef<IDBDatabase | null>(null);
  const itemsRef = useRef<MistakeRecord[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined" || !("indexedDB" in window)) {
      const timer = setTimeout(() => {
        if (!cancelled) {
          setSupported(false);
          setHydrated(true);
        }
      }, 0);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    void openMistakeNotebookDb()
      .then(async (database) => {
        if (cancelled) {
          database.close();
          return;
        }

        databaseRef.current = database;
        const storedItems = await readAllMistakes(database);

        if (!cancelled) {
          setItems(storedItems);
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupported(false);
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
      databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, []);

  const value = useMemo<MistakeNotebookContextValue>(
    () => ({
      items,
      totalStorageBytes: items.reduce((total, item) => total + item.sizeBytes, 0),
      addMistakes: async (input) => {
        const database = databaseRef.current;

        if (!database) {
          return;
        }

        const validFiles = input.files.filter((file) => file.type.startsWith("image/"));

        if (validFiles.length === 0) {
          return;
        }

        const normalizedDate = isDateKey(input.date) ? input.date : getLocalDateKey();
        const normalizedSubject = normalizeCategory(input.subject);
        const normalizedModule = normalizeCategory(input.moduleName);
        const normalizedNote = input.note.trim();
        const preparedItems = await Promise.all(
          validFiles.map(async (file) => {
            const preparedImage = await prepareMistakeImage(file);
            const record: MistakeRecord = {
              id: createMistakeId(),
              subject: normalizedSubject,
              moduleName: normalizedModule,
              date: normalizedDate,
              note: normalizedNote,
              fileName: file.name || "错题截图",
              mimeType: preparedImage.blob.type || file.type || "image/png",
              width: preparedImage.width,
              height: preparedImage.height,
              sizeBytes: preparedImage.blob.size,
              createdAt: new Date().toISOString(),
            };

            return {
              record,
              blob: preparedImage.blob,
            };
          }),
        );

        const mergedItems = sortMistakeRecords([
          ...preparedItems.map((item) => item.record),
          ...itemsRef.current,
        ]);

        await writeMistakeChanges(database, {
          add: preparedItems,
          removeIds: [],
        });

        setItems(mergedItems);
      },
      deleteMistake: async (id) => {
        const database = databaseRef.current;

        if (!database) {
          return;
        }

        await writeMistakeChanges(database, {
          add: [],
          removeIds: [id],
        });

        setItems((current) => current.filter((item) => item.id !== id));
      },
      clearAllMistakes: async () => {
        const database = databaseRef.current;

        if (!database) {
          return;
        }

        await clearMistakeStores(database);
        setItems([]);
      },
      getMistakeImageBlob: async (id) => {
        const database = databaseRef.current;

        if (!database) {
          return null;
        }

        return readMistakeImageBlob(database, id);
      },
      hydrated,
      supported,
    }),
    [hydrated, items, supported],
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
