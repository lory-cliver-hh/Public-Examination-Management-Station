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

const STORAGE_KEY = "gongkao-manager:course-catalog";
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

export function CourseProvider({
  children,
  initialCatalog = courseCatalog,
  initialImportMeta = null,
}: {
  children: ReactNode;
  initialCatalog?: CourseCatalog[];
  initialImportMeta?: CourseImportMeta | null;
}) {
  const { appendLessonStatusRecord } = useLearningRecords();
  const [catalog, setCatalog] = useState<CourseCatalog[]>(initialCatalog);
  const [importMeta, setImportMeta] = useState<CourseImportMeta | null>(initialImportMeta);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fallbackPayload: StoredCoursePayload = {
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

    const payload: StoredCoursePayload = { catalog, importMeta };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [catalog, hydrated, importMeta]);

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
