import { getLocale } from "next-intl/server";
import { UserError, userMessage, type ErrorKey } from "./errors";

/** `errorKey` names the UserError, so a form can point at the field it's about. */
export type ActionState = { error?: string; errorKey?: ErrorKey; ok?: string } | undefined;

/**
 * Run a server action body, turning thrown UserErrors into form state in the user's language.
 * The body returns its success message already translated.
 */
export async function attempt(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = await fn();
    return { ok: ok || undefined };
  } catch (err) {
    // Let Next.js redirect()/notFound() propagate.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) {
      throw err;
    }
    if (!(err instanceof Error && err.name === "UserError")) console.error(err);
    return { error: userMessage(err, await getLocale()), errorKey: err instanceof UserError ? err.key : undefined };
  }
}
