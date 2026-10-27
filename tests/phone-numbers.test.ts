import { describe, expect, it } from "vitest";
import { activeNumbersByAge, defaultCallerNumber, ourNumber } from "@/lib/phone-numbers";

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

describe("activeNumbersByAge", () => {
  it("keeps active numbers, earliest-bought first", () => {
    const numbers = [
      { id: "b", status: "active", agentId: null, createdAt: at(2) },
      { id: "p", status: "pending", agentId: null, createdAt: at(0) },
      { id: "a", status: "active", agentId: null, createdAt: at(1) },
    ];
    expect(activeNumbersByAge(numbers).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("ourNumber", () => {
  it("is the number called on inbound calls and the caller ID on outbound ones", () => {
    expect(ourNumber({ direction: "inbound", fromNumber: "+16505550133", toNumber: "+14155550142" })).toBe("+14155550142");
    expect(ourNumber({ direction: "outbound", fromNumber: "+14155550142", toNumber: "+16505550133" })).toBe("+14155550142");
  });
});
