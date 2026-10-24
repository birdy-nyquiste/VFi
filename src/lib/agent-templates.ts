import type { AgentBehavior, AgentVariable } from "./agent-settings";
import type { Language } from "./language";

/**
 * Starting points for a new Assistant. A template only fills in the new-Assistant form; nothing links
 * an Assistant to the template it came from. Names and descriptions are translated (agentTemplates.*);
 * greetings and instructions are what the agent itself reads, so they stay as written here.
 */
export interface AgentTemplate {
  language: Language;
  greeting: string;
  instructions: string;
  variables: AgentVariable[];
  behavior?: Partial<AgentBehavior>;
}

const businessName: AgentVariable = { key: "business_name", value: "", askPerCall: false };

// The three scenarios VFi is built around (reception, business Q&A, outreach), plus a blank start.
export const AGENT_TEMPLATES = {
  reception: {
    language: "en",
    greeting: "Thanks for calling {{business_name}}. How can I help?",
    instructions: `You are the front desk for {{business_name}}. Be warm, professional and brief.

This call is {{call_direction}}.
- If inbound: introduce {{business_name}} briefly when it helps, using your knowledge base. Find out why they are calling. For new inquiries and partnership or wholesale calls, collect their name, company, the best way to reach them (they're calling from {{contact_number}}) and what they need. Read the details back to confirm them.
- If outbound: you are calling on behalf of {{business_name}}. Your goal for this call: {{call_goal}}

Never quote prices, promise delivery dates or make commitments for {{business_name}}. If you aren't sure, say the team will follow up.`,
    variables: [businessName],
  },

  qa: {
    language: "en",
    greeting: "Thanks for calling {{business_name}}. What would you like to know?",
    instructions: `You answer questions about {{business_name}}'s products, services and how to work with the company. Be clear, accurate and brief.

Answer only from your knowledge base and these instructions. If something isn't covered, or you can't confirm it, say so plainly, then collect the caller's name, the best way to reach them (they're calling from {{contact_number}}) and their question, so the team can follow up. Read the details back to confirm them.

This call is {{call_direction}}.
- If outbound: you are calling on behalf of {{business_name}}. Your goal for this call: {{call_goal}}

Don't make up prices, availability, terms or policies.`,
    variables: [businessName],
  },

  outreach: {
    language: "en",
    greeting: "Hi, this is the assistant for {{business_name}}. Is this a good time?",
    instructions: `You make business calls for {{business_name}} to US customers, vendors and partners. Be friendly, clear and efficient.

This call is {{call_direction}}.
- If outbound: your goal for this call: {{call_goal}}
  Say who you are and why you're calling. Work toward the goal; if you reach a menu or are put on hold, wait patiently. Use your knowledge base for background about {{business_name}}. Before ending, repeat anything you agreed on: dates, times, names and next steps.
- If inbound: someone is calling back. Take their name, what it's about and any details, and confirm them back.

Stay within the goal. Never agree to prices, payments, contracts or deadlines unless the goal says you may.`,
    variables: [businessName],
    // Phone menus and hold music: give it time, and don't hang up on silence.
    behavior: { responseTiming: "balanced", silenceHangupSecs: 0 },
  },

  blank: { language: "en", greeting: "", instructions: "", variables: [] },
} satisfies Record<string, AgentTemplate>;

export type TemplateId = keyof typeof AGENT_TEMPLATES;
export const TEMPLATE_IDS = Object.keys(AGENT_TEMPLATES) as TemplateId[];

/** The templates to offer: business Q&A answers from a knowledge base, so only where that feature is on. */
export function offeredTemplates(knowledgeBase: boolean): TemplateId[] {
  return knowledgeBase ? TEMPLATE_IDS : TEMPLATE_IDS.filter((id) => id !== "qa");
}

export function toTemplateId(v: unknown): TemplateId | null {
  return typeof v === "string" && v in AGENT_TEMPLATES ? (v as TemplateId) : null;
}
