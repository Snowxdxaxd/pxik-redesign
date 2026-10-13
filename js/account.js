/* Փղիկ.am — personal account: profile, favorites, orders */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
 const fmt = pxik.money;

 const RU = pxik.lang() === 'ru';
 const STATUS_HY = { new: RU ? 'Новый' : 'Նոր', confirmed: RU ? 'Подтверждён' : 'Հաստատված', shipped: RU ? 'Отправлен' : 'Ուղարկված', done: RU ? 'Завершён' : 'Ավարտված' };
 const PAY_HY = { cash: RU ? 'Наличные' : 'Կանխիկ', card: RU ? 'Карта / ArCa' : 'Քարտով / ArCa', idram: 'Idram', credit: RU ? 'Рассрочка 0%' : 'Ապառիկ 0%' };

 /* ---------- auth: user mode or guest (local favorites) ---------- */
 pxik.loadMe().then((user) => {
 if (user) {
 fillProfile(user);
 loadFavorites();
 loadOrders();
 } else {
 // Гостевой режим: избранное из localStorage, профиль/заказы — с приглашением войти
 loadLocalFavorites();
 $('#panel-profile .account-grid').outerHTML =
 `<div class="cart-empty"><b>${I18N.t('Մուտք գործել')}</b><p>${RU ? 'Войдите, чтобы управлять профилем и заказами.' : 'Մուտք գործեք՝ պրոֆիլը և պատվերները կառավարելու համար:'}</p><a class="btn btn-primary" href="auth.html?next=account.html">${I18N.t('Մուտք')}</a></div>`;
 $('#ordersList').innerHTML =
 `<div class="cart-empty"><b>${I18N.t('Պատվերներ դեռ չկան')}</b><p><a class="btn btn-primary" href="auth.html?next=account.html">${I18N.t('Մուտք')}</a></p></div>`;
 switchTab('fav');
 }
 const hash = location.hash.slice(1);
 if (hash) switchTab($('#panel-' + hash) ? hash : 'profile');
 });

 function loadLocalFavorites() {
 let ids = [];
 try { ids = JSON.parse(localStorage.getItem('pxik-wish') || '[]'); } catch (e) { ids = []; }
 if (!ids.length) {
 $('#favGrid').innerHTML = '';
 $('#favEmpty').style.display = 'block';
 return;
 }
 pxik.api('/api/products?limit=48').then((all) => {
 const items = all.items.filter((p) => ids.includes(p.id));
 pxik.renderCards($('#favGrid'), items);
 $('#favEmpty').style.display = items.length ? 'none' : 'block';
 }).catch(console.error);
 }

 function switchTab(name) {
 $$('.pd-tab').forEach((x) => x.classList.toggle('active', x.dataset.panel === name));
 $$('.account-layout .pd-panel').forEach((p) => p.classList.remove('active'));
 const panel = $('#panel-' + name);
 if (panel) panel.classList.add('active');
 }

 $$('.pd-tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.panel)));

 /* ---------- profile ---------- */
 function fillProfile(user) {
 $('#pName').value = user.name;
 $('#pEmail').value = user.email;
 $('#pPhone').value = user.phone || '';
 }

 $('#profileSave').addEventListener('click', async () => {
 try {
 const data = await pxik.api('/api/auth/profile', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ name: $('#pName').value, phone: $('#pPhone').value }),
 });
 pxik.toast('Տվյալները պահպանված են ✔');
 if (window.pxik && data.user) location.reload();
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 });

 $('#pwSave').addEventListener('click', async () => {
 try {
 await pxik.api('/api/auth/password', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ old_password: $('#pwOld').value, new_password: $('#pwNew').value }),
 });
 $('#pwOld').value = $('#pwNew').value = '';
 pxik.toast('Գաղտնաբառը փոխված է ✔');
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 });

 /* ---------- favorites ---------- */
 async function loadFavorites() {
 try {
 const data = await pxik.api('/api/favorites');
 pxik.renderCards($('#favGrid'), data.items);
 $('#favEmpty').style.display = data.items.length ? 'none' : 'block';
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 }

 document.addEventListener('click', async (e) => {
 const wish = e.target.closest('#panel-fav [data-wish]');
 if (wish) {
 const on = await pxik.toggleFav(wish.dataset.wish, wish);
 if (on === false) {
 const card = wish.closest('.product');
 card.style.transition = 'opacity .25s';
 card.style.opacity = '0';
 setTimeout(() => { card.remove(); if (!$('#favGrid').children.length) $('#favEmpty').style.display = 'block'; }, 260);
 }
 }
 const add = e.target.closest('#panel-fav [data-add]');
 if (add) pxik.addToCart(Number(add.dataset.add));
 });

 /* ---------- orders ---------- */
 async function loadOrders() {
 try {
 const data = await pxik.api('/api/my/orders');
 const wrap = $('#ordersList');
 if (!data.orders.length) {
 wrap.innerHTML = '<div class="cart-empty"><b>Պատվերներ դեռ չկան</b><p>Առաջին պատվերը՝ մեկ ուսումնասիրության հեռավորության վրա:</p><a class="btn btn-primary" href="catalog.html">Դեպի կատալոգ</a></div>';
 return;
 }
 wrap.innerHTML = data.orders.map((o) => `
 <div class="o-card acc-order">
 <div class="acc-order-head">
 <div>
 <b>${RU ? 'Заказ' : 'Պատվեր'} #${o.id}</b>
 <span class="adm-sub">${o.created_at.slice(0, 16).replace('T', ' ')} · ${o.delivery_label}</span>
 </div>
 <span class="o-status-pill st-${o.status}">${o.status_label}</span>
 </div>
 <div class="acc-order-items">
 ${o.items.slice(0, 4).map((i) => `
 <span class="o-emoji" title="${pxik.esc(pxik.locName(i))}"><img src="${pxik.esc(i.image || 'img/placeholder.svg')}" alt="" loading="lazy"></span>`).join('')}
 ${o.items.length > 4 ? `<span class="acc-more">+${o.items.length - 4}</span>` : ''}
 </div>
 <div class="acc-order-foot">
 <div class="acc-pay">
 <span class="pay-chip ${o.payment_status === 'paid' ? 'paid' : ''}">
 ${o.payment_status === 'paid' ? `✔ ${RU ? 'Оплачен' : 'Վճարված'}${o.card_last4 ? ' · **** ' + o.card_last4 : ''}` : `⏳ ${RU ? 'Не оплачен' : 'Չվճարված'}`}
 </span>
 <span class="adm-sub">${PAY_HY[o.payment] || o.payment}</span>
 </div>
 <b class="acc-total">${fmt(o.total)}</b>
 </div>
 <div class="acc-order-actions">
 ${o.payment_status !== 'paid' ? `<a class="btn btn-primary" href="pay.html?order=${o.id}">${I18N.t('Վճարել առցանց')}</a>` : ''}
 <a class="btn btn-ghost" href="order.html?id=${o.id}">Մանրամասներ</a>
 </div>
 </div>`).join('');
 if (window.I18N) I18N.apply(wrap);
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 }
})();
