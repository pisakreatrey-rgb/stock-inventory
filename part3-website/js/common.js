/* Shared helpers: nav, banner, toast, formatting, login */

const toLatinDigits = s => String(s).replace(/[០-៩]/g, d => String(d.charCodeAt(0) - 0x17E0));
const fmtMoney = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = n => Number(n || 0).toLocaleString('en-US');
const fmtDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtDay = d => {
  const x = new Date(d);
  if (isNaN(x)) return String(d);
  const p = n => String(n).padStart(2, '0');
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROLE_LABEL = { owner: 'ម្ចាស់ហាង', staff: 'បុគ្គលិក' };

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

/** បង្ហាញកំហុស លើកលែងតែពេលអ្នកប្រើចុចបោះបង់ */
function showError(e) {
  if (e && e.code === 'CANCEL') return;
  toast((e && e.message) || 'មានកំហុស', 'error');
}

/* ---------------- ចូលគណនី (PIN) ---------------- */

function loginDialog(reason) {
  return new Promise((resolve, reject) => {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form method="dialog" novalidate>
        <h2>ចូលគណនី</h2>
        <p class="hint" style="margin:-.25rem 0 1rem">${esc(reason || 'សូមបញ្ចូល PIN របស់អ្នក ដើម្បីកត់ត្រាស្តុក។')}</p>
        <div class="field">
          <label for="pinInput">PIN</label>
          <input id="pinInput" type="password" inputmode="numeric" autocomplete="current-password" required placeholder="••••••">
          ${Api.live ? '' : '<div class="hint">Demo៖ ម្ចាស់ហាង <b>1111</b> · អ្នកលក់ <b>2222</b></div>'}
          <div class="form-error" role="alert"></div>
        </div>
        <div class="dialog-actions">
          <button class="btn secondary" type="button" data-cancel>បោះបង់</button>
          <button class="btn" type="submit">ចូលគណនី</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    const input = dlg.querySelector('input');
    const err = dlg.querySelector('.form-error');
    const submit = dlg.querySelector('[type=submit]');
    let done = false;

    dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      dlg.remove();
      if (!done) reject(Object.assign(new Error('បានបោះបង់ការចូលគណនី។'), { code: 'CANCEL' }));
    });
    dlg.querySelector('form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const pin = toLatinDigits(input.value).trim();
      if (!pin) { err.textContent = 'សូមបញ្ចូល PIN។'; return; }
      submit.disabled = true;
      err.textContent = '';
      try {
        const u = await Api.login(pin);
        Api.session.set(u);
        done = true;
        dlg.close();
        renderUserChip();
        toast(`សូមស្វាគមន៍ ${u.name}`, 'success');
        resolve(u);
      } catch (e) {
        err.textContent = e.message;
        input.select();
      } finally {
        submit.disabled = false;
      }
    });
    dlg.showModal();
    input.focus();
  });
}

const Auth = {
  user: () => Api.session.get(),
  isOwner() {
    const u = Api.session.get();
    return !!(u && u.token && u.role === Api.ROLE.OWNER);
  },
  /** ធានាថាបានចូលគណនី (owner: true = ត្រូវការម្ចាស់ហាង)។ Backend គ្មាន PIN → អនុញ្ញាតភ្លាម */
  async require({ owner = false } = {}) {
    const info = await Api.info();
    if (!info.auth) return { name: '', role: Api.ROLE.OWNER, open: true };
    const u = Api.session.get();
    if (u && u.token && (!owner || u.role === Api.ROLE.OWNER)) return u;
    return loginDialog(owner ? 'សកម្មភាពនេះសម្រាប់តែម្ចាស់ហាង។ សូមបញ្ចូល PIN ម្ចាស់ហាង។' : '');
  },
  logout() {
    Api.session.clear();
    location.reload();
  },
};

/** ហៅ fn ក្រោយចូលគណនី · បើ Session ផុតកំណត់ សុំ PIN ម្តងទៀត ហើយសាកម្តងទៀត */
async function withAuth(fn, opts) {
  await Auth.require(opts);
  try {
    return await fn();
  } catch (e) {
    if (e.code !== 'AUTH') throw e;
    Api.session.clear();
    await Auth.require(opts);
    return fn();
  }
}

async function renderUserChip() {
  const box = document.getElementById('userChip');
  if (!box) return;
  const info = await Api.info();
  if (!info.auth) { box.innerHTML = ''; return; }
  const u = Api.session.get();
  box.innerHTML = u && u.token
    ? `<span class="who" title="${esc(ROLE_LABEL[u.role] || '')}">👤 ${esc(u.name)}</span>
       <button type="button" class="link-btn" data-logout>ចាកចេញ</button>`
    : '<button type="button" class="link-btn" data-login>ចូលគណនី</button>';
  const out = box.querySelector('[data-logout]');
  if (out) out.addEventListener('click', Auth.logout);
  const login = box.querySelector('[data-login]');
  if (login) login.addEventListener('click', () => loginDialog().catch(() => {}));
}

/* ---------------- Header / Footer ---------------- */

function renderShell() {
  const page = document.body.dataset.page;
  const shop = (window.APP_CONFIG && APP_CONFIG.SHOP_NAME) || 'ហាង';
  const links = [
    ['dashboard.html', 'dashboard', 'ផ្ទាំងគ្រប់គ្រង'],
    ['index.html', 'products', 'ទំនិញ'],
    ['stock.html', 'stock', 'ស្តុកចូល/ចេញ'],
    ['balance.html', 'balance', 'សមតុល្យ'],
    ['count.html', 'count', 'រាប់ស្តុក'],
    ['report.html', 'report', 'របាយការណ៍'],
    ['portfolio.html', 'portfolio', 'អំពីគម្រោង'],
  ];
  const header = document.createElement('header');
  header.innerHTML = `
    <div class="topbar"><div class="inner">
      <a class="brand" href="dashboard.html"><img class="logo" src="assets/logo.svg" alt="" width="34" height="34">${esc(shop)}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mainNav">☰ ម៉ឺនុយ</button>
      <nav id="mainNav" aria-label="ម៉ឺនុយ">${links.map(([href, key, label]) =>
        `<a href="${href}" class="${key === page ? 'active' : ''}"${key === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        <div class="user-chip" id="userChip"></div>
      </nav>
    </div></div>
    <div class="mode-banner ${Api.live ? 'live' : ''}" id="modeBanner">
      ${Api.live
        ? '● ភ្ជាប់ជាមួយ Google Sheet រួចរាល់'
        : 'Demo Mode — ទិន្នន័យរក្សាទុកក្នុង Browser។ ដាក់ API_URL ក្នុង js/config.js ដើម្បីភ្ជាប់ Google Sheet។'}
    </div>`;
  document.body.prepend(header);

  const btn = header.querySelector('.menu-btn');
  btn.addEventListener('click', () => {
    const open = header.querySelector('nav').classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  Api.info().then(info => {
    if (Api.live && info.version < 2) {
      document.getElementById('modeBanner').insertAdjacentHTML('beforeend',
        ' · Backend ចាស់ — សូម Deploy Code.gs ថ្មី ដើម្បីប្រើ PIN, ការលុបចោល និងការរាប់ស្តុក');
    }
    renderUserChip();
  });

  const footer = document.createElement('footer');
  const cfg = window.APP_CONFIG || {};
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div>© ${year} ${esc(shop)} · Stock &amp; Inventory · Google Sheets + Apps Script</div>
    <div class="foot-links">
      ${cfg.AUTHOR ? `<span>រៀបចំដោយ ${esc(cfg.AUTHOR)}</span>` : ''}
      <a href="portfolio.html">អំពីគម្រោង</a>
      ${cfg.REPO_URL ? `<a href="${esc(cfg.REPO_URL)}" target="_blank" rel="noopener">GitHub</a>` : ''}
      ${cfg.VIDEO_URL ? `<a href="${esc(cfg.VIDEO_URL)}" target="_blank" rel="noopener">Video Demo</a>` : ''}
    </div>`;
  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', renderShell);
