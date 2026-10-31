import { describe, expect, it } from "vitest";
import { agentTabForError, agentTabQuery, readAgentTab } from "@/lib/agent-tab-ids";

describe("Assistant page tabs", () => {
  it("reads the tab from the address, falling back to Identity", () => {
    expect(readAgentTab("ending")).toBe("ending");
    expect(readAgentTab("nope")).toBe("identity");
    expect(readAgentTab("knowledge", false)).toBe("identity");
  });

  it("names the tab in the address only when it isn't Identity", () => {
    expect(agentTabQuery("identity", { saved: "1" })).toBe("?saved=1");
    expect(agentTabQuery("results", { saved: "1" })).toBe("?saved=1&tab=results");
    expect(agentTabQuery("identity")).toBe("");
  });

  it("opens the tab a save error is about", () => {
    expect(agentTabForError("voicemailMessageRequired")).toBe("ending");
    expect(agentTabForError("variableKeyDuplicate")).toBe("instructions");
    expect(agentTabForError("invalidRecipient")).toBe("results");
    expect(agentTabForError("generic")).toBeUndefined();
    expect(agentTabForError(undefined)).toBeUndefined();
  });
});
