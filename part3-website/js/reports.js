/**
 * Reports — គណនារបាយការណ៍ពីប្រតិបត្តិការទាំងអស់ (ក្នុង Browser)
 * ប្រើដោយ dashboard.html · report.html · Stock Card
 * ប្រតិបត្តិការដែលបានលុបចោល (voided) មិនត្រូវបានរាប់ទេ។
 */
const Reports = (() => {
  const MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const ADJUST = 'កែតម្រូវ';
  const p2 = n => String(n).padStart(2, '0');

  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`; };
  const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };

  /** ចន្លោះពេលរហ័ស → { from, to } (to = ថ្ងៃបន្ទាប់ពីថ្ងៃចុងក្រោយ ម៉ោង 00:00) */
  function range(kind, now = new Date()) {
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    switch (kind) {
      case 'today': return { from: today, to: tomorrow };
      case '7d': return { from: addDays(today, -6), to: tomorrow };
      case '30d': return { from: addDays(today, -29), to: tomorrow };
      case 'month': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
      case 'lastMonth': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: addMonths(first, -1), to: first };
      }
      case 'year': return { from: new Date(today.getFullYear(), 0, 1), to: tomorrow };
      default: return { from: addDays(today, -29), to: tomorrow };
    }
  }

  function bucketKey(d, by) {
    const x = new Date(d);
    if (by === 'year') return String(x.getFullYear());
    if (by === 'month') return `${x.getFullYear()}-${p2(x.getMonth() + 1)}`;
    return isoDay(x);
  }
  function bucketLabel(key, by, short) {
    if (by === 'year') return key;
    if (by === 'month') return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
    return short ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
  }
  function nextBucket(d, by) {
    if (by === 'year') return new Date(d.getFullYear() + 1, 0, 1);
    if (by === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return addDays(d, 1);
  }
  function bucketStart(d, by) {
    if (by === 'year') return new Date(d.getFullYear(), 0, 1);
    if (by === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    return startOfDay(d);
  }

  /** ទាញទិន្នន័យទាំងអស់ម្តង */
  async function load() {
    const [balances, moves] = await Promise.all([Api.balance(), Api.allMovements()]);
    const all = moves.map(m => ({ ...m, t: new Date(m.date) })).filter(m => !isNaN(m.t));
    const products = Object.fromEntries(balances.map(b => [b.sku, b]));
    return { balances, products, all, active: all.filter(m => !m.voided) };
  }

  /** របាយការណ៍តាមទំនិញ សម្រាប់ចន្លោះ [from, to) */
  function summarize(data, from, to, category = '') {
    const rows = {};
    data.balances.forEach(b => {
      if (category && b.category !== category) return;
      rows[b.sku] = { sku: b.sku, name: b.name, unit: b.unit, category: b.category, price: b.price,
        opening: 0, in: 0, out: 0, closing: 0, outValue: 0 };
    });
    const byReason = {};
    let count = 0;
    data.active.forEach(m => {
      const r = rows[m.sku];
      if (!r || m.t >= to) return;
      const sign = m.type === 'in' ? 1 : -1;
      if (m.t < from) { r.opening += sign * m.qty; return; }
      count++;
      if (m.type === 'in') r.in += m.qty;
      else {
        r.out += m.qty;
        r.outValue += m.qty * r.price;
        const reason = m.party || 'លក់';
        byReason[reason] = byReason[reason] || { qty: 0, value: 0 };
        byReason[reason].qty += m.qty;
        byReason[reason].value += m.qty * r.price;
      }
    });
    const list = Object.values(rows).map(r => ({ ...r, closing: r.opening + r.in - r.out }));
    const totals = list.reduce((t, r) => {
      ['opening', 'in', 'out', 'closing', 'outValue'].forEach(k => { t[k] += r[k]; });
      t.closingValue += r.closing * r.price;
      return t;
    }, { opening: 0, in: 0, out: 0, closing: 0, outValue: 0, closingValue: 0 });
    return { rows: list, totals, byReason, count };
  }

  /** ស៊េរីតាមពេល (ថ្ងៃ/ខែ/ឆ្នាំ) — រួមទាំងចន្លោះដែលគ្មានប្រតិបត្តិការ */
  function series(data, from, to, by = 'day', category = '') {
    const buckets = new Map();
    for (let d = bucketStart(from, by); d < to; d = nextBucket(d, by)) {
      const key = bucketKey(d, by);
      buckets.set(key, { key, label: bucketLabel(key, by), short: bucketLabel(key, by, true), in: 0, out: 0, outValue: 0, count: 0 });
    }
    data.active.forEach(m => {
      if (m.t < from || m.t >= to) return;
      const p = data.products[m.sku];
      if (!p || (category && p.category !== category)) return;
      const b = buckets.get(bucketKey(m.t, by));
      if (!b) return;
      b.count++;
      if (m.type === 'in') b.in += m.qty;
      else { b.out += m.qty; b.outValue += m.qty * p.price; }
    });
    return [...buckets.values()];
  }

  /** Stock Card — ប្រតិបត្តិការរបស់ទំនិញមួយ ពីចាស់ទៅថ្មី ជាមួយសមតុល្យបន្តបន្ទាប់ */
  function stockCard(data, sku) {
    let bal = 0;
    return data.all
      .filter(m => m.sku === sku)
      .sort((a, b) => a.t - b.t || String(a.id).localeCompare(String(b.id)))
      .map(m => {
        if (!m.voided) bal += m.type === 'in' ? m.qty : -m.qty;
        return { ...m, running: bal };
      });
  }

  /** ល្បឿនស្តុកចេញជាមធ្យមក្នុងមួយថ្ងៃ (មិនរាប់ការកែតម្រូវ) */
  function dailyOut(data, sku, days = 28, now = new Date()) {
    const from = addDays(startOfDay(now), -(days - 1));
    const qty = data.active
      .filter(m => m.sku === sku && m.type === 'out' && m.party !== ADJUST && m.t >= from)
      .reduce((s, m) => s + m.qty, 0);
    return qty / days;
  }

  /** ទាញយក CSV (UTF-8 BOM ដើម្បីឲ្យ Excel បង្ហាញអក្សរខ្មែរត្រឹមត្រូវ) */
  function downloadCsv(filename, rows) {
    const cell = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const text = '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { MONTHS, ADJUST, range, load, summarize, series, stockCard, dailyOut, downloadCsv,
    startOfDay, addDays, isoDay, parseDay };
})();
