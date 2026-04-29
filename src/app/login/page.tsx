import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { login, signup } from "@/app/login/actions";

function buildOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const mode = typeof resolvedSearchParams.mode === "string" ? resolvedSearchParams.mode : "";
  const showSignupSuccess = mode === "signup-success";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(182,95,51,0.12),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(32,52,73,0.12),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.35),transparent_42%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="panel rounded-[34px] p-6 lg:p-8">
          <p className="eyebrow">Shared Access</p>
          <h1 className="display-title mt-3 text-4xl leading-tight text-ink md:text-[3.4rem]">
            两台电脑登录同一个账号，就能看到同一份学习进度和记录。
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted md:text-base">
            当前版本会把课程进度、打卡、学习记录、刷题记录、模考成绩、倒计时、待办和错题本同步到云端。
          </p>
        </section>

        <section className="panel rounded-[34px] p-6">
          <p className="eyebrow">Login</p>
          <h2 className="display-title mt-2 text-3xl text-ink">登录公考平台</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            如果还没有账号，可以先注册一个邮箱账号，然后在两台电脑上共用这套账号密码。
          </p>

          {showSignupSuccess ? (
            <div className="mt-5 rounded-[24px] border border-sage/30 bg-sage/10 px-4 py-3 text-sm leading-7 text-sage">
              注册请求已提交。如果你的 Supabase 项目开启了邮箱确认，请先到邮箱完成验证，再回来登录。
            </div>
          ) : null}

          <form className="mt-6 space-y-4">
            <input type="hidden" name="origin" value={buildOrigin()} />

            <label className="block space-y-2 text-sm text-muted">
              <span className="font-semibold text-ink">邮箱</span>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2 text-sm text-muted">
              <span className="font-semibold text-ink">密码</span>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                placeholder="至少 6 位"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                formAction={login}
                className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
              >
                登录
              </button>
              <button
                formAction={signup}
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/70"
              >
                注册新账号
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
