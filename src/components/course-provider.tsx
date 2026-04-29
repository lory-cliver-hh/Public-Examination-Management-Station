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
import { useLearningRecords } from "@/components/learning-records-provider";
import { courseCatalog, type CourseCatalog } from "@/lib/mock-data";
import { syncCatalogStatus } from "@/lib/course-import";
import type { CourseImportMeta } from "@/lib/course-template-server";
import {
  hasLegacyMigrationMarker,
  markLegacyMigration,
  readLegacyJson,
} from "@/lib/legacy-storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { selectUserState, updateUserState } from "@/lib/supabase/user-state";

const LEGACY_STORAGE_KEY = "gongkao-manager:course-catalog";
const LEGACY_MIGRATION_SCOPE = "course-catalog";
const MOJIBAKE_PATTERN = /[\u00C0-\u00FF]/;

type StoredCoursePayload = {
  catalog: CourseCatalog[];
  importMeta: CourseImportMeta | null;
};

type CourseContextValue = {
  catalog: CourseCatalog[];
  setCatalog: Dispatch<SetStateAction<CourseCatalog[]>>;
  importMeta: CourseImportMeta | null;
  importCatalog: (catalog: CourseCatalog[], meta: CourseImportMeta) => void;
  resetCatalog: () => void;
  setLessonStatus: (lessonId: string, status: "未开始" | "学习中" | "已完成") => void;
  hydrated: boolean;
};

const CourseContext = createContext<CourseContextValue | null>(null);

function findLessonInCatalog(currentCatalog: CourseCatalog[], lessonId: string) {
  for (const subject of currentCatalog) {
    for (const moduleGroup of subject.modules) {
      for (const lesson of moduleGroup.lessons) {
        if (lesson.id === lessonId) {
          return {
            subject: subject.subject,
            moduleName: moduleGroup.name,
            lesson,
          };
        }
      }
    }
  }

  return null;
}

function normalizeStoredPayload(
  raw: unknown,
  fallback: StoredCoursePayload,
): StoredCoursePayload {
  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const catalog = Array.isArray(record.catalog)
    ? (record.catalog as CourseCatalog[])
    : fallback.catalog;
  const importMeta =
    typeof record.importMeta === "object" && record.importMeta !== null
      ? (record.importMeta as CourseImportMeta)
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

function hasCorruptedCatalog(catalog: CourseCatalog[]) {
  return catalog.some((subject) =>
    hasMojibake(subject.subject) ||
    subject.modules.some((module) =>
      hasMojibake(module.name) ||
      module.lessons.some((lesson) =>
        hasMojibake(lesson.title) ||
        hasMojibake(lesson.chapter) ||
        hasMojibake(lesson.note),
      ),
    ),
  );
}

function updateLessonStatusInCatalog(
  currentCatalog: CourseCatalog[],
  lessonId: string,
  status: "未开始" | "学习中" | "已完成",
) {
  return syncCatalogStatus(
    currentCatalog.map((subject) => ({
      ...subject,
      modules: subject.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, status } : lesson,
        ),
      })),
    })),
  );
}

function hasCoursePayloadData(payload: StoredCoursePayload) {
  return payload.importMeta !== null || payload.catalog.length > 0;
}

function hasPersistedCoursePayload(raw: unknown) {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }

  const record = raw as Record<string, unknown>;

  return (
    (Array.isArray(record.catalog) && record.catalog.length > 0) ||
    (typeof record.importMeta === "object" && record.importMeta !== null)
  );
}

function hasStoredCoursePayload(rawCatalog: unknown, rawImportMeta: unknown) {
  return (
    (Array.isArray(rawCatalog) && rawCatalog.length > 0) ||
    (typeof rawImportMeta === "object" && rawImportMeta !== null)
  );
}

export function CourseProvider({
  children,
  initialCatalog = courseCatalog,
  initialImportMeta = null,
}: {
  children: ReactNode;
  initialCatalog?: CourseCatalog[];
  initialImportMeta?: CourseImportMeta | null;
}) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { appendLessonStatusRecord } = useLearningRecords();
  const [catalog, setCatalog] = useState<CourseCatalog[]>(initialCatalog);
  const [importMeta, setImportMeta] = useState<CourseImportMeta | null>(initialImportMeta);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fallbackPayload: StoredCoursePayload = {
      catalog: initialCatalog,
      importMeta: initialImportMeta,
    };

    let cancelled = false;

    void (async () => {
      try {
        const { user, data } = await selectUserState<{
          course_catalog: unknown;
          course_import_meta: unknown;
        }>(supabase, "course_catalog, course_import_meta");

        const cloudPayload = normalizeStoredPayload(
          {
            catalog: data.course_catalog,
            importMeta: data.course_import_meta,
          },
          fallbackPayload,
        );
        const rawLegacyPayload = readLegacyJson<unknown>(LEGACY_STORAGE_KEY);
        const legacyPayload = normalizeStoredPayload(
          rawLegacyPayload,
          fallbackPayload,
        );
        const shouldMigrateLegacy =
          !hasStoredCoursePayload(data.course_catalog, data.course_import_meta) &&
          hasPersistedCoursePayload(rawLegacyPayload) &&
          hasCoursePayloadData(legacyPayload) &&
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
            course_catalog: legacyPayload.catalog,
            course_import_meta: legacyPayload.importMeta,
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
      course_catalog: catalog,
      course_import_meta: importMeta,
    }).catch(() => undefined);
  }, [catalog, hydrated, importMeta, supabase]);

  const value = useMemo<CourseContextValue>(
    () => ({
      catalog,
      setCatalog,
      importMeta,
      importCatalog: (nextCatalog, meta) => {
        setCatalog(syncCatalogStatus(nextCatalog));
        setImportMeta(meta);
      },
      resetCatalog: () => {
        setCatalog(initialCatalog);
        setImportMeta(initialImportMeta);
      },
      setLessonStatus: (lessonId, status) => {
        const lessonMatch = findLessonInCatalog(catalog, lessonId);

        if (!lessonMatch || lessonMatch.lesson.status === status) {
          return;
        }

        if (status === "学习中" || status === "已完成") {
          appendLessonStatusRecord({
            subject: lessonMatch.subject,
            moduleName: lessonMatch.moduleName,
            lessonTitle: lessonMatch.lesson.title,
            chapter: lessonMatch.lesson.chapter,
            duration: lessonMatch.lesson.duration,
            previousStatus: lessonMatch.lesson.status,
            nextStatus: status,
          });
        }

        setCatalog(updateLessonStatusInCatalog(catalog, lessonId, status));
      },
      hydrated,
    }),
    [
      appendLessonStatusRecord,
      catalog,
      hydrated,
      importMeta,
      initialCatalog,
      initialImportMeta,
    ],
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourses() {
  const context = useContext(CourseContext);

  if (!context) {
    throw new Error("useCourses must be used within CourseProvider");
  }

  return context;
}
