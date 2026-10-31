"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  confirm,
  disabled = false,
  size = "md",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const t = useTranslations("common");
  const formStatus = useFormStatus();
  // Inside ActionForm the submission doesn't go through <form action>, so read its pending state.
  const pending = useContext(ActionPendingContext) ?? formStatus.pending;
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={buttonClass(variant, size)}
      onClick={(e) => confirmFirst(e, confirm)}
    >
      {pending ? (pendingText ?? t("working")) : children}
    </button>
  );
}

/** Stops the click unless the user confirms `message` (when there is one). */
function confirmFirst(e: MouseEvent, message?: string): boolean {
  if (message && !window.confirm(message)) {
    e.preventDefault();
    return false;
  }
  return true;
}

/**
 * A button that runs a server action with fixed `data` where there's no form to put it in (e.g. inside another
 * form): it confirms, shows its pending state, and shows the action's error beside itself.
 */
export function ActionButton({
  action,
  data,
  children,
  pendingText,
  variant = "primary",
  confirm,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  data: Record<string, string>;
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const t = useTranslations("common");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        disabled={pending}
        className={buttonClass(variant)}
        onClick={(e) => {
          if (!confirmFirst(e, confirm)) return;
          const form = new FormData();
          for (const [k, v] of Object.entries(data)) form.set(k, v);
          start(async () => setState(await safeAction(action, te("network"))(undefined, form)));
        }}
      >
        {pending ? (pendingText ?? t("working")) : children}
      </button>
      {state?.error && (
        <span role="alert" className="text-sm text-red-600">
          {state.error}
        </span>
      )}
    </span>
  );
}

const ActionPendingContext = createContext<boolean | null>(null);
const ActionStateContext = createContext<{ state: ActionState; pending: boolean } | null>(null);

/** The latest result of the ActionForm this is inside, if any. */
export function useActionResult(): ActionState {
  return useContext(ActionStateContext)?.state;
}

/**
 * The form's latest error or success message, announced to screen readers. ActionForm shows it after
 * its fields unless `message="custom"`, in which case the form places this itself (e.g. next to a
 * Save button at the top). `initialOk` is shown until the next submission (e.g. "Saved." after a
 * redirect).
 */
export function FormMessage({ initialOk, className = "text-sm" }: { initialOk?: string; className?: string }) {
  const ctx = useContext(ActionStateContext);
  const state = ctx?.state;
  if (state?.error) return <p role="alert" className={`${className} text-red-600`}>{state.error}</p>;
  const ok = state?.ok ?? (state || ctx?.pending ? undefined : initialOk);
  return ok ? <p role="status" className={`${className} text-stone-600`}>{ok}</p> : null;
}

/**
 * A form bound to a server action that shows the returned error/success message.
 * Submits via onSubmit rather than <form action> because React resets a form's fields
 * after an action submission, which would wipe the user's input when we return an error.
 */
export function ActionForm({
  action,
  children,
  className,
  message = "end",
  resetOnSuccess = false,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Where the result message goes: after the fields, or wherever the form puts <FormMessage />. */
  message?: "end" | "custom";
  /**
   * Clear the fields after a success (keeping the message), for forms where submitting the same
   * input twice would do the thing twice, e.g. a paid clone. Inputs with their own state listen
   * for the form's reset event.
   */
  resetOnSuccess?: boolean;
}) {
  const t = useTranslations("errors");
  const [state, formAction, pending] = useActionState(safeAction(action, t("network")), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [resetOnSuccess, state]);
  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        // Include the clicked button's name/value (e.g. amount buttons).
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(data));
      }}
    >
      <ActionStateContext.Provider value={{ state, pending }}>
        <ActionPendingContext.Provider value={pending}>{children}</ActionPendingContext.Provider>
        {message === "end" && <FormMessage className="mt-2 text-sm" />}
      </ActionStateContext.Provider>
    </form>
  );
}

/**
 * Turn a rejected action call (network failure, body too large, server crash) into an error state;
 * otherwise useActionState rethrows it and the whole page falls over.
 */
export function safeAction<S extends { error?: string } | undefined>(action: (state: S, data: FormData) => Promise<S>, failedMessage: string) {
  return async (state: S, data: FormData): Promise<S> => {
    try {
      return await action(state, data);
    } catch (err) {
      // Let Next.js redirect()/notFound() propagate.
      if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_")) throw err;
      console.error(err);
      return { ...state, error: failedMessage } as S;
    }
  };
}
