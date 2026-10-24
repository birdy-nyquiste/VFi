import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "../_landing/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("comingSoon"))("privacy") };
}

export default function Page() {
  return <ComingSoon document="privacy" />;
}
