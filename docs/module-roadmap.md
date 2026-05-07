# Contractor Pricing App Module Roadmap

## Product Positioning

Contractor Pricing App is a retail pricing intelligence tool for contractors. It helps a contractor enter real project cost, business setup, project risk, and market context, then recommends Good, Better, and Best selling prices with expected profit and margin.

This is not an Xactimate clone, insurance estimating platform, or full CRM. The first product should stay focused on pricing clarity.

## Core Pricing Formula

Margin is based on sale price, not cost.

```txt
sale price = cost / (1 - finalMargin)
profit = sale price - cost
margin = profit / sale price
```

Base margins:

| Option | Base Margin | Purpose |
| --- | ---: | --- |
| Good | 28% | Competitive price for cost-sensitive customers |
| Better | 35% | Recommended balanced price |
| Best | 42% | Premium price for higher-service positioning |

## Recommended Frontend Architecture

Keep the first version frontend-only with local React state. Do not add Supabase, auth, server actions, API routes, PDF generation, or payments until requested.

Recommended structure when the single-page prototype becomes too large:

```txt
app/
  page.tsx
components/
  app-sidebar.tsx
  page-header.tsx
  metric-card.tsx
  modules/
    dashboard-module.tsx
    pricing-calculator-module.tsx
    contractor-setup-module.tsx
    pricing-rules-module.tsx
    projects-module.tsx
    contacts-module.tsx
    quotes-module.tsx
lib/
  pricing/
    rules.ts
    calculator.ts
    types.ts
```

For now, keeping logic in `app/page.tsx` is acceptable while the MVP is small. Extract only when the file becomes hard to read.

## Domain Model Plan

These are frontend TypeScript shapes first. They can become database tables later.

```ts
type ContractorProfile = {
  businessName: string;
  trade: Trade;
  state: StateName;
  city: string;
  companyLevel: CompanyLevel;
  monthlyOverhead: number;
  minimumMargin: number;
  preferredMargin: number;
  premiumMargin: number;
  defaultRiskLevel: RiskLevel;
  defaultProjectSize: ProjectSize;
  financingFeeEnabled: boolean;
  taxEnabled: boolean;
};

type CostBreakdown = {
  materials: number;
  labor: number;
  dumpster: number;
  permit: number;
  subcontractor: number;
  equipment: number;
  miscellaneous: number;
};

type Project = {
  id: string;
  name: string;
  customerId?: string;
  address: string;
  trade: Trade;
  status: "draft" | "priced" | "sent" | "accepted" | "declined";
  costBreakdown: CostBreakdown;
  notes: string;
};

type Quote = {
  id: string;
  projectId: string;
  good: PricingResult;
  better: PricingResult;
  best: PricingResult;
  selectedOption?: "Good" | "Better" | "Best";
  status: "draft" | "sent" | "accepted" | "declined";
  createdAt: string;
  expiresAt?: string;
};
```

## Module Roadmap

### 1. Dashboard

Purpose: show a quick overview of pricing activity.

MVP features:

- Total quotes created
- Average margin
- Average profit
- Recent quotes
- Quick button: New Pricing
- Warning if margins are below the contractor minimum

Initial UI:

- Top metric cards
- Recent quote list
- Low-margin warning card
- Button that opens Pricing Calculator

Data source by phase:

- Phase 1: local mock data
- Phase 2: local quotes state
- Phase 4: database-backed reporting

### 2. Pricing Calculator

Purpose: core module of the app.

MVP features:

- Enter project cost
- Select trade
- Select state and later city
- Select company level
- Select project size
- Select risk level
- Calculate Good, Better, Best
- Show sale price, profit, and margin
- Show minimum safe price
- Show plain-English pricing insight

Important logic:

- Final margin equals base margin plus all adjustments
- Sale price must use `cost / (1 - finalMargin)`
- Minimum safe price should protect against contractor minimum margin

Initial UI:

- Pricing setup form
- Good, Better, Best cards
- Minimum safe price callout
- Pricing insight box

### 3. Contractor Setup

Purpose: each contractor configures their own pricing profile.

MVP features:

- Business name
- Trade
- State
- City
- Company level
- Monthly overhead
- Desired minimum margin
- Preferred margin
- Premium margin
- Default risk level
- Default project size
- Financing fee option
- Tax option

Initial UI:

- Clean profile form
- Margin preference section
- Defaults section
- Local-only note until persistence is added

### 4. Pricing Rules Engine

Purpose: store and apply pricing logic.

MVP features:

- Base margins
- State adjustments
- Trade adjustments
- Risk adjustments
- Project size adjustments
- Company level adjustments
- Overhead adjustment
- Minimum safe price logic
- Good, Better, Best logic

Recommended files later:

- `lib/pricing/types.ts`
- `lib/pricing/rules.ts`
- `lib/pricing/calculator.ts`

Do not overbuild this early. Start with plain objects and pure functions.

### 5. Contacts

Purpose: store customer information.

Features:

- Name
- Phone
- Email
- Address
- Notes
- Customer type
- Related projects

Phase 2 frontend-only scope:

- Contact list
- Contact detail panel
- Create/edit form using local state

### 6. Projects

Purpose: main job container.

Features:

- Project name
- Customer
- Project address
- Trade
- Status
- Photos later
- Cost breakdown
- Related quotes
- Notes

Phase 2 frontend-only scope:

- Project list
- Project detail screen or panel
- New project form
- Link project to pricing calculator

### 7. Cost Breakdown

Purpose: let the contractor enter real costs.

Features:

- Material cost
- Labor cost
- Dumpster
- Permit
- Subcontractor
- Equipment
- Miscellaneous
- Total real cost

UX rule:

- Cost breakdown total should feed directly into project cost in the Pricing Calculator.

### 8. Quotes

Purpose: save generated pricing options.

Features:

- Quote linked to project
- Good, Better, Best options
- Selected option
- Status: draft, sent, accepted, declined
- Profit
- Margin
- Created date
- Expiration date

Phase 2 frontend-only scope:

- Save quote to local state
- Quote list
- Quote detail summary
- Selected package indicator

### 9. Proposal Builder

Purpose: create client-facing proposal.

Features:

- Company logo
- Customer info
- Project address
- Scope of work
- Good, Better, Best packages
- Terms
- Warranty text
- Financing note
- Accept button later

Phase 3 scope:

- Editable proposal preview
- Package cards
- Terms and warranty blocks

### 10. PDF Generator

Purpose: export quote/proposal.

Features:

- Generate professional PDF
- Include Good, Better, Best
- Include pricing details
- Include company branding
- Include terms and conditions

Phase 3 note:

- Do not add PDF dependencies until the Proposal Builder is useful.
- Keep PDF styling aligned with the app: clean, premium, minimal.

### 11. Settings

Purpose: app-level configuration.

Features:

- Company profile
- Branding
- Logo
- Default margins
- Tax settings
- Financing settings
- Proposal settings
- Terms and conditions

Phase 3 scope:

- Merge with Contractor Setup only if the app still feels small.
- Split Contractor Setup and Settings when proposal branding becomes real.

### 12. Reports

Purpose: help contractors understand profitability.

Features:

- Average margin by trade
- Win/loss later
- Total quoted amount
- Estimated profit
- Accepted quotes later
- Best performing price range later

Phase 4 scope:

- Requires saved quote history.
- Works best after database and quote statuses exist.

### 13. Future AI Insights

Purpose: give smart pricing recommendations.

Features:

- Warn if price is too low
- Suggest higher margin
- Explain risk
- Compare Good, Better, Best
- Suggest which option to present as recommended
- Learn from accepted/declined quotes later

Phase 4 scope:

- Start rule-based before model-based AI.
- Keep explanations grounded in visible pricing inputs.

## Build Order

### Phase 1: Pricing MVP

Goal: make the pricing engine useful without backend.

Build:

- Dashboard
- Pricing Calculator
- Pricing Rules Engine
- Contractor Setup basic

Done when:

- Contractor can enter cost and setup
- App calculates Good, Better, Best correctly
- Dashboard summarizes the current pricing scenario
- Contractor profile defaults affect pricing

### Phase 2: Job Workflow

Goal: turn pricing scenarios into project and quote workflow.

Build:

- Contacts
- Projects
- Cost Breakdown
- Quotes

Done when:

- Contractor can create a project
- Contractor can enter real cost breakdown
- Contractor can generate and save a quote
- Quote links back to project and customer

### Phase 3: Client-Facing Output

Goal: make pricing presentable to homeowners or customers.

Build:

- Proposal Builder
- PDF Generator
- Settings

Done when:

- Contractor can preview a client proposal
- Contractor can export a clean PDF
- Company branding and terms appear in proposals

### Phase 4: Business Intelligence

Goal: make the app smarter and persistent.

Build:

- Reports
- AI Insights
- Supabase database
- Auth

Done when:

- Users can sign in
- Pricing history persists
- Reports use real quote data
- AI/rule insights help improve pricing decisions

## Immediate Next Step

Before writing more UI, separate the current product into three Phase 1 concepts:

1. Dashboard overview
2. Pricing Calculator
3. Contractor Setup

Keep the first implementation frontend-only with local state. Once those are clean, extract the pricing rules into `lib/pricing/` so the calculator, dashboard, quotes, and reports all use the same logic.
