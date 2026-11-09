/**
 * UI រួមសម្រាប់ប្រតិបត្តិការ៖ Stock Card (ប្រវត្តិទំនិញ) និងការលុបចោល (Void)
 * ត្រូវការ api.js · common.js · reports.js
 */

const typeBadge = m => m.type === 'in'
  ? '<span class="badge in-t">ចូល</span>'
  : '<span class="badge out-t">ចេញ</span>';

const voidedBadge = m => m.voided
  ? ` <span class="badge void" title="${esc(m.voidNote || '')}">លុបចោល</span>`
  : '';

/** អាចលុបចោលបានទេ? — ម្ចាស់ហាង + Backend v2 (ឬ Demo) */
async function canVoid() {
  const info = await Api.info();
  if (info.version < 2) return false;
  return !info.auth || Auth.isOwner();
}

function makeDialog(html, cls = '') {
  const dlg = document.createElement('dialog');
  if (cls) dlg.className = cls;
  dlg.innerHTML = html;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  return dlg;
}

/** សួរមូលហេតុ ហើយលុបចោលប្រតិបត្តិការ · resolve(true) ពេលជោគជ័យ */
function voidFlow(m, productName) {
  return new Promise(resolve => {
    const dlg = makeDialog(`
      <form novalidate>
        <h2>លុបចោលប្រតិបត្តិការ</h2>
        <div class="preview">
          ${typeBadge(m)} <b>${esc(productName || m.sku)}</b> · ${m.type === 'in' ? '+' : '−'}${fmtNum(m.qty)}
          <br><span class="hint">${esc(m.id)} · ${fmtDate(m.date)}${m.by ? ' · ' + esc(m.by) : ''}</span>
        </div>
        <div class="field">
          <label for="voidReason">មូលហេតុ (ចាំបាច់)</label>
          <input id="voidReason" list="voidReasons" required placeholder="ឧ. កត់ខុសបរិមាណ">
          <datalist id="voidReasons">
            <option value="កត់ខុសបរិមាណ"><option value="កត់ខុសទំនិញ"><option value="កត់ស្ទួន"><option value="អតិថិជនប្តូរវិញ">
          </datalist>
          <div class="hint">ជួរនេះមិនត្រូវបានលុបចេញពី Sheet ទេ — វានៅតែបង្ហាញជា «លុបចោល» ដើម្បីរក្សាដាន។</div>
          <div class="form-error" role="alert"></div>
        </div>
        <div class="dialog-actions">
          <button class="btn secondary" type="button" data-cancel>បោះបង់</button>
          <button class="btn out" type="submit">លុបចោល</button>
        </div>
      </form>`);
    const form = dlg.querySelector('form');
    const err = dlg.querySelector('.form-error');
    const input = dlg.querySelector('#voidReason');
    const submit = dlg.querySelector('[type=submit]');
    let ok = false;
    dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => resolve(ok));
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const reason = input.value.trim();
      if (!reason) { err.textContent = 'សូមបញ្ចូលមូលហេតុ។'; input.focus(); return; }
      submit.disabled = true;
      err.textContent = '';
      try {
        const r = await withAuth(() => Api.voidMovement(m.id, reason), { owner: true });
        ok = true;
        toast(`បានលុបចោល — សមតុល្យថ្មី ${fmtNum(r.balance)}`, 'success');
        dlg.close();
      } catch (e) {
        if (e.code === 'CANCEL') { dlg.close(); return; }
        err.textContent = e.message;
      } finally {
        submit.disabled = false;
      }
    });
    dlg.showModal();
    input.focus();
  });
}

/** បើក Stock Card របស់ទំនិញ · onChange() ត្រូវបានហៅក្រោយលុបចោល */
async function openStockCard(sku, onChange) {
  const dlg = makeDialog(`
    <div class="card-head">
      <div>
        <h2 style="margin:0">Stock Card</h2>
        <div class="hint" data-title>កំពុងផ្ទុក…</div>
      </div>
      <button class="btn secondary" type="button" data-close aria-label="បិទ">✕</button>
    </div>
    <div data-body><p class="empty">កំពុងផ្ទុក…</p></div>`, 'wide');
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.showModal();

  async function render() {
    const body = dlg.querySelector('[data-body]');
    try {
      const [data, allowVoid] = await Promise.all([Reports.load(), canVoid()]);
      const p = data.products[sku];
      if (!p) { body.innerHTML = '<p class="empty">រកមិនឃើញទំនិញ</p>'; return; }
      const rows = Reports.stockCard(data, sku);
      const perDay = Reports.dailyOut(data, sku);
      const daysLeft = perDay > 0 ? Math.floor(p.balance / perDay) : null;
      dlg.querySelector('[data-title]').innerHTML =
        `<b>${esc(p.name)}</b> · <span class="sku">${esc(p.sku)}</span> · ${esc(p.category)}`;
      body.innerHTML = `
        <div class="mini-kpis">
          <div><span>សមតុល្យ</span><b>${fmtNum(p.balance)} ${esc(p.unit)}</b></div>
          <div><span>ស្ថានភាព</span>${badge(p.status)}</div>
          <div><span>ចេញ/ថ្ងៃ (២៨ ថ្ងៃ)</span><b>${perDay.toFixed(1)}</b></div>
          <div><span>នៅសល់ប្រហែល</span><b>${daysLeft === null ? '–' : fmtNum(daysLeft) + ' ថ្ងៃ'}</b></div>
        </div>
        <div class="table-wrap">
          <table class="compact">
            <thead><tr>
              <th>កាលបរិច្ឆេទ</th><th>ប្រភេទ</th><th>អ្នកផ្គត់ផ្គង់ / មូលហេតុ</th><th>ចំណាំ</th><th>អ្នកកត់</th>
              <th class="num">ចូល</th><th class="num">ចេញ</th><th class="num">សមតុល្យ</th>${allowVoid ? '<th></th>' : ''}
            </tr></thead>
            <tbody>${rows.length ? rows.slice().reverse().map(m => `
              <tr class="${m.voided ? 'voided' : ''}">
                <td style="white-space:nowrap">${fmtDate(m.date)}</td>
                <td>${typeBadge(m)}${voidedBadge(m)}</td>
                <td>${esc(m.party)}</td>
                <td>${esc(m.note)}</td>
                <td>${esc(m.by || '')}</td>
                <td class="num">${m.type === 'in' ? fmtNum(m.qty) : ''}</td>
                <td class="num">${m.type === 'out' ? fmtNum(m.qty) : ''}</td>
                <td class="num"><b>${fmtNum(m.running)}</b></td>
                ${allowVoid ? `<td>${m.voided ? '' : `<button class="link-btn danger" type="button" data-void="${esc(m.id)}">លុបចោល</button>`}</td>` : ''}
              </tr>`).join('') : `<tr><td colspan="9" class="empty">មិនទាន់មានប្រតិបត្តិការ</td></tr>`}
            </tbody>
          </table>
        </div>`;
      body.querySelectorAll('[data-void]').forEach(btn => btn.addEventListener('click', async () => {
        const m = rows.find(x => String(x.id) === btn.dataset.void);
        if (await voidFlow(m, p.name)) {
          await render();
          if (onChange) onChange();
        }
      }));
    } catch (e) {
      body.innerHTML = `<p class="empty">មានកំហុស៖ ${esc(e.message)}</p>`;
    }
  }
  render();
}
