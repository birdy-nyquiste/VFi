/**
 * Landing page wording, English and Simplified Chinese only (other interface languages see English).
 * Source of truth: docs/vfi-website-copy.md; change it there first, then here. Prices are not in
 * here: the page reads them from config so they always match what is billed.
 */
export type LandingLang = "en" | "zh";

export interface ScenarioCopy {
  id: "reception" | "qa" | "outreach";
  tab: string;
  headline: string;
  task: string;
  setup: string;
  example: string;
  team: string;
}

const en = {
  meta: {
    title: "VFi · Agentic Voice Customer Engagement",
    description:
      "Get a US phone number and an Assistant that answers and places calls for your business, in English and Mandarin. Pay as you go from US$10.",
  },
  nav: { scenarios: "Scenarios", how: "How it works", pricing: "Pricing", signIn: "Sign in", dashboard: "Dashboard", language: "Language", home: "VFi home" },
  hero: {
    title: "Your US customer calls, now handled by a Voice AI Agent.",
    subtitle: "A US phone number plus Assistants for every scenario: reception, business Q&A and outreach. In English and Mandarin, all on one platform.",
    seePricing: "See pricing",
    note: "Pay as you go. No subscription.",
  },
  call: {
    label: "Example call",
    meta: "Inbound · Front desk Assistant",
    status: "On a call",
    assistant: "Assistant",
    caller: "Caller",
    summary: "Summary",
    tags: ["Inquiry", "Contact collected", "Follow up"],
    disclaimer: "Illustration with made-up details, not a real customer call.",
  },
  values: {
    title: "Built for teams taking their business to the US",
    items: [
      { title: "Quick to respond", body: "Built to reply quickly, so conversations feel natural." },
      { title: "All in one", body: "Numbers, Assistants, voices and billing on one platform, with no outside providers to integrate." },
      { title: "Reliable foundation", body: "Built on established US carrier infrastructure." },
      { title: "Low cost", body: "No expensive call-center staff, and no traditional phone infrastructure to buy." },
      { title: "Smart", body: "Current AI models and Voice AI Agents deliver quality answers across scenarios." },
      { title: "Easy", body: "Manage numbers, Assistants and billing quickly, in one place." },
    ],
  },
  scenarios: {
    title: "Multiple Assistants, multiple scenarios",
    labels: { task: "Task", setup: "Setup", example: "Example", team: "Your team" },
    note: "Examples are illustrations, not customer cases or promised results.",
    items: [
      {
        id: "reception",
        tab: "Reception",
        headline: "Every first call is received. Every need is recorded.",
        task: "Introduce your company, learn why they are calling, and collect who they are, how to reach them and what they need.",
        setup: "Add your company intro to the Knowledge Base, write a greeting and reception instructions, pick a language and voice, then link a US number.",
        example:
          "A customer calls from your website about working together. The Assistant introduces your company from the Knowledge Base, then learns about their company, intent and contact details.",
        team: "Review the call record, judge the need, and have the right person follow up.",
      },
      {
        id: "qa",
        tab: "Business Q&A",
        headline: "Answers backed by your materials. Open questions go to your team.",
        task: "Answer common questions about your products, service scope and how to work with you, from your own materials.",
        setup: "Add your company profile, product information and FAQs to the Knowledge Base. Once they are processed, set the answer boundaries.",
        example: "A customer asks about service scope and terms. The Assistant answers what is confirmed and records what is not.",
        team: "Strict mode limits factual answers to the Knowledge Base. When it cannot confirm something, it says so and collects details.",
      },
      {
        id: "outreach",
        tab: "Outreach",
        headline: "Business calls with a clear goal.",
        task: "Call US customers, vendors or partners to ask questions, confirm details or follow up.",
        setup:
          "Pick an Assistant, enter the US number and the task, and place the call from the web. Background the call needs, such as your company intro or an offer, comes from the Knowledge Base.",
        example: "Call a partner who agreed to take the call, confirm when they are free, then your team schedules the meeting.",
        team: "Define who the Assistant is, what it may discuss and what it must not promise. Review the result and decide the next step.",
      },
    ] satisfies ScenarioCopy[],
    reception: { title: "Captured on the call", inbound: "Inbound", name: "Name", company: "Company", need: "Need", callback: "Callback", followUp: "Needs follow-up" },
    qa: { title: "Knowledge Base", strict: "Strict mode", ready: "Ready", toConfirm: "To confirm" },
    outreach: { title: "Place a call", number: "Number to call", goal: "Goal for this call", confirmed: "Thursday 2 PM confirmed", call: "Call" },
  },
  steps: {
    title: "Live in four steps",
    items: [
      { n: "Step 1", title: "Sign up and top up", body: "Create an account and add balance through Stripe. The minimum top-up is {min}." },
      { n: "Step 2", title: "Set up your Assistant", body: "Write a greeting and instructions, pick a language and voice, and add your company info to the Knowledge Base." },
      { n: "Step 3", title: "Get a number and link it", body: "Buy a US number by area code. Link it once the number is active and the Assistant is ready." },
      { n: "Step 4", title: "Test and go live", body: "Call in or place a test outreach call. Check the answers and collected details, then adjust." },
    ],
  },
  ops: {
    inbound: {
      title: "Customers call you",
      items: ["A customer calls your US number", "The linked Assistant answers by your instructions", "Their intent and the conversation are recorded"],
    },
    outbound: {
      title: "You place a call",
      items: ["Pick an Assistant and enter a US number", "Write the goal for this call and place it", "The Assistant makes the call and handles the conversation"],
    },
    after: {
      title: "Then review and act",
      body: "Use the recording, transcript and summary when available to check needs, schedule follow-ups and handle anything that needs a person.",
    },
    note: "Calls need a ready Assistant, an active number and enough balance.",
  },
  pricing: {
    title: "Pay as you go. No plans.",
    subtitle: "Add balance with Stripe and pay only for what you use. Unanswered calls are free.",
    caption: "Prices in US dollars",
    rows: { calls: ["Calls, in or out", "per minute"], number: ["Phone number", "every 30 days"], clone: ["Voice clone", "each"], knowledge: ["Knowledge Base source", "each"], text: ["Text received", "per segment"] },
    note: "Built-in voices are included. Cloning with your own ElevenLabs account is free here; the voice usage comes from that account.",
  },
  close: { title: "A US line for your business, answered in English and Mandarin." },
  footer: {
    before: "VFi is the phone service of AirPPP, by ",
    after: ".",
    privacy: "Privacy",
    terms: "Terms",
  },
};

export type LandingCopy = typeof en;

const zh: LandingCopy = {
  meta: {
    title: "VFi · AI 自主化的语音客户互动",
    description: "获取美国电话号码，让助理为你的企业接听和拨打电话，支持英文和普通话。按需付费，US$10 起充。",
  },
  nav: { scenarios: "应用场景", how: "开通流程", pricing: "价格", signIn: "登录", dashboard: "控制台", language: "语言", home: "VFi 首页" },
  hero: {
    title: "你的美国客户电话互动现在由 AI 语音智能体接管。",
    subtitle: "美国电话号码 + 多场景语音助理：来电接待、业务咨询、商务外联。支持英文和普通话，在同一平台完成。",
    seePricing: "查看价格",
    note: "按需付费，无订阅。",
  },
  call: {
    label: "示例通话",
    meta: "呼入 · 前台接待助理",
    status: "通话中",
    assistant: "助理",
    caller: "来电者",
    summary: "摘要",
    tags: ["咨询", "已收集联系方式", "待跟进"],
    disclaimer: "示意图，信息为虚构，并非真实客户通话。",
  },
  values: {
    title: "为出海美国的团队而建",
    items: [
      { title: "响应迅速", body: "为快速响应而设计，让对话自然流畅。" },
      { title: "聚合", body: "号码、助理、声音和账单在单一平台完成，无需集成外部服务商。" },
      { title: "可靠底层", body: "基于成熟的美国运营商基础设施构建。" },
      { title: "低成本", body: "无需投入昂贵人工客服成本，无需投入传统电话基建成本。" },
      { title: "智能", body: "集成前沿 AI 模型和 AI 语音智能体，多场景下提供高质量输出。" },
      { title: "便捷", body: "轻松、快速地管理号码、助理与账单。" },
    ],
  },
  scenarios: {
    title: "多助理，多场景",
    labels: { task: "任务", setup: "配置方式", example: "应用示例", team: "团队跟进" },
    note: "应用示例不代表客户案例或效果承诺。",
    items: [
      {
        id: "reception",
        tab: "来电接待",
        headline: "首次来电有接待，客户需求有记录。",
        task: "介绍企业、了解来意，收集客户身份、联系方式与关键需求。",
        setup: "在知识库中添加企业简介，设置开场白和接待指令，选择语言、声音，再关联美国号码。",
        example: "客户从官网致电咨询合作。助理依据知识库介绍企业，并了解对方企业、合作意向与联系方式。",
        team: "查看通话记录，判断需求，安排业务负责人继续联系。",
      },
      {
        id: "qa",
        tab: "业务咨询",
        headline: "企业资料支持回答，待确认事项由团队跟进。",
        task: "依据企业资料，解答产品、服务范围与合作方式等常见问题。",
        setup: "在知识库中添加企业介绍、产品说明和常见问题。待资料处理完成后，设定回答边界。",
        example: "客户询问服务范围与合作条件。助理解答已确认的信息，记录待确认事项。",
        team: "严格模式可将事实性回答限定在知识库范围内。无法确认时说明情况，并收集信息。",
      },
      {
        id: "outreach",
        tab: "商务外联",
        headline: "围绕明确目标，完成商务电话任务。",
        task: "联系美国客户、服务商或合作伙伴，开展询问、信息确认与回访。",
        setup: "选择助理，输入美国目标号码与任务，在网页发起电话。通话所需的背景信息，如企业简介或合作方案，来自知识库。",
        example: "联系已约定接听的合作伙伴，确认可沟通时间，再由团队安排会议。",
        team: "明确身份、沟通范围与承诺边界。查看结果，由团队决定下一步行动。",
      },
    ],
    reception: { title: "通话中收集的信息", inbound: "呼入", name: "姓名", company: "公司", need: "需求", callback: "回拨号码", followUp: "待跟进" },
    qa: { title: "知识库", strict: "严格模式", ready: "就绪", toConfirm: "待确认" },
    outreach: { title: "发起通话", number: "拨打号码", goal: "本次通话目标", confirmed: "已确认周四下午 2 点", call: "拨打" },
  },
  steps: {
    title: "四步完成开通",
    items: [
      { n: "第 1 步", title: "注册并充值", body: "创建账户，通过 Stripe 充值使用余额。最低充值 {min}。" },
      { n: "第 2 步", title: "配置业务助理", body: "填写开场白与指令，选择语言、声音，并在知识库中添加企业信息。" },
      { n: "第 3 步", title: "开通并关联号码", body: "按区号购买美国号码。待号码激活、助理就绪后完成关联。" },
      { n: "第 4 步", title: "测试并投入使用", body: "拨入或发起外联测试。核对回答与信息收集，调整配置。" },
    ],
  },
  ops: {
    inbound: { title: "客户拨入", items: ["客户拨打企业的美国号码", "关联助理按工作指令接待", "记录客户来意与沟通内容"] },
    outbound: { title: "企业发起", items: ["选择助理并输入美国目标号码", "填写本次通话目标并发起", "助理拨打电话并开展沟通"] },
    after: { title: "查看记录，安排下一步", body: "结合录音、转写及可用的摘要，核对需求、安排回访，并处理需要人工确认的事项。" },
    note: "通话需要助理就绪、号码有效且余额充足。",
  },
  pricing: {
    title: "按需付费，无订阅套餐。",
    subtitle: "通过 Stripe 充值，只为实际用量付费。未接通的电话不收费。",
    caption: "价格以美元计",
    rows: { calls: ["通话（呼入或呼出）", "每分钟"], number: ["电话号码", "每 30 天"], clone: ["声音克隆", "每个"], knowledge: ["知识库资料", "每个"], text: ["接收短信", "每段"] },
    note: "内置声音可直接选用。连接自有 ElevenLabs 账户克隆声音，在本产品侧免费，相关语音消耗使用该账户额度。",
  },
  close: { title: "为你的企业开通美国号码，中英文都能接听。" },
  footer: { before: "VFi 是 ", after: " 旗下 AirPPP 的电话服务。", privacy: "隐私政策", terms: "服务条款" },
};

export const LANDING_COPY: Record<LandingLang, LandingCopy> = { en, zh };
