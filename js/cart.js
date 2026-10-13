/* Փղիկ.am — cart page: server cart, promo, checkout */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 const root = $('[data-page="cart"]');
 if (!root) return;

 const list = $('#cartList');
 const summary = $('#cartSummary');
 const fmt = pxik.money;
 const FREE_FROM = 10000;
 const DELIVERY_COST = 1000;
 let lastData = null;

 function deliveryCost() {
 const method = ($('input[name="delivery"]:checked') || {}).value || 'courier';
 if (method === 'pickup') return 0;
 if (method === 'region') return DELIVERY_COST;
 return lastData && lastData.subtotal >= FREE_FROM ? 0 : DELIVERY_COST;
 }

 function deliveryLabel() {
 const cost = deliveryCost();
 return cost === 0 ? `<b style="color:var(--mint)">${I18N.t('Անվճար')}</b>` : `<b>${fmt(cost)}</b>`;
 }

 function render(data) {
 lastData = data;
 pxik.setCartCount(data.count);

 if (!data.items.length) {
 list.innerHTML = '<div class="cart-empty"><b>Զամբյուղը դատարկ է</b><p>Ընտրեք խաղալիքներ կատալոգից՝ և վերադարձեք այստեղ:</p><a class="btn btn-primary" href="catalog.html">Դեպի կատալոգ</a></div>';
 summary.style.opacity = '.55';
 $('#checkoutBtn').disabled = true;
 if (window.I18N) I18N.apply(list);
 } else {
 summary.style.opacity = '';
 $('#checkoutBtn').disabled = false;
 const unit = pxik.lang() === 'ru' ? 'шт.' : 'հատ';
 list.innerHTML = data.items.map((i) => `
 <div class="cart-item" data-id="${i.product_id}">
 <a class="ci-img" href="product.html?id=${i.product_id}"><img src="${pxik.esc(i.image || 'img/placeholder.svg')}" alt="" loading="lazy"></a>
 <div class="ci-info">
 <a class="ci-title" href="product.html?id=${i.product_id}">${pxik.esc(pxik.locName(i))}</a>
 <div class="ci-meta">${fmt(i.price)} / ${unit} · ${I18N.t('Առկա է')}: ${i.stock} ${unit}</div>
 <button class="ci-remove" data-remove="${i.product_id}">Հեռացնել</button>
 </div>
 <div class="ci-side">
 <div class="qty">
 <button class="ci-minus" data-minus="${i.product_id}" aria-label="Նվազեցնել">−</button>
 <input class="ci-qty" data-qty="${i.product_id}" value="${i.qty}" inputmode="numeric" aria-label="Քանակը">
 <button class="ci-plus" data-plus="${i.product_id}" aria-label="Ավելացնել">+</button>
 </div>
 <div class="ci-price">${fmt(i.total)}</div>
 </div>
 </div>`).join('') + '<a class="btn btn-outline" href="catalog.html">← Շարունակել գնումները</a>';
 if (window.I18N) I18N.apply(list);
 }

 $('#promoState').textContent = data.promo ? `${data.promo} (−${data.percent}%)` : '—';
 $('#sumItems').textContent = fmt(data.subtotal);
 $('#sumDiscount').textContent = '−' + fmt(data.discount);
 $('#sumDelivery').innerHTML = deliveryLabel();
 $('#sumTotal').textContent = fmt(data.subtotal - data.discount + deliveryCost());
 }

 function load() {
 pxik.api('/api/cart').then(render).catch((e) => pxik.toast(' ' + e.message));
 }

 /* ---------- Item actions (delegated) ---------- */
 list.addEventListener('click', (e) => {
 const remove = e.target.closest('[data-remove]');
 if (remove) {
 pxik.api('/api/cart/remove', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ product_id: Number(remove.dataset.remove) }),
 }).then((d) => { render(d); pxik.toast('Ապրանքը հեռացվեց զամբյուղից'); }).catch(console.error);
 return;
 }
 const minus = e.target.closest('[data-minus]');
 const plus = e.target.closest('[data-plus]');
 if (minus || plus) {
 const input = (minus || plus).closest('.qty').querySelector('.ci-qty');
 const id = Number((minus || plus).dataset.minus || (plus ? plus.dataset.plus : 0));
 const val = Math.max(1, parseInt(input.value, 10) || 1) + (plus ? 1 : -1);
 input.value = Math.max(1, val);
 pxik.api('/api/cart/update', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ product_id: id, qty: parseInt(input.value, 10) }),
 }).then(render).catch(console.error);
 }
 });

 list.addEventListener('change', (e) => {
 if (e.target.classList.contains('ci-qty')) {
 pxik.api('/api/cart/update', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ product_id: Number(e.target.dataset.qty), qty: parseInt(e.target.value, 10) || 1 }),
 }).then(render).catch(console.error);
 }
 });

 /* ---------- Promo ---------- */
 $('#promoApply').addEventListener('click', () => {
 const code = ($('#promoInput').value || '').trim();
 pxik.api('/api/cart/promo', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ code }),
 }).then((d) => {
 render(d);
 pxik.toast(d.promo ? `Կոդը ակտիվացվեց ✔ Զեղչ՝ ${d.percent}%` : 'Կոդը հանվեց');
 }).catch((e) => pxik.toast(' ' + e.message));
 });

 /* ---------- Delivery / payment radio cards ---------- */
 $$('.opt input').forEach((inp) => {
 inp.addEventListener('change', () => {
 $$('.opt input[name="' + inp.name + '"]').forEach((i) => {
 i.closest('.opt').classList.toggle('checked', i.checked);
 });
 if (inp.name === 'delivery') render(lastData);
 });
 });

 /* ---------- Checkout ---------- */
 $('#checkoutBtn').addEventListener('click', () => {
 const form = $('#checkoutForm');
 form.style.display = form.style.display === 'block' ? 'none' : 'block';
 if (form.style.display === 'block') form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 });

 $('#orderSubmit').addEventListener('click', () => {
 const payload = {
 name: $('#fName').value, phone: $('#fPhone').value, address: $('#fAddress').value,
 comment: $('#fComment').value,
 delivery: ($('input[name="delivery"]:checked') || {}).value,
 payment: ($('input[name="pay"]:checked') || {}).value,
 };
 pxik.api('/api/order', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 }).then((d) => {
 pxik.setCartCount(0);
 window.location.href = 'order.html?id=' + d.id;
 }).catch((e) => pxik.toast(' ' + e.message));
 });

 load();
})();
