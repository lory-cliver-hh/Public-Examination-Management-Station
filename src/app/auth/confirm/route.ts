import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const errorDescription = searchParams.get("error_description");
  const errorMessage = errorDescription
    ? decodeURIComponent(errorDescription)
    : "邮箱验证失败，请重新发起注册或检查回执链接。";

  const redirectWithError = (message: string, hint?: string) => {
    const errorUrl = new URL("/error", origin);
    errorUrl.searchParams.set("message", message);

    if (hint) {
      errorUrl.searchParams.set("hint", hint);
    }

    return NextResponse.redirect(errorUrl);
  };

  const redirectToNext = () => NextResponse.redirect(new URL(next, origin));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectToNext();
    }

    return redirectWithError(error.message, "email-confirm");
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return redirectToNext();
    }

    return redirectWithError(error.message, "email-confirm");
  }

  return redirectWithError(
    errorMessage,
    "email-confirm",
  );
}
