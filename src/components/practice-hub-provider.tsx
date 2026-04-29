"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  hasLegacyMigrationMarker,
  markLegacyMigration,
  readLegacyJson,
} from "@/lib/legacy-storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { selectUserState, updateUserState } from "@/lib/supabase/user-state";

const LEGACY_STORAGE_KEY = "gongkao-manager:practice-hub";
const LEGACY_MIGRATION_SCOPE = "practice-hub";
const DEFAULT_TIMER_MINUTES = 35;
const MAX_MOCK_EXAMS = 40;

export type DailyPracticeStats = {
  totalQuestions: number | null;
  wrongQuestions: number | null;
  updatedAt: string | null;
};

export type MockExamRecord = {
  id: string;
  title: string;
  date: string;
  totalScore: number;
  aptitudeScore: number | null;
  essayScore: number | null;
  note: string;
  createdAt: string;
};

type AddMockExamInput = {
  title: string;
  date: string;
  totalScore: number;
  aptitudeScore: number | null;
  essayScore: number | null;
  note: string;
};

type PracticeHubState = {
  dailyPractice: Record<string, DailyPracticeStats>;
  timerDurationMinutes: number;
  mockExams: MockExamRecord[];
};

type PracticeHubContextValue = {
  todayKey: string;
  dailyPracticeByDate: Record<string, DailyPracticeStats>;
  practiceDates: string[];
  todayPractice: DailyPracticeStats;
  saveTodayPractice: (input: {
    totalQuestions: string;
    wrongQuestions: string;
  }) => void;
  timerDurationMinutes: number;
  setTimerDurationMinutes: (minutes: string | number) => number;
  mockExams: MockExamRecord[];
  addMockExam: (input: AddMockExamInput) => void;
  deleteMockExam: (id: string) => void;
  hydrated: boolean;
};

const EMPTY_PRACTICE: DailyPracticeStats = {
  totalQuestions: null,
  wrongQuestions: null,
  updatedAt: null,
};

const PracticeHubContext = createContext<PracticeHubContextValue | null>(null);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseCount(value: unknown) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return Math.round(numeric);
}

function normalizePracticeCounts(input: {
  totalQuestions: number | null;
  wrongQuestions?: number | null;
  correctQuestions?: number | null;
}) {
  if (input.wrongQuestions !== undefined) {
    const safeTotal = input.totalQuestions ?? input.wrongQuestions ?? null;
    const safeWrong =
      input.wrongQuestions === null
        ? null
        : safeTotal === null
          ? input.wrongQuestions
          : Math.min(input.wrongQuestions, safeTotal);

    return {
      totalQuestions: safeTotal,
      wrongQuestions: safeWrong,
    };
  }

  const safeTotal = input.totalQuestions ?? input.correctQuestions ?? null;
  const safeCorrect =
    input.correctQuestions === null || input.correctQuestions === undefined
      ? null
      : safeTotal === null
        ? input.correctQuestions
        : Math.min(input.correctQuestions, safeTotal);

  return {
    totalQuestions: safeTotal,
    wrongQuestions:
      safeTotal === null || safeCorrect === null ? null : Math.max(safeTotal - safeCorrect, 0),
  };
}

function normalizePracticeStats(raw: unknown): DailyPracticeStats | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const totalQuestions = parseCount(record.totalQuestions);
  const wrongQuestions = parseCount(record.wrongQuestions);
  const correctQuestions = parseCount(record.correctQuestions);

  if (totalQuestions === null && wrongQuestions === null && correctQuestions === null) {
    return null;
  }
  const normalized = normalizePracticeCounts({
    totalQuestions,
    wrongQuestions,
    correctQuestions,
  });

  return {
    totalQuestions: normalized.totalQuestions,
    wrongQuestions: normalized.wrongQuestions,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  };
}

function sortDateKeysDescending(dateKeys: string[]) {
  return [...new Set(dateKeys.filter(isDateKey))].sort((left, right) =>
    right.localeCompare(left),
  );
}

function clampTimerMinutes(value: string | number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_TIMER_MINUTES;
  }

  return Math.max(1, Math.min(300, Math.round(numeric)));
}

function sortMockExams(records: MockExamRecord[]) {
  return [...records].sort((left, right) => {
    const dateDiff = right.date.localeCompare(left.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function normalizeMockExam(raw: unknown): MockExamRecord | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const date = typeof record.date === "string" ? record.date : "";
  const totalScore = Number(record.totalScore);

  if (!title || !isDateKey(date) || !Number.isFinite(totalScore)) {
    return null;
  }

  const aptitudeScore = Number(record.aptitudeScore);
  const essayScore = Number(record.essayScore);

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `mock-${date}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    date,
    totalScore: Math.max(0, Math.round(totalScore * 10) / 10),
    aptitudeScore: Number.isFinite(aptitudeScore)
      ? Math.max(0, Math.round(aptitudeScore * 10) / 10)
      : null,
    essayScore: Number.isFinite(essayScore)
      ? Math.max(0, Math.round(essayScore * 10) / 10)
      : null,
    note: typeof record.note === "string" ? record.note.trim() : "",
    createdAt:
      typeof record.createdAt === "string" && record.createdAt
        ? record.createdAt
        : new Date().toISOString(),
  };
}

function normalizeStoredState(raw: unknown): PracticeHubState {
  if (typeof raw !== "object" || raw === null) {
    return {
      dailyPractice: {},
      timerDurationMinutes: DEFAULT_TIMER_MINUTES,
      mockExams: [],
    };
  }

  const record = raw as Record<string, unknown>;
  const dailyPractice =
    typeof record.dailyPractice === "object" && record.dailyPractice !== null
      ? Object.entries(record.dailyPractice as Record<string, unknown>).reduce<
          Record<string, DailyPracticeStats>
        >((accumulator, [dateKey, value]) => {
          if (!isDateKey(dateKey)) {
            return accumulator;
          }

          const stats = normalizePracticeStats(value);

          if (stats) {
            accumulator[dateKey] = stats;
          }

          return accumulator;
        }, {})
      : {};
  const mockExams = Array.isArray(record.mockExams)
    ? sortMockExams(
        record.mockExams
          .map((item) => normalizeMockExam(item))
          .filter((item): item is MockExamRecord => item !== null),
      ).slice(0, MAX_MOCK_EXAMS)
    : [];

  return {
    dailyPractice,
    timerDurationMinutes: clampTimerMinutes(record.timerDurationMinutes as number),
    mockExams,
  };
}

function hasPracticeHubData(state: PracticeHubState) {
  return (
    Object.keys(state.dailyPractice).length > 0 ||
    state.mockExams.length > 0 ||
    state.timerDurationMinutes !== DEFAULT_TIMER_MINUTES
  );
}

export function PracticeHubProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayKey = getLocalDateKey();
  const [state, setState] = useState<PracticeHubState>({
    dailyPractice: {},
    timerDurationMinutes: DEFAULT_TIMER_MINUTES,
    mockExams: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { user, data } = await selectUserState<{
          daily_practice: unknown;
          timer_duration_minutes: unknown;
          mock_exams: unknown;
        }>(supabase, "daily_practice, timer_duration_minutes, mock_exams");
        const cloudState = normalizeStoredState({
          dailyPractice: data.daily_practice,
          timerDurationMinutes: data.timer_duration_minutes,
          mockExams: data.mock_exams,
        });
        const legacyState = normalizeStoredState(readLegacyJson<unknown>(LEGACY_STORAGE_KEY));
        const shouldMigrateLegacy =
          !hasPracticeHubData(cloudState) &&
          hasPracticeHubData(legacyState) &&
          !hasLegacyMigrationMarker(LEGACY_MIGRATION_SCOPE, user.id);

        if (!cancelled) {
          setState(shouldMigrateLegacy ? legacyState : cloudState);
        }

        if (shouldMigrateLegacy) {
          await updateUserState(supabase, {
            daily_practice: legacyState.dailyPractice,
            timer_duration_minutes: legacyState.timerDurationMinutes,
            mock_exams: legacyState.mockExams,
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
  }, [supabase]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void updateUserState(supabase, {
      daily_practice: state.dailyPractice,
      timer_duration_minutes: state.timerDurationMinutes,
      mock_exams: state.mockExams,
    }).catch(() => undefined);
  }, [hydrated, state, supabase]);

  const value = useMemo<PracticeHubContextValue>(
    () => ({
      todayKey,
      dailyPracticeByDate: state.dailyPractice,
      practiceDates: sortDateKeysDescending(Object.keys(state.dailyPractice)),
      todayPractice: state.dailyPractice[todayKey] ?? EMPTY_PRACTICE,
      saveTodayPractice: ({ totalQuestions, wrongQuestions }) => {
        const parsedTotal = parseCount(totalQuestions);
        const parsedWrong = parseCount(wrongQuestions);
        const normalized = normalizePracticeCounts({
          totalQuestions: parsedTotal,
          wrongQuestions: parsedWrong,
        });

        setState((current) => {
          const nextDailyPractice = { ...current.dailyPractice };

          if (
            normalized.totalQuestions === null &&
            normalized.wrongQuestions === null
          ) {
            delete nextDailyPractice[todayKey];
          } else {
            nextDailyPractice[todayKey] = {
              totalQuestions: normalized.totalQuestions,
              wrongQuestions: normalized.wrongQuestions,
              updatedAt: new Date().toISOString(),
            };
          }

          return {
            ...current,
            dailyPractice: nextDailyPractice,
          };
        });
      },
      timerDurationMinutes: state.timerDurationMinutes,
      setTimerDurationMinutes: (minutes) => {
        const normalized = clampTimerMinutes(minutes);

        setState((current) => ({
          ...current,
          timerDurationMinutes: normalized,
        }));

        return normalized;
      },
      mockExams: state.mockExams,
      addMockExam: (input) => {
        const nextRecord: MockExamRecord = {
          id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: input.title.trim(),
          date: input.date,
          totalScore: Math.max(0, Math.round(input.totalScore * 10) / 10),
          aptitudeScore:
            input.aptitudeScore === null
              ? null
              : Math.max(0, Math.round(input.aptitudeScore * 10) / 10),
          essayScore:
            input.essayScore === null
              ? null
              : Math.max(0, Math.round(input.essayScore * 10) / 10),
          note: input.note.trim(),
          createdAt: new Date().toISOString(),
        };

        setState((current) => ({
          ...current,
          mockExams: sortMockExams([nextRecord, ...current.mockExams]).slice(0, MAX_MOCK_EXAMS),
        }));
      },
      deleteMockExam: (id) => {
        setState((current) => ({
          ...current,
          mockExams: current.mockExams.filter((record) => record.id !== id),
        }));
      },
      hydrated,
    }),
    [hydrated, state.dailyPractice, state.mockExams, state.timerDurationMinutes, todayKey],
  );

  return (
    <PracticeHubContext.Provider value={value}>{children}</PracticeHubContext.Provider>
  );
}

export function usePracticeHub() {
  const context = useContext(PracticeHubContext);

  if (!context) {
    throw new Error("usePracticeHub must be used within PracticeHubProvider");
  }

  return context;
}
