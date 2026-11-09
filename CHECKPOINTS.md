# Checkpoint ប្រចាំសប្តាហ៍

កំណត់ត្រាការបង្ហាញវឌ្ឍនភាពដល់គ្រូ ៤ សប្តាហ៍។ សប្តាហ៍នីមួយៗមានតម្លៃ 1.25 ពិន្ទុ (សរុប 5)។

> **សម្រាប់អ្នកធ្វើគម្រោង៖** បំពេញ **ថ្ងៃបង្ហាញ** និង **មតិគ្រូ** តាមការពិត បន្ទាប់ពីបង្ហាញម្តងៗ។
> ជួរ «ភស្តុតាង» ចង្អុលទៅឯកសារក្នុង Repo ដែលគ្រូអាចបើកមើលបាន។

| សប្តាហ៍ | ថ្ងៃបង្ហាញ | ស្ថានភាព |
|---|---|---|
| ១ — រៀបចំ និង Claude AI | __/__/2026 | ☐ |
| ២ — Google Sheets + Apps Script | __/__/2026 | ☐ |
| ៣ — Website | __/__/2026 | ☐ |
| ៤ — ពិនិត្យ និងបង្ហាញចុងក្រោយ | __/__/2026 | ☐ |

---

## សប្តាហ៍ទី ១ — រៀបចំ និង Claude AI
**គោលដៅ៖** ជ្រើសប្រធានបទ និងបង្កើត Claude Project ដែលមាន Knowledge Base។

**អ្វីដែលបានបង្ហាញ**
- ប្រធានបទ៖ ការគ្រប់គ្រងស្តុកចូល–ចេញ របស់ «ហាង ស្តុកល្អ»
- Claude Project «ជំនួយការគ្រប់គ្រងស្តុក» + Project Instructions
- Knowledge Base៖ ព័ត៌មានហាង តួនាទី វាក្យសព្ទ ក្បួនស្តុក
- SOP ស្តុកចូល/ចេញ (SOP-INV-001)

**ភស្តុតាង៖** [00-project-instructions.md](part1-claude-ai/00-project-instructions.md) · [01-knowledge-base.md](part1-claude-ai/01-knowledge-base.md) · [02-SOP-stock-in-out.md](part1-claude-ai/02-SOP-stock-in-out.md) · Prompt #1–2 ក្នុង [05-prompts.md](part1-claude-ai/05-prompts.md)

**មតិគ្រូ៖**
**អ្វីដែលត្រូវកែសប្តាហ៍ក្រោយ៖**

---

## សប្តាហ៍ទី ២ — Google Sheets + Apps Script
**គោលដៅ៖** Database ក្នុង Google Sheet ដែលមាន Formula, Pivot/Chart និង Apps Script។

**អ្វីដែលបានបង្ហាញ**
- Sheet៖ Products · StockIn · StockOut · Balance · Pivot_StockOut · Settings
- Formula XLOOKUP · SUMIFS · IF + Conditional Formatting (ក្រហម/លឿង/បៃតង)
- PivotTable ស្តុកចេញ តាម SKU × មូលហេតុ + Column Chart សមតុល្យ
- Apps Script៖ Email ជូនដំណឹងស្តុកជិតអស់ + Trigger ប្រចាំថ្ងៃ 8:00
- Email Template ជូនដំណឹង + បញ្ជាទិញ

**ភស្តុតាង៖** [Code.gs](part2-google-sheets/Code.gs) · [sheet-structure.md](part2-google-sheets/sheet-structure.md) · [03-email-low-stock.md](part1-claude-ai/03-email-low-stock.md) · Prompt #3–8

**មតិគ្រូ៖**
**អ្វីដែលត្រូវកែសប្តាហ៍ក្រោយ៖**

---

## សប្តាហ៍ទី ៣ — Website
**គោលដៅ៖** Web App ≥ ៣ ទំព័រ ដែល Responsive មាន Live URL និងកូដក្នុង Git។

**អ្វីដែលបានបង្ហាញ**
- ទំព័រ៖ បញ្ជីទំនិញ · ស្តុកចូល/ចេញ · សមតុល្យ
- ភ្ជាប់ Apps Script API (doGet/doPost) + Demo Mode
- ដោះស្រាយបញ្ហា CORS (POST ជា `text/plain`)
- Deploy លើ Vercel + GitHub repo

**ភស្តុតាង៖** [part3-website/](part3-website/) · Live URL https://stock-inventory-part3-website.vercel.app/ · Prompt #9–10, #13

**មតិគ្រូ៖**
**អ្វីដែលត្រូវកែសប្តាហ៍ក្រោយ៖**

---

## សប្តាហ៍ទី ៤ — ពិនិត្យ និងបង្ហាញចុងក្រោយ
**គោលដៅ៖** កែកំហុស បំពេញលក្ខខណ្ឌទាំងអស់ និងរៀបចំបទបង្ហាញ។

**អ្វីដែលបានបង្ហាញ**
- ពិនិត្យ Web App ហើយកែបញ្ហា ៥ ចំណុច (ស្តុកចេញលើសសមតុល្យ, Note, ទូរស័ព្ទ, Form, Column បញ្ជាទិញ) — PR #1
- ទំនិញ ២០ មុខ · របាយការណ៍ប្រចាំខែពីលេខពិត · Prompt Log ១៧ · Logo — PR #2
- ទំព័រ Portfolio (`portfolio.html`) · Social preview · README
- Video Demo ៣–៥ នាទី

**ភស្តុតាង៖** [04-monthly-report.md](part1-claude-ai/04-monthly-report.md) · [portfolio.html](part3-website/portfolio.html) · Prompt #14–17 · Pull Requests លើ GitHub

**មតិគ្រូ៖**
