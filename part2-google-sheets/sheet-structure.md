# ផ្នែកទី ២ — Google Sheet (Database) + Apps Script

`setupSheets()` ក្នុង [Code.gs](Code.gs) បង្កើតអ្វីៗខាងក្រោមដោយស្វ័យប្រវត្តិ។ ឯកសារនេះពន្យល់រចនាសម្ព័ន្ធ និង Formula។

## Sheets
| Sheet | Columns | តួនាទី |
|---|---|---|
| **Products** | SKU · Name · Category · Unit · Price · MinStock | បញ្ជីទំនិញ (២០ មុខ) |
| **StockIn** | ID · Date · SKU · Qty · Supplier · Note | ប្រតិបត្តិការស្តុកចូល |
| **StockOut** | ID · Date · SKU · Qty · Reason · Note | ប្រតិបត្តិការស្តុកចេញ |
| **Balance** | SKU · Name · TotalIn · TotalOut · Balance · MinStock · Status · Value | សមតុល្យ (Formula) + Chart |
| **Pivot_StockOut** | — | PivotTable ស្តុកចេញ តាម SKU × មូលហេតុ |
| **Settings** | Key · Value (AlertEmail, ShopName, WebAppUrl) | ការកំណត់ |

## Formula ក្នុង Sheet Balance (ជួរទី 2)
| Col | Formula | ពន្យល់ |
|---|---|---|
| A SKU | `=IF(Products!A2="","",Products!A2)` | យក SKU ពី Products |
| B Name | `=IF(A2="","",XLOOKUP(A2,Products!A:A,Products!B:B,""))` | **XLOOKUP** ឈ្មោះ |
| C TotalIn | `=IF(A2="","",SUMIFS(StockIn!D:D,StockIn!C:C,A2))` | **SUMIFS** ស្តុកចូល |
| D TotalOut | `=IF(A2="","",SUMIFS(StockOut!D:D,StockOut!C:C,A2))` | **SUMIFS** ស្តុកចេញ |
| E Balance | `=IF(A2="","",C2-D2)` | សមតុល្យ |
| F MinStock | `=IF(A2="","",XLOOKUP(A2,Products!A:A,Products!F:F,0))` | ស្តុកអប្បបរមា |
| G Status | `=IF(A2="","",IF(E2<=0,"អស់ស្តុក",IF(E2<=F2,"ជិតអស់","គ្រប់គ្រាន់")))` | **IF** ស្ថានភាព |
| H Value | `=IF(A2="","",E2*XLOOKUP(A2,Products!A:A,Products!E:E,0))` | តម្លៃស្តុក ($) |

Formula ត្រូវបានចម្លងចុះក្រោម 500 ជួរ — បន្ថែមទំនិញក្នុង Products វានឹងបង្ហាញក្នុង Balance ដោយស្វ័យប្រវត្តិ។
Conditional formatting៖ ក្រហម = អស់ស្តុក · លឿង = ជិតអស់ · បៃតង = គ្រប់គ្រាន់។

### Formula បន្ថែម (Dashboard)
```
តម្លៃស្តុកសរុប       =SUM(Balance!H2:H)
ចំនួនមុខជិតអស់       =COUNTIF(Balance!G2:G,"ជិតអស់")
ស្តុកចេញខែនេះ (P001) =SUMIFS(StockOut!D:D,StockOut!C:C,"P001",StockOut!B:B,">="&EOMONTH(TODAY(),-1)+1)
```

## Chart & PivotTable
- **Column Chart** ក្នុង Sheet Balance៖ សមតុល្យ vs ស្តុកអប្បបរមា តាមទំនិញ។
- **PivotTable** ក្នុង Sheet Pivot_StockOut៖ Rows = SKU · Columns = Reason · Values = SUM(Qty)។

## Apps Script — Functions
| Function | ពេលដំណើរការ | ធ្វើអ្វី |
|---|---|---|
| `doGet` | Web App ហៅ (GET) | `?action=products` · `balance` · `movements&limit=20` |
| `doPost` | Web App ហៅ (POST) | `stockIn` · `stockOut` (បដិសេធបើលើសសមតុល្យ) · `addProduct` |
| `checkLowStock` | Trigger រាល់ថ្ងៃ 8:00 | ផ្ញើ Email បញ្ជីទំនិញជិតអស់/អស់ស្តុក |
| `addStockOut_` | ពេលកត់ស្តុកចេញ | ផ្ញើ Email **ភ្លាមៗ** ពេលទំនិញធ្លាក់ដល់ MinStock |
| `sendMonthlyReport` | Trigger ថ្ងៃទី 1 រាល់ខែ 8:00 | របាយការណ៍ខែមុន (ចូល/ចេញ/សមតុល្យ/Top 3) |
| `createTriggers` | Run ម្តង | បង្កើត Trigger ទាំងពីរ |
| `onOpen` | បើក Sheet | Menu «📦 ស្តុក» |
| `seedExtraData` | Run ម្តង (Menu) | បន្ថែមទំនិញ P011–P020 + ប្រតិបត្តិការ 20/10–07/11 (រំលងជួរដែលមានរួច) |
| `insertLogo` | `setupSheets` ឬ Menu | ដាក់ Logo ហាងលើ Sheet Balance |
