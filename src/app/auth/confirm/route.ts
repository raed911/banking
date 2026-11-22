import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/action";

/** Handles email confirmation, magic links and password-reset links (PKCE code or token hash). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const target = request.nextUrl.clone();
  target.search = "";
  if (ok) {
    target.pathname = next.split("?")[0]!;
  } else {
    target.pathname = "/login";
    target.searchParams.set("error", "link_invalid");
  }
  return NextResponse.redirect(target);
}
