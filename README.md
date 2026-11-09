# Application គ្រប់គ្រងស្តុក (Stock & Inventory) — សម្រាប់ហាង / ឃ្លាំង

គម្រោងមាន ៣ ផ្នែក ដែលប្រើប្រធានបទតែមួយ៖ **ការគ្រប់គ្រងស្តុកចូល–ចេញ របស់ «ហាង ស្តុកល្អ»**។

```
├── part1-claude-ai/          ផ្នែកទី ១ — Claude Project + Prompt
│   ├── 00-project-instructions.md   Instructions សម្រាប់ Claude Project
│   ├── 01-knowledge-base.md         Knowledge Base ផ្ទាល់ខ្លួន
│   ├── 02-SOP-stock-in-out.md       SOP ស្តុកចូល/ចេញ
│   ├── 03-email-low-stock.md        Email ជូនដំណឹងស្តុកជិតអស់ + Email បញ្ជាទិញ
│   ├── 04-monthly-report.md         របាយការណ៍ស្តុកប្រចាំខែ
│   └── 05-prompts.md                បញ្ជី Prompt ១៣
├── part2-google-sheets/      ផ្នែកទី ២ — Google Sheet (Database) + Apps Script
│   ├── Code.gs                      API + Email + Trigger + Setup (Formula/Pivot/Chart)
│   └── sheet-structure.md           រចនាសម្ព័ន្ធ Sheet និង Formula
└── part3-website/            ផ្នែកទី ៣ — Web App (HTML/CSS/JS)
    ├── index.html                   បញ្ជីទំនិញ + KPI + បន្ថែមទំនិញ
    ├── stock.html                   Form ស្តុកចូល/ចេញ + ប្រតិបត្តិការចុងក្រោយ
    ├── balance.html                 តារាងសមតុល្យ + តម្រង + សរុប
    ├── css/style.css
    └── js/config.js · api.js · common.js
```

## ត្រូវនឹងតម្រូវការអប្បបរមា
| ផ្នែក | តម្រូវការ | ក្នុងគម្រោងនេះ |
|---|---|---|
| ១ Claude AI | Project + Knowledge Base · ឯកសារ ≥ ២ · Prompt ≥ ១០ | Knowledge Base + SOP + Email ២ + Report · Prompt ១៣ |
| ២ Sheets | Formula (XLOOKUP/SUMIFS/IF) + Pivot ឬ Chart ≥ ១ + Apps Script | Sheet Balance ប្រើ XLOOKUP/SUMIFS/IF · PivotTable + Column Chart · Apps Script Email/API |
| ៣ Website | ≥ ៣ ទំព័រ · Responsive · Live URL · Git repo | ៣ ទំព័រ · Responsive (375px+) · Deploy Netlify/Vercel (ជំហានខាងក្រោម) |

---

## ជំហានទី ១ — Claude Project
1. claude.ai → **Projects → Create project** → ឈ្មោះ «ជំនួយការគ្រប់គ្រងស្តុក»។
2. Paste អត្ថបទក្នុង `00-project-instructions.md` ទៅ **Project instructions**។
3. Upload `01`–`05` ទៅ **Project knowledge**។
4. សាកល្បង Prompt ពី `05-prompts.md`។

## ជំហានទី ២ — Google Sheet + Apps Script
1. បង្កើត Google Sheet ថ្មី → **Extensions → Apps Script**។
2. លុបកូដដើម → Paste `part2-google-sheets/Code.gs` → Save។
3. ជ្រើស Function **`setupSheets`** → **Run** → អនុញ្ញាត Permission។
   បង្កើត Sheet ទាំងអស់ + ទិន្នន័យគំរូ ១០ មុខ + Formula + PivotTable + Chart។
4. ក្នុង Sheet **Settings** ពិនិត្យ `AlertEmail` (Email ដែលទទួលការជូនដំណឹង)។
5. Run **`createTriggers`** ម្តង → Email ប្រចាំថ្ងៃ 8:00 + របាយការណ៍ថ្ងៃទី 1។
6. សាកល្បង៖ Run **`checkLowStock`** → ពិនិត្យ Inbox។
7. **Deploy → New deployment → Web app**
   - Execute as: **Me** · Who has access: **Anyone**
   - ចម្លង URL ដែលបញ្ចប់ដោយ `/exec`។

> ⚠️ អ្នកណាមាន URL `/exec` អាចអាន និងកត់ត្រាស្តុកបាន។ កុំចែករំលែក URL នេះជាសាធារណៈ។
> រាល់ពេលកែ Code.gs ត្រូវ **Deploy → Manage deployments → Edit → New version**។

## ជំហានទី ៣ — Web App
1. បើក `part3-website/js/config.js` → ដាក់ URL `/exec` ក្នុង `API_URL`។
2. សាកល្បងក្នុងម៉ាស៊ីន៖
   ```bash
   python -m http.server 5173 --directory part3-website
   ```
   បើក http://localhost:5173 — បើ `API_URL` ទទេ វាដំណើរការជា **Demo Mode** (ទិន្នន័យក្នុង Browser)។
3. **Git repo**
   ```bash
   git init
   ```
   ```bash
   git add . && git commit -m "Stock & Inventory app"
   ```
   បង្កើត Repo ក្នុង GitHub ហើយ `git remote add origin … && git push -u origin main`។
4. **Deploy (ជ្រើសមួយ)**
   - **Netlify**៖ Add new site → Import from GitHub → Base/Publish directory = `part3-website` → Deploy។
     (ឬអូសថត `part3-website` ទៅ app.netlify.com/drop)
   - **Vercel**៖ Add New Project → Import Repo → Root Directory = `part3-website` → Framework = Other → Deploy។
5. ដាក់ Live URL ក្នុង Sheet **Settings → WebAppUrl** ដើម្បីឲ្យ Email មាន Link ទៅតារាងសមតុល្យ។

## លំហូរទិន្នន័យ
```
Web App (Netlify/Vercel)
   │  GET  ?action=products|balance|movements
   │  POST {action: stockIn|stockOut|addProduct}   (text/plain → គ្មាន CORS preflight)
   ▼
Apps Script Web App (doGet / doPost) ──► Google Sheet (Products · StockIn · StockOut · Balance)
   │
   ├─ ស្តុកចេញធ្លាក់ដល់ MinStock ──► Email ភ្លាមៗ
   ├─ Trigger រាល់ថ្ងៃ 8:00 ─────► checkLowStock() ──► Email
   └─ Trigger ថ្ងៃទី 1 ──────────► sendMonthlyReport() ──► Email
```
