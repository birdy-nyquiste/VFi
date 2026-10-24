import type { Locale } from "@/i18n/locales";
import { BCP47 } from "@/i18n/locales";
import { translator } from "@/i18n/messages";

/**
 * The sign-in code email, in the user's interface language. HTML is laid out with tables and inline
 * styles, the only layout mail clients agree on; web fonts mostly don't load there, so the type falls
 * back to the system face. The plain-text part carries the same content for clients that skip HTML.
 */
export function signInCodeEmail(locale: Locale, code: string, email: string): { subject: string; text: string; html: string } {
  const t = translator(locale, "email");
  const subject = t("otpSubject", { code });
  const parts = {
    preheader: t("otpPreheader"),
    heading: t("otpHeading"),
    intro: t("otpIntro", { email }),
    expiry: t("otpExpiry"),
    notYou: t("otpNotYou"),
    footer: t("otpFooter"),
  };
  const text = [parts.heading, "", parts.intro, "", code, "", parts.expiry, "", parts.notYou, "", "—", parts.footer].join("\n");
  const e = escapeHtml;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans','Microsoft YaHei',Helvetica,Arial,sans-serif";
  const html = `<!doctype html>
<html lang="${BCP47[locale]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fbfaf9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(parts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfaf9;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${font};color:#0b0b0c;">
<tr><td align="center" style="padding-bottom:24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:8px;vertical-align:middle;">${LOGO_MARK}</td>
<td style="font-size:20px;font-weight:600;letter-spacing:-1px;vertical-align:middle;">VFi</td>
</tr></table>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e8e6e3;border-radius:16px;padding:36px 36px 32px;">
<h1 style="margin:0 0 16px;font-size:26px;line-height:32px;font-weight:400;letter-spacing:-0.5px;">${e(parts.heading)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:#33343a;">${e(parts.intro)}</p>
<div style="background:#f3f2ef;border-radius:12px;padding:20px 0;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:36px;line-height:40px;font-weight:600;letter-spacing:8px;color:#0b0b0c;">${code}</div>
<p style="margin:20px 0 0;font-size:14px;line-height:21px;color:#55565b;">${e(parts.expiry)}</p>
<div style="height:1px;background:#efedea;margin:24px 0;line-height:1px;font-size:1px;">&nbsp;</div>
<p style="margin:0;font-size:13px;line-height:20px;color:#6e6f75;">${e(parts.notYou)}</p>
</td></tr>
<tr><td align="center" style="padding:20px 24px 0;font-size:12px;line-height:18px;color:#6e6f75;">${e(parts.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { subject, text, html };
}

/** The VFi mark as an inline image: many clients block SVG, so it is drawn with tables of bars. */
const BAR = (offset: number, color: string) =>
  `<td style="padding:0 1px;vertical-align:top;"><div style="width:4px;height:${offset}px;line-height:${offset}px;font-size:1px;">&nbsp;</div><div style="width:4px;height:17px;border-radius:2px;background:${color};line-height:17px;font-size:1px;">&nbsp;</div></td>`;
const LOGO_MARK = `<table role="presentation" cellpadding="0" cellspacing="0" style="height:28px;"><tr>${BAR(0, "#0b0b0c")}${BAR(4, "#0b0b0c")}${BAR(8, "#0e9aa7")}${BAR(4, "#0b0b0c")}${BAR(0, "#0b0b0c")}</tr></table>`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}
