# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + next-intl app. Every surface, including the public landing page, lives in this app.

## Identity

- Product name: **VFi** (always spelled VFi: capital V and F, lowercase i). Deployed at vfi.airppp.com.
- VFi is the Phone service of **AirPPP** (umbrella: Phone, People, Presence), made by **Nyquiste Corporation** (Reston, VA, founded 2023).
- Assets: no Nyquiste logo is used on VFi surfaces (text mention only). No AirPPP logo exists. VFi logo: concept B "Wave V" (five rounded voice bars dipping into a V, center bar in signal teal #0E9AA7, beside a Geist 500 "VFi" wordmark), chosen 2026-10-23.
- Formerly "Easy Voice"; that name must disappear from every surface.

## Terminology

- **Assistant (助理)** is the product feature: what the customer creates, configures, links to a number and reviews. Use it in all UI and marketing copy for the thing users manage. Never call the feature an "agent".
- **Voice AI Agent (AI 语音智能体)** is the technology that powers an Assistant. Use it only when explaining how VFi works (e.g. "powered by a Voice AI Agent").
- Code identifiers and routes may still say "agent"; that is internal.

## Users and job

Primary: Chinese-speaking founders and small teams from China and Asia taking their business into the US market. They talk to US customers by phone, can't staff every call or keep US hours, and want an AI voice assistant running quickly without building telephony or buying call-center labor. Chinese and English carry equal weight; es, ja, vi are full translations.

Jobs (from the product deck, the content source of truth):
1. Reception — answer first-time callers, introduce the company, learn intent, collect identity, contact and key needs.
2. Business Q&A — answer product, scope and partnership questions from the company's own materials; strict mode limits factual answers to those materials; unconfirmed items are recorded for the team.
3. Business outreach — call a US customer, vendor or partner with a stated goal (inquiry, confirmation, follow-up), one call at a time, started from the web.

After calls the team reviews recordings, transcripts and available summaries and decides next steps.

## Positioning

A US phone number plus a configurable, multi-scenario AI voice assistant, on one platform.
Value points (deck): low latency (efficient agent architecture, edge computing); all-in-one (no outside vendors to integrate); compliance (carrier-verified identity and certificates in the underlying infrastructure); low cost (no human call staff, no phone hardware); smart (current AI models and agents); easy (manage numbers, assistants and billing in one place).

## Capabilities (true today)

- Buy US local numbers by area code; answer inbound calls, place outbound calls, receive texts (receive only).
- Assistants: company intro, greeting, instructions, language, voice (built-in voices, voice cloning, or the user's own ElevenLabs account), knowledge base, strict answer mode, model choice.
- Calls: recordings, transcripts, summaries when available.
- One call at a time per account. Outbound calls are started one by one by the user.
- Billing: prepaid balance via Stripe, minimum top-up US$10, no subscription.

Do not claim: bringing an existing number / SIP trunk (hidden until built), outbound texting, browser calling (that is VFi Lite, a separate product), concurrency, customer results, specific compliance certifications, edge computing or latency figures.

Do not state on public pages: the one-call-at-a-time limit (true, but kept to the app).

## Pricing (final as of 2026-10-23; matches config)

Calls in or out US$0.15/min · Phone number US$3.00 per 30 days · Voice clone US$5.00 each · Knowledge source US$1.00 each · Received text US$0.02 per segment · Pay as you go, no plans. Cloning through the user's own ElevenLabs account is free on our side.

## Getting started (deck)

1. Sign up and top up (Stripe, min US$10). 2. Configure the assistant (company info, greeting, instructions, language, voice, optional knowledge). 3. Buy a number by area code and link it once the number is active and the assistant is ready. 4. Test by calling in or placing an outreach call; review and adjust.

## Evidence

No customer logos, testimonials or metrics exist. Proof is the product itself (live demo of the interface) and transparent pricing. Deck note: scenario examples are illustrations, not customer cases or promised results.

## Brand commitments

- Never use uppercase text styling or ALL-CAPS labels (the product name VFi is a name, not styling).
- nyquiste.com is a weak reference for umbrella concepts and effects only; its VFi copy is wrong — the deck wins.

## Copy decisions (2026-10-23)

- Website wording source of truth: docs/vfi-website-copy.md.
- Public landing page: English and Simplified Chinese only, chosen from the browser's language. Sign-in page, Dashboard and emails: all five languages.
- Contact shown publicly: birdyyao@nyquiste.com. Footer links to nyquiste.com; no AirPPP link.
- Privacy Policy and Terms: VFi will have its own, written later; until then both links open a coming-soon page. Required before public launch.
- The signed-in app is called **Dashboard / 控制台**; Overview / 概览 is one page inside it.
- One account button (Sign in / 登录 when signed out, Dashboard / 控制台 when signed in) is the landing page's only main button: header, hero, pricing, closing. No separate "Get started".
- Company intro and company info belong in the **Knowledge Base / 知识库** (no separate company field). Every scenario's copy shows the Knowledge Base at work.
- Sign-in code email gets a richer layout (mock first).
- Assistant templates: Reception, Business Q&A, Outreach, plus Blank.
- App copy is written for businesses, not personal use. `/agents` routes become `/assistants` with redirects.
- Illustrated features on the landing (structured captured fields) are illustrations only; no feature change.

## Accessibility

Standard WCAG 2.2 AA expectations; five interface languages including CJK and Vietnamese diacritics.

## Visual commitments (standing)

- Direction chosen 2026-10-23: the category standard for AI voice-agent products, played straight at full craft. Peer and craft bar: **ElevenLabs Agents** (restrained monochrome system, embedded live voice/chat widget, polished app console).
