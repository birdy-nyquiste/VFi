import { describe, expect, it } from "vitest";
import { defaultCallerNumber } from "@/lib/caller-number";

const at = (s: number) => new Date(2026, 9, 27, 12, 0, s);

describe("defaultCallerNumber", () => {
  const numbers = [
    { id: "c", status: "active", agentId: "sales", createdAt: at(3) },
    { id: "a", status: "active", agentId: null, createdAt: at(1) },
    { id: "b", status: "active", agentId: "sales", createdAt: at(2) },
    { id: "p", status: "pending", agentId: "desk", createdAt: at(0) },
  ];

  it("picks the agent's earliest-bought active number", () => {
    expect(defaultCallerNumber(numbers, "sales")?.id).toBe("b");
  });

  it("falls back to the earliest-bought active number", () => {
    expect(defaultCallerNumber(numbers, "desk")?.id).toBe("a");
  });

  it("finds nothing without an active number", () => {
    expect(defaultCallerNumber([numbers[3]], "desk")).toBeUndefined();
  });
});
