import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/server/auth";
import Link from "next/link";
import { LocaleLinks } from "@/components/locale-links";
import { LiveIndicator, Logo } from "@/components/logo";
import { focusRing } from "@/components/ui";
import { LoginForm } from "./login-form";
import { oauthErrorKey } from "./oauth-error";

export async function generateMetadata(): Promise<Metadata> {
  // "Sign in to VFi" already names the app.
  return { title: { absolute: (await getTranslations("login"))("title") } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const t = await getTranslations("login");
  const oauthError = error ? t(oauthErrorKey(error)) : undefined;
  return (
    <div className="flex min-h-screen flex-wrap bg-stone-50">
      <div className="flex min-h-screen min-w-0 flex-[1_1_480px] flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="VFi" className={`self-start rounded-lg ${focusRing}`}>
          <Logo />
        </Link>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="flex w-full max-w-[380px] flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-light leading-[42px] tracking-[-0.035em]">{t("title")}</h1>
              <p className="text-[15px] leading-[23px] text-stone-600">{t("tagline")}</p>
            </div>
            <LoginForm google={config.google.enabled} oauthError={oauthError} />
            <p className="text-[13px] leading-5 text-stone-500">
              {t.rich("legal", {
                terms: (chunks) => (
                  <Link href="/terms" className="underline hover:text-stone-900">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" className="underline hover:text-stone-900">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </main>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-stone-500">
          <span>{t("footer")}</span>
          <LocaleLinks />
        </div>
      </div>
      <div className="hidden min-w-0 flex-[1_1_480px] p-4 lg:flex">
        <div className="flex flex-1 flex-col justify-between gap-10 rounded-[28px] bg-stone-900 p-14 text-white">
          <p className="max-w-[460px] text-[40px] font-light leading-[46px] tracking-[-0.035em]">{t("panelTitle")}</p>
          <div className="flex max-w-[420px] flex-col gap-3">
            <div className="flex items-center gap-3.5 rounded-[20px] border border-stone-700 bg-stone-800 px-5 py-[18px]">
              <LiveIndicator className="h-9 w-9" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("panelCard")}</span>
                <span className="text-[13px] text-stone-400">{t("panelCardDetail")}</span>
              </div>
            </div>
            <span className="text-xs text-stone-400">{t("panelNote")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
