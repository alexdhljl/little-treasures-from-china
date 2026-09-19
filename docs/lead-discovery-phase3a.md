# Phase 3A — Sales Lead List MVP Foundation

日期：2026-09-18（America/New_York）。分支：`codex/lead-discovery-recovery`。

## 交付范围与结论

本阶段实现机构名单的持久化、导入、确定性去重、人工审核、唯一销售分配和 Excel CSV 导出。业务顺序为 **Institution Discovery > Contact Enrichment > CRM Automation**。

这是名单基础能力交付，不是已发现 500–1,000 个真实新客户的交付。只有原始 100 条 seed 被用于兼容性和浏览器验证；500 / 2,000 条容量测试均为临时数据库中的测试 fixture，未混入实际销售名单。没有真实搜索、客户网站爬取、付费 API、邮件、部署或 push。仅查阅公开官方文档以准备 Phase 3B API Gate。

- 原 Dashboard：`http://localhost:3000/lead-discovery`
- 新名单：`http://localhost:3000/lead-discovery/sales`
- 商城：`http://localhost:3000/en`
- API 文档：`http://127.0.0.1:8000/docs`
- 默认持久化：`backend/data/sales-leads.sqlite3`；可用 `SALES_LEADS_DB` 指定隔离库。
- 新名单与旧 Dashboard/crawl JSON 没有自动双向同步。显式“导入原有 100 条 seed”或 CSV 导入后进入待审核区。没有自动批准 seed。

## 修改文件与职责

| 文件 | 变化 |
| --- | --- |
| `.gitignore` | 仅放行新增离线测试文件；继续忽略数据库、.venv、备份、运行日志 |
| `backend/app/main.py` | 注册新 sales-leads router |
| `backend/app/api/sales_leads.py` | 名单、导入、分页、审核、分配、CSV API |
| `backend/app/services/institution_normalization.py` | 域名、网站、名称地区规范化 |
| `backend/app/services/sales_lead_model.py` | 机构字段、seed adapter、最低准入条件 |
| `backend/app/services/sales_lead_repository.py` | SQLite 事务、身份索引、重复证据、分配、版本冲突 |
| `backend/app/services/sales_lead_csv.py` | CSV 完整记录解析、Excel BOM、公式注入防护 |
| `backend/app/services/scraper_engine.py` | 移除根据域名生成虚假联系人的逻辑 |
| `backend/app/services/lead_scoring_engine.py` | 修复非空联系人触发的缺失 regex import；未改评分权重 |
| `backend/app/api/leads.py` | 取消 heuristic Verified，保存已抽取公开联系方式；历史列表标签降为 Unverified |
| `backend/tests/test_sales_foundation.py` | 新增 12 项离线后端测试 |
| `frontend/app/lead-discovery/sales/page.tsx` | 新增独立路由，noindex |
| `frontend/components/lead-discovery/SalesLeadList.tsx` | 最小表格、导入导出、审核、分配、备注状态 |
| `frontend/components/lead-discovery/DashboardView.tsx` | 保留布局；增加名单入口，修正验证语义 |
| `frontend/components/DashboardView.tsx` | 同步旧副本的验证语义，防止旧入口误标 |
| `frontend/data/lead-discovery/seed-leads.ts`、`frontend/data/seed-leads.ts` | 联系状态由 Verified 改为 Unverified；没有改写 seed 机构数据 |
| `frontend/lib/lead-discovery/csv.ts` | 旧 CLI 的完整 CSV parser 与保守去重 |
| `frontend/scripts/discover-leads.ts` | 修复按行拆 CSV，重复导入幂等，保存重复原因 |
| `frontend/tests/lead-discovery-csv.test.ts` | 新增 5 项前端/CLI 回归测试 |
| `docs/lead-discovery-phase3a.md` | 本报告与 Phase 3B Gate |

无需新依赖。SQLite 使用 Python 标准库；现有 backend/.venv、requirements、商城数据库及商城页面源码未改。

## 数据模型与保存语义

| 字段 | 类型与说明 |
| --- | --- |
| `id` | 服务端 UUID，稳定；CSV 不能覆盖已有 ID |
| `institution_name`, `institution_type` | 可空字符串，类型词表 22 项，同时允许未来新类型 |
| `website`, `domain` | HTTP(S) 候选官网与规范化 host；保存域名不等于验证官网 |
| `city`, `state`, `country` | 可空地区；正式池至少有 city 或 state |
| `phone`, `email`, `contact_page` | 可空公开联系方式；没有 source_url/contact_page 时丢弃输入 email/phone |
| `source_url`, `source_type` | 来源；受信任类型如 government/open_data/public_directory/official_website/manual_public_source |
| `founded_year`, `opened_year` | 可空年份；没有“五年”过滤器 |
| `sales_signal`, `reason_to_contact` | 可空文本；不自动提取，不冒充已证实的机会 |
| `assigned_salesperson` | 一个机构一个 owner；由分配事务写入，导入不能抢占或重置 |
| `status`, `notes` | new/reviewing/ready/contacted/follow_up/qualified/disqualified/archived；备注可空 |
| `created_at`, `updated_at` | 服务端 UTC 时间；普通重复导入不改创建时间 |
| `review_status` | pending/approved；所有新导入强制 pending |
| `revision` | 乐观锁版本，过期编辑返回 409 |
| `missing_requirements`, `pool_ready`, `contact_verification` | API 派生字段，区分缺字段、机构人工审核、联系方式未核验 |

`institutions` 保存机构 JSON payload，并单独索引 owner/review/status；`identities` 索引规范化身份；`duplicate_events` 保存原输入、匹配机构、原因、是否需要审核和时间。数据库为运行数据，明确不进入 Git；源代码受版本控制。备份本地名单时需另外备份 SQLite，Git 不能替代数据备份。

正式可分配条件：**名称 + city/state + 候选官网或可信来源 + 人工批准 + 非 archived/disqualified**。没有邮箱、没有联系人不影响进入正式池。审核按钮明确表示人工核对机构来源，不会自动核验网站、邮箱归属或邮箱可投递性。

新名单默认不继承旧评分的“缺联系人扣分/阻塞”行为。旧 Score 保留给历史 Dashboard 参考，不用于阻挡新机构池，也未实现 AI Scoring。

## CSV 与去重修复

旧 parser 用换行切记录；seed 的邮件草稿含多行，因此一条机构被拆成多条。现改为完整 quoted CSV 解析，支持 CRLF、内嵌换行、逗号、双引号及 BOM。原始 CSV/JSON 文件未重写。

后端 CSV 最多 10,000 条/次、10,000,000 字符；先完整校验，再一个事务提交，失败整体回滚。旧 CLI 仅作 staging，不是正式销售池：在当前 cwd 的 `data/imported-leads.json` 中保存唯一记录，并写 `data/import-duplicates.json`。测试在系统临时目录运行 CLI，不覆盖原 seed。

匹配顺序以 domain、website、name+location 为基础：

1. HTTP/HTTPS、www、域名大小写、末尾斜线/点、默认端口统一；去 fragment 和常见 tracking query。保留有意义的 URL path/query 与路径大小写。
2. 名称做 Unicode NFKC/casefold、空白折叠、常见标点处理；name+city+state 提供后备键（已知 country 冲突另留待审核）。支持 US/USA，以及首批 NY/NJ/CT 州名别名。其他地区别名、同义机构名、重定向与 parent/branch 关系暂未实现。
3. 保存 `same_domain` / `same_website` / `same_name_location`，旧 staging 的共享域名另标 `same_domain_shared_host_review`。
4. 同一机构重复导入补空字段，不覆盖已有 owner、审核、状态或非空备注。共享域名时 exact page/name+location 可优先识别相应分支。
5. 原 seed 中 City Experiences 的两个景点、bkstr.com 的三个大学书店共用域名，但路径与机构身份不同。保留为不同 pending 候选并保存域名冲突证据；100 条仍是 100 条。不同身份却指向同一页面的冲突只保留原输入证据，不静默覆盖原机构。

仍需人工判断同名改址、改名、集团下属场馆、重复官网等模糊情况。共享域名不是自动认定不同机构的证据，只是避免数据丢失的候选保留规则；批准前必须审核。

CSV 导出包含全部要求字段，Founded Year / Opened Year 分列，并增加 ID、Domain、时间及审核状态。UTF-8 BOM + CRLF 帮助 Excel 识别中文；公式开头单元格加单引号；本系统重导入可还原。电话与公式安全测试通过，但没有在桌面 Excel 中逐格测试导入向导。Excel 可能自行格式化电话，建议按文本列打开。

重导入原库保持 owner/ID/审核/状态；导入一个全新库则重新生成 ID，并强制 pending/unassigned，防止 CSV 宣称“已验证”直接变成事实。当前导出按 owner 筛选或导出全部，页面名称搜索不缩小导出范围，界面有说明。

## 虚假数据与 Verified

`enrich_contacts_mock` 为兼容旧调用保留函数名，已改成只返回现有公开抽取联系人；空输入返回空。不再从域名制造邮箱/头衔。输入匹配历史 `partnerships+[8 hex]@...` 模式的邮箱会置空。公开来源 URL 只是追溯入口，本阶段不访问它来断言联系信息真实。

已保存机构 ≠ 人工确认机构官网 ≠ Contact verified。seed/抓取结果的联系状态改为 Unverified；历史 API 列表的旧 Verified 标记也不再当作已验证。daily verified 计数不再使用 confidence 阈值，仅接受明确的 reviewer marker；本阶段没有生成该 marker 的功能。

历史 runtime JSON 不做破坏性重写；旧 CRM/邮件草稿等不属于新销售名单流程。没有实施完整多联系人实体、email enrichment、LLM 或 CRM 集成。

## API 与本地操作

所有新接口前缀 `/api/v1/sales-leads`：

| 方法/后缀 | 功能 |
| --- | --- |
| GET `/`（实际无尾斜线） | limit 1–500、offset、query、assigned_salesperson、review_status |
| GET `/metadata` | 22 种类型、15 种优先信号、external_discovery_enabled=false |
| POST `/import/seeds` | 显式读取现有 100 条 seed，无外网请求 |
| POST `/import/csv` | `{content: CSV文本}` |
| POST `/import/records` | `{records: InstitutionLeadInput[]}` |
| GET `/duplicates` | 分页查看重复输入证据 |
| PATCH `/{id}` | revision + 审核/状态/备注/联系理由 |
| POST `/assign` | salespeople + target_per_person，事务分配 |
| GET `/export.csv` | 全部或指定销售，CSV 下载 |

销售名规范化大小写/空白/标点，同名不会建立第二个 owner。分配先计算已有数量，再按欠额填充批准且未分配的机构；现有 owner 不被覆盖。只有 100 条时不会复制成 500 条，返回每人 shortfall。并发操作受 SQLite 写事务保护。

```powershell
# 在 backend/，只用现有 .venv
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# 在 frontend/
npm run dev -- --port 3000
```

本轮启动时搜索与 LLM key 均置空。该 MVP 为本地可信操作环境，没有增加登录、团队权限或公网防护；不能据此直接开放公网。完整数据纠错、冲突人工合并/拆分及复杂 owner 转移暂未实现；名称地区搜索扫描 JSON，SQLite 写入串行。已验证数千条本地基础操作，不宣称高并发/数万级生产 SLA。

## 测试与浏览器结果

执行命令：

```powershell
# backend/
.venv/Scripts/python.exe -B -m unittest discover -s tests -v
# frontend/
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

- 后端：17/17 通过（原 5 + 新 12）；测试拦截 outbound HTTP，使用临时 SQLite。
- 前端：26/26 通过（原 21，包括用户现有 product-images 测试 + 新 5）。
- 100 条多行 CSV 解析、CSV 导出→重导入、JSON seed 兼容、重复导入与稳定 ID 均通过。
- 覆盖三类重复原因、共享域名、空联系准入、无来源联系丢弃、synthetic 清理、Unverified、事务回滚、409、并发分配、持久化重开、owner CSV、22 类机构/15 类信号。
- 500 fixtures → 5 owners × 100，各机构唯一 owner，第二次分配为 0。25 条不足时并发分配合计 25，不复制。
- 2,000 fixtures 导入→重复导入→导出解析仍 2,000；不是发现了 2,000 个真实机构。
- 全项目 TypeScript：仅现有商城 `frontend/app/[locale]/[section]/page.tsx:159` 的 `siteConfig` 未定义错误；未修改该文件，不能宣称整个项目 typecheck/build 全绿。
- 浏览器用已安装 Playwright + Chrome，无新安装：新页加载、100 seed、重复导入、下载 BOM CSV 并重导入、审核 gate、分配、状态备注保存与刷新通过；本地新 API 均 200，pageerror 为 0。
- 原 Dashboard 100 条可显示，MoMA / Art Institute of Chicago / Getty 搜索并打开详情通过。
- 商城 `/en` 返回 200 且品牌内容存在。浏览器禁止外部请求，阻止了原商城的 Supabase 图片/分类请求，因此不是完整商城图片/远程数据验收；商城文件完整性单独用阶段前 SHA256 核对。
- 浏览器验证用 `_backups/lead-discovery-phase3a/browser-final.sqlite3` 隔离库，人工批准/备注只是测试状态。完成后后端切回默认库，不把这些测试审核复制进去。
- `git diff --check` 通过；.venv/SQLite/测试截图/日志/备份不纳入提交。没有安装软件。
- 阶段前 SHA256 对比：仅本阶段列出的 10 个已有源文件发生变化；原有 22 个商城修改未改变。提交 allowlist 共 21 文件；定向 secret pattern 扫描没有命中，配合 diff 人工检查；不是对外部凭证有效性的验证。
- 验证后默认本地 SQLite 已显式导入原 seed：100 条、100 pending、0 assigned；`/docs` 200。浏览器测试审核/备注未带入默认库。

本地证据：`_backups/lead-discovery-phase3a/` 中的测试日志、browser-results.json、截图、阶段前 hashes/status；均为 ignored 文件。

## Phase 3B 推荐批量发现架构（仅设计）

输入 `{geographies: [NY,NJ,CT], institution_types: [...], target_count: 500, source_budget, query_budget}`。

```text
Geography × Institution Type
    → 按地区/类别切分的 source adapters
    → 原始 Candidates（source ID / URL / fetched_at / license / batch ID）
    → 官网候选 + 地区/类型核对
    → Official Website Verification（保留依据与时间）
    → 当前 normalization + identities / 冲突审核
    → 人工确认符合 merchandise/IP 业务方向
    → Approved Lead Pool → Assignment → CSV
```

下一阶段需补充：batch_jobs/checkpoints、候选来源多条证据、verification_result/evidence/checked_at、可恢复队列、按 host 限速、超时/退避、失败和排除原因、预算硬上限。先做 50–100 条试批计算 yield，再按批准的预算扩展；不能把 500 条搜索结果计为 500 家去重且官网核实的机构。

任务状态 planned/discovering/verifying/review_required/completed/partial/failed。计数分别报告 raw_candidates、unique_candidates、verified_institutions、approved_pool、assigned、shortfall，防止数量虚高。source adapter 不能直接写 approved。

官网确认建议：优先政府/机构名录链接或 Wikidata/OSM website 候选，访问机构首页/About/Contact（Phase 3B 再授权执行），核对机构名称、地区、地址/电话及官方品牌内容；保留最终 URL、重定向、来源、检查时间和短证据。200 状态、HTTPS、网页标题或搜索第一名都不足以证明官方。平台上的分店/大学书店按具体 path 及机构地点审核。失效/停放/目录/售票代理/同名异地进入人工队列。访问需限制重定向、私网目标、大小、超时、速率，并遵守来源规则。

目标 universe 为模型中的 22 类，不局限 Museum。founded/opened 及 15 种近期信号不作为过滤条件；老机构扩建/新 IP 也保留。以后应给信号加独立 source_url、event_date、observed_at、证据与置信度，不能把新闻发布日期当成立年份。没有自动填虚假年份/信号。

## Phase 3B API Gate：来源、价格与限制

以下为 2026-09-18 查询官方文档所得；仅文档浏览，没有调用搜索/地点/客户数据 API。免费不代表无限请求或无需授权启动。

| 来源 | 适合场景 | Key / 费用 | 批量使用与局限 |
| --- | --- | --- | --- |
| Wikidata | 机构名称、类型、地区、候选官网、成立信息 | 公共读取无需付费 key；结构化数据 CC0 | 可小批 SPARQL / 公共数据；遵守 User-Agent、429/退避；大规模优先 dumps。覆盖和新项目时效不保证。[官方数据访问](https://www.wikidata.org/wiki/Wikidata:Data_access) |
| OSM extracts / Overpass | 地理范围内 museum/zoo/park/attraction/university 等 POI | 公共 Overpass 通常无需 key、无 API 费；自托管有资源成本 | 有界低频试批，持续业务应使用 extracts/自己的服务；公共实例不是免费生产后端。保留 ODbL 来源和相应署名/许可要求。[Overpass 资源政策](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)、[OSM 许可](https://www.openstreetmap.org/copyright) |
| 公共 Nominatim | 少量地址地理编码 | 无付费 key | 不用于系统性搜全某类 POI；公共服务限制最大 1 req/s，批量受限。[政策](https://operations.osmfoundation.org/policies/nominatim/) |
| NCES IPEDS | 大学/学院名录批量基础机构 | 公开下载 CSV，无搜索 key | 用官方完整数据文件；年份与字段需核验，不能把 enrollment 当游客或采购意向。[IPEDS 数据下载说明](https://nces.ed.gov/Ipeds/help/complete-data-files) |
| NPS | National Park Service 机构/公园/visitor 信息 | 免费注册 API key | 按官方分页/配额使用；并非所有州立/地方公园。[NPS 入门](https://www.nps.gov/subjects/developer/get-started.htm) |
| 政府文化/旅游目录、地方 DMO 公开名单 | 文化机构、景点与新旅游项目 | 部分免费/CSV，有的需申请 | 各源逐一确认许可、批量下载与更新频率，不能笼统假定所有网站允许抓取 |
| SerpAPI | 缺官网、长尾机构、新开业/扩建新闻的定向搜索补缺 | key；Free 250 searches/月；Starter $25/月 1,000；Developer $75/月 5,000 | 按订阅配额和吞吐批量；分别 50/200/1,000 searches/小时。一请求不等于一家有效机构；结果仍需核实。[官方价格](https://serpapi.com/pricing) |
| Google Custom Search JSON API | 仅现有客户可作过渡 Web search | key + engine ID；旧客户 100 queries/日免费，其后 $5/1,000 | 已关闭新客户注册；现有客户应在 2027-01-01 前迁移，不作为新系统默认方案。[官方说明](https://developers.google.com/custom-search/v1/overview) |
| Google Places API (New) | 地点候选及对照查询 | key + billing；按字段 SKU，有月度免费额度 | 不能把可访问等同于可永久入库/导出。缓存、存储及署名受限，place_id 有例外；不选作本 CSV/CRM 池的默认主源。[政策](https://developers.google.com/maps/documentation/places/web-service/policies) |
| Bing Search API（旧实现） | 不再适合新计划 | 已退役 | 2025-08-11 退役；现有代码中的 key 支持不表示今天可用。Grounding 不等价于可导出的批量搜索结果，不在本阶段引入。[Microsoft 公告](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement) |

### 1,000 个真实 Institution Leads 的 API 成本估算

以下是预算场景而非报价或产出保证；不含人工核验、工程、服务器、税费。假设先收集 **1,500–2,500 candidates**，经过重复、地区/类型错误、关闭/无效网站和不适合销售的筛除，留下 1,000。实际 yield 需 Phase 3B 试批测量；机构真实且有官网并不等于愿意采购。

| 方案 | 估算 API 费用 | 条件 |
| --- | --- | --- |
| 公开数据优先：Wikidata + OSM extract + IPEDS/政府目录 | **$0 API** | 在公共许可和配额内，官网通过公开来源+人工核对；可能需扩大地域/类别才能有 1,000 合格机构 |
| 免费数据 + 少量搜索补缺 | **$0 API** | 补缺最多 250 SerpAPI queries，且免费额度仍可用；缺口更大就停，不自动购买 |
| 免费数据 + 一批定向付费补缺 | **$25/月** | 当月补缺 ≤1,000 searches；按套餐实际收费，不能按 500 次折成 $12.50 |
| 搜索占比更高 / 新闻信号复核 | **$75/月** | 约 1,001–5,000 searches；超预算停止，不用付费 LLM |

建议为第一批 1,000 机构先设 **$0 API 预算**，免费批次后再看来源覆盖/核实通过率决定是否批准 $25–$75 搜索预算。这不是承诺三州内所有目标类型都能免费找到 1,000；如果只有 650，就报告 650 和具体缺口，不复制、不猜官网。

Google Places 仅作成本对照：Text Search Pro 当前免费 5,000 events/月，超额 $32/1,000；Place Details Enterprise 免费 1,000/月，超额 $20/1,000。websiteUri 属于 Enterprise 字段。[价格表](https://developers.google.com/maps/billing-and-pricing/pricing)、[字段计费](https://developers.google.com/maps/documentation/places/web-service/place-details)。例如 200 次 Pro 搜索 + 2,000 次 Enterprise 详情，在上述免费额度完全可用时约 $20；额度已耗尽则约 $46.40。**这不是可直接持久化导出 1,000 Leads 的推荐方案**，仍受 Places 内容使用限制，且最终合格率未知。

### 免费首批 500–1,000 是否可行

可以优先尝试，最有性价比的组合是 **Wikidata + OSM 区域 extracts + 官方行业/教育/旅游名录 → 官网人工核验 → 当前去重/审核池 → 分配/CSV**。这是一项基于来源能力的工程判断，本阶段没有下载实测数量。先 NY/NJ/CT × 全部合适机构类型；不足时明确报告，待批准后扩大范围或增加搜索预算。

进入 Phase 3B 前需要用户确认：首批地区/类型、可接受的数量不足处理、允许的免费数据源及官网访问范围、是否给 SerpAPI key 和具体美元/查询上限。本阶段到此停止；有免费额度也不自动启动真实搜索。
