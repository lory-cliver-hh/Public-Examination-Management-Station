"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lesson } from "@/lib/mock-data";

const STORAGE_KEY = "gongkao-manager:learning-records";
const MAX_RECORDS = 300;

export type LearningRecord = {
  id: string;
  createdAt: string;
  date: string;
  timeLabel: string;
  duration: string;
  lesson: string;
  outcome: string;
  note: string;
  status: Extract<Lesson["status"], "学习中" | "已完成">;
};

type LessonStatusRecordInput = {
  subject: string;
  moduleName: string;
  lessonTitle: string;
  chapter?: string;
  duration: string;
  previousStatus: Lesson["status"];
  nextStatus: Extract<Lesson["status"], "学习中" | "已完成">;
};

type LearningRecordsContextValue = {
  records: LearningRecord[];
  appendLessonStatusRecord: (input: LessonStatusRecordInput) => void;
  hydrated: boolean;
};

const LearningRecordsContext = createContext<LearningRecordsContextValue | null>(null);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeLabel(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeRecord(raw: unknown): LearningRecord | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.date !== "string" ||
    typeof record.timeLabel !== "string" ||
    typeof record.duration !== "string" ||
    typeof record.lesson !== "string" ||
    typeof record.outcome !== "string" ||
    typeof record.note !== "string" ||
    (record.status !== "学习中" && record.status !== "已完成")
  ) {
    return null;
  }

  return {
    id: record.id,
    createdAt: record.createdAt,
    date: record.date,
    timeLabel: record.timeLabel,
    duration: record.duration,
    lesson: record.lesson,
    outcome: record.outcome,
    note: record.note,
    status: record.status,
  };
}

function normalizeStoredRecords(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as LearningRecord[];
  }

  return raw
    .map((item) => normalizeRecord(item))
    .filter((item): item is LearningRecord => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function createLessonStatusRecord(input: LessonStatusRecordInput): LearningRecord {
  const now = new Date();
  const lessonLabel = `${input.subject}｜${input.moduleName}｜${input.lessonTitle}`;
  const chapterNote = input.chapter ? `章节：${input.chapter}` : "课程状态已自动同步到记录页。";

  return {
    id: `record-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    date: formatDateKey(now),
    timeLabel: formatTimeLabel(now),
    duration: input.duration && input.duration !== "待补" ? input.duration : "时长待补",
    lesson: lessonLabel,
    outcome:
      input.nextStatus === "学习中"
        ? `已开始学习，状态由“${input.previousStatus}”更新为“学习中”。`
        : `已标记完成，状态由“${input.previousStatus}”更新为“已完成”。`,
    note:
      input.nextStatus === "学习中"
        ? chapterNote
        : `${chapterNote} 这节课已经完成，可以继续补题或整理笔记。`,
    status: input.nextStatus,
  };
}

export function LearningRecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setRecords(normalizeStoredRecords(JSON.parse(raw)));
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [hydrated, records]);

  const value = useMemo<LearningRecordsContextValue>(
    () => ({
      records,
      appendLessonStatusRecord: (input) => {
        const nextRecord = createLessonStatusRecord(input);
        setRecords((current) => [nextRecord, ...current].slice(0, MAX_RECORDS));
      },
      hydrated,
    }),
    [hydrated, records],
  );

  return (
    <LearningRecordsContext.Provider value={value}>
      {children}
    </LearningRecordsContext.Provider>
  );
}

export function useLearningRecords() {
  const context = useContext(LearningRecordsContext);

  if (!context) {
    throw new Error("useLearningRecords must be used within LearningRecordsProvider");
  }

  return context;
}
