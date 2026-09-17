"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  Gem,
  Landmark,
  MailCheck,
  MapPin,
  PackageSearch,
  Palette,
  Play,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  University,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seedDashboardLeads, type SeedLead } from "@/data/seed-leads";

type LeadCategory = "Museum" | "University" | "Corporate" | "Zoo/Aquarium" | "Attraction";
type ContactStatus = "Verified" | "Generic" | "Missing";
type Locale = "zh" | "en";
type DashboardViewKey = "leadMap" | "museums" | "universities" | "corporate" | "procurement" | "aiDrafts" | "opportunities";
type DiscoveryPhase = "museums" | "universities" | "attractions" | "corporate" | "schools";
type PipelineStage =
  | "Not Contacted"
  | "Email Sent"
  | "Follow-up"
  | "Meeting Scheduled"
  | "Proposal Sent"
  | "Negotiation"
  | "Won"
  | "Lost";

type DashboardLead = {
  id: string;
  name: string;
  category: LeadCategory;
  state: string;
  city: string;
  score: number;
  contactStatus: ContactStatus;
  pipelineStage: PipelineStage;
  decisionMaker?: string;
  websiteUrl?: string;
  giftShopUrl?: string;
  vendorUrl?: string;
  wholesaleUrl?: string;
  theme: string;
  productIdea: string;
  latitude: number;
  longitude: number;
  notes: string[];
  seed?: SeedLead;
};

const initialLeads: DashboardLead[] = seedDashboardLeads;

const categoryColors: Record<LeadCategory, string> = {
  Museum: "#ef2950",
  University: "#00a6a6",
  Corporate: "#7c3aed",
  "Zoo/Aquarium": "#f2b705",
  Attraction: "#ff6b35",
};

const contactStatusStyles: Record<ContactStatus, string> = {
  Verified: "border-emerald-500 bg-emerald-50 text-emerald-900",
  Generic: "border-amber-500 bg-amber-50 text-amber-950",
  Missing: "border-rose-500 bg-rose-50 text-rose-950",
};

const pipelineStages: PipelineStage[] = [
  "Not Contacted",
  "Email Sent",
  "Follow-up",
  "Meeting Scheduled",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];

const categoryLabels: Record<Locale, Record<string, string>> = {
  zh: {
    All: "全部",
    Museum: "博物馆",
    University: "大学",
    Corporate: "企业礼品",
    "Zoo/Aquarium": "动物园/水族馆",
    Attraction: "旅游景点",
  },
  en: {
    All: "All",
    Museum: "Museum",
    University: "University",
    Corporate: "Corporate",
    "Zoo/Aquarium": "Zoo/Aquarium",
    Attraction: "Attraction",
  },
};

const statusLabels: Record<Locale, Record<ContactStatus, string>> = {
  zh: { Verified: "已验证", Generic: "通用邮箱", Missing: "待补充" },
  en: { Verified: "Verified", Generic: "Generic", Missing: "Missing" },
};

const discoveryPhaseLabels: Record<Locale, Record<DiscoveryPhase, string>> = {
  zh: {
    museums: "博物馆与文化机构",
    universities: "大学与校园商店",
    attractions: "景点 / 公园 / 水族馆",
    corporate: "企业礼品客户",
    schools: "学校网络",
  },
  en: {
    museums: "Museums & Cultural",
    universities: "Universities & Campus Stores",
    attractions: "Attractions / Parks / Aquariums",
    corporate: "Corporate Gift Buyers",
    schools: "School Networks",
  },
};

const stageLabels: Record<Locale, Record<PipelineStage, string>> = {
  zh: {
    "Not Contacted": "未联系",
    "Email Sent": "已发邮件",
    "Follow-up": "跟进中",
    "Meeting Scheduled": "已约会议",
    "Proposal Sent": "已发方案",
    Negotiation: "谈判中",
    Won: "已成交",
    Lost: "已丢失",
  },
  en: {
    "Not Contacted": "Not Contacted",
    "Email Sent": "Email Sent",
    "Follow-up": "Follow-up",
    "Meeting Scheduled": "Meeting Scheduled",
    "Proposal Sent": "Proposal Sent",
    Negotiation: "Negotiation",
    Won: "Won",
    Lost: "Lost",
  },
};

const ui = {
  zh: {
    topBar: "文化商业情报系统：发现博物馆零售、校园商店、旅游采购方与高端礼品合作机会",
    eyebrow: "Auctus Lab LLC",
    title: "文化商业数据库",
    subtitle: "Auctus Lab 面向北美博物馆、大学、旅游景点与高端礼品采购场景的彩色商业机会工作台。",
    search: "搜索潜在客户",
    topOpportunities: "查看高分机会",
    nav: {
      leadMap: "客户地图",
      museums: "博物馆",
      universities: "大学",
      corporate: "企业礼品",
      vendorPages: "采购页面",
      aiDrafts: "AI 邮件草稿",
      wonDeals: "成交机会",
    },
    metrics: {
      total: "机构总数",
      contacts: "采购联系人",
      avg: "平均分",
      museums: "博物馆线索",
    },
    filters: {
      title: "线索筛选",
      state: "州/地区",
      category: "类别",
      contact: "联系人",
      minScore: "最低分数",
    },
    crawl: {
      title: "爬虫工作台",
      mode: "自动发现",
      phase: "发现阶段",
      discover: "自动发现目标",
      target: "目标官网",
      type: "线索类型",
      button: "爬取官网",
      ready: "准备爬取一个机构官网",
      discovering: "正在生成目标名单...",
      discovered: "已生成目标名单，可开始批量爬取。",
      running: "正在爬取官网，并查找商店、采购、联系人页面...",
      complete: "实时爬取完成，线索已保存到仪表盘。",
      fallback: "后端尚未运行，已先创建一个可审核的本地预览线索。",
      googleNote: "不建议直接硬爬 Google。真实自动发现需要配置 SerpAPI、Bing Search 或 Google Programmable Search API；没有 API key 时这里只展示搜索计划。",
    },
    productsTitle: "产品类别",
    products: [
      ["地标冰淇淋模具", "高分博物馆零售机会"],
      ["艺术徽章", "展览限定文创礼品"],
      ["帆布袋", "视觉叙事型商品"],
      ["礼盒", "企业定制合作"],
    ],
    panels: {
      composition: "类别构成",
      hotspots: "州/地区热点",
      leaderboard: "机会排行榜",
      prospects: "个线索",
      heatmap: "线索热力图",
      mapAction: "可接入 Mapbox 图层",
      mapEyebrow: "高分机会聚集区",
      mapTitle: "博物馆商店风格市场地图",
      qualified: "个合格线索",
      avg: "平均分",
    },
    card: {
      productIdea: "产品建议",
      score: "分数",
      open: "打开线索",
    },
    detail: {
      title: "线索详情",
      score: "分数",
      contact: "联系人",
      stage: "阶段",
      crm: "CRM 流程",
      signals: "已抓取商业信号",
      theme: "馆藏 / 主题",
      targetContact: "目标联系人",
      recommendedProduct: "推荐产品",
      website: "官网",
      giftShop: "礼品商店",
      vendor: "采购页面",
      wholesale: "批发",
      missing: "缺失",
      draft: "AI 邮件草稿预览",
      humanReview: "需要人工审核",
      subject: "主题",
      saveDraft: "保存草稿供人工审核",
      researchNeeded: "需要进一步调研",
    },
  },
  en: {
    topBar: "Cultural commerce intelligence: discover museum retail, campus stores, tourism buyers, and premium gift partners",
    eyebrow: "Auctus Lab LLC",
    title: "Cultural Commerce Database",
    subtitle: "Auctus Lab's colorful executive workspace for North American museum, university, tourism, and premium gifting opportunities.",
    search: "Search leads",
    topOpportunities: "Show top opportunities",
    nav: {
      leadMap: "Lead Map",
      museums: "Museums",
      universities: "Universities",
      corporate: "Corporate Gifts",
      vendorPages: "Vendor Pages",
      aiDrafts: "AI Drafts",
      wonDeals: "Won Deals",
    },
    metrics: {
      total: "Total Institutions",
      contacts: "Procurement Contacts",
      avg: "Avg. Score",
      museums: "Museum Leads",
    },
    filters: {
      title: "Pipeline Filters",
      state: "State",
      category: "Category",
      contact: "Contact",
      minScore: "Minimum Score",
    },
    crawl: {
      title: "Crawl Studio",
      mode: "Auto Discovery",
      phase: "Discovery Phase",
      discover: "Discover Targets",
      target: "Target homepage",
      type: "Lead Type",
      button: "Crawl Homepage",
      ready: "Ready to crawl one homepage",
      discovering: "Generating target list...",
      discovered: "Target list generated. Ready for batch crawling.",
      running: "Crawling homepage and looking for store/vendor/contact pages...",
      complete: "Live crawl complete. Lead saved to dashboard.",
      fallback: "Backend is not running, so a review-safe preview lead was created locally.",
      googleNote: "Directly scraping Google is not recommended. Live discovery requires SerpAPI, Bing Search, or Google Programmable Search API. Without an API key this shows the search plan only.",
    },
    productsTitle: "Product Categories",
    products: [
      ["Landmark Molds", "High-score museum retail"],
      ["Art Pins", "Exhibition capsule gifts"],
      ["Canvas Bags", "Visual storytelling SKUs"],
      ["Gift Boxes", "Corporate collaboration"],
    ],
    panels: {
      composition: "Category Composition",
      hotspots: "State Hotspots",
      leaderboard: "Opportunity Leaderboard",
      prospects: "prospects",
      heatmap: "Lead Heatmap",
      mapAction: "Mapbox-ready mock layer",
      mapEyebrow: "High-score clusters",
      mapTitle: "Museum-store style market map",
      qualified: "qualified prospects",
      avg: "avg",
    },
    card: {
      productIdea: "Product idea",
      score: "Score",
      open: "Open lead",
    },
    detail: {
      title: "Lead Detail",
      score: "Score",
      contact: "Contact",
      stage: "Stage",
      crm: "CRM Pipeline",
      signals: "Scraped Business Signals",
      theme: "Collection / Theme",
      targetContact: "Target Contact",
      recommendedProduct: "Recommended Product",
      website: "Website",
      giftShop: "Gift Shop",
      vendor: "Vendor Page",
      wholesale: "Wholesale",
      missing: "Missing",
      draft: "AI Draft Preview",
      humanReview: "Human review required",
      subject: "Subject",
      saveDraft: "Save Draft for Human Review",
      researchNeeded: "Research needed",
    },
  },
} as const;

function getProductCards(locale: Locale) {
  const icons = [Landmark, Gem, ShoppingBag, PackageSearch];
  const accents = [
    "from-[#ff2f5f] to-[#ffb703]",
    "from-[#00a6a6] to-[#7bdff2]",
    "from-[#7c3aed] to-[#f0abfc]",
    "from-[#fb5607] to-[#ffbe0b]",
  ];
  return ui[locale].products.map(([title, subtitle], index) => ({
    title,
    subtitle,
    accent: accents[index],
    icon: icons[index],
  }));
}

export default function DashboardView() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [activeView, setActiveView] = useState<DashboardViewKey>("leadMap");
  const [leads, setLeads] = useState(initialLeads);
  const [stateFilter, setStateFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [contactFilter, setContactFilter] = useState("All");
  const [minimumScore, setMinimumScore] = useState(80);
  const [query, setQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlCategory, setCrawlCategory] = useState<LeadCategory>("Museum");
  const [discoveryPhase, setDiscoveryPhase] = useState<DiscoveryPhase>("museums");
  const [discoveredTargets, setDiscoveredTargets] = useState<Array<{ homepage_url: string; category: LeadCategory; source: string; query?: string }>>([]);
  const [crawlStatus, setCrawlStatus] = useState<string>(ui.zh.crawl.ready);
  const text = ui[locale];
  const productCards = getProductCards(locale);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => stateFilter === "All" || lead.state === stateFilter)
      .filter((lead) => categoryFilter === "All" || lead.category === categoryFilter)
      .filter((lead) => contactFilter === "All" || lead.contactStatus === contactFilter)
      .filter((lead) => lead.score >= minimumScore)
      .filter((lead) => lead.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.score - a.score);
  }, [categoryFilter, contactFilter, leads, minimumScore, query, stateFilter]);

  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const verifiedContacts = filteredLeads.filter((lead) => lead.contactStatus === "Verified").length;
    const averageScore = total ? Math.round(filteredLeads.reduce((sum, lead) => sum + lead.score, 0) / total) : 0;
    const museums = filteredLeads.filter((lead) => lead.category === "Museum").length;
    return { total, verifiedContacts, averageScore, museums };
  }, [filteredLeads]);

  const stateDensity = useMemo(() => {
    const byState = new Map<string, { state: string; leads: number; averageScore: number }>();
    for (const lead of filteredLeads) {
      const current = byState.get(lead.state) ?? { state: lead.state, leads: 0, averageScore: 0 };
      current.leads += 1;
      current.averageScore += lead.score;
      byState.set(lead.state, current);
    }
    return [...byState.values()]
      .map((item) => ({ ...item, averageScore: Math.round(item.averageScore / item.leads) }))
      .sort((a, b) => b.leads - a.leads || b.averageScore - a.averageScore);
  }, [filteredLeads]);

  const categoryDistribution = useMemo(() => {
    const counts = new Map<LeadCategory, number>();
    for (const lead of filteredLeads) counts.set(lead.category, (counts.get(lead.category) ?? 0) + 1);
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const states = ["All", ...Array.from(new Set(leads.map((lead) => lead.state))).sort()];
  const categories = ["All", ...Array.from(new Set(leads.map((lead) => lead.category))).sort()];
  const contactStatuses = ["All", "Verified", "Generic", "Missing"];

  function showCategory(category: string) {
    setActiveView(
      category === "Museum" ? "museums" : category === "University" ? "universities" : category === "Corporate" ? "corporate" : "leadMap",
    );
    setCategoryFilter(category === "All" ? "All" : category);
    setMinimumScore(0);
  }

  function updateStage(leadId: string, stage: PipelineStage) {
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, pipelineStage: stage } : lead)));
  }

  async function submitCrawl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!crawlUrl.trim()) return;

    setCrawlStatus(text.crawl.running);
    const url = normalizeUrl(crawlUrl);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/leads/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepage_url: url, category: crawlCategory }),
      });
      if (!response.ok) throw new Error("Backend crawler is not running");
      const data = await response.json();
      setLeads((current) => [data.lead as DashboardLead, ...current]);
      setCrawlStatus(text.crawl.complete);
    } catch {
      const previewLead = createPreviewLead(url, crawlCategory, locale);
      setLeads((current) => [previewLead, ...current]);
      setSelectedLeadId(previewLead.id);
      setCrawlStatus(text.crawl.fallback);
    }
    setCrawlUrl("");
  }

  async function discoverTargets() {
    setCrawlStatus(text.crawl.discovering);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/leads/discover-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: discoveryPhase, max_results: 12 }),
      });
      if (!response.ok) throw new Error("Backend discovery is not running");
      const data = await response.json();
      setDiscoveredTargets(data.targets);
      setCrawlStatus(
        data.requires_api_key_for_live_search
          ? locale === "zh"
            ? "已生成搜索计划；要实时发现上千机构，需要配置 SerpAPI 或 Bing Search API key。"
            : "Search plan generated. Configure SerpAPI or Bing Search API key for live discovery at scale."
          : text.crawl.discovered,
      );
    } catch {
      const targets = localDiscoveryTargets(discoveryPhase);
      setDiscoveredTargets(targets);
      setCrawlStatus(locale === "zh" ? "后端尚未运行，已使用本地种子名单生成目标。" : "Backend is not running, local seed targets were generated.");
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#111111]">
      <div className="flex min-h-11 items-center justify-center bg-[#2d2d2d] px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-white">
        {text.topBar}
      </div>

      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-7 px-8 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-end gap-4">
                <div className="text-[50px] font-black leading-[0.82] tracking-[-0.06em] text-[#ef2950]">
                  AUC
                  <br />
                  LAB
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ef2950]">{text.eyebrow}</p>
                  <h1 className="mt-1 text-[46px] font-semibold leading-none tracking-[-0.035em]">{text.title}</h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-[17px] leading-7 text-neutral-600">
                {text.subtitle}
              </p>
            </div>

            <div className="flex w-full max-w-xl items-center gap-4">
              <button
                onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
                className="h-12 border-2 border-black bg-white px-4 text-sm font-black"
                title={locale === "zh" ? "Switch to English" : "Switch to Chinese"}
              >
                {locale === "zh" ? "EN" : "中文"}
              </button>
              <label className="flex h-12 flex-1 items-center gap-3 border-b-2 border-black bg-white px-1 text-lg">
                <Search className="h-6 w-6" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={text.search}
                  className="w-full bg-transparent outline-none"
                />
              </label>
              <button
                className="flex h-12 w-12 items-center justify-center border-2 border-black bg-[#ffbe0b]"
                onClick={() => setMinimumScore(80)}
                title={text.topOpportunities}
              >
                <BarChart3 className="h-6 w-6" />
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-4 text-[19px] font-bold">
            <button onClick={() => showCategory("All")} className={activeView === "leadMap" ? "text-[#ef2950]" : ""}>
              {text.nav.leadMap}
            </button>
            <button onClick={() => showCategory("Museum")} className={activeView === "museums" ? "text-[#ef2950]" : ""}>
              {text.nav.museums}
            </button>
            <button onClick={() => showCategory("University")} className={activeView === "universities" ? "text-[#ef2950]" : ""}>
              {text.nav.universities}
            </button>
            <button onClick={() => showCategory("Corporate")} className={activeView === "corporate" ? "text-[#ef2950]" : ""}>
              {text.nav.corporate}
            </button>
            <button
              onClick={() => {
                setActiveView("procurement");
                setContactFilter("Verified");
              }}
              className={activeView === "procurement" ? "text-[#ef2950]" : ""}
            >
              {text.nav.vendorPages}
            </button>
            <button onClick={() => setActiveView("aiDrafts")} className={activeView === "aiDrafts" ? "text-[#ef2950]" : ""}>
              {text.nav.aiDrafts}
            </button>
            <button
              onClick={() => {
                setActiveView("opportunities");
                setMinimumScore(0);
              }}
              className={activeView === "opportunities" ? "text-[#ef2950]" : ""}
            >
              {text.nav.wonDeals}
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1520px] gap-5 px-8 py-7 lg:grid-cols-4">
        <MetricTile icon={Building2} label={text.metrics.total} value={metrics.total.toString()} color="bg-[#00a6a6]" />
        <MetricTile icon={MailCheck} label={text.metrics.contacts} value={metrics.verifiedContacts.toString()} color="bg-[#ffbe0b]" />
        <MetricTile icon={TrendingUp} label={text.metrics.avg} value={metrics.averageScore.toString()} color="bg-[#ef2950]" />
        <MetricTile icon={Landmark} label={text.metrics.museums} value={metrics.museums.toString()} color="bg-[#7c3aed]" />
      </section>

      <section className="mx-auto grid max-w-[1520px] gap-6 px-8 pb-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-r border-black/15 pr-6">
          <FilterBlock title={text.filters.title}>
            <FilterSelect label={text.filters.state} value={stateFilter} options={states} locale={locale} onChange={setStateFilter} />
            <FilterSelect label={text.filters.category} value={categoryFilter} options={categories} locale={locale} onChange={setCategoryFilter} />
            <FilterSelect label={text.filters.contact} value={contactFilter} options={contactStatuses} locale={locale} onChange={setContactFilter} />
            <label className="grid gap-3 text-lg font-semibold">
              {text.filters.minScore}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minimumScore}
                  onChange={(event) => setMinimumScore(Number(event.target.value))}
                  className="w-full accent-[#ef2950]"
                />
                <span className="w-12 text-right text-2xl">{minimumScore}</span>
              </div>
            </label>
          </FilterBlock>

          <FilterBlock title={text.crawl.title}>
            <div className="grid gap-4 border-2 border-black bg-white p-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ef2950]">{text.crawl.mode}</p>
              <FilterSelect
                label={text.crawl.phase}
                value={discoveryPhase}
                options={["museums", "universities", "attractions", "corporate", "schools"]}
                locale={locale}
                onChange={(value) => setDiscoveryPhase(value as DiscoveryPhase)}
              />
              <button
                type="button"
                onClick={discoverTargets}
                className="flex h-12 items-center justify-center gap-2 border-2 border-black bg-[#00a6a6] font-black text-white"
              >
                <Database className="h-5 w-5" />
                {text.crawl.discover}
              </button>
              <p className="text-xs leading-5 text-neutral-500">{text.crawl.googleNote}</p>
              {discoveredTargets.length ? (
                <div className="grid gap-2">
                  {discoveredTargets.map((target) => (
                    <button
                      key={target.homepage_url}
                      type="button"
                      onClick={() => {
                        if (!target.homepage_url.startsWith("http")) {
                          return;
                        }
                        const previewLead = createPreviewLead(target.homepage_url, target.category, locale);
                        setLeads((current) => [previewLead, ...current]);
                        setSelectedLeadId(previewLead.id);
                      }}
                      className={`border border-black/20 p-2 text-left text-xs font-semibold ${
                        target.homepage_url.startsWith("http") ? "bg-[#fbfaf7]" : "bg-amber-50"
                      }`}
                    >
                      {target.homepage_url.startsWith("http") ? target.homepage_url : target.query}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <form onSubmit={submitCrawl} className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
                {text.crawl.target}
                <input
                  value={crawlUrl}
                  onChange={(event) => setCrawlUrl(event.target.value)}
                  placeholder="https://museum.org"
                  className="h-12 border-2 border-black px-3 text-base font-semibold normal-case tracking-normal outline-none"
                />
              </label>
              <FilterSelect
                label={text.crawl.type}
                value={crawlCategory}
                options={["Museum", "University", "Corporate", "Zoo/Aquarium", "Attraction"]}
                locale={locale}
                onChange={(value) => setCrawlCategory(value as LeadCategory)}
              />
              <button className="flex h-12 items-center justify-center gap-2 border-2 border-black bg-[#ef2950] font-black text-white">
                <Play className="h-5 w-5" />
                {text.crawl.button}
              </button>
              <p className="border-l-4 border-[#ffbe0b] bg-white p-3 text-sm leading-6 text-neutral-600">{crawlStatus}</p>
            </form>
          </FilterBlock>

          <FilterBlock title={text.productsTitle}>
            <div className="grid gap-5">
              {productCards.map((card) => (
                <ProductCategoryCard key={card.title} {...card} />
              ))}
            </div>
          </FilterBlock>
        </aside>

        <MainWorkspace
          activeView={activeView}
          leads={filteredLeads}
          stateDensity={stateDensity}
          categoryDistribution={categoryDistribution}
          locale={locale}
          onOpenLead={setSelectedLeadId}
        />
      </section>

      {selectedLead ? (
        <LeadDetailDrawer
          lead={selectedLead}
          locale={locale}
          onClose={() => setSelectedLeadId(null)}
          onStageChange={(stage) => updateStage(selectedLead.id, stage)}
        />
      ) : null}
    </main>
  );
}

function MainWorkspace({
  activeView,
  leads,
  stateDensity,
  categoryDistribution,
  locale,
  onOpenLead,
}: {
  activeView: DashboardViewKey;
  leads: DashboardLead[];
  stateDensity: Array<{ state: string; leads: number; averageScore: number }>;
  categoryDistribution: Array<{ name: LeadCategory; value: number }>;
  locale: Locale;
  onOpenLead: (leadId: string) => void;
}) {
  const text = ui[locale];

  if (activeView === "procurement") {
    return <ProcurementView locale={locale} />;
  }

  if (activeView === "aiDrafts") {
    return <EmailDraftLibrary leads={leads} locale={locale} onOpenLead={onOpenLead} />;
  }

  if (activeView === "opportunities") {
    return <OpportunityDealBoard leads={leads} locale={locale} onOpenLead={onOpenLead} />;
  }

  const directoryTitle =
    activeView === "museums"
      ? locale === "zh"
        ? "博物馆客户目录"
        : "Museum Prospect Directory"
      : activeView === "universities"
        ? locale === "zh"
          ? "大学与校园商店目录"
          : "University & Campus Store Directory"
        : activeView === "corporate"
          ? locale === "zh"
            ? "企业礼品客户目录"
            : "Corporate Gift Prospect Directory"
          : text.panels.leaderboard;

  return (
    <div className="grid gap-6">
      {activeView === "leadMap" ? (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.85fr)]">
          <MuseumMap leads={leads} stateDensity={stateDensity} locale={locale} />

          <div className="grid gap-6">
            <Panel title={text.panels.composition}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryDistribution} dataKey="value" nameKey="name" innerRadius={68} outerRadius={106} paddingAngle={4}>
                    {categoryDistribution.map((entry) => (
                      <Cell key={entry.name} fill={categoryColors[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title={text.panels.hotspots}>
              <ResponsiveContainer width="100%" height={255}>
                <BarChart data={stateDensity.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="state" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#ef2950" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </div>
      ) : (
        <DirectoryHero activeView={activeView} leads={leads} locale={locale} />
      )}

      <Panel title={directoryTitle} action={`${leads.length} ${text.panels.prospects}`}>
        <div className="grid gap-0 border border-black/10 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} locale={locale} onOpen={() => onOpenLead(lead.id)} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DirectoryHero({ activeView, leads, locale }: { activeView: DashboardViewKey; leads: DashboardLead[]; locale: Locale }) {
  const isZh = locale === "zh";
  const copy = {
    museums: {
      title: isZh ? "博物馆文创采购机会" : "Museum Retail Opportunities",
      body: isZh
        ? "聚焦馆藏主题、礼品商店、展览周边和文化叙事商品。"
        : "Focused on collection themes, museum stores, exhibition merchandise, and cultural storytelling products.",
      color: "bg-[#ef2950]",
      icon: Landmark,
    },
    universities: {
      title: isZh ? "大学校园商店与校友礼品" : "Campus Store & Alumni Gifting",
      body: isZh
        ? "面向校园书店、校友活动、招生礼品和校庆纪念品。"
        : "For campus bookstores, alumni events, admissions gifts, and school-spirit merchandise.",
      color: "bg-[#00a6a6]",
      icon: University,
    },
    corporate: {
      title: isZh ? "企业高端礼品与品牌合作" : "Corporate Premium Gifting",
      body: isZh
        ? "服务 HR、员工体验、市场活动、客户答谢和品牌联名。"
        : "For HR, employee experience, marketing events, client appreciation, and brand collaborations.",
      color: "bg-[#7c3aed]",
      icon: Sparkles,
    },
    leadMap: {
      title: isZh ? "客户地图" : "Lead Map",
      body: isZh ? "按地域和分数查看客户密度。" : "View lead density by geography and score.",
      color: "bg-[#ffbe0b]",
      icon: MapPin,
    },
    procurement: {
      title: isZh ? "采购页面" : "Procurement Page",
      body: "",
      color: "bg-[#ffbe0b]",
      icon: PackageSearch,
    },
    aiDrafts: {
      title: isZh ? "AI 邮件草稿" : "AI Email Drafts",
      body: "",
      color: "bg-[#00a6a6]",
      icon: Wand2,
    },
    opportunities: {
      title: isZh ? "成交机会" : "Deal Opportunities",
      body: "",
      color: "bg-[#ef2950]",
      icon: TrendingUp,
    },
  }[activeView];
  const Icon = copy.icon;
  const topLead = [...leads].sort((a, b) => b.score - a.score)[0];

  return (
    <section className="grid border-2 border-black bg-white lg:grid-cols-[1fr_280px]">
      <div className="p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">Auctus Lab</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{copy.title}</h2>
        <p className="mt-3 max-w-3xl text-neutral-600">{copy.body}</p>
      </div>
      <div className={`flex flex-col justify-between border-l-2 border-black p-6 text-white ${copy.color}`}>
        <Icon className="h-12 w-12" />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]">{isZh ? "最高分客户" : "Top Lead"}</p>
          <p className="mt-2 text-2xl font-black">{topLead ? `${topLead.name} / ${topLead.score}` : "-"}</p>
        </div>
      </div>
    </section>
  );
}

function ProcurementView({ locale }: { locale: Locale }) {
  const isZh = locale === "zh";
  const packages = [
    [isZh ? "博物馆礼品店定制" : "Museum Store Custom Order", isZh ? "馆藏主题、展览周边、小批量文创商品" : "Collection themes, exhibition merch, small-batch cultural goods"],
    [isZh ? "企业高端礼盒" : "Corporate Premium Gift Box", isZh ? "客户答谢、员工体验、品牌联名" : "Client appreciation, employee experience, brand collaboration"],
    [isZh ? "校园/旅游纪念品" : "Campus / Tourism Souvenirs", isZh ? "校友活动、景区地标、游客零售" : "Alumni events, landmark tourism, visitor retail"],
  ];

  return (
    <div className="grid gap-6">
      <section className="grid border-2 border-black bg-white xl:grid-cols-[1fr_420px]">
        <div className="p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">Auctus Lab Order Desk</p>
          <h2 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            {isZh ? "给客户下单与询价的采购入口" : "Client Ordering & Procurement Intake"}
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
            {isZh
              ? "这个页面不是我们找供应商，而是让博物馆、大学、文旅公司和企业客户向 Auctus Lab 提交定制需求、预算、数量和交期。"
              : "This page is for museums, universities, tourism groups, and corporate clients to submit custom order requirements, budgets, quantities, and timelines to Auctus Lab."}
          </p>
        </div>
        <form className="grid gap-4 border-l-2 border-black bg-[#fbfaf7] p-6">
          <input className="h-12 border-2 border-black px-3 font-semibold" placeholder={isZh ? "机构名称" : "Institution name"} />
          <input className="h-12 border-2 border-black px-3 font-semibold" placeholder={isZh ? "联系人邮箱" : "Contact email"} />
          <select className="h-12 border-2 border-black px-3 font-semibold">
            <option>{isZh ? "地标冰淇淋模具" : "Landmark ice cream molds"}</option>
            <option>{isZh ? "艺术徽章 / 钥匙扣" : "Art pins / keychains"}</option>
            <option>{isZh ? "企业礼盒" : "Corporate gift box"}</option>
          </select>
          <textarea className="min-h-28 border-2 border-black p-3 font-semibold" placeholder={isZh ? "定制需求、数量、预算、交期" : "Requirements, quantity, budget, timeline"} />
          <button className="h-12 border-2 border-black bg-[#ef2950] font-black text-white">
            {isZh ? "保存采购询价" : "Save Procurement Request"}
          </button>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {packages.map(([title, body], index) => (
          <div key={title} className="border-2 border-black bg-white p-5">
            <div className={["bg-[#ef2950]", "bg-[#00a6a6]", "bg-[#ffbe0b]"][index] + " mb-5 h-4 w-24"} />
            <h3 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
            <p className="mt-3 leading-7 text-neutral-600">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailDraftLibrary({
  leads,
  locale,
  onOpenLead,
}: {
  leads: DashboardLead[];
  locale: Locale;
  onOpenLead: (leadId: string) => void;
}) {
  const isZh = locale === "zh";
  return (
    <div className="grid gap-6">
      <section className="border-2 border-black bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">{isZh ? "人工审核发送" : "Human-reviewed sending"}</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{isZh ? "邮件沟通模板库" : "Email Communication Template Library"}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
          {isZh
            ? "这里管理博物馆、大学、企业和动物园/水族馆不同语气的邮件草稿。系统只生成草稿，不自动群发。"
            : "Manage museum, university, corporate, and zoo/aquarium email drafts. The system creates drafts only and never mass-sends automatically."}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {leads.map((lead) => {
          const draft = buildEmailDraft(lead, locale);
          return (
            <article key={lead.id} className="border-2 border-black bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: categoryColors[lead.category] }}>
                    {categoryLabels[locale][lead.category]}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{lead.name}</h3>
                </div>
                <button onClick={() => onOpenLead(lead.id)} className="border-2 border-black bg-[#ffbe0b] px-3 py-2 text-sm font-black">
                  {isZh ? "编辑" : "Edit"}
                </button>
              </div>
              <div className="mt-5 border-2 border-black bg-[#fbfaf7] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{isZh ? "主题" : "Subject"}</p>
                <p className="mt-2 font-semibold">{draft.subject}</p>
              </div>
              <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-neutral-600">{draft.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OpportunityDealBoard({
  leads,
  locale,
  onOpenLead,
}: {
  leads: DashboardLead[];
  locale: Locale;
  onOpenLead: (leadId: string) => void;
}) {
  const isZh = locale === "zh";
  return (
    <div className="grid gap-6">
      <section className="border-2 border-black bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">{isZh ? "人工修正成交机会" : "Manually Adjust Deal Potential"}</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{isZh ? "文旅公司成交机会大小" : "Deal Opportunity Sizing"}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
          {isZh
            ? "这里不是自动结论，而是给你根据真实沟通、预算、采购周期和产品匹配度手动修正成交机会。"
            : "This is not an automatic final answer. It lets you adjust opportunity size based on real conversations, budget, procurement timeline, and product fit."}
        </p>
      </section>

      <div className="grid gap-4">
        {leads.map((lead) => (
          <article key={lead.id} className="grid border-2 border-black bg-white lg:grid-cols-[1fr_180px_180px_140px]">
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: categoryColors[lead.category] }}>
                {categoryLabels[locale][lead.category]}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{lead.name}</h3>
              <p className="mt-2 text-sm text-neutral-600">{lead.productIdea}</p>
            </div>
            <EditableDealField label={isZh ? "预计金额" : "Value"} value={lead.score >= 90 ? "$25k" : "$8k"} />
            <EditableDealField label={isZh ? "成交概率" : "Probability"} value={`${Math.min(90, lead.score - 5)}%`} />
            <div className="flex items-center justify-center border-l-2 border-black p-4">
              <button onClick={() => onOpenLead(lead.id)} className="border-b-2 border-black font-black">
                {isZh ? "修正" : "Adjust"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EditableDealField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 border-l-2 border-black p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <input defaultValue={value} className="h-10 border-2 border-black px-2 text-lg font-black outline-none" />
    </label>
  );
}

function MetricTile({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="group grid min-h-44 grid-cols-[1fr_96px] border-2 border-black bg-white">
      <div className="p-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
        <div className="mt-6 text-6xl font-black leading-none tracking-[-0.05em]">{value}</div>
      </div>
      <div className={`flex items-center justify-center border-l-2 border-black ${color}`}>
        <Icon className="h-10 w-10 text-white" />
      </div>
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/20 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
        <span className="text-3xl font-semibold">-</span>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  locale,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  locale: Locale;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-lg font-semibold">
      {label}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none border-2 border-black bg-white px-4 pr-10 text-base font-semibold outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {categoryLabels[locale][option] ??
                statusLabels[locale][option as ContactStatus] ??
                discoveryPhaseLabels[locale][option as DiscoveryPhase] ??
                option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5" />
      </div>
    </label>
  );
}

function ProductCategoryCard({
  title,
  subtitle,
  accent,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  accent: string;
  icon: LucideIcon;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-4">
      <div className={`flex aspect-square items-center justify-center bg-gradient-to-br ${accent}`}>
        <Icon className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-semibold tracking-[-0.02em] underline decoration-2 underline-offset-4">{title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return (
    <section className="border-2 border-black bg-white">
      <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
        {action ? <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">{action}</span> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function MuseumMap({
  leads,
  stateDensity,
  locale,
}: {
  leads: DashboardLead[];
  stateDensity: Array<{ state: string; leads: number; averageScore: number }>;
  locale: Locale;
}) {
  const text = ui[locale];
  const statePositions: Record<string, { left: string; top: string }> = {
    CA: { left: "14%", top: "56%" },
    WA: { left: "18%", top: "18%" },
    AZ: { left: "28%", top: "67%" },
    TX: { left: "52%", top: "74%" },
    MA: { left: "88%", top: "30%" },
    NY: { left: "84%", top: "39%" },
  };

  return (
    <Panel title={text.panels.heatmap} action={text.panels.mapAction}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative min-h-[560px] overflow-hidden bg-[#f4efe7]">
          <div className="absolute left-8 top-8 z-10 max-w-sm bg-white/90 p-4 shadow-[8px_8px_0_#111]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef2950]">{text.panels.mapEyebrow}</p>
            <p className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em]">{text.panels.mapTitle}</p>
          </div>

          <div className="absolute inset-x-[8%] top-[18%] h-[68%] rounded-[50%] border-2 border-black/20 bg-white" />
          <div className="absolute left-[18%] top-[29%] h-[44%] w-[64%] rounded-[48%] border-2 border-black/20 bg-[#e8dfd1]" />
          <div className="absolute left-[31%] top-[38%] h-[24%] w-[36%] rounded-[48%] bg-[#d7eef0]" />

          {stateDensity.map((state, index) => {
            const position = statePositions[state.state];
            if (!position) return null;
            const size = Math.max(60, Math.min(150, 42 + state.leads * 24 + (state.averageScore - 70)));
            const colors = ["#ef2950", "#00a6a6", "#ffbe0b", "#7c3aed", "#fb5607"];
            return (
              <div
                key={state.state}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-lg font-black text-white shadow-[10px_10px_0_rgba(0,0,0,0.18)]"
                style={{ left: position.left, top: position.top, width: size, height: size, background: colors[index % colors.length] }}
                title={`${state.state}: ${state.leads} leads, avg score ${state.averageScore}`}
              >
                {state.state}
              </div>
            );
          })}

          {leads.map((lead) => {
            const position = statePositions[lead.state];
            if (!position) return null;
            return (
              <span
                key={lead.id}
                className="absolute h-4 w-4 rounded-full border-2 border-black bg-white"
                style={{
                  left: `calc(${position.left} + ${(lead.longitude % 4) * 5}px)`,
                  top: `calc(${position.top} + ${(lead.latitude % 4) * 5}px)`,
                }}
                title={`${lead.name}: ${lead.score}`}
              />
            );
          })}
        </div>

        <div className="border-l-2 border-black bg-white">
          {stateDensity.map((state) => (
            <div key={state.state} className="border-b border-black/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black">{state.state}</span>
                <span className="text-sm font-bold text-[#ef2950]">{state.averageScore} {text.panels.avg}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-500">{state.leads} {text.panels.qualified}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function LeadCard({ lead, locale, onOpen }: { lead: DashboardLead; locale: Locale; onOpen: () => void }) {
  const text = ui[locale];
  return (
    <article className="min-h-[360px] border-b border-r border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: categoryColors[lead.category] }}>
          {categoryLabels[locale][lead.category]}
        </span>
        <span className={`border px-2 py-1 text-xs font-bold ${contactStatusStyles[lead.contactStatus]}`}>
          {statusLabels[locale][lead.contactStatus]}
        </span>
      </div>

      <div className="mt-8 flex min-h-24 items-center justify-center bg-[#fbfaf7]">
        <VisualMotif category={lead.category} />
      </div>

      <h3 className="mt-6 text-2xl font-semibold leading-tight tracking-[-0.03em]">{lead.name}</h3>
      <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
        <MapPin className="h-4 w-4" />
        {lead.city}, {lead.state}
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-600">{lead.theme}</p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{text.card.productIdea}</p>
          <p className="mt-1 font-semibold">{lead.productIdea}</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black leading-none tracking-[-0.06em]">{lead.score}</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef2950]">{text.card.score}</p>
        </div>
      </div>

      <button onClick={onOpen} className="mt-6 flex items-center gap-2 border-b-2 border-black text-sm font-bold">
        {text.card.open} <ArrowUpRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function LeadDetailDrawer({
  lead,
  locale,
  onClose,
  onStageChange,
}: {
  lead: DashboardLead;
  locale: Locale;
  onClose: () => void;
  onStageChange: (stage: PipelineStage) => void;
}) {
  const text = ui[locale];
  const draft = buildEmailDraft(lead, locale);

  return (
    <div className="fixed inset-0 z-50 bg-black/45">
      <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l-2 border-black bg-[#fbfaf7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b-2 border-black bg-white p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef2950]">{text.detail.title}</p>
            <h2 className="mt-2 text-4xl font-semibold leading-tight tracking-[-0.04em]">{lead.name}</h2>
            <p className="mt-2 text-neutral-600">
              {lead.city}, {lead.state} / {categoryLabels[locale][lead.category]}
            </p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label={text.detail.score} value={lead.score.toString()} color="bg-[#ef2950]" />
            <MiniStat label={text.detail.contact} value={statusLabels[locale][lead.contactStatus]} color="bg-[#00a6a6]" />
            <MiniStat label={text.detail.stage} value={stageLabels[locale][lead.pipelineStage]} color="bg-[#ffbe0b]" />
          </div>

          <Panel title={text.detail.crm}>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {pipelineStages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => onStageChange(stage)}
                  className={`flex items-center justify-between border-2 border-black px-3 py-2 text-left font-semibold ${
                    lead.pipelineStage === stage ? "bg-[#ef2950] text-white" : "bg-white"
                  }`}
                >
                  {stageLabels[locale][stage]}
                  {lead.pipelineStage === stage ? <CheckCircle2 className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={text.detail.signals}>
            <div className="grid gap-4 p-5">
              <InfoRow label={text.detail.theme} value={lead.theme} />
              <InfoRow label={text.detail.targetContact} value={lead.decisionMaker ?? text.detail.researchNeeded} />
              <InfoRow label={text.detail.recommendedProduct} value={lead.productIdea} />
              {lead.seed ? (
                <div className="grid gap-3 border-2 border-black bg-white p-4 md:grid-cols-2">
                  <InfoRow label={locale === "zh" ? "正确商业邮箱" : "Business Email"} value={lead.seed.correct_business_email ?? lead.seed.general_email ?? text.detail.missing} />
                  <InfoRow label={locale === "zh" ? "零售联系人" : "Retail Contact"} value={[lead.seed.retail_contact_name, lead.seed.retail_contact_title].filter(Boolean).join(" / ") || text.detail.researchNeeded} />
                  <InfoRow label={locale === "zh" ? "零售邮箱" : "Retail Email"} value={lead.seed.retail_contact_email ?? text.detail.researchNeeded} />
                  <InfoRow label={locale === "zh" ? "采购邮箱" : "Procurement Email"} value={lead.seed.procurement_contact_email ?? text.detail.researchNeeded} />
                  <InfoRow label={locale === "zh" ? "数据来源" : "Source Type"} value={lead.seed.source_type.replaceAll("_", " ")} />
                  <InfoRow label={locale === "zh" ? "外联状态" : "Outreach Status"} value={lead.seed.outreach_status.replaceAll("_", " ")} />
                </div>
              ) : null}
              <div className="grid gap-2">
                {lead.notes.map((note) => (
                  <div key={note} className="border-l-4 border-[#ffbe0b] bg-white p-3 text-sm font-semibold">
                    {note}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <ExternalLinkButton label={text.detail.website} href={lead.websiteUrl} missingLabel={text.detail.missing} />
                <ExternalLinkButton label={text.detail.giftShop} href={lead.giftShopUrl} missingLabel={text.detail.missing} />
                <ExternalLinkButton label={text.detail.vendor} href={lead.vendorUrl} missingLabel={text.detail.missing} />
                <ExternalLinkButton label={text.detail.wholesale} href={lead.wholesaleUrl} missingLabel={text.detail.missing} />
                <ExternalLinkButton label={locale === "zh" ? "来源" : "Source"} href={lead.seed?.source_url} missingLabel={text.detail.missing} />
              </div>
            </div>
          </Panel>

          <Panel title={text.detail.draft} action={text.detail.humanReview}>
            <div className="grid gap-4 p-5">
              <div className="border-2 border-black bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{text.detail.subject}</p>
                <p className="mt-2 text-xl font-semibold">{draft.subject}</p>
              </div>
              <textarea className="min-h-64 border-2 border-black bg-white p-4 text-sm leading-6 outline-none" defaultValue={draft.body} />
              <button className="flex h-12 items-center justify-center gap-2 border-2 border-black bg-[#00a6a6] font-black text-white">
                <Wand2 className="h-5 w-5" />
                {text.detail.saveDraft}
              </button>
            </div>
          </Panel>
        </div>
      </aside>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border-2 border-black bg-white">
      <div className={`h-3 ${color}`} />
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
        <p className="mt-2 text-2xl font-black leading-tight">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ExternalLinkButton({ label, href, missingLabel }: { label: string; href?: string; missingLabel: string }) {
  if (!href) {
    return (
      <span className="border-2 border-neutral-300 px-3 py-2 text-sm font-bold text-neutral-400">
        {label}: {missingLabel}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-sm font-bold">
      {label}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

function VisualMotif({ category }: { category: LeadCategory }) {
  if (category === "University") return <University className="h-16 w-16 text-[#00a6a6]" />;
  if (category === "Corporate") return <Sparkles className="h-16 w-16 text-[#7c3aed]" />;
  if (category === "Zoo/Aquarium") return <Palette className="h-16 w-16 text-[#f2b705]" />;
  if (category === "Attraction") return <MapPin className="h-16 w-16 text-[#fb5607]" />;
  return <Landmark className="h-16 w-16 text-[#ef2950]" />;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function createPreviewLead(url: string, category: LeadCategory, locale: Locale): DashboardLead {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const prettyName = host
    .split(".")[0]
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const isZh = locale === "zh";

  return {
    id: `local-${Date.now()}`,
    name: prettyName,
    category,
    state: "NA",
    city: isZh ? "待调研" : "Research",
    score: 61,
    contactStatus: "Missing",
    pipelineStage: "Not Contacted",
    decisionMaker: isZh ? "需要补充零售 / 采购联系人" : "Retail / procurement contact needed",
    websiteUrl: url,
    theme: isZh
      ? "新添加的官网。启动后端爬虫后，可发现礼品商店、采购、批发和联系人信号。"
      : "Newly added homepage. Run backend crawler to discover gift shop, vendor, wholesale, and contact signals.",
    productIdea:
      category === "Corporate"
        ? isZh
          ? "高端企业文化礼盒"
          : "Executive cultural gift box"
        : isZh
          ? "定制文化文创商品系列"
          : "Custom cultural merchandise capsule",
    latitude: 39,
    longitude: -98,
    notes: isZh
      ? ["本地预览线索", "后端爬虫尚未连接", "可进入人工富集审核"]
      : ["Local preview lead", "Backend crawler not connected yet", "Ready for enrichment review"],
  };
}

function localDiscoveryTargets(phase: DiscoveryPhase): Array<{ homepage_url: string; category: LeadCategory; source: string }> {
  const targets: Record<DiscoveryPhase, Array<{ homepage_url: string; category: LeadCategory; source: string }>> = {
    museums: [
      { homepage_url: "https://asianart.org", category: "Museum", source: "curated seed" },
      { homepage_url: "https://www.metmuseum.org", category: "Museum", source: "curated seed" },
      { homepage_url: "https://www.pem.org", category: "Museum", source: "curated seed" },
      { homepage_url: "https://www.fieldmuseum.org", category: "Museum", source: "curated seed" },
    ],
    universities: [
      { homepage_url: "https://www.ubookstore.com", category: "University", source: "campus store seed" },
      { homepage_url: "https://shop.uclastore.com", category: "University", source: "campus store seed" },
      { homepage_url: "https://www.thecoop.com", category: "University", source: "campus store seed" },
    ],
    attractions: [
      { homepage_url: "https://www.grandcanyon.org", category: "Attraction", source: "tourism seed" },
      { homepage_url: "https://www.montereybayaquarium.org", category: "Zoo/Aquarium", source: "tourism seed" },
      { homepage_url: "https://www.sdzsafaripark.org", category: "Zoo/Aquarium", source: "tourism seed" },
    ],
    corporate: [
      { homepage_url: "https://www.marriott.com", category: "Corporate", source: "corporate seed" },
      { homepage_url: "https://www.hyatt.com", category: "Corporate", source: "corporate seed" },
      { homepage_url: "https://www.salesforce.com", category: "Corporate", source: "corporate seed" },
    ],
    schools: [
      { homepage_url: "https://www.nais.org", category: "University", source: "school network seed" },
      { homepage_url: "https://www.acsi.org", category: "University", source: "school network seed" },
    ],
  };
  return targets[phase];
}

function buildEmailDraft(lead: DashboardLead, locale: Locale) {
  if (locale === "zh") {
    return {
      subject: `给 ${lead.name} 的定制${lead.productIdea}合作想法`,
      body: `您好，${lead.decisionMaker ?? "团队"}：\n\n我注意到 ${lead.name} 与「${lead.theme}」高度相关。Auctus Lab 专注于把地标、馆藏、展览主题和访客故事转化为高端、可零售的文化文创产品。\n\n针对贵机构的受众，我认为「${lead.productIdea}」可以成为一个有故事感的礼品商店、活动或合作商品方向，比常规纪念品更具视觉识别度和传播性。\n\n如果方便的话，我们是否可以安排一次简短沟通，看看是否适合为贵机构设计一个小批量定制系列？\n\n祝好，\n[Your Name]`,
    };
  }
  return {
    subject: `Custom ${lead.productIdea} idea for ${lead.name}`,
    body: `Hi ${lead.decisionMaker ?? "team"},\n\nI noticed ${lead.name}'s connection to ${lead.theme}. Our studio creates premium cultural merchandise concepts that translate landmarks, collections, and visitor stories into retail-ready products.\n\nFor your audience, I think a ${lead.productIdea.toLowerCase()} could work well as a distinctive gift shop or partnership item with stronger storytelling than standard souvenir inventory.\n\nWould it be worth a short conversation to see whether a small custom capsule could fit an upcoming retail, event, or engagement priority?\n\nBest,\n[Your Name]`,
  };
}
