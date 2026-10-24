import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LiveIndicator, Logo, LogoMark } from "@/components/logo";
import { buttonClass, focusRing } from "@/components/ui";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/server/auth";
import { LANDING_COPY, type LandingCopy, type LandingLang } from "./_landing/copy";
import { LanguageToggle } from "./_landing/language-toggle";
import { ScenarioTabs } from "./_landing/scenario-tabs";

/** The landing page is English or Simplified Chinese; every other interface language sees English. */
async function landingLang(): Promise<LandingLang> {
  return (await getLocale()) === "zh" ? "zh" : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = LANDING_COPY[await landingLang()];
  return { title: { absolute: meta.title }, description: meta.description };
}

/** "US$0.15": the landing page always names the currency, for visitors outside the US. */
function usd(cents: number) {
  return `US$${(cents / 100).toFixed(2)}`;
}

const h2 = "text-[34px] font-light leading-10 tracking-[-0.035em] sm:text-[44px] sm:leading-[50px]";
const wrap = "mx-auto w-full max-w-[1200px] px-4 sm:px-8";

export default async function Home() {
  const [user, lang] = await Promise.all([getCurrentUser(), landingLang()]);
  const c = LANDING_COPY[lang];
  // One main button everywhere on the page: Sign in, or Dashboard once signed in.
  const account = user ? { href: "/dashboard", label: c.nav.dashboard } : { href: "/login", label: c.nav.signIn };
  const p = config.pricing;
  const prices: [string[], string][] = [
    [c.pricing.rows.calls, usd(p.callPerMinuteCents)],
    [c.pricing.rows.number, usd(p.numberMonthlyCents)],
    ...(config.features.voiceCloning ? [[c.pricing.rows.clone, usd(p.voiceCloneCents)] as [string[], string]] : []),
    ...(config.features.knowledgeBase ? [[c.pricing.rows.knowledge, usd(p.knowledgeSourceCents)] as [string[], string]] : []),
    [c.pricing.rows.text, usd(p.smsInboundPerPartCents)],
  ];

  return (
    <div lang={lang === "zh" ? "zh-CN" : "en-US"} className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm">
        <div className={`${wrap} flex h-[68px] items-center gap-8`}>
          <Link href="/" aria-label={c.nav.home} className={`rounded-lg ${focusRing}`}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden gap-7 text-[15px] sm:flex">
            <a href="#scenarios" className="hover:text-stone-600">
              {c.nav.scenarios}
            </a>
            <a href="#how" className="hover:text-stone-600">
              {c.nav.how}
            </a>
            <a href="#pricing" className="hover:text-stone-600">
              {c.nav.pricing}
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <LanguageToggle lang={lang} label={c.nav.language} />
            <Link href={account.href} className={buttonClass("primary")}>
              {account.label}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="top" className={`${wrap} flex flex-wrap items-center gap-14 pb-24 pt-16 sm:pt-[88px]`}>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <h1 className="text-[44px] font-light leading-[48px] tracking-[-0.04em] [text-wrap:balance] sm:text-[64px] sm:leading-[68px]">{c.hero.title}</h1>
            <p className="max-w-[520px] text-[19px] leading-[29px] text-stone-600">{c.hero.subtitle}</p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href={account.href} className={buttonClass("primary", "lg")}>
                {account.label}
              </Link>
              <a href="#pricing" className={buttonClass("secondary", "lg")}>
                {c.hero.seePricing}
              </a>
            </div>
            <p className="text-sm text-stone-500">{c.hero.note}</p>
          </div>
          <HeroCall copy={c.call} />
        </section>

        <section className={`${wrap} pb-28`}>
          <h2 className={`${h2} mb-10 max-w-[720px]`}>{c.values.title}</h2>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-l border-t border-stone-200">
            {c.values.items.map((v) => (
              <li key={v.title} className="flex flex-col gap-2.5 border-b border-r border-stone-200 bg-white px-8 pb-9 pt-8">
                <h3 className="text-xl font-medium tracking-[-0.01em]">{v.title}</h3>
                <p className="text-[15px] leading-[23px] text-stone-600">{v.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="scenarios" className="scroll-mt-[68px] border-y border-stone-200 bg-white py-[104px]">
          <div className={wrap}>
            <ScenarioTabs copy={c.scenarios} speakers={{ caller: c.call.caller, assistant: c.call.assistant }} />
          </div>
        </section>

        <section id="how" className={`${wrap} flex scroll-mt-[68px] flex-col gap-12 py-28`}>
          <h2 className={h2}>{c.steps.title}</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-6">
            {c.steps.items.map((s) => (
              <li key={s.n} className="flex flex-col gap-3 border-t border-stone-900 pt-5">
                <span className="text-sm tabular-nums text-stone-500">{s.n}</span>
                <h3 className="text-xl font-medium">{s.title}</h3>
                <p className="text-[15px] leading-[23px] text-stone-600">{s.body.replace("{min}", usd(p.minTopupCents))}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-6 pt-6">
            <Flow title={c.ops.inbound.title} items={c.ops.inbound.items} />
            <Flow title={c.ops.outbound.title} items={c.ops.outbound.items} />
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-3xl bg-stone-900 p-7 text-white">
              <h3 className="text-lg font-medium">{c.ops.after.title}</h3>
              <p className="text-[15px] leading-[23px] text-stone-300">{c.ops.after.body}</p>
            </div>
          </div>
          <p className="max-w-[760px] text-[13px] leading-5 text-stone-500">{c.ops.note}</p>
        </section>

        <section id="pricing" className="scroll-mt-[68px] border-y border-stone-200 bg-white py-[104px]">
          <div className={`${wrap} flex flex-wrap gap-14`}>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
              <h2 className={h2}>{c.pricing.title}</h2>
              <p className="max-w-[400px] text-base leading-[25px] text-stone-600">{c.pricing.subtitle}</p>
              <Link href={account.href} className={`${buttonClass("primary", "lg")} self-start`}>
                {account.label}
              </Link>
            </div>
            <div className="min-w-0 flex-[2_1_520px]">
              <table className="w-full border-collapse text-base">
                <caption className="pb-3 text-left text-[13px] text-stone-500">{c.pricing.caption}</caption>
                <tbody>
                  {prices.map(([[item, unit], price]) => (
                    <tr key={item} className="border-t border-stone-200">
                      <th scope="row" className="py-[22px] text-left font-normal">
                        {item}
                      </th>
                      <td className="whitespace-nowrap py-[22px] text-right text-2xl font-light tracking-[-0.02em]">{price}</td>
                      <td className="w-[130px] py-[22px] pl-4 text-right text-sm text-stone-500">{unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 border-t border-stone-200 pt-4 text-[13px] leading-5 text-stone-500">{c.pricing.note}</p>
            </div>
          </div>
        </section>

        <section className={`${wrap} flex flex-col items-center gap-6 py-[120px] text-center`}>
          <LogoMark className="h-14 w-14" />
          <h2 className="max-w-[760px] text-[38px] font-light leading-[44px] tracking-[-0.04em] [text-wrap:balance] sm:text-[52px] sm:leading-[58px]">
            {c.close.title}
          </h2>
          <Link href={account.href} className={buttonClass("primary", "lg")}>
            {account.label}
          </Link>
        </section>
      </main>

      <footer className="border-t border-stone-200">
        <div className={`${wrap} flex flex-wrap justify-between gap-x-12 gap-y-6 py-10 text-sm text-stone-600`}>
          <div className="flex max-w-[440px] flex-col gap-2">
            <Logo size="sm" />
            <p>
              {c.footer.before}
              <a href="https://www.nyquiste.com" className="underline hover:text-stone-900">
                Nyquiste Corporation
              </a>
              {c.footer.after}
            </p>
            <p>12020 Sunrise Valley Dr Ste 100, Reston, VA 20191</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-start gap-5">
            <a href="#pricing" className="hover:text-stone-900">
              {c.nav.pricing}
            </a>
            <Link href="/privacy" className="hover:text-stone-900">
              {c.footer.privacy}
            </Link>
            <Link href="/terms" className="hover:text-stone-900">
              {c.footer.terms}
            </Link>
            <a href="mailto:birdyyao@nyquiste.com" className="hover:text-stone-900">
              birdyyao@nyquiste.com
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Flow({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-3xl border border-stone-200 bg-white p-7">
      <h3 className="text-lg font-medium">{title}</h3>
      <ul className="flex list-disc flex-col gap-2 pl-[18px] text-[15px] leading-[22px] text-stone-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

/** The hero's example call. An illustration: the conversation stays in English, as with a US caller. */
function HeroCall({ copy }: { copy: LandingCopy["call"] }) {
  const lines: [boolean, string][] = [
    [true, "Thanks for calling Lumen Home. This call may be recorded. How can I help?"],
    [false, "Hi, I saw your website. Do you ship wholesale orders to Texas?"],
    [true, "We do. May I have your name and the best email for a quote?"],
    [false, "Dana Ortiz, dana@example.com. About two hundred units to Austin."],
  ];
  return (
    <figure className="m-0 min-w-0 flex-[1_1_460px]">
      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_60px_rgba(11,11,12,0.08),0_2px_6px_rgba(11,11,12,0.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-[22px] py-[18px]">
          <LiveIndicator />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="whitespace-nowrap text-[15px] font-medium tabular-nums">+1 (415) 555-0132</span>
            <span className="text-[13px] text-stone-500">{copy.meta}</span>
          </div>
          <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 text-[13px] text-emerald-700">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {copy.status} · <span className="tabular-nums">02:14</span>
          </span>
        </div>
        <ol className="flex flex-col gap-3.5 p-[22px] text-[15px] leading-[22px]" lang="en-US">
          {lines.map(([assistant, text], i) => (
            <li key={i} className="flex animate-vfi-line-in gap-3" style={{ animationDelay: `${i * 0.5}s` }}>
              <span className={`w-16 shrink-0 pt-px text-[13px] ${assistant ? "text-emerald-700" : "text-stone-500"}`}>
                {assistant ? copy.assistant : copy.caller}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <div className="mx-3.5 mb-3.5 flex animate-vfi-line-in flex-col gap-2.5 rounded-[18px] bg-stone-100 px-[18px] py-4 [animation-delay:2.1s]">
          <span className="text-[13px] font-medium">{copy.summary}</span>
          <span className="text-sm leading-[21px] text-stone-700" lang="en-US">
            Wholesale inquiry, about 200 units to Austin, TX. Contact: Dana Ortiz, dana@example.com. Wants a quote.
          </span>
          <div className="flex flex-wrap gap-1.5">
            {copy.tags.map((tag) => (
              <span key={tag} className="inline-flex h-6 items-center rounded-full border border-stone-200 bg-white px-2.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-stone-500">{copy.disclaimer}</figcaption>
    </figure>
  );
}
