# Telnyx API notes

What we know about the Telnyx v2 API as VFi uses it: endpoints, field shapes, limits, and behavior we found by testing.
Product rules are in [SPEC.md](../SPEC.md); this file only records facts about Telnyx. Last reorganized 2026-10-27,
by topic. The earlier date-ordered version is in git history, and [Appendix A](#appendix-a-old-section-numbers)
maps its section numbers.

## How to use this file

- Find the topic in the contents below. Each fact carries how we know it:

  | Tag | Meaning |
  | --- | --- |
  | **Live YYYY-MM-DD** | Tested against the platform account on that date. Trust it over the docs. |
  | **Docs** | From Telnyx documentation or the OpenAPI spec only. |
  | **UNCONFIRMED** | Believed but not verified. Check before relying on it. |

  Facts without a tag in a section inherit the tag in the section's first line.
- **Sources:** developers.telnyx.com pages (linked per section); the OpenAPI spec
  `https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json`; the webhook catalog
  `https://developers.telnyx.com/data/webhook-events.json`; the LLM-friendly bundles
  `https://developers.telnyx.com/public/llms/ai/assistants-full.txt` and `.../calling/webrtc-full.txt`; and
  `https://telnyx.com/pricing.md`.
- **Testing rules:** probes use throwaway resources named `vfi-probe-*` or similar, never a user's, and delete them
  afterwards (Assistants with `?hard_delete=true`). Anything that costs money (a real call, buying a number) needs
  the product owner's OK first.
- **Adding a fact:** put it in its topic section with a tag. Don't add dated sections.

## Contents

1. [Conventions](#1-conventions)
2. [Phone numbers](#2-phone-numbers)
3. [Call Control application](#3-call-control-application)
4. [Call commands](#4-call-commands)
5. [Webhooks and signatures](#5-webhooks-and-signatures)
6. [Call cost and recordings](#6-call-cost-and-recordings)
7. [AI Assistants](#7-ai-assistants)
8. [Models](#8-models)
9. [Variables](#9-variables)
10. [Conversations, transcripts and insights](#10-conversations-transcripts-and-insights)
11. [Voices, previews and cloning](#11-voices-previews-and-cloning)
12. [Messaging](#12-messaging)
13. [Knowledge bases: buckets, embeddings, crawls](#13-knowledge-bases-buckets-embeddings-crawls)
14. [Assistant versions and routing rules](#14-assistant-versions-and-routing-rules)
15. [Testing without calls: chat, AI Tests, browser calls](#15-testing-without-calls-chat-ai-tests-browser-calls)
16. [Pronunciation dictionaries and recognition prompts](#16-pronunciation-dictionaries-and-recognition-prompts)
17. [Unconfirmed items](#17-unconfirmed-items)

### What VFi calls

Methods are on the live adapter, `src/server/telnyx/live.ts`, unless another file is named.

| Purpose | Endpoint | Code |
| --- | --- | --- |
| Search numbers | `GET /available_phone_numbers` | `searchNumbers` |
| Buy a number | `POST /number_orders`, then `GET /number_orders/{id}` | `orderNumber`, `getNumberOrder` |
| Find / release a number | `GET /phone_numbers?filter[phone_number]=`, `DELETE /phone_numbers/{id}` | `getNumberOrder`, `releaseNumber` |
| Receive texts on a number | `PATCH /messaging_phone_numbers/{e164}` | `enableInboundMessaging` |
| Place a call | `POST /calls` | `dial` |
| Answer / reject / hang up | `POST /calls/{id}/actions/answer`, `…/reject`, `…/hangup` | `answer`, `reject`, `hangup` |
| Start the Assistant on an answered outbound call | `POST /calls/{id}/actions/ai_assistant_start` | `startAssistant` |
| Create / update / delete an Assistant | `POST /ai/assistants`, `POST /ai/assistants/{id}`, `DELETE …?hard_delete=true` | `createAssistant`, `updateAssistant`, `deleteAssistant` |
| Offered models | `GET /ai/models` | `listModels`; filtering in `models.ts` |
| Voices, preview, clones | `GET /text-to-speech/voices`, `POST /text-to-speech/speech`, `/voice_clones…` | `listStockVoices`, `synthesizePreview`, `cloneVoice`, `getClonedVoice`, `deleteClonedVoice`, `getCloneSample` |
| ElevenLabs key | `POST` / `DELETE /integration_secrets` | `createIntegrationSecret`, `deleteIntegrationSecret` |
| Transcript, summary and fields | `GET /ai/conversations?…`, `…/{id}/messages`, `…/{id}/conversations-insights` | `getCallResults` |
| Each assistant's insight group | `POST`/`PUT /ai/conversations/insight-groups…`, `POST`/`PUT`/`DELETE /ai/conversations/insights…`, `…/assign` | `syncInsights`, `deleteInsights` |
| Recording link, retention | `GET` / `DELETE /recordings…`, `DELETE /ai/conversations/{id}` | `getRecordingUrl`, `purgeCallData` |
| Knowledge base | S3-compatible storage, `POST /ai/embeddings`, `POST /ai/embeddings/url`, `GET` / `DELETE /ai/embeddings/buckets/{name}` | `storage.ts`; `enableEmbedding`, `embeddingStatuses`, `crawlUrl`, `deleteBucket` |

---

## 1. Conventions

**Docs.**

- Base URL `https://api.telnyx.com/v2`; auth header `Authorization: Bearer <TELNYX_API_KEY>`.
- Most responses are wrapped in `{ "data": ... }`. **AI Assistant endpoints are the exception:** they return the
  Assistant object unwrapped. The TTS voice list is also unwrapped (§11).
- List filters use deepObject style: `filter[x]=...`, `page[number]`, `page[size]`. AI conversation lists use
  PostgREST syntax instead (§10).
- Some page sizes are capped: conversation messages reject `page[size]` over 100 with error `10015` (**Live**).

## 2. Phone numbers

### Search: `GET /v2/available_phone_numbers`

**Docs.** https://developers.telnyx.com/api-reference/phone-number-search/list-available-phone-numbers

- Filters: `filter[country_code]=US`, `filter[phone_number_type]=local`
  (`local|toll_free|mobile|national|shared_cost`), `filter[national_destination_code]=415` (US area code),
  `filter[locality]`, `filter[administrative_area]` (US state), `filter[rate_center]` (US/CA),
  `filter[phone_number][starts_with|ends_with|contains]`, `filter[features][]=voice` (also `sms`, `mms`, `fax`,
  `emergency`, `hd_voice`, …), `filter[limit]`, `filter[best_effort]` (US/CA), `filter[quickship]`,
  `filter[reservable]`, `filter[exclude_held_numbers]`.
- Response `data[]`: `phone_number` (E.164), `vanity_format`, `best_effort` (true = not an exact match, e.g. a nearby
  area code), `quickship`, `reservable`, `region_information[] {region_type, region_name}`,
  `cost_information {upfront_cost, monthly_cost, currency}`, `features[] {name}`. `meta`/`metadata` carry
  `total_results` and `best_effort_results`.
- Only numbers returned by a search can be ordered.
- **Live 2026-10-07:** US local results had region types `country_code`, `location`, `rate_center`, `state`, and
  `monthly_cost` `"1.00000"` USD for 415 numbers.

### Order: `POST /v2/number_orders`

**Docs.** https://developers.telnyx.com/api-reference/phone-number-orders/create-a-number-order

```json
{ "phone_numbers": [{ "phone_number": "+14155550100" }],
  "connection_id": "<call control app id>",
  "messaging_profile_id": "<profile id>",
  "customer_reference": "user_123" }
```

- `phone_numbers[]` items: `phone_number` (required), `requirement_group_id`, `bundle_id`.
- Order-level only: `connection_id` (attaches the numbers to the Call Control app at order time),
  `messaging_profile_id`, `billing_group_id`, `customer_reference`.
- Whether US local numbers need a requirement group: **UNCONFIRMED** (believed not; check `requirements_met`).
- `GET /v2/number_orders/{id}` (and the list) returns `id`, `phone_numbers_count`, `connection_id`,
  `messaging_profile_id`, `phone_numbers[]`, `sub_number_orders_ids[]`, `status`, `customer_reference`,
  `requirements_met`, timestamps.
  - Order `status`: `pending | success | failure` (the guide also lists `cancelled`, `deleted`).
  - `phone_numbers[]` item: `id` (the **order item** id, not the number's id), `phone_number`, `status`,
    `requirements_met`, `requirements_status`, `phone_number_type`, `country_code`, `regulatory_requirements[]`.
- Webhook `number_order.complete` (payload = the order; `status` can still be `pending` or `failure`) is configured
  in the portal's account notification settings; there is no `webhook_url` on the order. We poll the order instead.

### Number resource: `/v2/phone_numbers`

**Docs.** https://developers.telnyx.com/api-reference/phone-number-configurations/list-phone-numbers

- `GET /v2/phone_numbers` filters: `filter[phone_number]` (min 3 digits), `filter[status]`,
  `filter[connection_id]`, `filter[customer_reference]`, `filter[tag]`, `filter[number_type][eq]`; paged (default
  20).
- `{id}` is a numeric string (e.g. `"1293384261075731499"`). Get it with `filter[phone_number]=+1415…` after the
  order completes.
- `PATCH /v2/phone_numbers/{id}`: `connection_id`, `tags`, `customer_reference`, `billing_group_id`,
  `external_pin`, `hd_voice_enabled`, `address_id`.
- `DELETE /v2/phone_numbers/{id}` releases the number; fails if `deletion_lock_enabled`.
- Response fields include `id`, `phone_number`, `status`, `connection_id`, `connection_name`, `customer_reference`,
  `tags`, `phone_number_type`, `purchased_at`, `activated_at`, `deletion_lock_enabled`, `billing_group_id`,
  `messaging_profile_id`, `emergency_enabled`.
- `status`: `purchase-pending | purchase-failed | port-pending | port-failed | active | deleted | emergency-only |
  ported-out | port-out-pending | requirement-info-pending | requirement-info-under-review |
  requirement-info-exception | provision-pending`.

## 3. Call Control application

**Docs.** https://developers.telnyx.com/api-reference/call-control-applications/create-a-call-control-application

The app's id is the `connection_id` used by number orders, `PATCH /phone_numbers/{id}` and `POST /calls`. Ours is
created in the portal (README.md); the API is `POST /v2/call_control_applications` (201) and
`GET|PATCH|DELETE /v2/call_control_applications/{id}`.

```json
{ "application_name": "vfi-prod",
  "webhook_event_url": "https://<host>/api/webhooks/telnyx",
  "webhook_api_version": "2",
  "webhook_timeout_secs": 10,
  "call_cost_in_webhooks": true,
  "outbound": { "outbound_voice_profile_id": "<ovp id>" } }
```

- Required: `application_name`, `webhook_event_url`.
- **`webhook_api_version` defaults to `"1"`; set `"2"`** for the envelope in §5.
- Other fields: `active` (default true), `anchorsite_override` (default `Latency`), `dtmf_type`,
  `first_command_timeout(_secs)` (default 30 s),
  `inbound {channel_limit, shaken_stir_enabled, sip_subdomain, …}`, `outbound {channel_limit,
  outbound_voice_profile_id}`, `call_cost_in_webhooks`, `redact_dtmf_debug_logging`, `webhook_event_failover_url`.
  `webhook_timeout_secs` range 0–30.
- Outbound calling needs an Outbound Voice Profile linked through `outbound.outbound_voice_profile_id`; ours allows
  only US destinations. Strictly required: **UNCONFIRMED**.

## 4. Call commands

**Docs.** All commands are `POST /v2/calls/{call_control_id}/actions/<command>`. Every command accepts
`client_state` (**must be Base64**; echoed in later webhooks) and `command_id` (idempotency key per call). Responses
are `data.result` (e.g. `"ok"`).

### Dial: `POST /v2/calls`

https://developers.telnyx.com/api-reference/call-commands/dial

- Required: `connection_id`, `to` (E.164, SIP URI or array), `from` (E.164).
- Useful: `client_state`, `webhook_url`, `timeout_secs` (default 30, 5–600), `time_limit_secs` (default 14400, 30–14400),
  `answering_machine_detection`, `record: "record-from-answer"`, `record_format` (`wav|mp3`, default mp3), `record_channels`
  (`single|dual`, default dual), `record_track`, `record_max_length`, `command_id`, `from_display_name`.
- An `assistant` object is accepted (same overrides as answer). Whether it starts the Assistant on answer:
  **UNCONFIRMED**. VFi dials without it and calls `ai_assistant_start` once the call is answered.
- Response `data`: `call_control_id`, `call_leg_id`, `call_session_id`, `is_alive`, `recording_id` (with `record`),
  `start_time`.
- Webhooks: `call.initiated` (direction `outgoing`), then `call.answered` or `call.hangup`.

### Answer: `…/actions/answer`

https://developers.telnyx.com/api-reference/call-commands/answer-call

- Optional body: `client_state`, `command_id`, `webhook_url`, `record…`, `billing_group_id`, `transcription`,
  `stream_url`, and **`assistant`**: `{ id (required), instructions, greeting, voice_settings, transcription,
  dynamic_variables, tools, model, name, llm_api_key_ref, fallback_config, external_llm, mcp_servers,
  observability_settings }`.
- Omitted fields use the stored Assistant. Supplied `voice_settings` and `transcription` **replace** the stored
  objects (no merge); `dynamic_variables` merge, request wins. VFi sends only `id` and `dynamic_variables`.
- With `assistant.id`, Telnyx answers and starts the Assistant itself. **Don't also send `ai_assistant_start`.** The
  `conversation_id` arrives in `call.conversation.created`, not the response.
- There is no version id on answer, dial or `ai_assistant_start` (**Live 2026-10-26**; see §14).

### Start Assistant: `…/actions/ai_assistant_start` (call already answered)

https://developers.telnyx.com/docs/voice/programmable-voice/ai-assistant-start

```json
{ "assistant": { "id": "assistant-<uuid>", "dynamic_variables": { "call_direction": "outbound" } },
  "greeting": "Hi, this is an AI assistant calling. This call may be recorded.",
  "command_id": "<ccid>:assistant" }
```

- Top-level: `assistant`, `greeting`, `interruption_settings {enable}`, `transcription {model, language}`,
  `message_history[]`, `send_message_history_updates`, `participants[]`, `client_state`, `command_id`. There is no
  top-level `voice`; it goes in `assistant.voice_settings.voice`.
- Response `data`: `result`, **`conversation_id`**.
- Webhooks: `call.conversation.created`, `call.conversation.ended`, `call.conversation_insights.generated`.
- Also `…/ai_assistant_stop` and `…/ai_assistant_join`.

### Reject and hang up

- `…/actions/reject` with required `cause`: `CALL_REJECTED` (SIP 603) | `USER_BUSY` (486) | `NOT_FOUND` (404) |
  `TEMPORARILY_UNAVAILABLE` (480). Only for unanswered inbound calls; produces `call.hangup`.
- `…/actions/hangup`: `client_state`, `command_id`, `custom_headers[]`.

### Recording command

`…/actions/record_start` needs `format` and `channels` (`dual` = first leg on channel A); options `play_beep`,
`max_length`, `recording_track`, `trim`, `custom_file_name`, `transcription`. Response has **no `recording_id`**.
VFi doesn't use it: recording is requested on answer and dial.

## 5. Webhooks and signatures

### Envelope (Call Control, v2)

**Docs.** https://developers.telnyx.com/docs/voice/programmable-voice/voice-api-webhooks

```json
{ "data": { "record_type": "event", "event_type": "call.initiated", "id": "<uuid>",
            "occurred_at": "2026-...Z", "payload": { ... } },
  "meta": { "attempt": 1, "delivered_to": "https://..." } }
```

Common payload: `call_control_id`, `call_leg_id`, `call_session_id`, `connection_id`, `client_state`, `from`, `to`.

| event_type | Extra payload fields |
| --- | --- |
| `call.initiated` | `direction` (`incoming`/`outgoing`), `state`, `start_time`, `caller_id_name`, `call_screening_result`, `shaken_stir_attestation`, `shaken_stir_validated`, `custom_headers`, `sip_headers`, `tags`, codecs |
| `call.answered` | `start_time`, `state: "answered"`, `tags` |
| `call.hangup` | `start_time`, `hangup_cause` (`call_rejected|normal_clearing|originator_cancel|timeout|time_limit|user_busy|not_found|no_answer|unspecified`), `hangup_source` (`caller|callee|unknown`), `sip_hangup_cause`, `call_quality_stats` |
| `call.recording.saved` | `recording_started_at`, `recording_ended_at`, `channels`, `recording_urls {mp3, wav}` (**valid 10 minutes**), `public_recording_urls` (valid while the file exists; a per-account feature) |
| `call.conversation.created` | `conversation_id`, `call_control_id` |
| `call.conversation.start_failed` | `reason`: `invalid_request` or `service_error` (answer with `assistant.id` only; the call stays answered) |
| `call.conversation.ended` | `assistant_id`, `conversation_id`, `duration_sec`, `reason`, `calling_party_type`, `llm_model`, `stt_model`, `tts_provider`, `tts_model_id`, `tts_voice_id` |
| `call.conversation_insights.generated` | `insight_group_id`, `results[] {insight_id, result}`, `calling_party_type` |
| `call.ai_gather.message_history_updated` | full `message_history[]` each time (only with `send_message_history_updates`) |
| `call.cost` | see §6 |

- **`call.hangup` has no `end_time`;** use `data.occurred_at`.
- **`call.recording.saved` has no `call_control_id` or `recording_id`** in the schema; correlate on
  `call_leg_id` / `call_session_id`, or list recordings (§6).
- Deliveries can be duplicated or out of order: dedupe on `data.id`.
- `call.conversation.created` and `call.conversation.start_failed` are in the guide but not the OpenAPI webhook
  schemas, so their fields beyond the ids above are **UNCONFIRMED**.
- Text and insight webhooks use the same signing: §12 and §10.

### Signature

**Docs.** https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks

- Headers `telnyx-signature-ed25519` (Base64) and `telnyx-timestamp` (Unix seconds).
- Signed message: `` `${timestamp}|${rawBody}` `` over the **exact raw body**. In Next.js read `await req.text()`
  before parsing.
- Public key from the portal (API Keys → Public Key), stored as `TELNYX_PUBLIC_KEY` (Base64, raw 32-byte Ed25519).
  For Node `crypto.verify`, wrap it in SPKI DER (prefix `302a300506032b6570032100`). The Node SDK's
  `client.webhooks.unwrap(rawBody, {headers})` verifies too (`unsafeUnwrap` skips it).
- Reject timestamps older than 5 minutes. Answer 2xx quickly; process idempotently.

## 6. Call cost and recordings

### `call.cost`

**Docs, checked against the OpenAPI spec 2026-10-07.** Sent when the Call Control app has `call_cost_in_webhooks`.
Payload: `call_control_id`, `call_leg_id`, `call_session_id`, `client_state`, `total_cost` (decimal string, e.g.
`"0.0106"`), `billed_duration_secs`, `cost_parts[] {call_part, rate, cost, currency, billed_duration_secs}`. VFi stores
`total_cost` as micro-USD on the call for reconciliation. Whether AI inference is in `cost_parts`: **UNCONFIRMED**
(compare with the invoice).

### Recordings

**Docs.** https://developers.telnyx.com/api-reference/call-recordings/retrieve-a-call-recording

- `GET /v2/recordings/{id}`: `call_control_id`, `call_leg_id`, `call_session_id`, `channels`,
  `download_urls {mp3, wav}`, `duration_millis`, `recording_started_at`, `recording_ended_at`, `status`, `from`,
  `to`, timestamps. How long `download_urls` stay valid: **UNCONFIRMED**; fetch fresh before use.
- `GET /v2/recordings?filter[call_control_id]=…` (also `call_leg_id`, `call_session_id`, `connection_id`, `from`,
  `to`, `created_at`).
- `DELETE /v2/recordings/{id}`; bulk `POST /v2/recordings/actions/delete`.
- **Live:** the Assistant's own `telephony_settings.recording_settings` is on by default and made a second,
  duplicate recording on outbound calls. VFi records on answer/dial and sends `recording_settings: {enabled: false}`.

## 7. AI Assistants

### Endpoints

**Docs.** https://developers.telnyx.com/api-reference/assistants/create-an-assistant

| Op | Method and path |
| --- | --- |
| Create | `POST /v2/ai/assistants` (optional `Idempotency-Key` header) |
| Get | `GET /v2/ai/assistants/{id}` |
| Update | **`POST /v2/ai/assistants/{id}`** (not PATCH): create fields plus `promote_to_main` (default true; §14) |
| Delete | `DELETE /v2/ai/assistants/{id}` → `{id, object, deleted}`; `?hard_delete=true` skips the "Recently Deleted" list. Soft-deleted ones are listed at `GET /ai/assistants/deleted` (**Live 2026-10-26**) |
| List | `GET /v2/ai/assistants` |

- Response (unwrapped): `id` (`assistant-<uuid>`), `name`, `created_at`, all config, `version_id`.
- Creating an Assistant auto-creates a TeXML app (`telephony_settings.default_texml_app_id`); a hard delete removes
  it too (**Live 2026-10-21**).

### Fields

```json
{ "name": "…", "model": "zai-org/GLM-5.2", "instructions": "…", "greeting": "…",
  "voice_settings": { "voice": "Telnyx.Ultra.<id>", "voice_speed": 1.0,
                      "background_audio": { "type": "predefined_media", "value": "office", "volume": 0.5 } },
  "transcription": { "model": "assemblyai/universal-3-5-pro", "language": "auto",
                     "settings": { "keyterm": "VFi, AirPPP" } },
  "interruption_settings": { "enable": true, "disable_greeting_interruption": false,
                             "start_speaking_plan": { "wait_seconds": 0.8 } },
  "telephony_settings": { "time_limit_secs": 1800, "user_idle_timeout_secs": 60,
                          "recording_settings": { "enabled": false } },
  "enabled_features": ["telephony"],
  "tools": [{ "type": "hangup", "hangup": { "description": "…" } }],
  "insight_settings": { "insight_group_id": "<uuid>" },
  "dynamic_variables": { "business_name": "…" } }
```

- Required on create: `name`, `instructions`.
- `voice_settings`: `voice` (required), `voice_speed` (docs: 0.6–1.5), `api_key_ref` (ElevenLabs secret),
  `temperature`, `similarity_boost`, `use_speaker_boost`, `style`, `speed`, `language_boost`, `expressive_mode`,
  `background_audio`, `pronunciation_dict_id` (§16).
- `transcription`: `model` (`deepgram/flux`, `deepgram/nova-3`, `deepgram/nova-2`, `azure/fast`,
  `assemblyai/universal-streaming`, `assemblyai/universal-3-5-pro`, `xai/grok-stt`, `soniox/…`,
  `nvidia/parakeet-v3`, …), `language` (unset or `auto` = detect), `region`, `api_key_ref`, `settings`
  (`keyterm`, `prompt` (§16)).
- `telephony_settings`: `default_texml_app_id`, `supports_unauthenticated_web_calls` (§15), `noise_suppression`
  (`aicoustics|krisp|deepfilternet|disabled`), `time_limit_secs` (default 1800), `user_idle_timeout_secs`,
  `user_idle_reply_secs` (default 10), `fallback_destination`, `send_message_history_updates`,
  `voicemail_detection`, `disable_dtmf`, `recording_settings`.
- Other: `description`, `tool_ids`, `tools` (inline, **deprecated**), `mcp_servers`, `llm_api_key_ref`,
  `external_llm`, `fallback_config`, `dynamic_variables_webhook_url`, `post_conversation_settings`,
  `messaging_settings`, `websocket_settings`, `conversation_flow`, `privacy_settings {data_retention}` (false = no
  history or insights stored).

### Behavior settings VFi uses

**Live 2026-10-21** (a throwaway Assistant created, updated, read back, hard-deleted).

- Accepted and echoed exactly: `voice_speed` (KokoroTTS and Ultra), `background_audio` with `silence` or `office`,
  `transcription.settings.keyterm` (comma-separated string; `null` clears it), `interruption_settings {enable,
  disable_greeting_interruption, start_speaking_plan.wait_seconds}`, `time_limit_secs`, `user_idle_timeout_secs`
  (`null` clears it), custom keys in `dynamic_variables`.
- `voice_speed` isn't range-checked (1.6 was accepted); VFi clamps to 0.8–1.2. Whether every voice model honors it
  can only be heard on a call.
- `voice_settings` sent on update is **merged** with the stored one: an omitted key keeps its value
  (**Live 2026-10-26**).

### Tools

- **Assistants created through the API have no tools** (**Live 2026-10-20**). The portal's templates add a Hang Up
  tool; that's a portal default.
- Hang-up tool: `{"type": "hangup", "hangup": {"description": "…"}}`. Telnyx gives each inline tool a `tool_id`.
- Sending `tools` replaces the whole list (an update with one hang-up tool leaves one, with a new id); omitting
  `tools` keeps the current list (**Live 2026-10-21**). VFi always sends it.
- Retrieval tool: §13.
- `post_conversation_settings.enabled` gives the Assistant one extra LLM turn after the conversation for final
  tool calls (**Docs**). Not useful to VFi.

### Portal-only things

**Live 2026-10-21.** Templates exist only in the portal (30 of them: Blank, healthcare, sales, scheduling,
collections, routing, multilingual, video); there's no template API. The portal's Assistant sections: Agent, Voice,
Avatar, Workflow, Integrations, Analysis, Calling, Messaging, Widget, Observability, Simulation, Advanced.

## 8. Models

### Speech recognition

**Live 2026-10-07**, on real calls.

- `deepgram/nova-3` with `language: "auto"` transcribed spoken Mandarin as English words ("thirty cents chime").
- `assemblyai/universal-3-5-pro` with `"auto"` transcribed English, Mandarin (`你是谁？`) and mixed sentences
  correctly. One short utterance was detected as Japanese; if that recurs for Mandarin-first Assistants, try
  `language: "zh"`. Per the transcription-settings doc it's the only model whose listed languages include `zh`.

### LLMs

- `GET /v2/ai/models` lists the catalog (34 models on 2026-10-07, 18 `recommended_for_assistants`) with `pricing`
  per million tokens (**Live**).
- An empty `model` resolved to `moonshotai/Kimi-K2.6` (**Live 2026-10-07**); VFi always sets one.
- **Comparison, Live 2026-10-26:** all 15 offered models ran the Nyquiste Front Desk setup (instructions, 2
  knowledge sources, strict mode) on 14 caller questions (11 English, 3 Mandarin), twice each, through
  `POST /ai/assistants/{id}/chat` on temporary copies. Chat runs the retrieval tool as a call does.

  | Model | Correct | False claims | Searched when needed | Reply seconds (no search / search) |
  | --- | --- | --- | --- | --- |
  | GLM-5.2 | 100% | 0 | 100% | 1.0 / 2.2 |
  | gpt-5.2 | 100% | 0 | 100% | 2.4 / 4.5 |
  | GLM-5.3-Flash | 96% | 0 | 100% | 0.8 / 1.8 |
  | gpt-6-luna | 93% | 0 | 92% | 2.2 / 4.3 |
  | gpt-5.4-mini | 86% | 0 | 92% | 1.3 / 3.0 |
  | Kimi-K2.6 | 86% | 0 | 67% | 1.6 / 4.4 |

  gpt-5.1 and Qwen3-235B-A22B claimed VFi can transfer calls (it can't). gpt-4.1, gpt-4o, gpt-5.6-luna and
  claude-haiku-4-5 searched in 0–50% of the cases that needed it. GLM-5.3-Flash once looped on its search tool and
  returned Telnyx's "stuck in a loop" message.
- Prices (**Docs, pricing.md, 2026-10-26**): GLM-5.2 $1 / $4 per million input / output tokens ($0.20 cached
  input); GLM-5.3-Flash $0.135 / $0.45.

### Other providers (not used yet)

**Docs.** `llm_api_key_ref` (own key for a provider); `external_llm {base_url, model, llm_api_key_ref,
authentication_method, certificate_ref, token_retrieval_url, forward_metadata}` (any OpenAI-compatible
chat-completions endpoint); `fallback_config {model | external_llm}`. TTS catalog providers include aws, azure,
elevenlabs (`voice_settings.api_key_ref`), minimax (`language_boost`), resemble, xai. STT `api_key_ref` / `region`
apply to Azure only. Secrets live in Integration Secrets (`/v2/integration_secrets`).

## 9. Variables

- **Live 2026-10-21, chat:** `{{telnyx_current_date}}`, `{{telnyx_current_weekday}}` and `{{telnyx_current_time}}`
  resolved, in UTC (`2026-10-21T14:48:29Z`). A custom key with a default in the Assistant's `dynamic_variables` did
  **not** resolve, nor did `{{telnyx_end_user_target}}`. So VFi passes every value explicitly on `answer` /
  `ai_assistant_start`, and fills in `contact_number` and a local `current_time` itself.
- **Docs:** `{{telnyx_current_time_<IANA zone>}}` and a `date` filter exist; the shorthand variables are UTC.
- **Live 2026-10-26, chat:** top-level keys in the conversation's `metadata` fill `{{variables}}`
  (`{business_name: "MetaCo"}` resolved); a nested `dynamic_variables` key was rejected. Without them custom
  variables render as `Unknown`.
- On calls, `dynamic_variables` sent on answer / start merge with the stored ones, request wins (**Docs**).

## 10. Conversations, transcripts and insights

### Conversations and transcripts

**Docs.** https://developers.telnyx.com/api-reference/conversations/list-conversations

- Store the `conversation_id` from `ai_assistant_start` or `call.conversation.created`. To look one up by call:
  `GET /v2/ai/conversations?metadata->call_control_id=eq.<id>` (PostgREST syntax; also
  `metadata->assistant_id=eq.`, `metadata->telnyx_end_user_target=eq.`, `metadata->telnyx_agent_target=eq.`,
  `metadata->telnyx_conversation_channel=eq.phone_call`, `created_at=gte.`, `limit`, `order=created_at.desc`).
  Returns `data[] {id, name, created_at, metadata, last_message_at}`.
- `GET /v2/ai/conversations/{id}`; `DELETE /v2/ai/conversations/{id}` (removes transcript and insights; used for
  retention).
- Transcript: `GET /v2/ai/conversations/{id}/messages` (`page[size]` ≤ 100, `page[number]`) →
  `data[] {role: user|assistant|tool, text, tool_calls, created_at, sent_at, metadata}`. Sort by `sent_at`;
  `created_at` isn't necessarily send time.
- `POST /v2/ai/conversations {name, metadata}` creates a conversation (needed for chat, §15).

### Insights (summaries and structured results)

- `GET /v2/ai/conversations/{id}/conversations-insights` → `data[] {id, status: pending|in_progress|completed|failed,
  created_at, conversation_insights[] {insight_id, result}}`. `result` is a string (JSON text when the insight has a
  schema). (**Docs**)
- A summary exists only if the Assistant's insight group has a summary insight. **Live 2026-10-26:** an Assistant
  without `insight_settings` gets the account's `Default` group, which holds three Telnyx-managed insights (Summary,
  User Satisfaction, Agent Instruction Following; `insight_type: default`). The summary is a completed entry about
  30 s after hangup; right after hangup the list is empty.
- **Update in place (Docs):** `PUT /ai/conversations/insights/{id} {name, instructions, json_schema, webhook}` and
  `PUT /ai/conversations/insight-groups/{id} {name, description, webhook}`. VFi updates each assistant's insights this
  way when its fields change, so their ids stay the same.
- **Create (Live 2026-10-26):** `POST /ai/conversations/insights {name, instructions, json_schema?}`,
  `POST /ai/conversations/insight-groups {name, description?, webhook?}`,
  `POST /ai/conversations/insight-groups/{group}/insights/{insight}/assign`, then set
  `insight_settings.insight_group_id` on the Assistant. No documented limit on groups or insights. A group of our own
  doesn't include the Default group's insights, so it needs its own summary insight.
- **Strict JSON Schema (Live 2026-10-26):** `additionalProperties: false` is required and `required` must list every
  property, or the API answers `10015 Invalid json_schema`. An optional field therefore uses a nullable type
  (`"type": ["string", "null"]`). `enum` and `boolean` work.
- **Insight model (Live 2026-10-26):** `insight_settings.model` must be `zai-org/GLM-5.3-Flash` (default) or
  `meta-llama/Llama-3.3-70B-Instruct`; it runs every insight in the group. A few insights per call cost a fraction of
  a cent.
- **Insight webhook (Live 2026-10-26, signature checked; delivered after a real call 2026-10-27, under a minute after hang-up):** set on the group
  (no per-Assistant override; `POST /ai/conversations/insights` also takes a `webhook`). One `POST` per conversation's
  insight request, sent when the group's insights complete or finally fail, with a result for each insight:

  ```json
  { "record_type": "event", "event_type": "conversation_insight_result",
    "payload": { "conversation_id": "…", "status": "completed", "insight_group_id": "…",
                 "results": [{ "insight_id": "…", "result": "…" }], "metadata": { } } }
  ```

  Signed with the usual Ed25519 headers (§5).
- **Chats:** the docs say insights also run on chat conversations, but none of our test chats got any insight entries
  within about 10 minutes, with either the Default group or our own (**Live 2026-10-26**).

## 11. Voices, previews and cloning

### Voice list: `GET /v2/text-to-speech/voices`

- Query `provider` (`aws|telnyx|azure|elevenlabs|minimax|resemble|xai|humain|soniox`), `api_key` (ElevenLabs).
  Response is **not** wrapped: `{ "voices": [ … ] }` (**Docs**).
- **Live 2026-10-07:** each entry's `id` is already the full voice string for an Assistant (e.g.
  `Telnyx.KokoroTTS.af_heart`, `Telnyx.Ultra.<uuid>`), with `name`, `language`, `model_id`, `gender`, `label` and an
  optional `deprecated`. Mandarin (`zh`) exists **only on Ultra** (15 voices, 2 deprecated); KokoroTTS has no
  Mandarin; `NaturalHD.astra` doesn't exist. VFi loads the catalog live and skips deprecated voices.
- Voice string formats (**Docs**): `Telnyx.<model>.<voice_id>`, `Minimax.<Model>.<VoiceId>`, `AWS.Polly.<voice_id>`,
  `azure.<voice>`. ElevenLabs needs `api_key_ref` (docs/elevenlabs-notes.md). Mustache works in it
  (`Telnyx.Ultra.{{voice_id}}`).

### Preview

**Live 2026-10-08.** `POST /v2/text-to-speech/speech {text, voice}` returns `audio/mpeg` bytes directly, about 0.5 s
for a sentence on KokoroTTS and Ultra. It has no pronunciation-dictionary parameter (**Live 2026-10-26**).

### Cloning

**Docs.** https://developers.telnyx.com/docs/voice/voice-design-lab/clone-voice/parameters

- `POST /v2/voice_clones/from_upload` (multipart): `audio_file` (WAV/MP3/FLAC/OGG/M4A), `name`, `language` (ISO
  639-1), `gender` (`male|female|neutral`) and `provider` (`telnyx` | `minimax`), all required; `model_id` (`Qwen3TTS` default |
  `Ultra` | `speech-2.8-turbo` for minimax), `ref_text` (optional transcript, improves quality), `label`.
- Limits: Qwen3TTS 3–15 s (trimmed to 10 s), 5 MB, synchronous 201. Ultra up to 60 s, 5 MB, **asynchronous 202**
  (`status: pending`). Minimax 10 s–5 min, 20 MB, synchronous.
- **No consent fields** exist; consent is our responsibility.
- Response `data`: `id`, `name`, `language`, `gender`, `provider`, `provider_supported_models[]`,
  `provider_voice_id`, `model_id`, `status` (`active|pending|failed|expired`; "expired if not kept alive"),
  timestamps. What keeps a clone alive: **UNCONFIRMED**.
- Voice string for an Assistant: `{Provider}.{Model}.{provider_voice_id}`, e.g. `Telnyx.Qwen3TTS.<clone id>` (for
  Qwen3TTS `provider_voice_id` is the clone id). Ultra uses a Cartesia-assigned id (presumably
  `Telnyx.Ultra.<provider_voice_id>`, **UNCONFIRMED**).
- Polling: the docs say `GET /v2/voice_clones/{id}`, but the OpenAPI spec defines only PATCH and DELETE there. VFi
  tries the GET and falls back to the list (`GET /v2/voice_clones?page[size]=250`).
- `GET /v2/voice_clones/{id}/sample` returns the uploaded sample as is (`audio/wav`) (**Live 2026-10-08**).
- Also: `POST /v2/voice_clones` from a voice design (`POST /v2/voice_designs` takes a text prompt; designs can't be
  used for TTS directly), `PATCH|DELETE /v2/voice_clones/{id}`.
- **Clones need account verification (Live 2026-10-08).** On an unverified account cloning succeeds but using the
  clone fails: Assistants answer 403 `10010` "Your account is not permitted to use cloned voices. Please complete L2
  verification or use a platform voice"; TTS answers 403 `10038` "Feature not permitted at this account level". The
  adapter maps `10010` to `FeatureNotPermittedError`.

## 12. Messaging

VFi only **receives** texts (SPEC §7). Receiving is built and in use; the sending, 10DLC and Assistant-messaging
notes below are kept for reference.

### What VFi uses

- One messaging profile whose webhook is `/api/webhooks/telnyx` (API version 2). A number can send or receive only
  once it's on a profile. VFi assigns numbers with `PATCH /v2/messaging_phone_numbers/{e164}
  {messaging_profile_id}`; the 10DLC doc uses `PATCH /v2/phone_numbers/{number}` for the same field (**UNCONFIRMED**
  which is canonical). It can also be set on the number order (§2).
- `message.received` (**Docs**): `data.payload` has `id`, `direction`, `from.phone_number`,
  `to[] {phone_number, status}`, `text`, `media[] {url, content_type, sha256, size}` (media URLs expire after 30
  days), `cost {amount, currency}`, `parts`, `errors`. `data.id` is the event id for de-duplication. Same Ed25519
  signing as calls. Other events: `message.sent`, `message.finalized`.
- **Never** put `messaging` in an Assistant's `enabled_features`: the Assistant would reply to texts.
- Pricing (**Docs, 2026-10-16**): receiving $0.004 per segment plus $0–0.0045 carrier fees; an unregistered
  (non-10DLC) carrier fee of about $0.010–0.012 may apply (**UNCONFIRMED** for receiving); texting on a number
  $0.10/month.

### Sending (not used)

**Docs.** `POST /v2/messages`: `to` (E.164 string), `from`, `text` or `media_urls[]` (MMS, < 1 MB total), `subject`,
`type`, `messaging_profile_id`, `webhook_url`, `use_profile_webhooks` (default true), `send_at` (ISO 8601, minute
precision), `encoding` (`auto|gsm7|ucs2`).
Response `to[]` is an array (a string in the request). Mandarin is UCS-2: 70 characters per segment (67 when
concatenated) versus 160/153 for GSM-7.

### 10DLC (not used)

**Docs.** Carriers filter unregistered A2P texts from local numbers (texts between Telnyx numbers are on-net and
work for testing). Flow: brand (`/v2/10dlc/brand`) → campaign (`/v2/10dlc/campaignBuilder`) →
`POST /v2/10dlc/phoneNumberCampaign {phoneNumber, campaignId}`; the number must already be on a profile; one
campaign per number; the campaign must be `ACTIVE`. Approval usually 1–5 business days, then 24–72 h after
assigning numbers. Fees: $4 brand, $15 campaign vetting; monthly and per-message surcharges **UNCONFIRMED**. Sole
proprietor brands (no EIN) need the registrant's name, address, mobile and last 4 of SSN, verified by SMS PIN within
24 h; 1 campaign, 1 number, low volume (about 1,000 texts a day per a support article).

### Assistants and messaging (not used)

**Docs.** `enabled_features` may include `messaging` ("the assistant will be able to send and receive messages") with
`messaging_settings {default_messaging_profile_id, delivery_status_webhook_url, conversation_inactivity_minutes}`; a
default messaging profile is created with the Assistant.
Outbound texts from an Assistant: `POST /v2/ai/assistants/{id}/scheduled_events` with
`telnyx_conversation_channel: "sms_chat"`, `telnyx_end_user_target`, `telnyx_agent_target`,
`scheduled_at_fixed_datetime` (future), `text`; retry fields are rejected (400) for SMS; status
`pending|in_progress|completed|failed`. **UNCONFIRMED:** how inbound texts reach the Assistant; whether we
still get `message.received` for them; whether the time can be "now"; whether SMS conversations appear in
`/ai/conversations`; whether a send-text tool exists during calls.

Open questions for support: docs/telnyx-support-questions-messaging.md.

## 13. Knowledge bases: buckets, embeddings, crawls

A portal "knowledge base" is a storage bucket whose objects are embedded; the Assistant searches it with a
`retrieval` tool. Background for SPEC §8. Open questions for support:
docs/telnyx-support-questions-knowledge-base.md.

### Buckets and objects

**Live 2026-10-20** (portal spike; the Telnyx MCP connector rejected calls as unauthenticated).

- In the portal, Assistant → Agent → Knowledge Bases has *Sources* (a multi-select of bucket names, so one bucket can
  serve several Assistants) and *Max Number of Results* (blank by default). Saving labels the new version "Added
  knowledge base bucket ID".
- Bucket names: 3–63 characters of lowercase letters, digits, `.` and `-`, globally unique. Region defaults to
  `us-central-1`. With *Storage Versioning* disabled the bucket shows "Bucket Versioning: Suspended" and no
  lifecycle rules, so deleted objects aren't kept as old versions.
- Uploaded files keep their names as object keys.
- Telnyx allows 100 buckets per account (**Docs**).
- VFi talks to storage over the S3-compatible endpoint `https://us-central-1.telnyxcloudstorage.com/<bucket>/<key>`,
  using the API key as the SigV4 access key id (Telnyx ignores the signature). See `src/server/telnyx/storage.ts`.

### Embeddings

- `POST /v2/ai/embeddings` on a bucket turns embedding on. **It works on an empty bucket:** files uploaded afterwards
  were embedded, and the bucket showed "AI Embedding: Embedded" within about a minute (**Live 2026-10-20**).
- The per-object "Embedding Status" stayed blank for small embedded text files (**Live 2026-10-20**). VFi treats
  blank as embedded and only explicit progress words as processing.
- `GET /v2/ai/embeddings/buckets/{name}` lists embedded files; `DELETE` turns embedding off (afterwards `GET`
  answers 404) (**Live 2026-10-21**).
- Embedding price (**Docs**): $0.0015 per 1,000 characters with the default `intfloat/multilingual-e5-large` (the
  $0.0001 per 1,000 tokens on the inference price list is gte-large). Storage $0.60 per GiB-month.

### Retrieval tool

- Shape: `{type: "retrieval", retrieval: {bucket_ids: [...], max_num_results: 3}}`, sent inline in `tools` (inline
  tools are deprecated, §7). Whether `bucket_ids` takes names: **UNCONFIRMED** (the portal picks by name).
- Retrieval during a call can't be tested in the portal (it has no text chat); `POST /ai/assistants/{id}/chat` does
  run it (§15).

### Website crawls

`POST /v2/ai/embeddings/url` crawls a site into the bucket. **Live 2026-10-21**: two throwaway buckets set up as the
app does, polled every 30 s until the object count held for 10 minutes, then emptied and deleted.

| Start URL | Objects | Text | Timeline |
| --- | --- | --- | --- |
| `https://developers.telnyx.com/` | 2 (3 by cleanup) | 18 KB | 1st at ~2 min, 2nd at ~4 min, nothing for 10+ min, a 3rd by ~37 min |
| `https://docs.python.org/3/` | 8 | 12.5 MB | from ~2 to ~11 min, then nothing for 10 min |

- **The task status means nothing.** The POST answers `status: "success"` with `finished_at: null` at once, and
  `GET /ai/embeddings/{task_id}` keeps answering that during and after the crawl.
- **Objects aren't pages.** Each object is many pages' text concatenated (no separators or URLs), split at about
  2 MB, named `depth-<level>-<n>.txt` at the bucket root. `<level>` counts down from 4 at the start URL to 1, so a
  crawl follows links about three hops deep; `<n>` numbers chunks within a level. The Python docs gave `depth-4-0`
  (64 bytes), `depth-3-0` (204 KB), `depth-2-0`…`depth-2-4` (1.1–2.8 MB each), `depth-1-0` (2.1 MB). A second crawl
  into the same bucket reuses the names (**Live 2026-10-20**).
- **No page or size limit** beyond the depth. All 12.5 MB was embedded, presumably billed. JavaScript-rendered sites
  (the Telnyx docs) yield almost nothing.
- **Late writes:** a crawl wrote again after more than 10 quiet minutes. "Done" can only be guessed from the bucket
  going quiet; VFi waits an hour (`knowledgeCrawlQuietMs`) and checks only total bytes, not object count.

## 14. Assistant versions and routing rules

**Live 2026-10-26.** Not used by VFi (draft versions were dropped, SPEC §1.4); recorded in case we return to them.

- **Every update creates a version; each Assistant keeps at most 10.** Older ones are deleted, except the main
  version and any version a routing rule references. VFi's background re-syncs use up versions too.
- `POST /ai/assistants/{id}` with `promote_to_main: false` creates a non-main version and leaves main alone.
  `POST /ai/assistants/{id}/versions/{version_id}` updates that non-main version in place (same id, no new version;
  main can't be updated this way). The non-main version survived four later main updates.
- `POST …/versions/{version_id}/promote` makes it main in one call and **deletes the routing rules** (`GET
  …/canary-deploys` answers 404 afterwards).
- Routing rules: `POST` / `PUT /ai/assistants/{id}/canary-deploys {rules: [{match, serve}]}`, e.g.
  `{match: [{attribute: "telnyx_end_user_target", operator: "in", values: ["vfi-draft-test"]}], serve: {version_id}}`.
  The first matching rule wins; no match means main. `telnyx_end_user_target` is the only allowed attribute.
- For calls, `telnyx_end_user_target` is the caller (inbound) or the destination (outbound), so a rule on a made-up
  value never matches real calls, and a rule on a phone number would route that person's calls to a version (not
  tested on a real call).
- Answer, dial and `ai_assistant_start` take no version id; per-call overrides apply to whichever version answers.
- `version_name` (optional) labels a version.

## 15. Testing without calls: chat, AI Tests, browser calls

**Live 2026-10-26.** Not used by VFi (dropped, SPEC §1.4), except that chat was used to compare models (§8).

- **Chat:** `POST /ai/assistants/{id}/chat {content, conversation_id}` needs an existing conversation
  (`POST /ai/conversations {name, metadata}`); a random UUID gives 404. Replies in about 1 s; the same
  `conversation_id` continues the conversation; the retrieval tool runs. The conversation's metadata gets
  `assistant_id`, `assistant_version_id`, `telnyx_conversation_channel: "web_chat"`. Variables: §9.
- **Chat always uses the main version** (body fields like `version_id` are ignored) unless a routing rule matches the
  conversation's `telnyx_end_user_target` metadata (§14).
- **Flaky right after an update:** a chat within seconds of an Assistant create or update sometimes answered
  `422 "Error chatting with assistant: Error code: 404"`; a retry a few seconds later worked. Seen with GLM-5.2, not
  GLM-5.3-Flash. Retry once.
- **Cost:** chat bills only LLM tokens (no voice minutes). A GLM-5.2 reply with long instructions and knowledge
  context (~8k tokens in) is about $0.01.
- **AI Tests** (`POST /ai/assistants/tests`, `POST …/tests/{id}/runs`): an LLM plays the caller from free-text
  `instructions` and an LLM judges each `rubric` item; a 3-turn `web_chat` run took about 30 s. **The run's
  `destination_version_id` was ignored on `web_chat`** (main answered). Test conversations have
  `telnyx_end_user_target: "ai-assistant-test-<test_id>"`. Run pricing isn't published. Creating a test also creates
  a hidden simulator Assistant named after it; deleting the test only soft-deletes that Assistant.
- **Browser voice calls:** the WebRTC SDK's `anonymous_login {target_type: "ai_assistant", target_id,
  target_version_id?, target_params: {conversation_id}}` connects a browser straight to an Assistant (a specific
  version works). It requires `telephony_settings.supports_unauthenticated_web_calls: true`, which lets **anyone who
  knows the Assistant id** call it on our account. These calls go through the Assistant's own TeXML app, not our Call
  Control app: no answer webhook, balance check, recording or per-call variables. Voice AI is $0.05/min on Telnyx's
  side.

## 16. Pronunciation dictionaries and recognition prompts

**Live 2026-10-26.** Not used by VFi (dropped, SPEC §1.4).

- `POST /v2/pronunciation_dicts {name, items[]}`; items are `{text, type: "alias", alias}` or
  `{text, type: "phoneme", phoneme, alphabet: "ipa"}`. `text` ≤ 200 characters, alias ≤ 500, case-insensitive
  matching. `PATCH /pronunciation_dicts/{id} {items}` replaces the whole list (409 on a concurrent change). `DELETE`
  answers 204. `name` must be unique in the organization.
- **50 dictionaries per organization, 100 items each.** All VFi users share one account, so 50 across every user
  (error `90203`).
- Linked with `voice_settings.pronunciation_dict_id` (accepted and echoed though not in the OpenAPI schema). `null`
  removes it; omitting keeps it; a non-existent id is accepted without error.
- The TTS preview endpoint can't use a dictionary; alias items would have to be applied to the text first.
- Whether each TTS model honors dictionaries, and English words inside Mandarin sentences: only provable on a call.
- **Recognition prompt:** `transcription.settings.prompt`, only for `assemblyai/universal-3-5-pro`, at most 1,750
  characters, should "describe the content, do not give instructions". Accepted and echoed beside `keyterm`. Effect
  only provable on a call.

## 17. Unconfirmed items

Collected from the sections above.

| Item | Section |
| --- | --- |
| US local numbers need no requirement group | §2 |
| An Outbound Voice Profile is strictly required for dialing | §3 |
| An `assistant` object on dial starts the Assistant on answer | §4 |
| Full field lists of `call.conversation.created` / `start_failed` | §5 |
| AI inference included in `call.cost` parts | §6 |
| How long recording `download_urls` stay valid | §6 |
| Ultra clone voice string; what keeps a clone alive | §11 |
| Canonical endpoint for putting a number on a messaging profile | §12 |
| Unregistered-traffic carrier fee on received texts; 10DLC monthly fees | §12 |
| `bucket_ids` takes bucket names | §13 |
| Knowledge-base retention, vector deletion, crawl billing (support questions) | §13 |

---

## Appendix A. Old section numbers

| Old | New |
| --- | --- |
| §1 Available number search, §2 Number orders, §3 Phone numbers | §2 |
| §4 Call Control Application | §3 |
| §5 Call Control commands | §4 |
| §6 Call webhooks, §7 Webhook signature verification | §5 |
| §8 AI Assistants (incl. "After a call") | §7, §10 |
| §9 Voices and cloning | §11 |
| §10 Recordings | §6 |
| §11 Confirmed after review (call.cost, voices, number search) | §6, §11, §2 |
| §12 Model choices verified on live calls | §8 |
| §13 Previews, per-agent models, cloned-voice access | §11, §8 |
| §14 Messaging | §12 |
| §15 Knowledge bases | §13 |
| §16 Assistant behavior fields and variables | §7, §9 |
| §17 Website crawl limits | §13 |
| §18 Assistant round 2: A (insights) | §10 |
| §18: B (testing), C (pronunciation), D (versions) | §15, §16, §14 |
