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
import {
  hasLegacyMigrationMarker,
  markLegacyMigration,
  readLegacyJson,
} from "@/lib/legacy-storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { selectUserState, updateUserState } from "@/lib/supabase/user-state";

const LEGACY_STORAGE_KEY = "gongkao-manager:exam-countdowns";
const LEGACY_MIGRATION_SCOPE = "countdowns";

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

function hasStoredCountdowns(raw: unknown) {
  return Array.isArray(raw) && raw.length > 0;
}

export function CountdownProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [countdowns, setCountdowns] = useState<ExamCountdown[]>(examCountdowns);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { user, data } = await selectUserState<{ countdowns: unknown }>(
          supabase,
          "countdowns",
        );
        const cloudCountdowns = normalizeCountdowns(data.countdowns);
        const legacyCountdowns = normalizeCountdowns(
          readLegacyJson<unknown>(LEGACY_STORAGE_KEY),
        );
        const shouldMigrateLegacy =
          !hasStoredCountdowns(data.countdowns) &&
          !hasLegacyMigrationMarker(LEGACY_MIGRATION_SCOPE, user.id) &&
          hasStoredCountdowns(readLegacyJson<unknown>(LEGACY_STORAGE_KEY));

        if (!cancelled) {
          setCountdowns(shouldMigrateLegacy ? legacyCountdowns : cloudCountdowns);
        }

        if (shouldMigrateLegacy) {
          await updateUserState(supabase, {
            countdowns: legacyCountdowns,
          });
          markLegacyMigration(LEGACY_MIGRATION_SCOPE, user.id);
        }
      } catch {
        if (!cancelled) {
          setCountdowns(examCountdowns);
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
      countdowns,
    }).catch(() => undefined);
  }, [countdowns, hydrated, supabase]);

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
