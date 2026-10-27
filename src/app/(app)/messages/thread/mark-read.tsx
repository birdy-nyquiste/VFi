"use client";

import { useEffect } from "react";
import { markReadAction } from "../actions";

/**
 * Marks the texts on screen read once they've rendered. A thread open in a background tab (left
 * there, or opened with cmd-click) waits until the tab is shown, so texts aren't marked read unseen.
 */
export function MarkRead({ from, to, upTo, hasUnread }: { from: string; to?: string; upTo: string; hasUnread: boolean }) {
  useEffect(() => {
    if (!hasUnread) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", mark);
      // The action revalidates the layout, which refreshes the nav badge. If it fails, the texts
      // just stay unread until the next visit.
      markReadAction({ from, to }, upTo).catch(() => {});
    };
    document.addEventListener("visibilitychange", mark);
    mark();
    return () => document.removeEventListener("visibilitychange", mark);
  }, [from, to, upTo, hasUnread]);
  return null;
}
