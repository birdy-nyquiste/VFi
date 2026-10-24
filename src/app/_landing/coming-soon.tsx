import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { Badge, buttonClass, focusRing } from "@/components/ui";

/** Stands in for a policy page until VFi's own Privacy Policy and Terms are written. */
export async function ComingSoon({ document }: { document: "privacy" | "terms" }) {
  const t = await getTranslations("comingSoon");
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 px-4 py-8 sm:px-10">
      <Link href="/" aria-label="VFi" className={`self-start rounded-lg ${focusRing}`}>
        <Logo />
      </Link>
      <main className="flex flex-1 items-center justify-center py-16">
        <div className="flex max-w-[520px] flex-col items-start gap-5">
          <h1 className="text-[44px] font-light leading-[50px] tracking-[-0.035em]">{t(document)}</h1>
          <Badge>{t("title")}</Badge>
          <p className="text-[17px] leading-[27px] text-stone-600">
            {t.rich("body", {
              document: t(document),
              email: (chunks) => (
                <a href="mailto:birdyyao@nyquiste.com" className="text-stone-900 underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <Link href="/" className={buttonClass("secondary")}>
            {t("back")}
          </Link>
        </div>
      </main>
    </div>
  );
}
