"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "gongkao-manager:daily-todos";

export type DailyTodoItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

type DailyTodoContextValue = {
  todayKey: string;
  todosByDate: Record<string, DailyTodoItem[]>;
  todayTodos: DailyTodoItem[];
  addTodo: (dateKey: string, text: string) => boolean;
  moveTodo: (dateKey: string, sourceId: string, targetId: string | null) => void;
  toggleTodo: (dateKey: string, id: string) => void;
  deleteTodo: (dateKey: string, id: string) => void;
  clearCompleted: (dateKey: string) => void;
  hydrated: boolean;
};

const DailyTodoContext = createContext<DailyTodoContextValue | null>(null);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeTodoText(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function normalizeTodoItem(raw: unknown): DailyTodoItem | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const text = normalizeTodoText(typeof record.text === "string" ? record.text : "");

  if (!text) {
    return null;
  }

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    completed: Boolean(record.completed),
    createdAt:
      typeof record.createdAt === "string" && record.createdAt
        ? record.createdAt
        : new Date().toISOString(),
    completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
  };
}

function moveTodoItem(
  items: DailyTodoItem[],
  sourceId: string,
  targetId: string | null,
) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);

  if (sourceIndex < 0) {
    return items;
  }

  const nextItems = [...items];
  const [sourceItem] = nextItems.splice(sourceIndex, 1);

  if (!sourceItem) {
    return items;
  }

  if (targetId === null) {
    nextItems.push(sourceItem);
    return nextItems;
  }

  const targetIndex = nextItems.findIndex((item) => item.id === targetId);

  if (targetIndex < 0) {
    nextItems.push(sourceItem);
    return nextItems;
  }

  nextItems.splice(targetIndex, 0, sourceItem);
  return nextItems;
}

function normalizeStoredState(raw: unknown) {
  if (typeof raw !== "object" || raw === null) {
    return {} as Record<string, DailyTodoItem[]>;
  }

  const record = raw as Record<string, unknown>;

  return Object.entries(record).reduce<Record<string, DailyTodoItem[]>>(
    (accumulator, [dateKey, value]) => {
      if (!isDateKey(dateKey) || !Array.isArray(value)) {
        return accumulator;
      }

      const items =
        value
          .map((item) => normalizeTodoItem(item))
          .filter((item): item is DailyTodoItem => item !== null);

      if (items.length > 0) {
        accumulator[dateKey] = items;
      }

      return accumulator;
    },
    {},
  );
}

export function DailyTodoProvider({ children }: { children: ReactNode }) {
  const todayKey = getLocalDateKey();
  const [todosByDate, setTodosByDate] = useState<Record<string, DailyTodoItem[]>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setTodosByDate(normalizeStoredState(JSON.parse(raw)));
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todosByDate));
  }, [hydrated, todosByDate]);

  const value = useMemo<DailyTodoContextValue>(
    () => ({
      todayKey,
      todosByDate,
      todayTodos: todosByDate[todayKey] ?? [],
      addTodo: (dateKey, text) => {
        const normalizedText = normalizeTodoText(text);

        if (!normalizedText || !isDateKey(dateKey)) {
          return false;
        }

        setTodosByDate((current) => ({
          ...current,
          [dateKey]: [
            ...(current[dateKey] ?? []),
            {
              id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              text: normalizedText,
              completed: false,
              createdAt: new Date().toISOString(),
              completedAt: null,
            },
          ],
        }));

        return true;
      },
      moveTodo: (dateKey, sourceId, targetId) => {
        if (!isDateKey(dateKey) || !sourceId) {
          return;
        }

        setTodosByDate((current) => {
          const items = current[dateKey];

          if (!items || items.length < 2) {
            return current;
          }

          return {
            ...current,
            [dateKey]: moveTodoItem(items, sourceId, targetId),
          };
        });
      },
      toggleTodo: (dateKey, id) => {
        if (!isDateKey(dateKey)) {
          return;
        }

        setTodosByDate((current) => {
          const items = current[dateKey];

          if (!items) {
            return current;
          }

          return {
            ...current,
            [dateKey]: items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    completed: !item.completed,
                    completedAt: item.completed ? null : new Date().toISOString(),
                  }
                : item,
            ),
          };
        });
      },
      deleteTodo: (dateKey, id) => {
        if (!isDateKey(dateKey)) {
          return;
        }

        setTodosByDate((current) => {
          const items = current[dateKey];

          if (!items) {
            return current;
          }

          const nextItems = items.filter((item) => item.id !== id);

          if (nextItems.length === 0) {
            const nextState = { ...current };
            delete nextState[dateKey];
            return nextState;
          }

          return {
            ...current,
            [dateKey]: nextItems,
          };
        });
      },
      clearCompleted: (dateKey) => {
        if (!isDateKey(dateKey)) {
          return;
        }

        setTodosByDate((current) => {
          const items = current[dateKey];

          if (!items) {
            return current;
          }

          const nextItems = items.filter((item) => !item.completed);

          if (nextItems.length === 0) {
            const nextState = { ...current };
            delete nextState[dateKey];
            return nextState;
          }

          return {
            ...current,
            [dateKey]: nextItems,
          };
        });
      },
      hydrated,
    }),
    [hydrated, todayKey, todosByDate],
  );

  return <DailyTodoContext.Provider value={value}>{children}</DailyTodoContext.Provider>;
}

export function useDailyTodos() {
  const context = useContext(DailyTodoContext);

  if (!context) {
    throw new Error("useDailyTodos must be used within DailyTodoProvider");
  }

  return context;
}
