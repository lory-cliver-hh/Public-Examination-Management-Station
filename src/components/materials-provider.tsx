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
import {
  hasLegacyMigrationMarker,
  markLegacyMigration,
  readLegacyJson,
} from "@/lib/legacy-storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { selectUserState, updateUserState } from "@/lib/supabase/user-state";

const LEGACY_STORAGE_KEY = "gongkao-manager:materials-catalog";
const LEGACY_MIGRATION_SCOPE = "materials-catalog";
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

function hasMaterialsPayloadData(payload: StoredMaterialsPayload) {
  return payload.importMeta !== null || payload.catalog.length > 0;
}

function hasPersistedMaterialsPayload(raw: unknown) {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }

  const record = raw as Record<string, unknown>;

  return (
    (Array.isArray(record.catalog) && record.catalog.length > 0) ||
    (typeof record.importMeta === "object" && record.importMeta !== null)
  );
}

function hasStoredMaterialsPayload(rawCatalog: unknown, rawImportMeta: unknown) {
  return (
    (Array.isArray(rawCatalog) && rawCatalog.length > 0) ||
    (typeof rawImportMeta === "object" && rawImportMeta !== null)
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
  const supabase = useMemo(() => createSupabaseClient(), []);
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

    let cancelled = false;

    void (async () => {
      try {
        const { user, data } = await selectUserState<{
          materials_catalog: unknown;
          materials_import_meta: unknown;
        }>(supabase, "materials_catalog, materials_import_meta");

        const cloudPayload = normalizeStoredPayload(
          {
            catalog: data.materials_catalog,
            importMeta: data.materials_import_meta,
          },
          fallbackPayload,
        );
        const rawLegacyPayload = readLegacyJson<unknown>(LEGACY_STORAGE_KEY);
        const legacyPayload = normalizeStoredPayload(
          rawLegacyPayload,
          fallbackPayload,
        );
        const shouldMigrateLegacy =
          !hasStoredMaterialsPayload(data.materials_catalog, data.materials_import_meta) &&
          hasPersistedMaterialsPayload(rawLegacyPayload) &&
          hasMaterialsPayloadData(legacyPayload) &&
          !hasCorruptedCatalog(legacyPayload.catalog) &&
          !hasLegacyMigrationMarker(LEGACY_MIGRATION_SCOPE, user.id);
        const nextPayload = shouldMigrateLegacy ? legacyPayload : cloudPayload;

        if (!cancelled) {
          if (!hasCorruptedCatalog(nextPayload.catalog)) {
            setCatalog(nextPayload.catalog);
            setImportMeta(nextPayload.importMeta);
          } else {
            setCatalog(initialCatalog);
            setImportMeta(initialImportMeta);
          }
        }

        if (shouldMigrateLegacy) {
          await updateUserState(supabase, {
            materials_catalog: legacyPayload.catalog,
            materials_import_meta: legacyPayload.importMeta,
          });
          markLegacyMigration(LEGACY_MIGRATION_SCOPE, user.id);
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
  }, [initialCatalog, initialImportMeta, supabase]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void updateUserState(supabase, {
      materials_catalog: catalog,
      materials_import_meta: importMeta,
    }).catch(() => undefined);
  }, [catalog, hydrated, importMeta, supabase]);

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
