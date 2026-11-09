/* Shared helpers: nav, banner, toast, formatting */

const toLatinDigits = s => String(s).replace(/[០-៩]/g, d => String(d.charCodeAt(0) - 0x17E0));
const fmtMoney = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = n => Number(n || 0).toLocaleString('en-US');
const fmtDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function statusClass(status) {
  if (status === Api.STATUS.OUT) return 'out';
  if (status === Api.STATUS.LOW) return 'low';
  return 'ok';
}
const badge = status => `<span class="badge ${statusClass(status)}">${esc(status)}</span>`;

function toast(msg, type = '') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function renderShell() {
  const page = document.body.dataset.page;
  const shop = (window.APP_CONFIG && APP_CONFIG.SHOP_NAME) || 'ហាង';
  const links = [
    ['index.html', 'products', 'បញ្ជីទំនិញ'],
    ['stock.html', 'stock', 'ស្តុកចូល/ចេញ'],
    ['balance.html', 'balance', 'សមតុល្យ'],
  ];
  const header = document.createElement('header');
  header.innerHTML = `
    <div class="topbar"><div class="inner">
      <a class="brand" href="index.html"><img class="logo" src="assets/logo.svg" alt="" width="34" height="34">${esc(shop)}</a>
      <nav aria-label="ម៉ឺនុយ">${links.map(([href, key, label]) =>
        `<a href="${href}" class="${key === page ? 'active' : ''}">${label}</a>`).join('')}</nav>
    </div></div>
    <div class="mode-banner ${Api.live ? 'live' : ''}">
      ${Api.live
        ? '● ភ្ជាប់ជាមួយ Google Sheet រួចរាល់'
        : 'Demo Mode — ទិន្នន័យរក្សាទុកក្នុង Browser។ ដាក់ API_URL ក្នុង js/config.js ដើម្បីភ្ជាប់ Google Sheet។'}
    </div>`;
  document.body.prepend(header);

  const footer = document.createElement('footer');
  footer.innerHTML = `${esc(shop)} · Stock &amp; Inventory · Google Sheets + Apps Script`;
  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', renderShell);
