/* Փղիկ.am — online payment (sandbox gateway) */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const fmt = pxik.money;
 const DELIVERY_HY = { courier: 'Առաքիչով՝ Երևան', region: 'Առաքում մարզեր', pickup: 'Վերցնել խանութից' };

 const oid = Number(new URL(location.href).searchParams.get('order'));

 if (!oid) {
 $('#payRoot').innerHTML = '<div class="cart-empty" style="grid-column:1/-1"><b>Պատվեր չի ընտրված</b><p><a href="account.html#orders">Իմ պատվերները</a></p></div>';
 } else {
 pxik.api('/api/order/' + oid).then((data) => {
 const o = data.order;
 const count = data.items.reduce((s, i) => s + i.qty, 0);
 if (o.payment_status === 'paid') {
 $('#payRoot').innerHTML = `<div class="cart-empty" style="grid-column:1/-1"><div class="big">✔</div><b>Պատվեր #${o.id} արդեն վճարված է</b><p>Անհրաժեշտության դեպքում կապվեք մեզ հետ:</p><a class="btn btn-primary" href="order.html?id=${o.id}">Պատվերի մանրամասներ</a></div>`;
 return;
 }
 $('#paySummary').innerHTML = `
 <div class="o-row"><span>Պատվեր</span><b>#${o.id}</b></div>
 <div class="o-row"><span>Ապրանքներ</span><b>${count} հատ</b></div>
 <div class="o-row"><span>Առաքում</span><b>${DELIVERY_HY[o.delivery] || o.delivery}</b></div>
 ${o.discount ? `<div class="o-row"><span>Զեղչ</span><b>−${fmt(o.discount)} դր</b></div>` : ''}
 <div class="o-row"><span>${I18N.t('Առաքման արժեք')}</span><b>${o.delivery_cost ? fmt(o.delivery_cost) : I18N.t('Անվճար')}</b></div>
 <div class="o-row o-total"><span>${I18N.t('Վճարելու է')}</span><b>${fmt(o.total)}</b></div>`;
 }).catch((e) => {
 $('#payRoot').innerHTML = `<div class="cart-empty" style="grid-column:1/-1"><b>${pxik.esc(e.message)}</b><p><a href="account.html#orders">Իմ պատվերները</a></p></div>`;
 $('#payRoot').nextElementSibling.style.display = 'none';
 });
 }

 /* card number formatting: 0000 0000 0000 0000 */
 $('#cardNumber').addEventListener('input', (e) => {
 const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
 e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
 });
 $('#cardExp').addEventListener('input', (e) => {
 let v = e.target.value.replace(/\D/g, '').slice(0, 4);
 if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
 e.target.value = v;
 });

 $('#payBtn').addEventListener('click', async () => {
 const btn = $('#payBtn');
 btn.disabled = true;
 btn.textContent = 'Մշակվում է…';
 try {
 const res = await pxik.api(`/api/orders/${oid}/pay`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 card_number: $('#cardNumber').value,
 exp: $('#cardExp').value,
 cvv: $('#cardCvv').value,
 holder: $('#cardHolder').value,
 }),
 });
 pxik.toast((pxik.lang() === 'ru' ? 'Платёж принят ✔ Чек: ' : 'Վճարումն ընդունված է ✔ Անդորրագիր՝ ') + res.receipt);
 setTimeout(() => { window.location.href = 'order.html?id=' + oid; }, 900);
 } catch (e) {
 pxik.toast(' ' + e.message);
 btn.disabled = false;
 btn.textContent = 'Վճարել';
 }
 });
})();
