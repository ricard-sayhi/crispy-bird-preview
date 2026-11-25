/* The Crispy Bird · site behaviour (no dependencies).
   Cart, item options, delivery/pickup, open/closed status, postcode check, menu tabs, NL/EN. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DATA = JSON.parse($('#site-data').textContent);
  const MENU = Object.fromEntries(DATA.menu.map(m => [m.id, m]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cb-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('cb-' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  // ------------------------------------------------------------ language
  const S = {
    nl: {
      open: c => `Nu open · bezorging tot ${c}`, opensAt: o => `Gesloten · opent vandaag om ${o} · vooruitbestellen`,
      closed: d => `Gesloten · vooruitbestellen voor ${d}`, days: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
      added: n => `${n} zit in je mand`, sub: 'Subtotaal', disc: '1+1 Tenders', del: 'Bezorging', free: 'Gratis', total: 'Totaal',
      toMin: x => `Nog ${x} tot het minimum`, minOk: m => `Minimum van ${m} gehaald`, needPc: 'Vul je postcode in om het minimum te zien',
      pcLabel: 'Bezorgadres postcode', pcYes: (a, m) => `Ja! We bezorgen in ${a}. Minimum ${m}, gratis bezorging.`,
      pcLocked: 'Hier bezorgen we tijdelijk niet. Afhalen kan wel.', pcNo: 'Hier bezorgen we (nog) niet. Afhalen kan altijd.',
      pcBad: 'Vul een geldige postcode in, bijv. 3431 BM.', pickupNote: 'Afhalen aan de Kruyderlaan 3a, geen minimum.',
      burger: 'Burger', burgerN: n => `Burger ${n}`, dip: 'Dip', freeDip: 'Dip (gratis)', drink: 'Drankje', req: 'kies 1',
      remove: n => `${n} verwijderen`, less: 'Minder', more: 'Meer', change: 'wijzig',
      asap: 'Zo snel mogelijk', preorder: d => `Vooruitbestellen voor ${d}`,
      formOk: 'Dank je! Let op: dit formulier is in dit prototype nog niet gekoppeld.', formErr: 'Vul de verplichte velden in.',
      codeBad: 'Deze code kennen we niet. Controleer de spelling.', codeEmpty: 'Vul eerst een code in.',
      orderProto: 'Dit is een prototype: er is geen bestelling geplaatst. In de live-versie ga je nu naar iDEAL of Wero.',
      orderLink: 'Bestel nu via ons huidige bestelsysteem', emptyCart: 'Je mand is leeg.', expires: n => n <= 0 ? 'Laatste dag' : `Nog ${n} ${n === 1 ? 'dag' : 'dagen'}`,
      pickupAt: 'Afhalen', deliverTo: 'Bezorgen naar', pay: 'Betalen met', note: 'Opmerking', mode: { delivery: 'Bezorgen', pickup: 'Afhalen' },
    },
    en: {
      open: c => `Open now · delivering until ${c}`, opensAt: o => `Closed · opens today at ${o} · pre-order`,
      closed: d => `Closed · pre-order for ${d}`, days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      added: n => `${n} is in your cart`, sub: 'Subtotal', disc: 'Tenders 1+1', del: 'Delivery', free: 'Free', total: 'Total',
      toMin: x => `${x} to go to the minimum`, minOk: m => `${m} minimum reached`, needPc: 'Enter your postcode to see the minimum',
      pcLabel: 'Delivery postcode', pcYes: (a, m) => `Yes! We deliver in ${a}. Minimum ${m}, free delivery.`,
      pcLocked: 'We are not delivering here for now. Pickup is possible.', pcNo: "We don't deliver here (yet). Pickup is always possible.",
      pcBad: 'Enter a valid postcode, e.g. 3431 BM.', pickupNote: 'Pickup at Kruyderlaan 3a, no minimum.',
      burger: 'Burger', burgerN: n => `Burger ${n}`, dip: 'Dip', freeDip: 'Dip (free)', drink: 'Drink', req: 'pick 1',
      remove: n => `Remove ${n}`, less: 'Fewer', more: 'More', change: 'change',
      asap: 'As soon as possible', preorder: d => `Pre-order for ${d}`,
      formOk: 'Thanks! Note: this form is not connected yet in this prototype.', formErr: 'Please fill in the required fields.',
      codeBad: "We don't know this code. Check the spelling.", codeEmpty: 'Enter a code first.',
      orderProto: 'This is a prototype: no order has been placed. On the live site you would now go to iDEAL or Wero.',
      orderLink: 'Order now through our current ordering system', emptyCart: 'Your cart is empty.', expires: n => n <= 0 ? 'Last day' : `${n} ${n === 1 ? 'day' : 'days'} left`,
      pickupAt: 'Pickup', deliverTo: 'Deliver to', pay: 'Pay with', note: 'Note', mode: { delivery: 'Delivery', pickup: 'Pickup' },
    },
  };
  const qsLang = new URLSearchParams(location.search).get('lang');
  let lang = qsLang === 'en' || qsLang === 'nl' ? qsLang : store.get('lang', 'nl');
  const L = () => S[lang];
  const tx = o => (o && typeof o === 'object' ? o[lang] || o.nl : o);
  const eur = n => new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'nl-NL', { style: 'currency', currency: 'EUR' }).format(n).replace(/\s/g, '');

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-en]').forEach(el => {
      if (el.dataset.nl == null) el.dataset.nl = el.innerHTML;
      el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.nl;
    });
    $$('*').forEach(el => {
      for (const a of [...el.attributes]) {
        if (!a.name.startsWith('data-en-')) continue;
        const attr = a.name.slice(8), key = 'nl' + attr.replace(/-/g, '');
        if (el.dataset[key] == null) el.dataset[key] = el.getAttribute(attr) || '';
        el.setAttribute(attr, lang === 'en' ? a.value : el.dataset[key]);
      }
    });
    $$('.money').forEach(m => (m.textContent = eur(+m.dataset.v)));
    $$('[data-lang-label]').forEach(b => (b.textContent = lang === 'en' ? 'NL' : 'EN'));
    $$('crispy-delivery-map').forEach(m => m.setAttribute('lang', lang));
    renderStatus(); renderCart(); renderPcResults(); renderExpiry(); if (isCheckout) renderCheckout();
  }
  $$('[data-lang-toggle]').forEach(b => b.addEventListener('click', () => { lang = lang === 'en' ? 'nl' : 'en'; store.set('lang', lang); applyLang(); }));

  // ------------------------------------------------------------ light / dark (v2 pages)
  // No saved choice = follow the device setting. A click saves the opposite of what is showing now.
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  const shownTheme = () => document.documentElement.dataset.theme || (sysLight.matches ? 'light' : 'dark');
  const syncThemeBtn = () => $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === shownTheme())));
  $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.themeSet; store.set('theme', b.dataset.themeSet); syncThemeBtn();
  }));
  sysLight.addEventListener?.('change', syncThemeBtn); syncThemeBtn();

  // ------------------------------------------------------------ opening status (Europe/Amsterdam)
  function nowNL() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { day, min: +p.hour * 60 + +p.minute };
  }
  const toMin = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };
  const hoursFor = d => DATA.hours.find(h => h.day === d);
  function openState() {
    const { day, min } = nowNL(), h = hoursFor(day);
    if (h.open && min >= toMin(h.open) && min < toMin(h.close)) return { open: true, close: h.close, day };
    if (h.open && min < toMin(h.open)) return { open: false, later: h.open, day };
    for (let i = 1; i <= 7; i++) { const d = (day + i) % 7; if (hoursFor(d).open) return { open: false, next: d, day }; }
    return { open: false, day };
  }
  function renderStatus() {
    const st = openState(), l = L();
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', st.open);
      $('[data-status-text]', el).textContent = st.open ? l.open(st.close) : st.later ? l.opensAt(st.later) : l.closed(l.days[st.next]);
    });
    $$('tr[data-day]').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === st.day));
  }

  // ------------------------------------------------------------ delivery / pickup
  let mode = store.get('mode', 'delivery');
  function setMode(m) { mode = m; store.set('mode', m); syncMode(); renderCart(); if (isCheckout) renderCheckout(); }
  function syncMode() { $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode);
    const s = e.target.closest('[data-set-mode]'); if (s) setMode(s.dataset.setMode);
  });

  // ------------------------------------------------------------ postcode check
  let pc = store.get('pc', null); // { code, pc4, min, area } | { code, status: 'locked'|'out' }
  function checkPostcode(raw) {
    const v = raw.toUpperCase().replace(/\s+/g, '');
    const m = v.match(/^(\d{4})([A-Z]{2})?$/);
    if (!m || +m[1] < 1000) return null;
    const pc4 = m[1], code = m[2] ? `${pc4} ${m[2]}` : pc4;
    if (DATA.locked.some(l => l.code === pc4)) return { code, pc4, status: 'locked' };
    const g = DATA.areas.find(a => a.codes.includes(pc4));
    return g ? { code, pc4, status: 'ok', min: g.min, area: g } : { code, pc4, status: 'out' };
  }
  function pcMessage(r) {
    const l = L();
    if (!r) return '';
    if (r.status === 'ok') return `<span class="chip">✓ ${r.code}</span> ${l.pcYes(tx(r.area).split(':')[0], eur(r.min))}`;
    return `<span class="chip">${r.code}</span> ${r.status === 'locked' ? l.pcLocked : l.pcNo}`;
  }
  function renderPcResults() {
    $$('[data-pc-form]').forEach(f => {
      const out = $('[data-pc-result]', f); if (!out || !f.dataset.touched) return;
      out.className = 'pc-result' + (pc ? ' is-' + pc.status : '');
      out.innerHTML = f.dataset.bad ? L().pcBad : pcMessage(pc);
    });
  }
  function bindPcForm(f) {
    if (pc && $('input', f) && !$('input', f).value) $('input', f).value = pc.code;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const r = checkPostcode($('input', f).value);
      f.dataset.touched = '1';
      if (!r) { f.dataset.bad = '1'; } else { delete f.dataset.bad; pc = r; store.set('pc', r); }
      renderPcResults(); renderCart(); if (isCheckout) renderCheckout();
    });
  }
  $$('[data-pc-form]').forEach(bindPcForm);

  // ------------------------------------------------------------ cart
  let cart = store.get('cart', []);
  const lineKey = l => l.id + '|' + JSON.stringify(l.opts || {}) + '|' + (l.note || '');
  function totals() {
    const sub = cart.reduce((s, l) => s + MENU[l.id].price * l.qty, 0);
    const tenders = cart.filter(l => l.id === 'tenders').reduce((s, l) => s + l.qty, 0);
    const disc = Math.floor(tenders / 2) * MENU.tenders.price;
    const total = Math.round((sub - disc) * 100) / 100;
    const min = mode === 'pickup' ? DATA.pickupMin : pc && pc.status === 'ok' ? pc.min : null;
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const canDeliver = mode === 'pickup' || (pc && pc.status === 'ok');
    const ok = count > 0 && canDeliver && (min == null || total >= min);
    return { sub, disc, total, min, count, ok, canDeliver };
  }
  function save() { store.set('cart', cart); renderCart(); if (isCheckout) renderCheckout(); }
  function addLine(id, opts, qty = 1, note = '') {
    const l = { id, opts, qty, note }, k = lineKey(l), ex = cart.find(x => lineKey(x) === k);
    if (ex) ex.qty += qty; else cart.push(l);
    save();
    bump(); toast(L().added(MENU[id].name));
    return k;
  }
  const optName = id => MENU[id] ? MENU[id].name : id;
  function optText(l) {
    const o = l.opts || {}, parts = [];
    (o.burger || []).forEach(b => parts.push(optName(b)));
    (o.drink || []).forEach(b => parts.push(optName(b)));
    (o.dip || []).forEach(b => parts.push(optName(b)));
    if (l.note) parts.push('“' + l.note + '”');
    return parts.join(' · ');
  }
  // Photos: on v2 pages use the cut-out version and its fit (cover / contain / pad / light) from the build.
  const USE_CUT = document.body.classList.contains('v2');
  const photo = m => (USE_CUT && m.cut ? m.cut : { src: m.img });
  const photoAttrs = m => { const p = photo(m); return `src="${p.src}"${p.fit ? ` class="fit-${p.fit}"` : ''}${p.style ? ` style="${p.style}"` : ''}`; };
  function setPhoto(img, m) { const p = photo(m); img.src = p.src; img.className = p.fit ? 'fit-' + p.fit : ''; img.setAttribute('style', p.style || ''); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function lineHTML(l, i, editable) {
    const m = MENU[l.id], l10n = L();
    return `<li class="line" data-i="${i}">
      <img ${photoAttrs(m)} alt="" width="64" height="64" loading="lazy">
      <div><p class="line-name">${editable ? '' : l.qty + '× '}${esc(m.name)}${m.size ? ' ' + m.size : ''}</p><p class="line-opts">${esc(optText(l))}</p></div>
      <div class="line-right"><span class="line-price">${eur(m.price * l.qty)}</span>
      ${editable ? `<div class="stepper"><button type="button" data-step="-1" aria-label="${esc(l.qty === 1 ? l10n.remove(m.name) : l10n.less)}">${svg('minus')}</button><output aria-live="polite">${l.qty}</output><button type="button" data-step="1" aria-label="${l10n.more}">${svg('plus')}</button></div>` : ''}</div>
    </li>`;
  }
  const ICONS = { minus: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" d="M5 12h14"/>', plus: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" d="M12 5v14m-7-7h14"/>' };
  const svg = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
  function sumsHTML(t) {
    const l = L();
    return `<dt>${l.sub}</dt><dd>${eur(t.sub)}</dd>${t.disc ? `<dt class="disc">${l.disc}</dt><dd class="disc">−${eur(t.disc)}</dd>` : ''}${mode === 'delivery' ? `<dt>${l.del}</dt><dd>${l.free}</dd>` : ''}<dt class="total">${l.total}</dt><dd class="total">${eur(t.total)}</dd>`;
  }
  function renderCart() {
    const t = totals(), l = L();
    $$('[data-cart-count]').forEach(c => { c.textContent = t.count; c.hidden = !t.count; });
    $$('[data-cart-total]').forEach(c => (c.textContent = eur(t.total)));
    const lines = $('[data-lines]'); if (!lines) return;
    lines.innerHTML = cart.map((x, i) => lineHTML(x, i, true)).join('');
    $('[data-empty]').hidden = !!cart.length;
    $('[data-foot]').hidden = !cart.length;
    $('[data-sums]').innerHTML = sumsHTML(t);
    // postcode prompt inside the cart (delivery only)
    const pcBox = $('[data-cart-pc]');
    if (mode === 'delivery' && cart.length) {
      if (!pcBox.dataset.ready) {
        pcBox.innerHTML = `<form data-pc-form novalidate><label class="pc-label" for="pc-cart"></label><div class="pc-row"><input id="pc-cart" autocomplete="postal-code" maxlength="7"><button class="btn btn-black" type="submit">Check</button></div><p class="pc-result" data-pc-result aria-live="polite"></p></form>`;
        bindPcForm($('form', pcBox)); pcBox.dataset.ready = '1';
      }
      $('label', pcBox).textContent = l.pcLabel;
      $('input', pcBox).placeholder = lang === 'en' ? 'e.g. 3431 BM' : 'bijv. 3431 BM';
      pcBox.hidden = false;
    } else pcBox.hidden = true;
    // minimum order progress
    const bar = $('[data-minbar]'), txt = $('[data-minbar-text]'), fill = $('[data-minbar-fill]');
    if (mode === 'pickup') { bar.classList.add('done'); fill.style.width = '100%'; txt.textContent = l.pickupNote; }
    else if (t.min == null) { bar.classList.remove('done'); fill.style.width = '0'; txt.textContent = pc && pc.status !== 'ok' ? (pc.status === 'locked' ? l.pcLocked : l.pcNo) : l.needPc; }
    else { const done = t.total >= t.min; bar.classList.toggle('done', done); fill.style.width = Math.min(100, (t.total / t.min) * 100) + '%'; txt.textContent = done ? l.minOk(eur(t.min)) : l.toMin(eur(t.min - t.total)); }
    const co = $('[data-checkout]');
    co.setAttribute('aria-disabled', String(!t.ok)); co.tabIndex = t.ok ? 0 : -1;
    $('[data-checkout-total]').textContent = eur(t.total);
  }
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-step]'); if (!s) return;
    const i = +s.closest('[data-i]').dataset.i, d = +s.dataset.step;
    cart[i].qty += d; if (cart[i].qty <= 0) cart.splice(i, 1);
    save(); bump();
    const out = $(`[data-lines] [data-i="${i}"] .stepper button`); if (out) out.focus(); else $('[data-cart-close]').focus();
  });
  function bump() { $$('[data-cart-count]').forEach(c => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }); }
  let toastT;
  function toast(msg) { const el = $('[data-toast]'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2200); }

  // drawer
  const drawer = $('[data-drawer]'), scrim = $('[data-scrim]'); let lastFocus;
  function openCart() {
    lastFocus = document.activeElement; drawer.hidden = scrim.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('on'); scrim.classList.add('on'); });
    document.body.style.overflow = 'hidden'; $('[data-cart-close]').focus();
  }
  function closeCart() {
    drawer.classList.remove('on'); scrim.classList.remove('on'); document.body.style.overflow = '';
    setTimeout(() => { drawer.hidden = scrim.hidden = true; }, reduced ? 0 : 240);
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-cart-open]').forEach(b => b.addEventListener('click', openCart));
  $('[data-cart-close]').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  drawer.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
    if (e.key !== 'Tab') return;
    const f = $$('a[href]:not([tabindex="-1"]), button:not([disabled]), input, textarea, select', drawer).filter(x => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
  $('[data-checkout]').addEventListener('click', e => { if (!totals().ok) e.preventDefault(); });
  $$('[data-step-checkout]').forEach(a => a.addEventListener('click', e => { if (!totals().count) { e.preventDefault(); openCart(); } }));

  // ------------------------------------------------------------ item modal
  const modal = $('[data-modal]'), form = $('[data-modal-form]');
  let current = null, qty = 1, sourceBtn = null;
  function radios(name, label, ids, req) {
    return `<fieldset class="opt-group"><legend>${label}${req ? ` <span class="req">${L().req}</span>` : ''}</legend><div class="opts">${ids.map((id, i) =>
      `<label class="opt"><input type="radio" name="${name}" value="${id}"${i === 0 ? ' checked' : ''}><span>${esc(MENU[id].name)}</span></label>`).join('')}</div></fieldset>`;
  }
  function openItem(id, btn) {
    const m = MENU[id], o = m.options, l = L(); current = m; qty = 1; sourceBtn = btn;
    setPhoto($('[data-modal-img]'), m); $('[data-modal-img]').alt = m.name;
    $('[data-modal-title]').textContent = m.name; $('[data-modal-desc]').textContent = tx(m.desc);
    let g = '';
    for (let i = 1; i <= (o.burger || 0); i++) g += radios('burger' + i, o.burger > 1 ? l.burgerN(i) : l.burger, DATA.choices.burger, true);
    if (o.drink) g += radios('drink', l.drink, DATA.choices.drink, true);
    if (o.dip) g += radios('dip', o.freeDip ? l.freeDip : l.dip, DATA.choices.dip, true);
    $('[data-modal-groups]').innerHTML = g;
    form.note.value = ''; renderModalQty();
    modal.showModal();
  }
  function renderModalQty() { $('[data-modal-qty] output').textContent = qty; $('[data-modal-price]').textContent = '· ' + eur(current.price * qty); }
  $('[data-modal-qty]').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; qty = Math.max(1, qty + +b.dataset.q); renderModalQty(); });
  modal.addEventListener('close', () => {
    if (modal.returnValue === 'add' && current) {
      const fd = new FormData(form), o = current.options, opts = {};
      if (o.burger) opts.burger = Array.from({ length: o.burger }, (_, i) => fd.get('burger' + (i + 1)));
      if (o.drink) opts.drink = [fd.get('drink')];
      if (o.dip) opts.dip = [fd.get('dip')];
      addLine(current.id, opts, qty, (fd.get('note') || '').trim());
      if (sourceBtn) pop(sourceBtn);
    }
    modal.returnValue = ''; if (sourceBtn) sourceBtn.focus();
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.close('cancel'); });
  function pop(b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const m = MENU[b.dataset.add];
    if (m.options) openItem(m.id, b); else { addLine(m.id, {}); pop(b); }
  });

  // ------------------------------------------------------------ header, nav, reveals, tabs
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navBtn = $('[data-nav-toggle]'), nav = $('#nav');
  const setNav = open => { nav.classList.toggle('open', open); navBtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
  navBtn.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); navBtn.focus(); } });

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 50 + 'ms'; io.observe(el); });
  } else $$('[data-reveal]').forEach(el => el.classList.add('in'));

  const tabs = $('[data-tabs]');
  if (tabs) {
    const links = $$('a', tabs), secs = links.map(a => $(a.getAttribute('href')));
    const setActive = id => links.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      a.setAttribute('aria-current', String(on));
      if (on) a.parentElement.parentElement.scrollTo({ left: a.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
    });
    const spy = () => {
      const y = header.getBoundingClientRect().bottom + tabs.offsetHeight + 24;
      let cur = secs[0];
      for (const s of secs) if (s.getBoundingClientRect().top <= y) cur = s;
      setActive(cur.id);
    };
    addEventListener('scroll', spy, { passive: true }); spy();
  }

  // ------------------------------------------------------------ reviews carousel
  $$('[data-carousel]').forEach(c => {
    const track = $('[data-track]', c), prev = $('[data-prev]', c), next = $('[data-next-rv]', c);
    const step = () => { const li = track.firstElementChild; return li ? li.getBoundingClientRect().width + 22 : 300; };
    const sync = () => { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); } });
    addEventListener('resize', sync); sync();
  });

  // ------------------------------------------------------------ same-page links scroll smoothly
  const pagePath = p => p.replace(/\/(index\.html)?$/, '/');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || pagePath(url.pathname) !== pagePath(location.pathname)) return;
    const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (url.hash && !target) return;
    e.preventDefault();
    if (nav.classList.contains('open')) setNav(false);
    if (target) { target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); history.pushState(null, '', url.hash); }
    else { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); history.pushState(null, '', url.pathname.split('/').pop() || './'); }
  });

  // ------------------------------------------------------------ deals expiry
  function renderExpiry() {
    $$('[data-expires]').forEach(el => {
      if (!el.dataset.expires) return;
      const days = Math.ceil((new Date(el.dataset.expires + 'T23:59:59') - new Date()) / 864e5);
      el.lastElementChild.textContent = L().expires(days);
    });
  }

  // ------------------------------------------------------------ forms (not connected in the prototype)
  $$('[data-newsletter], [data-contact-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('[data-form-msg]', f), bad = $$('[required]', f).filter(i => !i.checkValidity());
    msg.className = 'form-msg ' + (bad.length ? 'err' : 'ok');
    msg.textContent = bad.length ? L().formErr : L().formOk;
    if (bad.length) bad[0].focus(); else f.reset();
  }));

  // ------------------------------------------------------------ checkout
  const coForm = $('[data-checkout-form]');
  const isCheckout = !!coForm;
  let step = 1;
  function timeSlots() {
    const st = openState(), l = L(), out = [];
    const slots = (h, from) => { for (let m = Math.ceil(Math.max(from, toMin(h.open) + 30) / 15) * 15; m <= toMin(h.close); m += 15) out.push(`${String(m / 60 | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); };
    if (st.open) { out.push(l.asap); slots(hoursFor(st.day), nowNL().min + 30); return out.map(v => [v, v]); }
    const d = st.later ? st.day : st.next, h = hoursFor(d), list = [];
    slots(h, 0);
    const label = st.later ? '' : ` (${l.days[d]})`;
    return out.map(v => [v + label, l.preorder(v + label)]);
  }
  function renderCheckout() {
    const t = totals(), l = L();
    $('[data-co-lines]').innerHTML = cart.length ? cart.map((x, i) => lineHTML(x, i, false)).join('') : `<li>${l.emptyCart} <a href="menu.html">Menu</a></li>`;
    $('[data-co-sums]').innerHTML = sumsHTML(t);
    $('.delivery-only').hidden = mode !== 'delivery';
    $$('.delivery-only [required]').forEach(i => (i.disabled = mode !== 'delivery'));
    const pcIn = $('[data-co-pc]'); if (pc && !pcIn.value) pcIn.value = pc.code;
    const sel = $('[data-co-time]'), prev = sel.value;
    sel.innerHTML = timeSlots().map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');
    if (prev) sel.value = prev;
    if (step === 3) {
      const fd = new FormData(coForm);
      $('[data-co-review]').innerHTML = `<p><strong>${mode === 'pickup' ? l.pickupAt : l.deliverTo}:</strong> ${esc(mode === 'pickup' ? 'Kruyderlaan 3a, Nieuwegein' : `${fd.get('street') || ''}, ${fd.get('postcode') || ''}`)} · ${esc(fd.get('time') || '')}</p>
        <p><strong>${esc(fd.get('name') || '')}</strong> · ${esc(fd.get('phone') || '')} · ${esc(fd.get('email') || '')}</p>
        <p><strong>${l.pay}:</strong> ${fd.get('pay') === 'wero' ? 'Wero' : 'iDEAL'}</p>${fd.get('note') ? `<p><strong>${l.note}:</strong> ${esc(fd.get('note'))}</p>` : ''}`;
    }
  }
  function goStep(n) {
    if (n > step) {
      const bad = $$(`[data-step="${step}"] [required]:not(:disabled)`).filter(i => !i.checkValidity());
      if (step === 1 && mode === 'delivery') {
        const r = checkPostcode($('[data-co-pc]').value);
        $('[data-co-pc]').setCustomValidity(r && r.status === 'ok' ? '' : L().pcNo);
        if (r) { pc = r; store.set('pc', r); renderCart(); }
        if (!(r && r.status === 'ok')) bad.push($('[data-co-pc]'));
      }
      if (bad.length) { bad[0].reportValidity(); return; }
    }
    step = n;
    $$('[data-step]', coForm).forEach(f => (f.hidden = +f.dataset.step !== n));
    $$('[data-step-dot]').forEach(d => { const k = +d.dataset.stepDot; d.toggleAttribute('aria-current', k === n); if (k === n) d.setAttribute('aria-current', 'step'); d.classList.toggle('done', k < n); });
    renderCheckout();
    $(`[data-step="${n}"] legend`).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    const first = $(`[data-step="${n}"] input, [data-step="${n}"] button`); if (first) first.focus({ preventScroll: true });
  }
  if (isCheckout) {
    $$('[data-next]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.next)));
    $('[data-apply-code]').addEventListener('click', () => {
      const v = $('[data-co-code]').value.trim(), msg = $('[data-code-msg]');
      msg.className = 'form-msg err'; msg.textContent = v ? L().codeBad : L().codeEmpty;
    });
    coForm.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('[data-co-msg]'), t = totals();
      if (!t.ok) {
        msg.className = 'form-msg err';
        msg.textContent = !t.count ? L().emptyCart : !t.canDeliver ? L().pcNo : L().toMin(eur(t.min - t.total));
        return;
      }
      msg.className = 'form-msg ok';
      msg.innerHTML = `${L().orderProto} <a href="${DATA.orderSystem}" rel="noopener">${L().orderLink}</a>.`;
    });
  }

  // ------------------------------------------------------------ boot
  syncMode();
  applyLang();
  if (location.hash === '#cart') openCart();
  setInterval(renderStatus, 60000);
})();
