# Industry Benchmarks Reference & Taxonomy Guide

This document specifies the **11 industry benchmark profiles** supported across the MergeWorks Due Diligence Dashboard. It outlines the screening metrics, benchmark bands (Low, Median, High), auto-detection aliases, and platform usage.

---

## 1. Overview & Provenance

The MergeWorks platform uses an illustrative middle-market and SMB vertical benchmark taxonomy to evaluate deal targets across valuation, profitability, growth velocity, and capital safety.

> [!NOTE]
> **Provenance & Disclaimer**: Benchmark bands represent curated internal screening heuristics for lower-middle-market and small business acquisitions ($1M–$50M EV). They serve as screening baselines and sanity checks, not audited percentiles from a single live dataset. Before finalizing investment committee memos or loan submissions, validate against current citable comparables (e.g. DealStats, GF Data, PitchBook).

Source code implementation: [`frontend/utils/verticalBenchmarks.ts`](file:///frontend/utils/verticalBenchmarks.ts).

---

## 2. The 6 Standard Benchmark Metrics

For every industry profile, 6 core metrics are evaluated across **Low**, **Median**, and **High** screening thresholds:

| Metric | Code Key | Typical Unit | Description |
| :--- | :--- | :--- | :--- |
| **Entry Multiple** | `entryMultiple` | Multiple (`x`) | Enterprise Value divided by Normalized TTM EBITDA/SDE. |
| **Gross Margin** | `grossMargin` | Percentage (`%`) | (Revenue − COGS) ÷ Revenue. Measures pricing power and direct product cost efficiency. |
| **EBITDA Margin** | `ebitdaMargin` | Percentage (`%`) | Normalized EBITDA ÷ Revenue. Measures core operational cash efficiency. |
| **Revenue Growth** | `revenueGrowth` | Percentage (`%`) | Trailing 12-month or multi-year annual compound revenue growth rate. |
| **Payback Years** | `paybackYears` | Years (`yrs`) | Initial Investment ÷ Annual Free Operating Cash Flow. Measures capital recoup speed. |
| **DSCR** | `dscr` | Ratio (`x`) | Annual Operating Cash Flow ÷ Scheduled Senior Debt Service. Minimum safe coverage is 1.25x. |

---

## 3. The 11 Supported Industry Profiles

### 1. HVAC, Plumbing & Mechanical (MEP) (`hvac_mep`)
* **Display Name**: HVAC, Plumbing & Mechanical (MEP)
* **Category**: HVAC & MEP
* **Description**: Commercial & residential heating, ventilation, air conditioning, plumbing, and electrical trade contractors.
* **Metric Bands**:
  * Entry Multiple: **3.2x** (Low) | **4.2x** (Median) | **5.8x** (High)
  * Gross Margin: **38%** (Low) | **48%** (Median) | **58%** (High)
  * EBITDA Margin: **12%** (Low) | **18%** (Median) | **24%** (High)
  * Revenue Growth: **4%** (Low) | **9%** (Median) | **16%** (High)
  * Payback Years: **3.5 yrs** (Low) | **5.0 yrs** (Median) | **7.5 yrs** (High)
  * DSCR: **1.20x** (Low) | **1.60x** (Median) | **2.50x** (High)
* **Detection Aliases**: `hvac`, `plumbing`, `mep`, `mechanical`, `heating`, `cooling`, `air conditioning`, `electrical contractor`, `trades`.

---

### 2. B2B SaaS & Cloud Software (`b2b_saas`)
* **Display Name**: B2B SaaS & Cloud Software
* **Category**: B2B SaaS
* **Description**: Subscription recurring revenue (ARR) B2B software, enterprise workflow, supply chain, and vertical applications.
* **Metric Bands**:
  * Entry Multiple: **4.5x** (Low) | **6.5x** (Median) | **9.5x** (High)
  * Gross Margin: **70%** (Low) | **78%** (Median) | **88%** (High)
  * EBITDA Margin: **15%** (Low) | **24%** (Median) | **35%** (High)
  * Revenue Growth: **12%** (Low) | **22%** (Median) | **40%** (High)
  * Payback Years: **4.0 yrs** (Low) | **6.5 yrs** (Median) | **9.0 yrs** (High)
  * DSCR: **1.30x** (Low) | **1.80x** (Median) | **3.00x** (High)
* **Detection Aliases**: `saas`, `software`, `cloud`, `subscription`, `arr`, `b2b software`, `tech`, `platform`.

---

### 3. Precision Machining, CNC & Job Shops (`precision_mfg`)
* **Display Name**: Precision Machining, CNC & Job Shops
* **Category**: Precision Mfg
* **Description**: Contract precision manufacturing, CNC milling/turning, aerospace/defense tooling, and engineered metal fabrication.
* **Metric Bands**:
  * Entry Multiple: **3.0x** (Low) | **3.8x** (Median) | **4.8x** (High)
  * Gross Margin: **26%** (Low) | **34%** (Median) | **44%** (High)
  * EBITDA Margin: **9%** (Low) | **14%** (Median) | **20%** (High)
  * Revenue Growth: **2%** (Low) | **6%** (Median) | **12%** (High)
  * Payback Years: **3.0 yrs** (Low) | **4.8 yrs** (Median) | **7.0 yrs** (High)
  * DSCR: **1.15x** (Low) | **1.50x** (Median) | **2.20x** (High)
* **Detection Aliases**: `precision`, `machining`, `cnc`, `manufacturing`, `metal`, `fabrication`, `job shop`, `tooling`, `industrial parts`.

---

### 4. Dental Practices & Healthcare Clinics (`healthcare_dental`)
* **Display Name**: Dental Practices & Healthcare Clinics
* **Category**: Healthcare / Dental
* **Description**: Private dental practices, physical therapy clinics, optometry, and outpatient specialty healthcare clinics.
* **Metric Bands**:
  * Entry Multiple: **3.8x** (Low) | **5.0x** (Median) | **7.0x** (High)
  * Gross Margin: **52%** (Low) | **64%** (Median) | **74%** (High)
  * EBITDA Margin: **15%** (Low) | **22%** (Median) | **30%** (High)
  * Revenue Growth: **3%** (Low) | **7%** (Median) | **14%** (High)
  * Payback Years: **3.5 yrs** (Low) | **5.2 yrs** (Median) | **8.0 yrs** (High)
  * DSCR: **1.25x** (Low) | **1.70x** (Median) | **2.60x** (High)
* **Detection Aliases**: `dental`, `clinic`, `healthcare`, `medical`, `dentist`, `orthodontics`, `physical therapy`, `optometry`, `health`.

---

### 5. Freight Brokerage, Trucking & Logistics (`logistics_freight`)
* **Display Name**: Freight Brokerage, Trucking & Logistics
* **Category**: Logistics & Freight
* **Description**: Non-asset freight brokerage, specialized 3PL warehousing, intermodal freight, and regional fleet hauling.
* **Metric Bands**:
  * Entry Multiple: **2.8x** (Low) | **3.6x** (Median) | **4.8x** (High)
  * Gross Margin: **15%** (Low) | **22%** (Median) | **32%** (High)
  * EBITDA Margin: **7%** (Low) | **11%** (Median) | **17%** (High)
  * Revenue Growth: **3%** (Low) | **8%** (Median) | **18%** (High)
  * Payback Years: **2.8 yrs** (Low) | **4.5 yrs** (Median) | **6.8 yrs** (High)
  * DSCR: **1.15x** (Low) | **1.45x** (Median) | **2.10x** (High)
* **Detection Aliases**: `logistics`, `freight`, `trucking`, `3pl`, `warehousing`, `brokerage`, `hauling`, `transport`, `transportation`.

---

### 6. Commercial Landscaping & Facility Services (`commercial_landscaping`)
* **Display Name**: Commercial Landscaping & Facility Services
* **Category**: Commercial Landscaping
* **Description**: Recurring commercial landscape maintenance, snow removal, tree care, and exterior commercial property maintenance.
* **Metric Bands**:
  * Entry Multiple: **3.0x** (Low) | **3.9x** (Median) | **5.2x** (High)
  * Gross Margin: **36%** (Low) | **46%** (Median) | **56%** (High)
  * EBITDA Margin: **11%** (Low) | **16%** (Median) | **22%** (High)
  * Revenue Growth: **3%** (Low) | **7%** (Median) | **14%** (High)
  * Payback Years: **3.2 yrs** (Low) | **4.8 yrs** (Median) | **7.2 yrs** (High)
  * DSCR: **1.20x** (Low) | **1.55x** (Median) | **2.40x** (High)
* **Detection Aliases**: `landscaping`, `lawn`, `grounds`, `tree care`, `exterior`, `snow removal`, `facility maintenance`, `landscape`.

---

### 7. Managed IT Services (MSP) & Cyber (`it_msp`)
* **Display Name**: Managed IT Services (MSP) & Cyber
* **Category**: Managed IT / MSP
* **Description**: Recurring monthly contract IT support, managed cybersecurity, cloud backup administration, and enterprise networking.
* **Metric Bands**:
  * Entry Multiple: **4.0x** (Low) | **5.2x** (Median) | **6.8x** (High)
  * Gross Margin: **42%** (Low) | **52%** (Median) | **64%** (High)
  * EBITDA Margin: **13%** (Low) | **19%** (Median) | **27%** (High)
  * Revenue Growth: **6%** (Low) | **12%** (Median) | **22%** (High)
  * Payback Years: **3.8 yrs** (Low) | **5.5 yrs** (Median) | **7.8 yrs** (High)
  * DSCR: **1.25x** (Low) | **1.65x** (Median) | **2.60x** (High)
* **Detection Aliases**: `msp`, `it services`, `managed service`, `cybersecurity`, `tech support`, `networking`, `it consulting`, `cloud services`.

---

### 8. E-Commerce & DTC Consumer Brands (`ecommerce_dtc`)
* **Display Name**: E-Commerce & DTC Consumer Brands
* **Category**: E-Commerce
* **Description**: Omnichannel consumer brands, Amazon FBA, Shopify direct-to-consumer stores, and branded proprietary goods.
* **Metric Bands**:
  * Entry Multiple: **2.5x** (Low) | **3.2x** (Median) | **4.5x** (High)
  * Gross Margin: **32%** (Low) | **42%** (Median) | **54%** (High)
  * EBITDA Margin: **8%** (Low) | **12%** (Median) | **18%** (High)
  * Revenue Growth: **5%** (Low) | **14%** (Median) | **30%** (High)
  * Payback Years: **2.6 yrs** (Low) | **4.2 yrs** (Median) | **6.5 yrs** (High)
  * DSCR: **1.15x** (Low) | **1.45x** (Median) | **2.10x** (High)
* **Detection Aliases**: `ecommerce`, `e-commerce`, `dtc`, `fba`, `amazon`, `shopify`, `online store`, `consumer goods`, `retail`.

---

### 9. Food & Beverage Processing / Distribution (`food_bev_dist`)
* **Display Name**: Food & Beverage Processing / Distribution
* **Category**: Food & Beverage Dist
* **Description**: Wholesale food distribution, specialty beverage manufacturing, commercial bakeries, and packaging processors.
* **Metric Bands**:
  * Entry Multiple: **2.8x** (Low) | **3.5x** (Median) | **4.6x** (High)
  * Gross Margin: **18%** (Low) | **26%** (Median) | **36%** (High)
  * EBITDA Margin: **6%** (Low) | **9%** (Median) | **15%** (High)
  * Revenue Growth: **2%** (Low) | **5%** (Median) | **10%** (High)
  * Payback Years: **3.0 yrs** (Low) | **4.6 yrs** (Median) | **7.0 yrs** (High)
  * DSCR: **1.15x** (Low) | **1.45x** (Median) | **2.20x** (High)
* **Detection Aliases**: `food`, `beverage`, `distributor`, `distribution`, `bakery`, `wholesale food`, `specialty food`, `ingredients`.

---

### 10. Specialty Trade Contractors & Construction (`construction_general`)
* **Display Name**: Specialty Trade Contractors & Construction
* **Category**: Specialty Trades
* **Description**: Commercial roofing, structural concrete, architectural glass/glazing, earthwork, structural steel, and specialty subcontracting.
* **Metric Bands**:
  * Entry Multiple: **2.6x** (Low) | **3.4x** (Median) | **4.4x** (High)
  * Gross Margin: **20%** (Low) | **28%** (Median) | **38%** (High)
  * EBITDA Margin: **7%** (Low) | **10%** (Median) | **16%** (High)
  * Revenue Growth: **2%** (Low) | **6%** (Median) | **12%** (High)
  * Payback Years: **2.8 yrs** (Low) | **4.4 yrs** (Median) | **6.8 yrs** (High)
  * DSCR: **1.15x** (Low) | **1.45x** (Median) | **2.20x** (High)
* **Detection Aliases**: `construction`, `contractor`, `roofing`, `concrete`, `subcontractor`, `general contractor`, `steel`, `paving`, `earthwork`.

---

### 11. General SMB / All Lower-Middle-Market (`generic_smb`)
* **Display Name**: General SMB / All Lower-Middle-Market
* **Category**: General SMB
* **Description**: Cross-industry baseline for US small and medium business acquisitions ($1M–$50M EV) when no vertical sub-sector is detected.
* **Metric Bands**:
  * Entry Multiple: **2.5x** (Low) | **3.5x** (Median) | **5.0x** (High)
  * Gross Margin: **30%** (Low) | **42%** (Median) | **55%** (High)
  * EBITDA Margin: **10%** (Low) | **20%** (Median) | **30%** (High)
  * Revenue Growth: **2%** (Low) | **8%** (Median) | **15%** (High)
  * Payback Years: **3.0 yrs** (Low) | **5.0 yrs** (Median) | **8.0 yrs** (High)
  * DSCR: **1.10x** (Low) | **1.50x** (Median) | **2.50x** (High)
* **Detection Aliases**: `general`, `smb`, `other`, `default`, `diversified`.

---

## 4. Automatic Sector Detection Engine

The function `detectSector(input?: string | null)` automatically scans deal metadata:
1. Target company name (e.g. "Northstar Commercial HVAC Services").
2. Document coverage keywords & CIM executive summaries.
3. Industry field passed from project creation or synthesis.

It iterates through the 10 specific sector alias lists in order. If any keyword matches (case-insensitive substring), that profile is assigned. If no alias matches or the input is empty, it safely defaults to `generic_smb`.

---

## 5. UI Visualization & Card Integration

The benchmark profiles power several dashboard cards:
1. **Industry Benchmark Comparison Card** (`IndustryBenchmarkCard.tsx`):
   * **The Horizontal Bar (Line)**: Represents the industry benchmark range from the **Low (left end)** to the **High (right end)**, with a vertical tick mark at the **Median**.
   * **The Dot**: Represents **this deal's actual metric** plotted against the benchmark distribution.
   * **Color Coding**: Green if at or above median, Amber if between low and median, Red if below low (or above upper bound for entry multiple / payback period).
2. **Deal Grade Card** (`DealGradeCard.tsx`):
   * Benchmarks determine the sub-score weighting for Valuation, Financial Quality, and Capital Safety.
3. **Model Assumptions Summary** (`ModelAssumptionsSummary.tsx`):
   * Unassigned valuation parameters (like EBITDA Multiple ceiling or baseline margins) pull their default ranges directly from the active industry profile.
