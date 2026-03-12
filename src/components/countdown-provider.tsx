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
import { examCountdowns, type ExamCountdown } from "@/lib/mock-data";

const STORAGE_KEY = "gongkao-manager:exam-countdowns";

type CountdownContextValue = {
  countdowns: ExamCountdown[];
  setCountdowns: Dispatch<SetStateAction<ExamCountdown[]>>;
  resetCountdowns: () => void;
  hydrated: boolean;
};

const CountdownContext = createContext<CountdownContextValue | null>(null);

function isEmphasis(value: unknown): value is ExamCountdown["emphasis"] {
  return value === "primary" || value === "secondary" || value === "supporting";
}

function normalizeCountdowns(raw: unknown): ExamCountdown[] {
  if (!Array.isArray(raw)) {
    return examCountdowns;
  }

  const normalized = raw
    .map((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const date = typeof record.date === "string" ? record.date : "";
      const note = typeof record.note === "string" ? record.note.trim() : "";
      const emphasis = isEmphasis(record.emphasis) ? record.emphasis : "supporting";

      if (!name || Number.isNaN(new Date(date).getTime())) {
        return null;
      }

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id
            : `custom-${index + 1}`,
        name,
        date,
        emphasis,
        note,
      } satisfies ExamCountdown;
    })
    .filter((item): item is ExamCountdown => item !== null);

  return normalized.length > 0 ? normalized : examCountdowns;
}

export function CountdownProvider({ children }: { children: ReactNode }) {
  const [countdowns, setCountdowns] = useState<ExamCountdown[]>(examCountdowns);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCountdowns(normalizeCountdowns(JSON.parse(raw)));
      }
    } catch {
      setCountdowns(examCountdowns);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
  }, [countdowns, hydrated]);

  const value = useMemo<CountdownContextValue>(
    () => ({
      countdowns,
      setCountdowns,
      resetCountdowns: () => setCountdowns(examCountdowns),
      hydrated,
    }),
    [countdowns, hydrated],
  );

  return (
    <CountdownContext.Provider value={value}>{children}</CountdownContext.Provider>
  );
}

export function useCountdowns() {
  const context = useContext(CountdownContext);

  if (!context) {
    throw new Error("useCountdowns must be used within CountdownProvider");
  }

  return context;
}
