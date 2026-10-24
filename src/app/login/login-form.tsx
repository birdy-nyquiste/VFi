"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton, safeAction } from "@/components/forms";
import { buttonClass, inputClass } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = { step: "email" };
const ERROR_ID = "login-error";
const CODE_SENT_ID = "login-code-sent";

/** `oauthError` is a failed Google sign-in from the redirect; it's shown until the user tries again. */
export function LoginForm({ google, oauthError }: { google: boolean; oauthError?: string }) {
  const t = useTranslations("login");
  const tErrors = useTranslations("errors");
  const send = safeAction(loginAction, tErrors("network"));
  // Pass the typed address along: a request that fails outright returns the previous state, which
  // then still has it (the form resets its fields after every submission).
  const [state, action] = useActionState<LoginState, FormData>(
    (prev, data) => send({ ...prev, email: String(data.get("email") ?? "") }, data),
    INITIAL,
  );
  return (
    <>
      {oauthError && state === INITIAL && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {oauthError}
        </p>
      )}
      {google && (
        <>
          <a href="/api/auth/google" className={`${buttonClass("secondary", "lg")} w-full`}>
            <GoogleIcon />
            {t("google")}
          </a>
          <div className="my-5 flex items-center gap-3 text-[13px] text-stone-500">
            <span className="h-px flex-1 bg-stone-200" />
            {t("or")}
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}
      <form action={action} className="space-y-3">
        <label htmlFor="login-email" className="block text-sm font-medium">
          {t("emailLabel")}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={state.email}
          readOnly={state.step === "code"}
          aria-describedby={state.step === "email" && state.error ? ERROR_ID : undefined}
          className={`${inputClass} py-3 read-only:bg-stone-100`}
        />
        {state.step === "code" && (
          <>
            <p id={CODE_SENT_ID} role="status" className="text-sm text-stone-600">
              {t(state.resent ? "codeResent" : "codeSent", { email: state.email ?? "" })}
            </p>
            <label htmlFor="login-code" className="sr-only">
              {t("codeLabel")}
            </label>
            <input
              id="login-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              // No maxLength: a pasted "482 913" would be cut to "482 91" before this could tidy it.
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 6);
              }}
              required
              autoFocus
              placeholder="123456"
              aria-describedby={state.error ? `${CODE_SENT_ID} ${ERROR_ID}` : CODE_SENT_ID}
              className={`${inputClass} py-3 text-center font-mono text-xl tracking-[0.5em]`}
            />
          </>
        )}
        {state.error && (
          <p id={ERROR_ID} role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <LoginButtons step={state.step} />
      </form>
    </>
  );
}

const linkButtonClass = "text-sm text-stone-500 enabled:hover:text-stone-800 disabled:cursor-not-allowed";

/** The clicked button shows the progress, and none can be pressed again until the request is done. */
function LoginButtons({ step }: { step: LoginState["step"] }) {
  const t = useTranslations("login");
  const { pending, data } = useFormStatus();
  // "send" (resend), "change", or null for the main button.
  const intent = pending ? data?.get("intent") : null;
  const label = step === "email" ? t("sendCode") : t("signIn");
  return (
    <div className="flex flex-col gap-2">
      <SubmitButton size="lg" pendingText={step === "email" ? t("sending") : intent ? label : t("verifying")}>
        {label}
      </SubmitButton>
      {step === "code" && (
        <div className="flex justify-center gap-4">
          <button name="intent" value="send" disabled={pending} className={linkButtonClass} formNoValidate>
            {intent === "send" ? t("sending") : t("resend")}
          </button>
          <button name="intent" value="change" disabled={pending} className={linkButtonClass} formNoValidate>
            {t("changeEmail")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Google's "G", as its sign-in guidelines ask for on a "Continue with Google" button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-[18px] w-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
