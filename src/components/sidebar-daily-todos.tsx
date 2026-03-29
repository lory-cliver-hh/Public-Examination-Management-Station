"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useDailyTodos } from "@/components/daily-todo-provider";

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

export function SidebarDailyTodos() {
  const {
    todayKey,
    todayTodos,
    addTodo,
    moveTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    hydrated,
  } = useDailyTodos();
  const [draft, setDraft] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const completedCount = useMemo(
    () => todayTodos.filter((item) => item.completed).length,
    [todayTodos],
  );
  const totalCount = todayTodos.length;
  const pendingCount = Math.max(totalCount - completedCount, 0);
  const progressWidth =
    totalCount > 0 ? `${Math.max(Math.round((completedCount / totalCount) * 100), 6)}%` : "6%";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!addTodo(todayKey, draft)) {
      return;
    }

    setDraft("");
  }

  return (
    <section className="panel-muted rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Daily Todo</p>
          <h2 className="display-title mt-2 text-[1.35rem] leading-tight text-ink">
            今日待办
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">{formatDateLabel(todayKey)}</p>
        </div>

        <div className="rounded-[18px] border border-line bg-white/78 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">进度</p>
          <p className="numeric-display mt-1 text-lg font-semibold text-ink">
            {hydrated ? `${completedCount}/${totalCount}` : "--"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/75">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#597062,#b65f33)]"
          style={{ width: progressWidth }}
        />
      </div>

      <p className="mt-3 text-sm leading-7 text-muted">
        {hydrated
          ? totalCount > 0
            ? pendingCount > 0
              ? `今天还剩 ${pendingCount} 项待完成，做完就勾掉。`
              : "今天的计划已经全部完成。"
            : "先列 2 到 5 项今天必须收掉的小计划。"
          : "正在读取今日待办..."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <label className="text-sm text-muted">
          <span className="font-semibold text-ink">新增计划</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="例如：刷判断推理 40 题"
              className="w-full rounded-[16px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
            />
            <button
              type="submit"
              className="inline-flex min-w-[5.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              添加
            </button>
          </div>
          <p className="mt-2 text-xs leading-6 text-muted">按回车可直接添加，可拖动调整优先级。</p>
        </label>
      </form>

      {hydrated && todayTodos.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {todayTodos.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => {
                setDraggingId(item.id);
                setDropTargetId(item.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggingId && draggingId !== item.id) {
                  setDropTargetId(item.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                if (draggingId && draggingId !== item.id) {
                  moveTodo(todayKey, draggingId, item.id);
                }

                setDraggingId(null);
                setDropTargetId(null);
              }}
              className={`cursor-grab rounded-[18px] border bg-white/80 px-3 py-3 transition active:cursor-grabbing ${
                dropTargetId === item.id && draggingId && draggingId !== item.id
                  ? "border-accent/40 shadow-[0_10px_24px_rgba(182,95,51,0.10)]"
                  : "border-line"
              } ${draggingId === item.id ? "opacity-75" : ""}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleTodo(todayKey, item.id)}
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                    item.completed
                      ? "border-sage/40 bg-sage text-white"
                      : "border-line bg-white text-muted hover:border-accent hover:text-accent"
                  }`}
                  aria-label={item.completed ? "取消完成" : "标记完成"}
                >
                  {item.completed ? "√" : ""}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`break-words pr-1 text-sm leading-6 ${
                      item.completed ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {item.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteTodo(todayKey, item.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-sm text-muted transition hover:border-accent/40 hover:text-accent"
                  aria-label="删除待办"
                >
                  x
                </button>
              </div>
            </div>
          ))}

          {todayTodos.length > 1 && draggingId ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (draggingId) {
                  setDropTargetId("end");
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                if (draggingId) {
                  moveTodo(todayKey, draggingId, null);
                }

                setDraggingId(null);
                setDropTargetId(null);
              }}
              className={`rounded-[16px] border border-dashed px-4 py-2.5 text-center text-xs transition ${
                dropTargetId === "end"
                  ? "border-accent/40 bg-accent/8 text-accent"
                  : "border-line bg-white/45 text-muted"
              }`}
            >
              放到最后
            </div>
          ) : null}
        </div>
      ) : hydrated ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-line bg-white/58 px-4 py-4 text-sm leading-7 text-muted">
          今天的待办还是空的，先把最关键的几项列出来。
        </div>
      ) : null}

      {hydrated && completedCount > 0 ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => clearCompleted(todayKey)}
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
          >
            清空已完成
          </button>
        </div>
      ) : null}
    </section>
  );
}
