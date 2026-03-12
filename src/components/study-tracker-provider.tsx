"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "gongkao-manager:study-tracker";

type StudyTrackerState = {
  dailyHours: Record<string, string>;
  checkins: string[];
};

type StudyTrackerContextValue = {
  todayKey: string;
  todayHours: string;
  dailyHoursByDate: Record<string, string>;
  setTodayHours: (hours: string) => void;
  checkInDates: string[];
  hasCheckedInToday: boolean;
  streak: number;
  latestCheckIn: string | null;
  toggleTodayCheckIn: () => void;
  hydrated: boolean;
};

const StudyTrackerContext = createContext<StudyTrackerContextValue | null>(null);

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sortAndDeduplicateDates(dates: string[]) {
  return [...new Set(dates.filter(isDateKey))].sort((left, right) =>
    right.localeCompare(left),
  );
}

function normalizeStoredState(raw: unknown): StudyTrackerState {
  if (typeof raw !== "object" || raw === null) {
    return {
      dailyHours: {},
      checkins: [],
    };
  }

  const record = raw as Record<string, unknown>;
  const dailyHours =
    typeof record.dailyHours === "object" && record.dailyHours !== null
      ? Object.entries(record.dailyHours as Record<string, unknown>).reduce<
          Record<string, string>
        >((accumulator, [key, value]) => {
          if (isDateKey(key) && typeof value === "string") {
            accumulator[key] = value;
          }

          return accumulator;
        }, {})
      : {};
  const checkins = Array.isArray(record.checkins)
    ? sortAndDeduplicateDates(
        record.checkins.filter((value): value is string => typeof value === "string"),
      )
    : [];

  return {
    dailyHours,
    checkins,
  };
}

function clampHours(hours: string) {
  const trimmed = hours.trim();

  if (!trimmed) {
    return "";
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  const normalized = Math.max(0, Math.min(24, Math.round(parsed * 10) / 10));
  return String(normalized);
}

function getDayDiff(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);

  return Math.round((leftDate.getTime() - rightDate.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateStreak(checkins: string[]) {
  if (checkins.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < checkins.length; index += 1) {
    const diff = getDayDiff(checkins[index - 1], checkins[index]);

    if (diff === 1) {
      streak += 1;
      continue;
    }

    if (diff > 1) {
      break;
    }
  }

  return streak;
}

export function StudyTrackerProvider({ children }: { children: ReactNode }) {
  const todayKey = getLocalDateKey();
  const [state, setState] = useState<StudyTrackerState>({
    dailyHours: {},
    checkins: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setState(normalizeStoredState(JSON.parse(raw)));
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const value = useMemo<StudyTrackerContextValue>(
    () => ({
      todayKey,
      todayHours: state.dailyHours[todayKey] ?? "",
      dailyHoursByDate: state.dailyHours,
      setTodayHours: (hours) => {
        const normalized = clampHours(hours);

        setState((current) => {
          const nextDailyHours = { ...current.dailyHours };

          if (normalized) {
            nextDailyHours[todayKey] = normalized;
          } else {
            delete nextDailyHours[todayKey];
          }

          return {
            ...current,
            dailyHours: nextDailyHours,
          };
        });
      },
      checkInDates: state.checkins,
      hasCheckedInToday: state.checkins.includes(todayKey),
      streak: calculateStreak(state.checkins),
      latestCheckIn: state.checkins[0] ?? null,
      toggleTodayCheckIn: () =>
        setState((current) => {
          const hasCheckedIn = current.checkins.includes(todayKey);

          return {
            ...current,
            checkins: hasCheckedIn
              ? current.checkins.filter((date) => date !== todayKey)
              : sortAndDeduplicateDates([...current.checkins, todayKey]),
          };
        }),
      hydrated,
    }),
    [hydrated, state, todayKey],
  );

  return (
    <StudyTrackerContext.Provider value={value}>
      {children}
    </StudyTrackerContext.Provider>
  );
}

export function useStudyTracker() {
  const context = useContext(StudyTrackerContext);

  if (!context) {
    throw new Error("useStudyTracker must be used within StudyTrackerProvider");
  }

  return context;
}
