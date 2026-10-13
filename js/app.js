/* Փղիկ.am — shared frontend core: API, session, auth, favorites, cart, card template */
(function () {
 'use strict';

 const SID_KEY = 'pxik-sid';
 const WISH_KEY = 'pxik-wish';
 const HEART_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>';
 const PLUS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

 let ME = null; // current user or null
 let SERVER_FAVS = new Set(); // favorites ids (server, when logged in)

 /* ---------- display language & currency (set by lang.js switchers) ---------- */
 const CURS = {
 amd: { rate: 1, sym: 'դր', pos: 'after', dec: 0 },
 usd: { rate: 1 / 385, sym: '$', pos: 'before', dec: 2 },
 eur: { rate: 1 / 420, sym: '€', pos: 'before', dec: 2 },
 rub: { rate: 1 / 4.2, sym: '₽', pos: 'after', dec: 0 },
 };
 let CUR = 'amd';
 try { CUR = localStorage.getItem('pxik-cur') || 'amd'; } catch (e) { /* ignore */ }
 if (!CURS[CUR]) CUR = 'amd';

 function money(n) {
 const c = CURS[CUR];
 const v = Math.round(n * c.rate * Math.pow(10, c.dec)) / Math.pow(10, c.dec);
 const str = v.toLocaleString('ru-RU', { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec }).replace(/\u00A0/g, ' ');
 return c.pos === 'before' ? `${c.sym} ${str}` : `${str} ${c.sym}`;
 }

 function locName(obj) {
 // localized name: ru when translation exists
 if (window.I18N && I18N.LANG === 'ru' && obj && obj.name_ru) return obj.name_ru;
 return obj ? obj.name : '';
 }
 function locDesc(obj) {
 if (window.I18N && I18N.LANG === 'ru' && obj && obj.description_ru) return obj.description_ru;
 return obj ? obj.description : '';
 }

 function esc(s) {
 return String(s == null ? '' : s)
 .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
 }

 /* ---------- session (cart) ---------- */
 function getSid() {
 let s = null;
 try { s = localStorage.getItem(SID_KEY); } catch (e) { /* storage off */ }
 if (!s || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(s)) {
 s = (crypto.randomUUID ? crypto.randomUUID() : 'sid-' + Date.now() + '-' + Math.random().toString(16).slice(2));
 try { localStorage.setItem(SID_KEY, s); } catch (e) { /* ignore */ }
 }
 return s;
 }

 async function api(path, opts) {
 opts = opts || {};
 opts.headers = Object.assign({ 'X-Sid': getSid() }, opts.headers || {});
 const res = await fetch(path, opts);
 let data = null;
 try { data = await res.json(); } catch (e) { /* non-json */ }
 if (!res.ok) {
 const err = new Error((data && data.error) || 'Սխալ սերվերի հետ կապի ժամանակ');
 err.status = res.status;
 throw err;
 }
 return data;
 }

 /* ---------- toast ---------- */
 const toastEl = document.getElementById('toast');
 let toastTimer = null;
 function toast(msg) {
 if (!toastEl) return;
 if (window.I18N) msg = I18N.t(msg);
 toastEl.textContent = msg;
 toastEl.classList.add('show');
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
 }

 /* ---------- auth ---------- */
 function me() { return ME; }
 function isFav(id) {
 id = Number(id);
 return ME ? SERVER_FAVS.has(id) : localWish().includes(id);
 }
 function localWish() {
 try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch (e) { return []; }
 }

 async function initSession() {
 try {
 const boot = await api('/api/bootstrap');
 SERVER_FAVS = new Set(boot.favorites || []);
 return boot;
 } catch (e) {
 console.error(e);
 return null;
 }
 }

 async function loadMe() {
 try {
 const data = await api('/api/auth/me');
 ME = data.user || null;
 } catch (e) { ME = null; }
 if (ME) {
 try {
 const favs = await api('/api/favorites');
 SERVER_FAVS = new Set(favs.ids || []);
 } catch (e) { /* ignore */ }
 }
 return ME;
 }

 async function logout() {
 try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
 ME = null;
 SERVER_FAVS = new Set();
 window.location.href = 'index.html';
 }

 /* ---------- favorites (server for users, localStorage for guests) ---------- */
 function setCartCount(n) {
 const el = document.getElementById('cartCount');
 if (!el) return;
 el.textContent = n;
 el.classList.remove('bump');
 void el.offsetWidth;
 el.classList.add('bump');
 }

 async function toggleFav(id, btn) {
 id = Number(id);
 if (ME) {
 try {
 const res = await api('/api/favorites/toggle', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ product_id: id }),
 });
 if (res.on) SERVER_FAVS.add(id); else SERVER_FAVS.delete(id);
 if (btn) btn.classList.toggle('on', res.on);
 toast(res.on ? 'Ավելացվեց ընտրյալներում ' : 'Հեռացվեց ընտրյալներից');
 return res.on;
 } catch (e) {
 toast(' ' + e.message);
 return null;
 }
 }
 const list = localWish();
 const i = list.indexOf(id);
 if (i >= 0) { list.splice(i, 1); toast('Հեռացվեց ընտրյալներից'); } else { list.push(id); toast('Ավելացվեց ընտրյալներում'); }
 try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
 if (btn) btn.classList.toggle('on', i < 0);
 return i < 0;
 }

 async function mergeGuestFavorites() {
 const list = localWish();
 if (list.length && ME) {
 try {
 await api('/api/favorites/merge', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ids: list }),
 });
 } catch (e) { /* ignore */ }
 }
 try { localStorage.setItem(WISH_KEY, '[]'); } catch (e) { /* ignore */ }
 }

 async function addToCart(productId, qty) {
 try {
 const data = await api('/api/cart/add', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ product_id: productId, qty: qty || 1 }),
 });
 setCartCount(data.count);
 toast('Ավելացվեց զամբյուղում');
 return data;
 } catch (e) {
 toast(' ' + e.message);
 }
 }

 async function refreshCartCount() {
 try {
 const data = await api('/api/bootstrap');
 setCartCount(data.cartCount);
 return data;
 } catch (e) {
 console.error(e);
 }
 }

 /* ---------- product card ---------- */
 function badgesHtml(p) {
 let out = '';
 if (p.is_sale && p.discount) out += `<span class="badge b-sale">-${p.discount}%</span>`;
 if (p.badge === 'new') out += '<span class="badge b-new">Նոր</span>';
 if (p.badge === 'hit') out += '<span class="badge b-hot">Հիթ</span>';
 if (p.stock === 0) out += '<span class="badge b-stock">Սպառված</span>';
 return out;
 }

 function mediaHtml(p) {
 const img = (p.images && p.images[0]) || 'img/placeholder.svg';
 return `<img class="p-img" src="${esc(img)}" alt="${esc(locName(p))}" loading="lazy" decoding="async" width="480" height="360">`;
 }

 function cardHtml(p) {
 const old = p.old_price ? `<s>${money(p.old_price)}</s>` : '';
 const wished = isFav(p.id) ? ' on' : '';
 const disabled = p.stock === 0 ? ' disabled' : '';
 const nm = esc(locName(p));
 return `
 <article class="product${p.stock === 0 ? ' out' : ''}" data-id="${p.id}">
 <div class="p-media" style="--tint:${esc(p.tint)}">
 ${mediaHtml(p)}
 <span class="badges">${badgesHtml(p)}</span>
 <button class="wish${wished}" data-wish="${p.id}" aria-label="${nm}">${HEART_SVG}</button>
 </div>
 <div class="p-body">
 <div class="p-rate">★ ${Number(p.rating).toFixed(1)} <span>(${p.reviews_count})</span></div>
 <h3 class="p-title">${nm}</h3>
 <div class="p-foot">
 <div class="p-price"><b>${money(p.price)}</b> ${old}</div>
 <button class="p-add" data-add="${p.id}" aria-label="add"${disabled}>${PLUS_SVG}</button>
 </div>
 </div>
 </article>`;
 }

 function renderCards(container, items) {
 if (!container) return;
 container.innerHTML = items.map(cardHtml).join('');
 if (window.I18N) I18N.apply(container);
 }

 function stars(n) {
 const full = Math.round(n);
 return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
 }

 window.pxik = {
 api, money, esc, toast, addToCart, refreshCartCount, setCartCount,
 cardHtml, badgesHtml, renderCards, stars, locName, locDesc,
 me, loadMe, logout, initSession, isFav, toggleFav, mergeGuestFavorites,
 lang: () => (window.I18N ? I18N.LANG : 'hy'),
 get ME() { return ME; },
 };
})();
