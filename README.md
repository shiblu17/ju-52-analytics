# Jahangirnagar University — 52nd Batch Data Selection & Analytics Portal
### জাহাঙ্গীরনগর বিশ্ববিদ্যালয় — ৫২তম আবর্তন ডাটা অ্যানালাইটিক্স ও সিলেকশন প্ল্যাটফর্ম

**Canonical Session:** `2022–2023` &bull; **Batch Designation:** `JU 52nd Batch / ৫২তম আবর্তন`

---

## 🏛️ Project Overview

This repository hosts the official **JU 52nd Batch Academic Data Selection & Analytics Portal**. The platform provides an interactive, accessible, and high-performance browsing and selection experience across all **19 residential halls** and **47 academic departments** of Jahangirnagar University.

Strictly adhering to **Product Requirements Document (PRD v1.0)**, the application enforces the mandatory session rule at the **data and query layer**, ensuring that only students belonging to the **2022–2023 session** are exposed in selectable lists, search results, recommendations, summaries, and exports.

---

## 🛡️ Key Features & PRD Compliance

1. **Mandatory Session Restriction (PRD FR-01, FR-02):**
   - 7,938 total records extracted across 7 academic sessions (`2017-18` through `2023-24`).
   - Query engine strictly filters to `session === '2022-2023'`.
   - **1,958 verified students** are eligible and active.
   - The remaining 5,980 multi-session records are safely quarantined in the data layer.

2. **Real-time Search & Multi-Criteria Filtering (PRD FR-03, FR-04):**
   - Instant search across Student Name, Registration Number, Class Roll, Department, and Hall.
   - Hall Dropdown covering all 19 residential halls.
   - Department Dropdown covering all 47 university departments.
   - Fixed/locked session badge: `Eligible Session: 2022–2023 — JU 52nd Batch / ৫২তম আবর্তন` (PRD FR-08).

3. **Multi-Selection & Export Engine (PRD FR-05, FR-09):**
   - Checkbox multi-selection (individual, current page, or all filtered).
   - Selection counter & basket.
   - Tamper-proof export to CSV, JSON, and print-ready formal reports, preserving the session allowlist header.

4. **Transparent Multi-Session Audit & Verification (PRD FR-10):**
   - Dedicated Audit Tab displaying distribution of all sessions and proving non-eligible session isolation.

5. **Modern Web Standards (Responsive Table):**
   - Adheres to modern responsive table standards with sticky column headers (`thead { position: sticky; inset-block-start: 0; }`), keyboard accessibility (`tabindex="0"`, `role="region"`), and mobile stacked layout.

---

## 📊 Summary of Hall Coverage (19 Residential Halls)

| # | Residential Hall Name | 52nd Batch (2022-2023) | Multi-Session Total |
|---|-----------------------|:----------------------:|:-------------------:|
| 1 | A F M Kamaluddin Hall | 27 | 244 |
| 2 | Al Beruni Hall | 13 | 139 |
| 3 | Begum Khaleda Zia Hall | 97 | 306 |
| 4 | Begum Sufia Kamal Hall | 63 | 342 |
| 5 | Bir Protik Taramon Bibi Hall | 375 | 967 |
| 6 | Bishwakabi Rabindranath Tagore Hall | 21 | 272 |
| 7 | Fazilatunnesa Hall | 42 | 654 |
| 8 | Jahanara Imam Hall | 84 | 271 |
| 9 | Jatiya Kabi Kazi Nazrul Islam Hall | 425 | 982 |
| 10 | JULY-24 JAGORONI HALL | 56 | 318 |
| 11 | Mir Mosharraf Hossain Hall | 100 | 355 |
| 12 | Mowlana Bhashani Hall | 108 | 419 |
| 13 | Nawab Faizunnesa Hall | 54 | 216 |
| 14 | NAWAB SALIMULLAH HALL | 46 | 546 |
| 15 | Pritilata Hall | 75 | 292 |
| 16 | SHAHEED FELANI KHATUN HALL | 126 | 494 |
| 17 | Shaheed Rafiq-Jabbar Hall | 111 | 511 |
| 18 | Shaheed Salam-Barkat Hall | 25 | 227 |
| 19 | SHER-E-BANGLA A. K. FAZLUL HUQ HALL | 110 | 383 |
| **Total** | **All 19 Halls** | **1,958** | **7,938** |

---

## 🧪 Automated QA Test Matrix (PRD Section 11)

All 6 automated tests pass with 100% compliance:
- `Test 1: Mixed Sessions` -> PASS (Only 2022-2023 selectable)
- `Test 2: Search Overlap` -> PASS (Overlapping keywords return only 2022-2023)
- `Test 3: No Eligible Match` -> PASS (Empty state with zero fallback)
- `Test 4: Invalid/Missing Session` -> PASS (Ambiguous sessions excluded)
- `Test 5: API Tampering Rejection` -> PASS (Direct non-2022-23 record submission rejected)
- `Test 6: Export Consistency` -> PASS (Preserves session label & isolates records)

---
Designed & Maintained for Jahangirnagar University 52nd Batch Academic Data Management.
