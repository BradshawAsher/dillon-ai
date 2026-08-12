# Eval Regression Report

- **Generated:** 2026-08-12T19:18:30.977Z
- **Overall:** 98% (43/43 docs passing) — SHIP-READY (PASS)
- **Regression gate:** threshold 80% → ✅ PASS
- **Ground-truth coverage:** 43/41 specs scored

## Category averages (% of max)

| Dimension | Avg |
| --- | --- |
| classification | 97% |
| facts | 97% |
| risk | 98% |
| valuation | 100% |
| employee | 100% |
| math | 99% |
| recommendation (weakest) | 95% |
| crossDocConflicts | 100% |

## Cross-document conflicts

| Project | Expected | Caught | Detector FPs | Score |
| --- | --- | --- | --- | --- |
| Cascadia Climate Services, Inc. (Commercial & Residential HVAC Services) | 1 | 1 | 0 | 10/10 |
| Northstar Industrial Supply, LLC (Specialty Industrial Distribution (fasteners & fluid power)) | 1 | 1 | 0 | 10/10 |
| Summit Managed Services, Inc. (Managed IT Services (MSP)) | 1 | 1 | 0 | 10/10 |
| Alder Precision Manufacturing Co. (Precision Machining & Light Assembly) | 1 | 1 | 0 | 10/10 |
| Juniper Environmental Group, Inc. (Environmental Remediation & Site Services) | 1 | 1 | 0 | 10/10 |
| Harborview Dental Partners, LLC (Multi-Site Dental Group (4 clinics)) | 1 | 1 | 0 | 10/10 |
| Bitterroot Food Group, Inc. (Specialty Food Manufacturing & Co-Packing) | 1 | 1 | 0 | 10/10 |
| Puget Sound Logistics Co. (Regional LTL Trucking & Third-Party Logistics) | 1 | 1 | 0 | 10/10 |
| Meridian Testing Laboratories, Inc. (Environmental & Materials Testing Laboratory) | 1 | 1 | 0 | 10/10 |
| Cobalt Ridge Software, Inc. (Vertical SaaS - Utility Field Operations) | 1 | 1 | 0 | 10/10 |
| Ridgeline Staffing Partners, Inc. (Light-Industrial & Skilled-Trades Staffing) | 1 | 1 | 0 | 10/10 |
| Basin Waste Solutions, LLC (Roll-Off Waste Hauling & Recycling) | 1 | 1 | 0 | 10/10 |
| Tideline Marine Services, Inc. (Commercial Marine Repair & Dock Services) | 1 | 1 | 0 | 10/10 |
| Alpine Bloom Landscape & Facilities, Inc. (Commercial Landscaping, Irrigation & Snow Removal) | 1 | 1 | 0 | 10/10 |
| Quarry Ridge Plastics, Inc. (Injection Moulding & Contract Manufacturing) | 1 | 1 | 0 | 10/10 |

**Cascadia Climate Services, Inc. (Commercial & Residential HVAC Services)** — detected contradictions:
- `adjusted_ebitda` TTM: DD-001_Cascadia_Climate_Services__Inc__due_diligence_packet.pdf 1260400 vs DD-001_seller_adjusted_ebitda_bridge_exhibit.pdf 1590000 (21%, critical)

**Cobalt Ridge Software, Inc. (Vertical SaaS - Utility Field Operations)** — detected contradictions:
- `adjusted_ebitda` TTM: DD-010_Cobalt_Ridge_Software__Inc__due_diligence_packet.pdf 1214620 vs DD-010_seller_adjusted_ebitda_bridge_exhibit.pdf 2760000 (56%, critical)

## Per-document scores

| Document | Score | Verdict |
| --- | --- | --- |
| Werkheiser_LOI_MergeWorks.docx | 96% | PASS |
| Werkheiser P&L 2025.pdf | 98% | PASS |
| Two years PL ended Dec 31 2024.pdf | 97% | PASS |
| Balance Sheet Jan 2023 to Dec 2024.pdf | 97% | PASS |
| MergeWorks_Financial_Due_Diligence_Model.xlsx | 99% | PASS |
| Iron_Tree_Data_-_Teaser.pdf | 97% | PASS |
| Iron_Tree_Data_-_CIM.pdf | 97% | PASS |
| Financial Modeling for Iron Tree.xltx | 97% | PASS |
| Adjusted_Financials_-_Iron-Tree_(2026.02)_final.xlsx | 98% | PASS |
| 2) TurnKey Product Management P&L [Google Sheet].xlsx | 97% | PASS |
| 1) TurnKey Product Management Business Summary.pdf | 98% | PASS |
| WC- Conversion XL OM.pdf | 97% | PASS |
| DD Memo.pdf | 97% | PASS |
| ConversionXL LLC_Profit and Loss by Month v2.xlsx | 97% | PASS |
| CXL_Screen.xlsx | 96% | PASS |
| _RENEW HEALTH CENTER - FULL YEAR COMPARATIVE P&L (2024-2025).pdf | 99% | PASS |
| Financial Modelling Renew Health .xlsm | 97% | PASS |
| fixed_asset_register.xlsx | 97% | PASS |
| customer_concentration.xlsx | 96% | PASS |
| MergeWorks Testing - 1 Combined Happy Path.docx | 99% | PASS |
| MergeWorks Testing - 2 Customer Concentration Table.docx | 97% | PASS |
| MergeWorks Testing - 3 Financial Performance CSV.docx | 99% | PASS |
| MergeWorks Testing - 4 Seller Add-Back Notes.docx | 98% | PASS |
| DD-001_Cascadia_Climate_Services__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-002_Northstar_Industrial_Supply__LLC_due_diligence_packet.pdf | 99% | PASS |
| DD-003_Summit_Managed_Services__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-004_Alder_Precision_Manufacturing_Co__due_diligence_packet.pdf | 99% | PASS |
| DD-005_Juniper_Environmental_Group__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-006_Harborview_Dental_Partners__LLC_due_diligence_packet.pdf | 99% | PASS |
| DD-007_Bitterroot_Food_Group__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-008_Puget_Sound_Logistics_Co__due_diligence_packet.pdf | 99% | PASS |
| DD-009_Meridian_Testing_Laboratories__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-010_Cobalt_Ridge_Software__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-011_Ridgeline_Staffing_Partners__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-012_Basin_Waste_Solutions__LLC_due_diligence_packet.pdf | 99% | PASS |
| DD-013_Tideline_Marine_Services__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-014_Alpine_Bloom_Landscape___Facilities__Inc__due_diligence_packet.pdf | 99% | PASS |
| DD-015_Quarry_Ridge_Plastics__Inc__due_diligence_packet.pdf | 99% | PASS |
| WidgetCo - 1_P&L_Statement.xlsx | 99% | PASS |
| WidgetCo - 3_Customer_Concentration.xlsx | 98% | PASS |
| WidgetCo - 4_Fixed_Asset_Register.xlsx | 98% | PASS |
| WidgetCo - 2_Balance_Sheet.xlsx | 97% | PASS |
| WidgetCo - 5_AR_Aging_Report.xlsx | 98% | PASS |
