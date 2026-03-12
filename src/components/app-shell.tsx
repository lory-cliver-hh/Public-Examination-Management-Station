"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCountdowns } from "@/components/countdown-provider";
import { SidebarStudyCalendar } from "@/components/sidebar-study-calendar";

const navigation = [
  { href: "/", label: "总览", hint: "今天该学什么" },
  { href: "/courses", label: "课程", hint: "按课时直达夸克" },
  { href: "/materials", label: "资料", hint: "按模块查看资料" },
  { href: "/records", label: "记录", hint: "学习流水与复盘" },
  { href: "/settings", label: "设置", hint: "调整倒计时目标" },
];

function getNearestCountdown(
  countdowns: ReturnType<typeof useCountdowns>["countdowns"],
) {
  const now = Date.now();

  return [...countdowns]
    .map((exam) => ({
      ...exam,
      diff: new Date(exam.date).getTime() - now,
    }))
    .filter((exam) => exam.diff > 0)
    .sort((left, right) => left.diff - right.diff)[0];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { countdowns, hydrated } = useCountdowns();
  const nearest = getNearestCountdown(countdowns);
  const daysLeft = nearest ? Math.floor(nearest.diff / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 text-ink lg:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(182,95,51,0.10),transparent_20%),radial-gradient(circle_at_88%_24%,rgba(32,52,73,0.10),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.28),transparent_38%)]" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1520px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="panel relative overflow-hidden rounded-[30px] p-5">
          <div className="paper-grid absolute inset-0 opacity-50" />
          <div className="relative space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white/70 px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-sm font-semibold tracking-[0.22em] text-white">
                  GK
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">公考管理系统</p>
                  <p className="text-xs text-muted">学习驾驶舱</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="eyebrow">Focus</p>
                <h1 className="display-title text-[2rem] leading-tight text-ink">
                  先把今天的学习节奏摆在眼前。
                </h1>
                <p className="max-w-xs text-sm leading-7 text-muted">
                  课程、倒计时和学习记录集中在一个工作面里。
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {navigation.map((item) => {
                const active =
                  item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-[24px] border px-4 py-3 transition ${
                      active
                        ? "border-navy bg-[linear-gradient(135deg,#203449,#35516b)] text-white shadow-[0_18px_40px_rgba(32,52,73,0.22)]"
                        : "border-line bg-white/65 text-ink hover:-translate-y-0.5 hover:border-sage/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          active ? "text-white" : "text-ink"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span
                        className={`text-[11px] ${
                          active ? "text-white/70" : "text-muted"
                        }`}
                      >
                        {item.hint}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="panel-muted rounded-[26px] p-4">
              <p className="eyebrow">Next Exam</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {hydrated ? nearest?.name ?? "尚未设置" : "正在读取倒计时"}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {hydrated
                      ? nearest?.note ?? "暂未设置考试目标。"
                      : "正在读取倒计时"}
                  </p>
                </div>
                <div className="rounded-[22px] bg-accent px-3 py-2 text-right text-white">
                  <div className="numeric-display text-2xl font-semibold leading-none">
                    {hydrated ? daysLeft : "--"}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/80">
                    Days
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-dashed border-line bg-white/45 p-4">
              <p className="eyebrow">Info Feed</p>
              <p className="mt-3 text-sm font-semibold text-ink">公考信息更新</p>
              <p className="mt-2 text-sm leading-7 text-muted">暂无更新</p>
            </div>

            <SidebarStudyCalendar />
          </div>
        </aside>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
