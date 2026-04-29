import Link from "next/link";

export default async function ErrorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const message =
    typeof resolvedSearchParams.message === "string"
      ? decodeURIComponent(resolvedSearchParams.message)
      : "登录或注册失败，请检查 Supabase 配置和账号信息。";
  const hint =
    typeof resolvedSearchParams.hint === "string" ? resolvedSearchParams.hint : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-ink">
      <div className="panel w-full max-w-2xl rounded-[34px] p-6 lg:p-8">
        <p className="eyebrow">Auth Error</p>
        <h1 className="display-title mt-3 text-4xl leading-tight text-ink">
          认证流程没有完成。
        </h1>
        <p className="mt-4 rounded-[24px] border border-accent/30 bg-accent/10 px-4 py-4 text-sm leading-7 text-accent-deep">
          {message}
        </p>
        {hint === "email-confirm" ? (
          <div className="mt-4 rounded-[24px] border border-line bg-white/72 px-4 py-4 text-sm leading-7 text-muted">
            <p className="font-semibold text-ink">如果这是注册后的邮箱验证页，通常是 Supabase 邮件模板还没改成 SSR 验证方式。</p>
            <p className="mt-2">
              请到 `Authentication` → `URL Configuration` 确认已加入
              `http://127.0.0.1:3001/**`，再到 `Authentication` → `Email Templates` →
              `Confirm signup`，把模板链接改成：
            </p>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[#f6efe1] px-4 py-3 text-xs leading-6 text-accent-deep">
              {`<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">确认邮箱</a>`}
            </pre>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
          >
            返回登录页
          </Link>
        </div>
      </div>
    </div>
  );
}
