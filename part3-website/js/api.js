/**
 * API layer — Google Apps Script (Live) ឬ localStorage (Demo)
 * POST ផ្ញើជា text/plain ដើម្បីជៀសវាង CORS preflight (Apps Script មិនគាំទ្រ OPTIONS)។
 */
const Api = (() => {
  const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL || '').trim();
  const live = API_URL.length > 0;

  const STATUS = { OUT: 'អស់ស្តុក', LOW: 'ជិតអស់', OK: 'គ្រប់គ្រាន់' };
  const statusOf = (bal, min) => (bal <= 0 ? STATUS.OUT : bal <= min ? STATUS.LOW : STATUS.OK);

  /* ---------------- Live (Apps Script) ---------------- */
  async function liveGet(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { redirect: 'follow' });
    return unwrap(await res.json());
  }
  async function livePost(body) {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return unwrap(await res.json());
  }
  function unwrap(json) {
    if (!json.ok) throw new Error(json.error || 'មានកំហុស');
    return json.data;
  }

  /* ---------------- Demo (localStorage) ---------------- */
  const KEY = 'stock-demo-v1';
  let memory = null;

  function seed() {
    const d = n => new Date(Date.now() - n * 86400000).toISOString();
    const products = [
      ['P001', 'Coca-Cola កំប៉ុង', 'ភេសជ្ជៈ', 'កំប៉ុង', 0.6, 24],
      ['P002', 'ទឹកបរិសុទ្ធ Vital 500ml', 'ភេសជ្ជៈ', 'ដប', 0.3, 24],
      ['P003', 'មី Mama', 'អាហារ', 'កេស', 6.5, 10],
      ['P004', 'អង្ករ ផ្កាម្លិះ 25kg', 'អាហារ', 'បាវ', 22, 5],
      ['P005', 'ប្រេងឆា 1L', 'គ្រឿងទេស', 'ដប', 2.2, 12],
      ['P006', 'ស្ករស 1kg', 'គ្រឿងទេស', 'កញ្ចប់', 1.1, 10],
      ['P007', 'ទឹកត្រី', 'គ្រឿងទេស', 'ដប', 1.5, 12],
      ['P008', 'ទឹកដោះគោ Dutch Mill', 'ភេសជ្ជៈ', 'ប្រអប់', 0.45, 30],
      ['P009', 'សាប៊ូដុសខ្លួន', 'អនាម័យ', 'ដុំ', 0.8, 8],
      ['P010', 'ក្រដាសអនាម័យ', 'អនាម័យ', 'ឡូ', 0.5, 20],
    ].map(([sku, name, category, unit, price, minStock]) => ({ sku, name, category, unit, price, minStock }));
    const mv = (type, n, sku, qty, party, i) => ({ id: `${type.toUpperCase()}-${i}`, type, date: d(n), sku, qty, party, note: '' });
    const movements = [
      ['in', 20, 'P001', 120, 'Cambrew'], ['in', 20, 'P002', 96, 'Vital'], ['in', 18, 'P003', 20, 'ផ្សារដើមគរ'],
      ['in', 18, 'P004', 12, 'ឃ្លាំងអង្ករ'], ['in', 15, 'P005', 36, 'ផ្សារដើមគរ'], ['in', 15, 'P006', 40, 'ផ្សារដើមគរ'],
      ['in', 12, 'P007', 24, 'ផ្សារដើមគរ'], ['in', 10, 'P008', 96, 'Dutch Mill'], ['in', 10, 'P009', 24, 'Unilever'],
      ['in', 8, 'P010', 60, 'Unilever'],
      ['out', 7, 'P001', 56, 'លក់'], ['out', 6, 'P002', 42, 'លក់'], ['out', 5, 'P003', 16, 'លក់'],
      ['out', 5, 'P004', 4, 'លក់'], ['out', 4, 'P005', 10, 'លក់'], ['out', 3, 'P007', 24, 'លក់'],
      ['out', 3, 'P008', 50, 'លក់'], ['out', 2, 'P008', 6, 'ផុតកំណត់'], ['out', 2, 'P009', 19, 'លក់'],
      ['out', 1, 'P010', 18, 'លក់'],
    ].map((m, i) => mv(m[0], m[1], m[2], m[3], m[4], i + 1));
    return { products, movements };
  }

  function load() {
    if (memory) return memory;
    try {
      const raw = localStorage.getItem(KEY);
      memory = raw ? JSON.parse(raw) : seed();
    } catch (_) {
      memory = seed();
    }
    return memory;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (_) { /* in-memory only */ }
  }
  const wait = (v) => new Promise(r => setTimeout(() => r(v), 150));

  function demoBalances() {
    const db = load();
    const t = {};
    db.movements.forEach(m => {
      t[m.sku] = t[m.sku] || { in: 0, out: 0 };
      t[m.sku][m.type] += m.qty;
    });
    return db.products.map(p => {
      const x = t[p.sku] || { in: 0, out: 0 };
      const balance = x.in - x.out;
      return { ...p, totalIn: x.in, totalOut: x.out, balance, status: statusOf(balance, p.minStock),
        value: Math.round(balance * p.price * 100) / 100 };
    });
  }

  function demoMove(type, b) {
    const db = load();
    const p = db.products.find(x => x.sku === b.sku);
    if (!p) throw new Error(`រកមិនឃើញទំនិញ SKU "${b.sku}"។`);
    const qty = Number(b.qty);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('បរិមាណមិនត្រឹមត្រូវ។ សូមបញ្ចូលចំនួនគត់ធំជាង ០។');
    const cur = demoBalances().find(x => x.sku === p.sku).balance;
    if (type === 'out' && qty > cur) throw new Error(`ស្តុកមិនគ្រប់គ្រាន់។ សមតុល្យបច្ចុប្បន្ន ${cur} ${p.unit}។`);
    const id = `${type.toUpperCase()}-${Date.now()}`;
    db.movements.push({ id, type, date: new Date().toISOString(), sku: p.sku, qty,
      party: type === 'in' ? (b.supplier || '') : (b.reason || 'លក់'), note: b.note || '' });
    save();
    const balance = type === 'in' ? cur + qty : cur - qty;
    return { id, balance, status: statusOf(balance, p.minStock) };
  }

  const demo = {
    products: () => wait(load().products.slice()),
    balance: () => wait(demoBalances()),
    movements: (limit = 20) => wait(load().movements.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit)),
    stockIn: async b => wait(demoMove('in', b)),
    stockOut: async b => wait(demoMove('out', b)),
    addProduct: async b => {
      const db = load();
      const sku = String(b.sku || '').trim().toUpperCase();
      if (!sku || !b.name) throw new Error('SKU និងឈ្មោះទំនិញ ជាព័ត៌មានចាំបាច់។');
      if (db.products.some(p => p.sku === sku)) throw new Error(`SKU "${sku}" មានរួចហើយ។`);
      db.products.push({ sku, name: b.name, category: b.category || 'ផ្សេងៗ', unit: b.unit || 'ឯកតា',
        price: Number(b.price) || 0, minStock: Number(b.minStock) || 0 });
      save();
      return wait({ sku });
    },
    reset: () => { memory = seed(); save(); },
  };

  if (!live) return { live, STATUS, ...demo };

  return {
    live, STATUS,
    products: () => liveGet('products'),
    balance: () => liveGet('balance'),
    movements: (limit = 20) => liveGet('movements', { limit }),
    stockIn: b => livePost({ action: 'stockIn', ...b }),
    stockOut: b => livePost({ action: 'stockOut', ...b }),
    addProduct: b => livePost({ action: 'addProduct', ...b }),
    reset: () => {},
  };
})();
