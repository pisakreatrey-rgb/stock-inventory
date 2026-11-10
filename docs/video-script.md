# Script Video Demo (៣–៥ នាទី)

> **របៀបប្រើ៖** កុំអានតាមពាក្យនីមួយៗ។ ប្រើជាចំណុចណែនាំ ហើយនិយាយតាមពាក្យរបស់អ្នកផ្ទាល់។ ថតអេក្រង់ + សំឡេង (OBS, Loom ឬ Xbox Game Bar `Win + Alt + R`)។ គោលដៅ ≈ ៤ នាទី។

## រៀបចំមុនថត
- [ ] បើក Tab ទាំងនេះជាមុន៖ Claude Project · Google Sheet · Gmail (Email ជូនដំណឹង) · Live URL (`dashboard.html`)
- [ ] Sheet មានទិន្នន័យ ២០ មុខ ហើយ Pivot + Chart បង្ហាញត្រឹមត្រូវ
- [ ] ជ្រើសទំនិញ ១ មុខដែលជិតដល់ MinStock សម្រាប់បង្ហាញស្តុកចេញ → ជិតអស់
- [ ] ចាំ PIN របស់ owner / staff
- [ ] បិទ Notification · ពង្រីក Browser ១២៥%

---

## ០:០០–០:២០ — សេចក្តីផ្តើម
**អេក្រង់៖** `portfolio.html` (Logo + ចំណងជើង)

- ជម្រាបសួរ ខ្ញុំឈ្មោះ ___។ គម្រោងរបស់ខ្ញុំគឺ **Application គ្រប់គ្រងស្តុក** សម្រាប់ «ហាង ស្តុកល្អ»។
- បញ្ហា៖ ហាងតូចៗកត់ស្តុកក្នុងសៀវភៅ មិនដឹងថាទំនិញណាជិតអស់ ហើយធ្វើរបាយការណ៍យឺត។
- ដំណោះស្រាយមាន ៣ ផ្នែកដែលភ្ជាប់គ្នា៖ **Claude AI → Google Sheets → Website**។

## ០:២០–១:១០ — ផ្នែកទី ១៖ Claude AI
**អេក្រង់៖** Claude Project

- បង្ហាញ **Project Instructions** និង **Knowledge Base** (ព័ត៌មានហាង តួនាទី ក្បួនស្តុក)។
- បើកឯកសារ ២–៣ ដែល Claude ជួយសរសេរ៖ **SOP ស្តុកចូល/ចេញ**, **Email ជូនដំណឹង** និង **របាយការណ៍ប្រចាំខែ**។
- និយាយអំពីអ្វីដែល **អ្នកបានកែខ្លួនឯង** (ឧ. ប្តូរឈ្មោះអ្នកផ្គត់ផ្គង់ កែពាក្យឲ្យធម្មជាតិ)។
- បង្ហាញ **Prompt Log ២២ Prompt** មួយភ្លែត។

## ១:១០–២:១០ — ផ្នែកទី ២៖ Google Sheets + Apps Script
**អេក្រង់៖** Google Sheet

- Sheet ៖ Products · StockIn · StockOut · **Balance**។
- ចុចលើ Cell ១ ក្នុង Balance ឲ្យឃើញ Formula **XLOOKUP / SUMIFS / IF**។ ពន្យល់៖ «សមតុល្យ = ចូល − ចេញ ហើយ IF ប្តូរពណ៌ក្រហម/លឿង/បៃតង»។
- បង្ហាញ **PivotTable** ស្តុកចេញតាម SKU × មូលហេតុ និង **Chart**។
- បើក Apps Script មួយភ្លែត៖ API សម្រាប់ Website + **Email ជូនដំណឹងស្តុកជិតអស់** + Trigger ម៉ោង 8:00។
- បង្ហាញ Email ពិតក្នុង Gmail។

## ២:១០–៣:៤០ — ផ្នែកទី ៣៖ Website (Live)
**អេក្រង់៖** Live URL — បង្ហាញដំណើរការពិត មិនមែនគ្រាន់តែទំព័រ

1. **Dashboard**៖ KPI · Chart ចូល–ចេញ · ទំនិញដែលត្រូវបញ្ជាទិញ។
2. **ស្តុកចេញ** (`stock.html`)៖ ចូលដោយ PIN → កត់ស្តុកចេញទំនិញដែលជិតអស់។
3. ត្រឡប់ទៅ **Google Sheet** ឲ្យឃើញថាជួរថ្មីចូលភ្លាម → **បង្ហាញថាផ្នែកទាំង ៣ ភ្ជាប់គ្នា**។
4. **តារាងសមតុល្យ**៖ ទំនិញនោះប្តូរទៅពណ៌លឿង/ក្រហម · ចុចឈ្មោះ → **Stock Card**។
5. **របាយការណ៍** (`report.html`)៖ ជ្រើស «ខែនេះ» → Export CSV ឬ Print PDF។
6. បើក **DevTools → Mobile view** (ឬទូរស័ព្ទពិត) បង្ហាញថា Responsive។
7. (បើមានពេល) **រាប់ស្តុក** និង **លុបចោល (Void)** ដោយម្ចាស់ហាង។

## ៣:៤០–៤:២០ — បញ្ចប់
**អេក្រង់៖** `portfolio.html` ឬ GitHub repo

- សង្ខេប៖ Claude ជួយសរសេរឯកសារ និងកូដ · Sheet ជា Database · Website ឲ្យបុគ្គលិកកត់ពីទូរស័ព្ទ។
- អ្វីដែលបានរៀន ១–២ ចំណុច (ឧ. ការដោះស្រាយ CORS, ការសរសេរ Prompt ឲ្យច្បាស់)។
- អ្វីដែលចង់បន្ថែមនាពេលក្រោយ (ឧ. Scan Barcode)។
- អរគុណ។

---

## បន្ទាប់ពីថត
1. Upload ទៅ YouTube (**Unlisted**)
2. ដាក់ Link ក្នុង `VIDEO_URL` នៃ `part3-website/js/config.js` និងជួរ «Video Demo» ក្នុង `README.md`
3. Commit + Push → Vercel Deploy ស្វ័យប្រវត្តិ → Video បង្ហាញក្នុង `portfolio.html`
