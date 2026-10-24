# VFi website wording

Draft 3 · 2026-10-23 · draft 2 plus your answers to the eight open questions. No open questions remain.

How to use this file:

- Edit the text after `EN:` and `中文:` directly. Leave the bold keys as they are.
- `>` lines are my notes. **[?]** marks a question that is still open; write your answer under it.
- **Changed** marks an entry that differs from draft 1, so you can check only those.
- Feature names are capitalized in English: **Assistant**, **Knowledge Base**, **Dashboard**.
- The landing page is English and Chinese only. The language follows the visitor's browser: Simplified Chinese browsers get 中文, everyone else gets English.
- Terminology: **Assistant / 助理** is the feature. **Voice AI Agent / AI 语音智能体** is the technology behind it, used only when explaining how VFi works.

## Decisions applied in this draft

| # | Decision | Where it shows |
|---|---|---|
| 1 | Privacy Policy and Terms: we write our own, later | §9, §11 |
| 2 | Compliance: no specific claim yet, softer wording | §4 values.compliance |
| 3 | Latency: softer wording, no "edge computing" | §4 values.latency |
| 4 | Prices are final | §7 |
| 5 | Contact: birdyyao@nyquiste.com | §9 |
| 6 | No AirPPP link; link to nyquiste.com | §9 |
| 7 | Landing in two languages, picked by browser | header of this file, §2 |
| 8 | No "Hear an example call" button | §10 removed |
| 9 | No "one call at a time" on the public page | §6 ops.note |
| 10 | Assistant templates: Reception, Business Q&A, Outreach, Blank | app, not this file |
| 12 | Reception card stays an illustration, no feature change | §5 |
| 13 | App copy rewritten for businesses, not personal use | app, not this file |
| 14 | `/agents` becomes `/assistants`, old links redirect | app, not this file |
| — | One account button (Sign in / Dashboard) is the page's main button everywhere | §2, §3, §7, §8 |
| — | The signed-in app is called Dashboard; Overview is one page inside it | §2 |
| — | Company intro and info live in the Knowledge Base; every scenario covers it | §5, §6 |
| — | Privacy and Terms point to a coming-soon page until written | §9, §11 |
| — | App, sign-in page and emails keep five languages | §12 |
| — | Sign-in email redesigned; mock first | §12 |

---

## 1. Page metadata (browser tab and search results)

**meta.title** · Changed (your edit)
- EN: VFi · Agentic Voice Customer Engagement
- 中文: VFi · AI 自主化的语音客户互动
> Aligned with Nyquiste's pairing "Agentic Customer Engagement" = "AI 自主化的客户互动". Decided: keep.

**meta.description**
- EN: Get a US phone number and an Assistant that answers and places calls for your business, in English and Mandarin. Pay as you go from US$10.
- 中文: 获取美国电话号码，让助理为你的企业接听和拨打电话，支持英文和普通话。按需付费，US$10 起充。

---

## 2. Top navigation

**nav.scenarios**
- EN: Scenarios
- 中文: 应用场景

**nav.how**
- EN: How it works
- 中文: 开通流程

**nav.pricing**
- EN: Pricing
- 中文: 价格

**nav.account** · Changed: the page's one main button, label depends on state
- Signed out · EN: Sign in · 中文: 登录 → opens the sign-in page
- Signed in · EN: Dashboard · 中文: 控制台 → opens Overview, the Dashboard's first page
> Used in the header, the hero, the pricing section and the closing section. There is no separate "Get started" button anywhere.
> "Dashboard / 控制台" is the name of the whole signed-in app. Overview / 概览 is one page inside it, next to Assistants, Voices, Numbers, Calls and Messages.

---

## 3. Hero (first screen)

**hero.title** · Changed (your text, translated)
- EN: Your US phone Customer Engagement, now handled by a Voice AI Agent.
> Changed 2026-10-24: 客户互动 is "Customer Engagement" everywhere, matching the page title.
- 中文: 你的美国客户电话互动现在由 AI 语音智能体接管。

**hero.subtitle** · Changed (your text, translated)
- EN: A US phone number plus Assistants for every scenario: reception, business Q&A and outreach. In English and Mandarin, all on one platform.
- 中文: 美国电话号码 + 多场景语音助理：来电接待、业务咨询、商务外联。支持英文和普通话，在同一平台完成。
> Changed: "Powered by a Voice AI Agent / 由 AI 语音智能体驱动" removed, since the title already says it.
> Your subtitle says "语音助理", while elsewhere the feature is just "助理". I read "语音助理" as a description (a voice assistant), not a new term, and left it.

**hero.cta** (main button): **nav.account**

**hero.ctaPricing** (second button)
- EN: See pricing
- 中文: 查看价格

**hero.note** · Changed (your edit)
- EN: Pay as you go. No subscription.
- 中文: 按需付费，无订阅。

### Example call card (right side of the hero)

> An illustration. Callers are US customers, so the conversation stays in English in both languages; only the labels are translated.

**heroCall.meta**
- EN: Inbound · Front desk Assistant
- 中文: 呼入 · 前台接待助理

**heroCall.status**
- EN: On a call
- 中文: 通话中

**heroCall.speakerAssistant**
- EN: Assistant
- 中文: 助理

**heroCall.speakerCaller**
- EN: Caller
- 中文: 来电者

**heroCall.transcript** (English in both languages)
1. Assistant: Thanks for calling Lumen Home. This call may be recorded. How can I help?
2. Caller: Hi, I saw your website. Do you ship wholesale orders to Texas?
3. Assistant: We do. May I have your name and the best email for a quote?
4. Caller: Dana Ortiz, dana@example.com. About two hundred units to Austin.

**heroCall.summaryLabel**
- EN: Summary
- 中文: 摘要

**heroCall.summary** (English in both languages)
- Wholesale inquiry, about 200 units to Austin, TX. Contact: Dana Ortiz, dana@example.com. Wants a quote.

**heroCall.tags**
- EN: Inquiry · Contact collected · Follow up
- 中文: 咨询 · 已收集联系方式 · 待跟进

**heroCall.disclaimer**
- EN: Illustration with made-up details, not a real customer call.
- 中文: 示意图，信息为虚构，并非真实客户通话。

---

## 4. Value points

**values.title**
- EN: Built for teams taking their business to the US
- 中文: 为出海美国的团队而建

**values.latency** · Changed: softer, as you asked
- EN title: Quick to respond
- EN body: Built to reply quickly, so conversations feel natural.
- 中文标题: 响应迅速
- 中文正文: 为快速响应而设计，让对话自然流畅。

**values.allInOne**
- EN title: All in one
- EN body: Numbers, Assistants, voices and billing on one platform, with no outside providers to integrate.
- 中文标题: 聚合
- 中文正文: 号码、助理、声音和账单在单一平台完成，无需集成外部服务商。

**values.compliance** · Changed: softer, no specific claim
- EN title: Reliable foundation
- EN body: Built on established US carrier infrastructure.
- 中文标题: 可靠底层
- 中文正文: 基于成熟的美国运营商基础设施构建。
> Still a placeholder until the compliance details are decided (your answer: TBD). It states where VFi runs, not that it is certified.

**values.lowCost**
- EN title: Low cost
- EN body: No expensive call-center staff, and no traditional phone infrastructure to buy.
- 中文标题: 低成本
- 中文正文: 无需投入昂贵人工客服成本，无需投入传统电话基建成本。

**values.smart**
- EN title: Smart
- EN body: Current AI models and Voice AI Agents deliver quality answers across scenarios.
- 中文标题: 智能
- 中文正文: 集成前沿 AI 模型和 AI 语音智能体，多场景下提供高质量输出。

**values.easy**
- EN title: Easy
- EN body: Manage numbers, Assistants and billing quickly, in one place.
- 中文标题: 便捷
- 中文正文: 轻松、快速地管理号码、助理与账单。

---

## 5. Scenarios

**scenarios.title**
- EN: Multiple Assistants, multiple scenarios
- 中文: 多助理，多场景

**scenarios.labels**
- EN: Task · Setup · Example · Your team
- 中文: 任务 · 配置方式 · 应用示例 · 团队跟进

**scenarios.note**
- EN: Examples are illustrations, not customer cases or promised results.
- 中文: 应用示例不代表客户案例或效果承诺。

### Scenario 1: Reception

**reception.tab**
- EN: Reception
- 中文: 来电接待

**reception.headline**
- EN: Every first call is received. Every need is recorded.
- 中文: 首次来电有接待，客户需求有记录。

**reception.task**
- EN: Introduce your company, learn why they are calling, and collect who they are, how to reach them and what they need.
- 中文: 介绍企业、了解来意，收集客户身份、联系方式与关键需求。

**reception.setup** · Changed: company intro goes in the Knowledge Base
- EN: Add your company intro to the Knowledge Base, write a greeting and reception instructions, pick a language and voice, then link a US number.
- 中文: 在知识库中添加企业简介，设置开场白和接待指令，选择语言、声音，再关联美国号码。

**reception.example** · Changed: shows the Knowledge Base at work
- EN: A customer calls from your website about working together. The Assistant introduces your company from the Knowledge Base, then learns about their company, intent and contact details.
- 中文: 客户从官网致电咨询合作。助理依据知识库介绍企业，并了解对方企业、合作意向与联系方式。

**reception.team**
- EN: Review the call record, judge the need, and have the right person follow up.
- 中文: 查看通话记录，判断需求，安排业务负责人继续联系。

**reception.card** (illustration; no feature change)
- EN: Captured on the call · Inbound · Name · Company · Need · Callback · Needs follow-up
- 中文: 通话中收集的信息 · 呼入 · 姓名 · 公司 · 需求 · 回拨号码 · 待跟进
- Sample values (English in both): Marcus Bell · Bell & Rowe Interiors · Distribution partnership in the Midwest · +1 (312) 555-0187

### Scenario 2: Business Q&A

**qa.tab**
- EN: Business Q&A
- 中文: 业务咨询

**qa.headline**
- EN: Answers backed by your materials. Open questions go to your team.
- 中文: 企业资料支持回答，待确认事项由团队跟进。

**qa.task**
- EN: Answer common questions about your products, service scope and how to work with you, from your own materials.
- 中文: 依据企业资料，解答产品、服务范围与合作方式等常见问题。

**qa.setup** · Changed: names the Knowledge Base
- EN: Add your company profile, product information and FAQs to the Knowledge Base. Once they are processed, set the answer boundaries.
- 中文: 在知识库中添加企业介绍、产品说明和常见问题。待资料处理完成后，设定回答边界。

**qa.example**
- EN: A customer asks about service scope and terms. The Assistant answers what is confirmed and records what is not.
- 中文: 客户询问服务范围与合作条件。助理解答已确认的信息，记录待确认事项。

**qa.team**
- EN: Strict mode limits factual answers to the Knowledge Base. When it cannot confirm something, it says so and collects details.
- 中文: 严格模式可将事实性回答限定在知识库范围内。无法确认时说明情况，并收集信息。
> Changed: "your materials / 事实性回答依据" now names the Knowledge Base.

**qa.card** (illustration)
- EN: Knowledge Base · Strict mode · Ready · To confirm
- 中文: 知识库 · 严格模式 · 就绪 · 待确认
- Sample (English in both): Company profile.pdf · Product catalog 2026.pdf · Partner FAQ
- Caller: Do you offer net-60 payment terms?
- Assistant: I can't confirm that, so I'll have the team follow up. What's the best email for you?

### Scenario 3: Outreach

**outreach.tab**
- EN: Outreach
- 中文: 商务外联

**outreach.headline**
- EN: Business calls with a clear goal.
- 中文: 围绕明确目标，完成商务电话任务。

**outreach.task**
- EN: Call US customers, vendors or partners to ask questions, confirm details or follow up.
- 中文: 联系美国客户、服务商或合作伙伴，开展询问、信息确认与回访。

**outreach.setup** · Changed: "one at a time" removed (decision 9); Knowledge Base added
- EN: Pick an Assistant, enter the US number and the task, and place the call from the web. Background the call needs, such as your company intro or an offer, comes from the Knowledge Base.
- 中文: 选择助理，输入美国目标号码与任务，在网页发起电话。通话所需的背景信息，如企业简介或合作方案，来自知识库。

**outreach.example**
- EN: Call a partner who agreed to take the call, confirm when they are free, then your team schedules the meeting.
- 中文: 联系已约定接听的合作伙伴，确认可沟通时间，再由团队安排会议。

**outreach.team**
- EN: Define who the Assistant is, what it may discuss and what it must not promise. Review the result and decide the next step.
- 中文: 明确身份、沟通范围与承诺边界。查看结果，由团队决定下一步行动。

**outreach.card** (illustration)
- EN: Place a call · Number to call · Goal for this call · Thursday 2 PM confirmed · Call
- 中文: 发起通话 · 拨打号码 · 本次通话目标 · 已确认周四下午 2 点 · 拨打
- Sample goal (English in both): Confirm a 30-minute call with Priya next week and offer Tuesday or Thursday afternoon.

---

## 6. How it works

**steps.title**
- EN: Live in four steps
- 中文: 四步完成开通

**steps.1**
- EN: Step 1 · Sign up and top up · Create an account and add balance through Stripe. The minimum top-up is US$10.
- 中文: 第 1 步 · 注册并充值 · 创建账户，通过 Stripe 充值使用余额。最低充值 US$10。

**steps.2**
- EN: Step 2 · Set up your Assistant · Write a greeting and instructions, pick a language and voice, and add your company info to the Knowledge Base.
- 中文: 第 2 步 · 配置业务助理 · 填写开场白与指令，选择语言、声音，并在知识库中添加企业信息。
> Changed: company info now goes in the Knowledge Base.

**steps.3**
- EN: Step 3 · Get a number and link it · Buy a US number by area code. Link it once the number is active and the Assistant is ready.
- 中文: 第 3 步 · 开通并关联号码 · 按区号购买美国号码。待号码激活、助理就绪后完成关联。

**steps.4**
- EN: Step 4 · Test and go live · Call in or place a test outreach call. Check the answers and collected details, then adjust.
- 中文: 第 4 步 · 测试并投入使用 · 拨入或发起外联测试。核对回答与信息收集，调整配置。

### Daily operations

**ops.inbound**
- EN title: Customers call you
- EN: A customer calls your US number · The linked Assistant answers by your instructions · Their intent and the conversation are recorded
- 中文标题: 客户拨入
- 中文: 客户拨打企业的美国号码 · 关联助理按工作指令接待 · 记录客户来意与沟通内容

**ops.outbound** · Changed: "逐次 / one by one" removed, to match decision 9
- EN title: You place a call
- EN: Pick an Assistant and enter a US number · Write the goal for this call and place it · The Assistant makes the call and handles the conversation
- 中文标题: 企业发起
- 中文: 选择助理并输入美国目标号码 · 填写本次通话目标并发起 · 助理拨打电话并开展沟通

**ops.after**
- EN title: Then review and act
- EN: Use the recording, transcript and summary when available to check needs, schedule follow-ups and handle anything that needs a person.
- 中文标题: 查看记录，安排下一步
- 中文: 结合录音、转写及可用的摘要，核对需求、安排回访，并处理需要人工确认的事项。

**ops.note** · Changed: concurrency and one-by-one sentences removed
- EN: Calls need a ready Assistant, an active number and enough balance.
- 中文: 通话需要助理就绪、号码有效且余额充足。

---

## 7. Pricing (final)

**pricing.title**
- EN: Pay as you go. No plans.
- 中文: 按需付费，无订阅套餐。

**pricing.subtitle**
- EN: Add balance with Stripe and pay only for what you use. Unanswered calls are free.
- 中文: 通过 Stripe 充值，只为实际用量付费。未接通的电话不收费。

**pricing.cta** · Changed: **nav.account** (main button). "Start with US$10" removed; the minimum top-up is still stated in step 1.

**pricing.caption**
- EN: Prices in US dollars
- 中文: 价格以美元计

**pricing.rows**
- EN: Calls, in or out · US$0.15 · per minute
- 中文: 通话（呼入或呼出） · US$0.15 · 每分钟
- EN: Phone number · US$3.00 · every 30 days
- 中文: 电话号码 · US$3.00 · 每 30 天
- EN: Voice clone · US$5.00 · each
- 中文: 声音克隆 · US$5.00 · 每个
- EN: Knowledge Base source · US$1.00 · each
- 中文: 知识库资料 · US$1.00 · 每个
- EN: Text received · US$0.02 · per segment
- 中文: 接收短信 · US$0.02 · 每段

**pricing.note**
- EN: Built-in voices are included. Cloning with your own ElevenLabs account is free here; the voice usage comes from that account.
- 中文: 内置声音可直接选用。连接自有 ElevenLabs 账户克隆声音，在本产品侧免费，相关语音消耗使用该账户额度。

---

## 8. Closing section

**close.title**
- EN: A US line for your business, answered in English and Mandarin.
- 中文: 为你的企业开通美国号码，中英文都能接听。

> The button is **nav.account**.

---

## 9. Footer

**footer.line** (text only, no AirPPP link)
- EN: VFi is the phone service of AirPPP, by Nyquiste Corporation.
- 中文: VFi 是 Nyquiste 旗下 AirPPP 的电话服务。
> "Nyquiste Corporation" links to https://www.nyquiste.com.

**footer.address**
- 12020 Sunrise Valley Dr Ste 100, Reston, VA 20191

**footer.links** · Changed
- EN: Pricing · Privacy · Terms · birdyyao@nyquiste.com
- 中文: 价格 · 隐私政策 · 服务条款 · birdyyao@nyquiste.com
> Privacy and Terms point to a coming-soon page until VFi's own policies are written. They must exist before public launch.

**comingSoon.title**
- EN: Coming soon
- 中文: 即将上线

**comingSoon.body**
- EN: We're writing VFi's {document}. Questions in the meantime? Email birdyyao@nyquiste.com.
- 中文: 我们正在撰写 VFi 的{document}。如有疑问，请发送邮件至 birdyyao@nyquiste.com。
> {document} is "Privacy Policy / 隐私政策" or "Terms of Service / 服务条款".
> A personal address will be public on the page and in search results. Fine for now; a role address such as support@ can replace it later without other changes.

---

## 10. Floating button

Removed, per your decision.

---

## 11. Sign-in page

**signIn.title**
- EN: Sign in to VFi
- 中文: 登录 VFi

**signIn.subtitle**
- EN: New here? Signing in creates your account.
- 中文: 第一次使用？登录即会创建账户。

**signIn.google**
- EN: Continue with Google
- 中文: 使用 Google 继续

**signIn.or**
- EN: or
- 中文: 或

**signIn.emailLabel**
- EN: Email
- 中文: 邮箱

**signIn.emailPlaceholder**
- EN: you@company.com
- 中文: you@company.com

**signIn.sendCode**
- EN: Email me a code
- 中文: 发送验证码到邮箱

**signIn.legal**
- EN: By continuing you agree to the Terms and Privacy Policy.
- 中文: 继续即表示你同意服务条款和隐私政策。
> Both links open the coming-soon page until the policies exist.

**signIn.panelTitle**
- EN: Your US line, answered in English and Mandarin.
- 中文: 你的美国号码，中英文都能接听。

**signIn.panelCard**
- EN: Front desk Assistant answered a call · Wholesale inquiry · contact collected
- 中文: 前台接待助理接听了一通来电 · 批发咨询 · 已收集联系方式
> Changed: English now says "Front desk Assistant", matching the Chinese and the hero card.

**signIn.panelNote**
- EN: Illustration, not a real call.
- 中文: 示意图，并非真实通话。

**signIn.footer** · Changed: matches the footer line, no AirPPP link
- EN: VFi · by Nyquiste
- 中文: VFi · Nyquiste 出品

---

## 12. Emails and payment

### Sign-in code email · Changed: redesigned, more detailed

> Layout mock: the "Email: sign-in code" artboard on the canvas.

**email.code.subject**
- EN: {code} is your VFi sign-in code
- 中文: {code} 是你的 VFi 登录验证码
> Putting the code first lets people read it from the notification without opening the email.

**email.code.preheader** (preview text shown in the inbox list)
- EN: It expires in 10 minutes. Didn't request it? You can ignore this email.
- 中文: 10 分钟内有效。如非本人操作，请忽略此邮件。

**email.code.heading**
- EN: Your sign-in code
- 中文: 你的登录验证码

**email.code.body**
- EN: Enter this code on the VFi sign-in page to continue as {email}.
- 中文: 在 VFi 登录页面输入以下验证码，以 {email} 继续登录。

**email.code.code** (large, spaced digits)
- {code}

**email.code.expiry**
- EN: The code expires in 10 minutes and works once. If you ask for a new code, only the newest one works.
- 中文: 验证码 10 分钟内有效，仅可使用一次。重新获取后，只有最新的验证码有效。

**email.code.notYou**
- EN: Didn't try to sign in? You can ignore this email; nobody can sign in without the code.
- 中文: 不是你本人在登录？请忽略此邮件，没有验证码任何人都无法登录。

**email.code.footer**
- EN: VFi by Nyquiste Corporation · 12020 Sunrise Valley Dr Ste 100, Reston, VA 20191 · birdyyao@nyquiste.com
- 中文: VFi · Nyquiste Corporation 出品 · 12020 Sunrise Valley Dr Ste 100, Reston, VA 20191 · birdyyao@nyquiste.com

> The email goes out in all five app languages, not only English and Chinese, because it follows the user's app language.

**stripe.checkoutItem**
- EN: VFi credit
- 中文: VFi 余额

> Languages: the landing page is English and Chinese. The sign-in page, the Dashboard and emails keep all five (English, 中文, Español, 日本語, Tiếng Việt).
