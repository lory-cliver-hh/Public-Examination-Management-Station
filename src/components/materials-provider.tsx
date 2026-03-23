"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { materialsCatalog, type MaterialCatalog } from "@/lib/mock-data";
import type { MaterialImportMeta } from "@/lib/material-template-server";

const STORAGE_KEY = "gongkao-manager:materials-catalog";
const MOJIBAKE_PATTERN = /[\u00C0-\u00FF]/;

type StoredMaterialsPayload = {
  catalog: MaterialCatalog[];
  importMeta: MaterialImportMeta | null;
};

type MaterialsContextValue = {
  catalog: MaterialCatalog[];
  setCatalog: Dispatch<SetStateAction<MaterialCatalog[]>>;
  importMeta: MaterialImportMeta | null;
  importCatalog: (catalog: MaterialCatalog[], meta: MaterialImportMeta) => void;
  resetCatalog: () => void;
  hydrated: boolean;
};

const MaterialsContext = createContext<MaterialsContextValue | null>(null);

function normalizeStoredPayload(
  raw: unknown,
  fallback: StoredMaterialsPayload,
): StoredMaterialsPayload {
  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const catalog = Array.isArray(record.catalog)
    ? (record.catalog as MaterialCatalog[])
    : fallback.catalog;
  const importMeta =
    typeof record.importMeta === "object" && record.importMeta !== null
      ? (record.importMeta as MaterialImportMeta)
      : null;

  return {
    catalog: catalog.length > 0 ? catalog : fallback.catalog,
    importMeta,
  };
}

function hasMojibake(text: string | undefined) {
  if (!text) {
    return false;
  }

  return MOJIBAKE_PATTERN.test(text) && !/[\u4e00-\u9fff]/.test(text);
}

function hasCorruptedCatalog(catalog: MaterialCatalog[]) {
  return catalog.some((subject) =>
    hasMojibake(subject.subject) ||
    subject.modules.some((moduleGroup) =>
      hasMojibake(moduleGroup.name) ||
      moduleGroup.items.some((item) =>
        hasMojibake(item.title) ||
        hasMojibake(item.chapter) ||
        hasMojibake(item.note),
      ),
    ),
  );
}

export function MaterialsProvider({
  children,
  initialCatalog = materialsCatalog,
  initialImportMeta = null,
}: {
  children: ReactNode;
  initialCatalog?: MaterialCatalog[];
  initialImportMeta?: MaterialImportMeta | null;
}) {
  const [catalog, setCatalog] = useState<MaterialCatalog[]>(initialCatalog);
  const [importMeta, setImportMeta] = useState<MaterialImportMeta | null>(
    initialImportMeta,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fallbackPayload: StoredMaterialsPayload = {
      catalog: initialCatalog,
      importMeta: initialImportMeta,
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeStoredPayload(JSON.parse(raw), fallbackPayload);

        if (parsed.importMeta && !hasCorruptedCatalog(parsed.catalog)) {
          setCatalog(parsed.catalog);
          setImportMeta(parsed.importMeta);
        } else {
          if (parsed.importMeta && hasCorruptedCatalog(parsed.catalog)) {
            window.localStorage.removeItem(STORAGE_KEY);
          }
          setCatalog(initialCatalog);
          setImportMeta(initialImportMeta);
        }
      }
    } finally {
      setHydrated(true);
    }
  }, [initialCatalog, initialImportMeta]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const payload: StoredMaterialsPayload = { catalog, importMeta };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [catalog, hydrated, importMeta]);

  const value = useMemo<MaterialsContextValue>(
    () => ({
      catalog,
      setCatalog,
      importMeta,
      importCatalog: (nextCatalog, meta) => {
        setCatalog(nextCatalog);
        setImportMeta(meta);
      },
      resetCatalog: () => {
        setCatalog(initialCatalog);
        setImportMeta(initialImportMeta);
      },
      hydrated,
    }),
    [catalog, hydrated, importMeta, initialCatalog, initialImportMeta],
  );

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterials() {
  const context = useContext(MaterialsContext);

  if (!context) {
    throw new Error("useMaterials must be used within MaterialsProvider");
  }

  return context;
}
