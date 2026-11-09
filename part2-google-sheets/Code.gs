/**
 * Stock & Inventory — Google Apps Script (Backend + Email)
 * ---------------------------------------------------------
 * Google Sheet = Database · Apps Script = API + Email alerts
 *
 * ដំឡើង៖
 *  1. បង្កើត Google Sheet ថ្មី → Extensions → Apps Script → Paste កូដនេះ
 *  2. Run `setupSheets` ម្តង (អនុញ្ញាត Permission) → បង្កើត Sheet + Formula + Pivot + Chart + ទិន្នន័យគំរូ
 *  3. វាយ Email របស់អ្នកក្នុង Sheet "Settings" (AlertEmail)
 *  4. Run `createTriggers` ម្តង → Email ជូនដំណឹងប្រចាំថ្ងៃ + របាយការណ៍ប្រចាំខែ
 *  5. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone
 *     → ចម្លង URL (…/exec) ទៅដាក់ក្នុង part3-website/js/config.js
 */

const SHEETS = {
  PRODUCTS: 'Products',
  IN: 'StockIn',
  OUT: 'StockOut',
  BALANCE: 'Balance',
  SETTINGS: 'Settings',
  PIVOT: 'Pivot_StockOut',
};

const HEADERS = {
  Products: ['SKU', 'Name', 'Category', 'Unit', 'Price', 'MinStock'],
  StockIn: ['ID', 'Date', 'SKU', 'Qty', 'Supplier', 'Note'],
  StockOut: ['ID', 'Date', 'SKU', 'Qty', 'Reason', 'Note'],
  Balance: ['SKU', 'Name', 'TotalIn', 'TotalOut', 'Balance', 'MinStock', 'Status', 'Value'],
};

const STATUS = { OUT: 'អស់ស្តុក', LOW: 'ជិតអស់', OK: 'គ្រប់គ្រាន់' };
const BALANCE_ROWS = 500; // ចំនួនជួរ Formula ក្នុង Sheet Balance

/* ============================== MENU ============================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📦 ស្តុក')
    .addItem('ពិនិត្យស្តុកជិតអស់ + ផ្ញើ Email', 'checkLowStock')
    .addItem('ផ្ញើរបាយការណ៍ខែមុន', 'sendMonthlyReport')
    .addSeparator()
    .addItem('ដំឡើង Sheet (លើកដំបូង)', 'setupSheets')
    .addItem('បង្កើត Trigger ស្វ័យប្រវត្តិ', 'createTriggers')
    .addToUi();
}

/* ============================== WEB API ============================== */

/** GET ?action=products | balance | movements&limit=20 | summary */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'balance';
    switch (action) {
      case 'products':  return json_({ ok: true, data: getProducts_() });
      case 'balance':   return json_({ ok: true, data: getBalances_() });
      case 'movements': return json_({ ok: true, data: getMovements_(Number(e.parameter.limit) || 20) });
      default:          return json_({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

/**
 * POST body (sent as text/plain to avoid CORS preflight):
 *  { action: "stockIn",  sku, qty, supplier, note }
 *  { action: "stockOut", sku, qty, reason, note }
 *  { action: "addProduct", sku, name, category, unit, price, minStock }
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    let result;
    switch (body.action) {
      case 'stockIn':    result = addStockIn_(body); break;
      case 'stockOut':   result = addStockOut_(body); break;
      case 'addProduct': result = addProduct_(body); break;
      default: throw new Error('Unknown action: ' + body.action);
    }
    return json_({ ok: true, data: result });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================== DATA ============================== */

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('រកមិនឃើញ Sheet "' + name + '" — សូម Run setupSheets');
  return sh;
}

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift();
  return values
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function getProducts_() {
  return rows_(SHEETS.PRODUCTS).map(p => ({
    sku: String(p.SKU), name: p.Name, category: p.Category, unit: p.Unit,
    price: Number(p.Price) || 0, minStock: Number(p.MinStock) || 0,
  }));
}

/** គណនាសមតុល្យក្នុង Script (មិនពឹងលើ Formula ដើម្បីឲ្យលទ្ធផលភ្លាមៗ) */
function getBalances_() {
  const totals = {};
  const add = (sheetName, field) => rows_(sheetName).forEach(r => {
    const sku = String(r.SKU);
    totals[sku] = totals[sku] || { in: 0, out: 0 };
    totals[sku][field] += Number(r.Qty) || 0;
  });
  add(SHEETS.IN, 'in');
  add(SHEETS.OUT, 'out');

  return getProducts_().map(p => {
    const t = totals[p.sku] || { in: 0, out: 0 };
    const balance = t.in - t.out;
    return Object.assign({}, p, {
      totalIn: t.in, totalOut: t.out, balance,
      status: statusOf_(balance, p.minStock),
      value: Math.round(balance * p.price * 100) / 100,
    });
  });
}

function statusOf_(balance, min) {
  if (balance <= 0) return STATUS.OUT;
  if (balance <= min) return STATUS.LOW;
  return STATUS.OK;
}

function getMovements_(limit) {
  const map = (type, extraKey) => r => ({
    id: r.ID, type, date: toIso_(r.Date), sku: String(r.SKU),
    qty: Number(r.Qty) || 0, party: r[extraKey] || '', note: String(r.Note ?? ''),
  });
  const all = rows_(SHEETS.IN).map(map('in', 'Supplier'))
    .concat(rows_(SHEETS.OUT).map(map('out', 'Reason')));
  all.sort((a, b) => (a.date < b.date ? 1 : -1));
  return all.slice(0, limit);
}

function toIso_(d) {
  return d instanceof Date ? d.toISOString() : String(d);
}

/* ============================== WRITE ============================== */

function validateQty_(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) {
    throw new Error('បរិមាណមិនត្រឹមត្រូវ។ សូមបញ្ចូលចំនួនគត់ធំជាង ០។');
  }
  return n;
}

function findProduct_(sku) {
  const p = getProducts_().find(x => x.sku === String(sku));
  if (!p) throw new Error('រកមិនឃើញទំនិញ SKU "' + sku + '"។');
  return p;
}

/** Append a row and keep Note (column F) as plain text so "0012" stays "0012". */
function appendMovement_(sheetName, row) {
  const sh = sheet_(sheetName);
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), 6).setNumberFormat('@').setValue(row[5]);
}

function addStockIn_(b) {
  const p = findProduct_(b.sku);
  const qty = validateQty_(b.qty);
  const id = 'IN-' + Date.now();
  appendMovement_(SHEETS.IN, [id, new Date(), p.sku, qty, b.supplier || '', String(b.note || '')]);
  const bal = getBalances_().find(x => x.sku === p.sku);
  return { id, balance: bal.balance, status: bal.status };
}

function addStockOut_(b) {
  const p = findProduct_(b.sku);
  const qty = validateQty_(b.qty);
  const before = getBalances_().find(x => x.sku === p.sku);
  if (qty > before.balance) {
    throw new Error('ស្តុកមិនគ្រប់គ្រាន់។ សមតុល្យបច្ចុប្បន្ន ' + before.balance + ' ' + p.unit + '។');
  }
  const id = 'OUT-' + Date.now();
  appendMovement_(SHEETS.OUT, [id, new Date(), p.sku, qty, b.reason || 'លក់', String(b.note || '')]);

  const after = before.balance - qty;
  const status = statusOf_(after, p.minStock);
  // ផ្ញើ Email ភ្លាមៗ ពេលទំនិញទើបតែធ្លាក់ចុះដល់កម្រិតអប្បបរមា
  if (before.balance > p.minStock && after <= p.minStock) {
    sendAlertEmail_([Object.assign({}, before, { balance: after, status })], 'ភ្លាមៗ');
  }
  return { id, balance: after, status };
}

function addProduct_(b) {
  const sku = String(b.sku || '').trim().toUpperCase();
  if (!sku || !b.name || !b.unit) throw new Error('SKU ឈ្មោះទំនិញ និងឯកតា ជាព័ត៌មានចាំបាច់។');
  const price = Number(b.price), minStock = Number(b.minStock);
  if (b.price === '' || b.price == null || !isFinite(price) || price < 0) throw new Error('តម្លៃមិនត្រឹមត្រូវ។');
  if (!(minStock > 0) || Math.floor(minStock) !== minStock) {
    throw new Error('ស្តុកអប្បបរមាមិនត្រឹមត្រូវ។ សូមបញ្ចូលចំនួនគត់ធំជាង ០។');
  }
  if (getProducts_().some(p => p.sku === sku)) throw new Error('SKU "' + sku + '" មានរួចហើយ។');
  sheet_(SHEETS.PRODUCTS).appendRow([sku, b.name, b.category || 'ផ្សេងៗ', b.unit, price, minStock]);
  return { sku };
}

/* ============================== EMAIL ============================== */

function setting_(key) {
  const row = rows_(SHEETS.SETTINGS).find(r => r.Key === key);
  return row ? String(row.Value || '').trim() : '';
}

function alertEmail_() {
  return setting_('AlertEmail') || Session.getEffectiveUser().getEmail();
}

/** Trigger ប្រចាំថ្ងៃ ឬចុចពី Menu */
function checkLowStock() {
  const low = getBalances_().filter(b => b.status !== STATUS.OK);
  if (low.length) sendAlertEmail_(low, 'ប្រចាំថ្ងៃ');
  return low.length;
}

function sendAlertEmail_(items, kind) {
  const shop = setting_('ShopName') || 'ហាង';
  const appUrl = setting_('WebAppUrl');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const rows = items.map(b => {
    const reorder = Math.max(b.minStock * 2 - b.balance, 0);
    const color = b.status === STATUS.OUT ? '#b42318' : '#b54708';
    return '<tr>' + td_(b.sku) + td_(b.name) + td_(b.balance, true) + td_(b.minStock, true) +
      '<td style="padding:8px;border:1px solid #ddd;color:' + color + ';font-weight:600">' + b.status + '</td>' +
      td_(reorder, true) + '</tr>';
  }).join('');

  const html =
    '<div style="font-family:\'Kantumruy Pro\',\'Noto Sans Khmer\',sans-serif;line-height:1.7;font-size:15px">' +
    '<p>សួស្តី លោក/លោកស្រី,</p>' +
    '<p>ប្រព័ន្ធបានរកឃើញទំនិញ <b>' + items.length + ' មុខ</b> ដែលសមតុល្យស្មើ ឬតិចជាងស្តុកអប្បបរមា (' + kind + ')៖</p>' +
    '<table style="border-collapse:collapse">' +
    '<tr style="background:#1f2a44;color:#fff">' +
    ['SKU', 'ទំនិញ', 'សមតុល្យ', 'អប្បបរមា', 'ស្ថានភាព', 'បញ្ជាទិញណែនាំ']
      .map(h => '<th style="padding:8px;border:1px solid #ddd">' + h + '</th>').join('') +
    '</tr>' + rows + '</table>' +
    '<p><b>សកម្មភាព៖</b> សូមអនុម័តការបញ្ជាទិញក្នុងរយៈពេល ២៤ ម៉ោង។</p>' +
    (appUrl ? '<p><a href="' + appUrl.replace(/\/+$/, '') + '/balance.html">មើលតារាងសមតុល្យ</a></p>' : '') +
    '<p style="color:#667085;font-size:13px">Email នេះផ្ញើដោយស្វ័យប្រវត្តិពី Google Apps Script — ' + shop + '</p></div>';

  MailApp.sendEmail({
    to: alertEmail_(),
    subject: '⚠️ [' + shop + '] ទំនិញជិតអស់ស្តុក ' + items.length + ' មុខ — ' + today,
    htmlBody: html,
  });
}

function td_(v, right) {
  return '<td style="padding:8px;border:1px solid #ddd' + (right ? ';text-align:right' : '') + '">' + v + '</td>';
}

/** Trigger ថ្ងៃទី ១ រៀងរាល់ខែ — របាយការណ៍ខែមុន */
function sendMonthlyReport() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const inRange = r => r.Date instanceof Date && r.Date >= start && r.Date < end;

  const sum = {};
  const tally = (sheetName, field) => rows_(sheetName).filter(inRange).forEach(r => {
    const sku = String(r.SKU);
    sum[sku] = sum[sku] || { in: 0, out: 0 };
    sum[sku][field] += Number(r.Qty) || 0;
  });
  tally(SHEETS.IN, 'in');
  tally(SHEETS.OUT, 'out');

  const balances = getBalances_();
  let totIn = 0, totOut = 0, totValue = 0;
  const rows = balances.map(b => {
    const m = sum[b.sku] || { in: 0, out: 0 };
    totIn += m.in; totOut += m.out; totValue += b.value;
    return '<tr>' + td_(b.sku) + td_(b.name) + td_(m.in, true) + td_(m.out, true) +
      td_(b.balance, true) + td_(b.status) + td_('$' + b.value.toFixed(2), true) + '</tr>';
  }).join('');
  const top = balances
    .map(b => ({ name: b.name, out: (sum[b.sku] || { out: 0 }).out }))
    .filter(x => x.out > 0)
    .sort((a, b) => b.out - a.out).slice(0, 3)
    .map((x, i) => '<li>' + (i + 1) + '. ' + x.name + ' — ' + x.out + '</li>').join('');
  const lowCount = balances.filter(b => b.status === STATUS.LOW).length;
  const outCount = balances.filter(b => b.status === STATUS.OUT).length;

  const period = Utilities.formatDate(start, tz, 'MM/yyyy');
  const shop = setting_('ShopName') || 'ហាង';
  const html =
    '<div style="font-family:\'Kantumruy Pro\',\'Noto Sans Khmer\',sans-serif;line-height:1.7;font-size:15px">' +
    '<h2 style="line-height:1.5">របាយការណ៍ស្តុកប្រចាំខែ ' + period + '</h2>' +
    '<ul><li>ស្តុកចូលសរុប៖ <b>' + totIn + '</b></li><li>ស្តុកចេញសរុប៖ <b>' + totOut + '</b></li>' +
    '<li>តម្លៃស្តុកបច្ចុប្បន្ន៖ <b>$' + totValue.toFixed(2) + '</b></li>' +
    '<li>ជិតអស់៖ <b>' + lowCount + '</b> មុខ · អស់ស្តុក៖ <b>' + outCount + '</b> មុខ</li></ul>' +
    (top ? '<h3>ទំនិញចេញច្រើនជាងគេ</h3><ul style="list-style:none;padding:0">' + top + '</ul>' : '') +
    '<table style="border-collapse:collapse"><tr style="background:#1f2a44;color:#fff">' +
    ['SKU', 'ទំនិញ', 'ចូល', 'ចេញ', 'សមតុល្យ', 'ស្ថានភាព', 'តម្លៃ']
      .map(h => '<th style="padding:8px;border:1px solid #ddd">' + h + '</th>').join('') +
    '</tr>' + rows + '</table>' +
    '<p style="color:#667085;font-size:13px">ផ្ញើដោយស្វ័យប្រវត្តិ — ' + shop + '</p></div>';

  MailApp.sendEmail({
    to: alertEmail_(),
    subject: '📊 [' + shop + '] របាយការណ៍ស្តុកប្រចាំខែ ' + period,
    htmlBody: html,
  });
}

/* ============================== TRIGGERS ============================== */

function createTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkLowStock').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('sendMonthlyReport').timeBased().onMonthDay(1).atHour(8).create();
}

/* ============================== SETUP ============================== */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const get = name => ss.getSheetByName(name) || ss.insertSheet(name);

  // Products / StockIn / StockOut
  [SHEETS.PRODUCTS, SHEETS.IN, SHEETS.OUT].forEach(name => {
    const sh = get(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]])
        .setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });
  sheet_(SHEETS.IN).getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet_(SHEETS.OUT).getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet_(SHEETS.IN).getRange('F:F').setNumberFormat('@');
  sheet_(SHEETS.OUT).getRange('F:F').setNumberFormat('@');
  sheet_(SHEETS.PRODUCTS).getRange('E:E').setNumberFormat('$#,##0.00');

  seedSampleData_();

  // Settings
  const st = get(SHEETS.SETTINGS);
  if (st.getLastRow() === 0) {
    st.getRange(1, 1, 4, 2).setValues([
      ['Key', 'Value'],
      ['AlertEmail', Session.getEffectiveUser().getEmail()],
      ['ShopName', 'ហាង ស្តុកល្អ'],
      ['WebAppUrl', ''],
    ]);
    st.getRange('A1:B1').setFontWeight('bold');
  }

  // Balance — Formula: XLOOKUP + SUMIFS + IF
  const bal = get(SHEETS.BALANCE);
  bal.clear();
  bal.getRange(1, 1, 1, HEADERS.Balance.length).setValues([HEADERS.Balance])
    .setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
  bal.setFrozenRows(1);
  const f = [];
  for (let r = 2; r <= BALANCE_ROWS + 1; r++) {
    f.push([
      '=IF(Products!A' + r + '="","",Products!A' + r + ')',
      '=IF(A' + r + '="","",XLOOKUP(A' + r + ',Products!A:A,Products!B:B,""))',
      '=IF(A' + r + '="","",SUMIFS(StockIn!D:D,StockIn!C:C,A' + r + '))',
      '=IF(A' + r + '="","",SUMIFS(StockOut!D:D,StockOut!C:C,A' + r + '))',
      '=IF(A' + r + '="","",C' + r + '-D' + r + ')',
      '=IF(A' + r + '="","",XLOOKUP(A' + r + ',Products!A:A,Products!F:F,0))',
      '=IF(A' + r + '="","",IF(E' + r + '<=0,"' + STATUS.OUT + '",IF(E' + r + '<=F' + r + ',"' + STATUS.LOW + '","' + STATUS.OK + '")))',
      '=IF(A' + r + '="","",E' + r + '*XLOOKUP(A' + r + ',Products!A:A,Products!E:E,0))',
    ]);
  }
  bal.getRange(2, 1, BALANCE_ROWS, 8).setFormulas(f);
  bal.getRange('H:H').setNumberFormat('$#,##0.00');

  // Conditional formatting on Status
  const statusRange = bal.getRange('G2:G' + (BALANCE_ROWS + 1));
  bal.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(STATUS.OUT)
      .setBackground('#fee4e2').setFontColor('#b42318').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(STATUS.LOW)
      .setBackground('#fef0c7').setFontColor('#b54708').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(STATUS.OK)
      .setBackground('#d1fadf').setFontColor('#027a48').setRanges([statusRange]).build(),
  ]);

  // Chart — សមតុល្យតាមទំនិញ
  bal.getCharts().forEach(c => bal.removeChart(c));
  const n = Math.max(sheet_(SHEETS.PRODUCTS).getLastRow(), 2);
  bal.insertChart(bal.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(bal.getRange('B1:B' + n))
    .addRange(bal.getRange('E1:F' + n))
    .setOption('title', 'សមតុល្យ vs ស្តុកអប្បបរមា')
    .setPosition(2, 10, 0, 0)
    .build());

  // PivotTable — ស្តុកចេញសរុបតាម SKU និងមូលហេតុ
  const pv = get(SHEETS.PIVOT);
  pv.clear();
  const src = sheet_(SHEETS.OUT).getRange('A1:F');
  const pivot = pv.getRange('A1').createPivotTable(src);
  pivot.addRowGroup(3);    // SKU
  pivot.addColumnGroup(5); // Reason
  pivot.addPivotValue(4, SpreadsheetApp.PivotTableSummarizeFunction.SUM); // Qty

  ss.setActiveSheet(bal);
}

function seedSampleData_() {
  const p = sheet_(SHEETS.PRODUCTS);
  if (p.getLastRow() > 1) return; // មានទិន្នន័យរួចហើយ
  const products = [
    ['P001', 'Coca-Cola កំប៉ុង', 'ភេសជ្ជៈ', 'កំប៉ុង', 0.60, 24],
    ['P002', 'ទឹកបរិសុទ្ធ Vital 500ml', 'ភេសជ្ជៈ', 'ដប', 0.30, 24],
    ['P003', 'មី Mama', 'អាហារ', 'កេស', 6.50, 10],
    ['P004', 'អង្ករ ផ្កាម្លិះ 25kg', 'អាហារ', 'បាវ', 22.00, 5],
    ['P005', 'ប្រេងឆា 1L', 'គ្រឿងទេស', 'ដប', 2.20, 12],
    ['P006', 'ស្ករស 1kg', 'គ្រឿងទេស', 'កញ្ចប់', 1.10, 10],
    ['P007', 'ទឹកត្រី', 'គ្រឿងទេស', 'ដប', 1.50, 12],
    ['P008', 'ទឹកដោះគោ Dutch Mill', 'ភេសជ្ជៈ', 'ប្រអប់', 0.45, 30],
    ['P009', 'សាប៊ូដុសខ្លួន', 'អនាម័យ', 'ដុំ', 0.80, 8],
    ['P010', 'ក្រដាសអនាម័យ', 'អនាម័យ', 'ឡូ', 0.50, 20],
  ];
  p.getRange(2, 1, products.length, 6).setValues(products);

  const d = days => new Date(Date.now() - days * 86400000);
  const ins = [
    ['IN-1', d(20), 'P001', 120, 'Cambrew', 'INV-1001'],
    ['IN-2', d(20), 'P002', 96, 'Vital', 'INV-1002'],
    ['IN-3', d(18), 'P003', 20, 'ផ្សារដើមគរ', ''],
    ['IN-4', d(18), 'P004', 12, 'ឃ្លាំងអង្ករ', ''],
    ['IN-5', d(15), 'P005', 36, 'ផ្សារដើមគរ', ''],
    ['IN-6', d(15), 'P006', 40, 'ផ្សារដើមគរ', ''],
    ['IN-7', d(12), 'P007', 24, 'ផ្សារដើមគរ', ''],
    ['IN-8', d(10), 'P008', 96, 'Dutch Mill', ''],
    ['IN-9', d(10), 'P009', 24, 'Unilever', ''],
    ['IN-10', d(8), 'P010', 60, 'Unilever', ''],
  ];
  sheet_(SHEETS.IN).getRange(2, 1, ins.length, 6).setValues(ins);

  const outs = [
    ['OUT-1', d(7), 'P001', 56, 'លក់', ''],
    ['OUT-2', d(6), 'P002', 42, 'លក់', ''],
    ['OUT-3', d(5), 'P003', 16, 'លក់', ''],
    ['OUT-4', d(5), 'P004', 4, 'លក់', ''],
    ['OUT-5', d(4), 'P005', 10, 'លក់', ''],
    ['OUT-6', d(3), 'P007', 24, 'លក់', ''],
    ['OUT-7', d(3), 'P008', 50, 'លក់', ''],
    ['OUT-8', d(2), 'P008', 6, 'ផុតកំណត់', ''],
    ['OUT-9', d(2), 'P009', 19, 'លក់', ''],
    ['OUT-10', d(1), 'P010', 18, 'លក់', ''],
  ];
  sheet_(SHEETS.OUT).getRange(2, 1, outs.length, 6).setValues(outs);
}
