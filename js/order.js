/* Փղիկ.am — order success page */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const url = new URL(location.href);
 const id = Number(url.searchParams.get('id'));
 const justPaid = url.searchParams.get('paid') === '1';

 if (!id) {
 $('#orderWrap').innerHTML = '<div class="cart-empty"><b>Պատվեր չի ընտրված</b><p><a href="catalog.html">Դեպի կատալոգ</a></p></div>';
 } else {
 pxik.api('/api/order/' + id).then((data) => {
 const o = data.order;
 const STATUS_HY = { new: 'Նոր', confirmed: 'Հաստատված', shipped: 'Ուղարկված', done: 'Ավարտված' };

 $('#orderWrap').innerHTML = `
 ${justPaid ? '<div class="pay-banner">Վճարումն ընդունված է առցանց</div>' : ''}
 <div class="order-success">
 <div class="o-check">✔</div>
 <h1>${pxik.lang() === 'ru' ? `Заказ #${o.id} принят` : `Պատվեր #${o.id} ընդունված է`}</h1>
 <p class="o-sub">${pxik.lang() === 'ru' ? 'Специалист свяжется с вами в течение 15 минут для подтверждения заказа.' : 'Մասնագետը կկապվի ձեզ հետ 15 րոպեի ընթացքում՝ պատվերը հաստատելու համար:'}</p>
 <div class="o-grid">
 <div class="o-card">
 <h4>Տվյալներ</h4>
 <div class="o-row"><span>Անուն</span><b>${pxik.esc(o.name)}</b></div>
 <div class="o-row"><span>Հեռախոս</span><b>${pxik.esc(o.phone)}</b></div>
 <div class="o-row"><span>Հասցե</span><b>${pxik.esc(o.address)}</b></div>
 <div class="o-row"><span>Առաքում</span><b>${o.delivery_label}</b></div>
 <div class="o-row"><span>Վճարում</span><b>${o.payment_label}</b></div>
 <div class="o-row"><span>Կարգավիճակ</span><b class="o-status-pill st-${o.status}">${o.status_label || STATUS_HY[o.status]}</b></div>
 <div class="o-row"><span>Վճարումը</span><b class="pay-chip ${o.payment_status === 'paid' ? 'paid' : ''}">${o.payment_status === 'paid' ? `Վճարված${o.card_last4 ? ' · **** ' + o.card_last4 : ''}` : 'Չվճարված'}</b></div>
 ${o.paid_at ? `<div class="o-row"><span>Վճարման ամսաթիվը</span><b>${o.paid_at.slice(0, 16).replace('T', ' ')}</b></div>` : ''}
 </div>
 <div class="o-card">
 <h4>Ապրանքներ</h4>
 ${data.items.map((i) => `
 <div class="o-item">
 <span class="o-emoji"><img src="${pxik.esc(i.image || 'img/placeholder.svg')}" alt="" loading="lazy"></span>
 <span class="o-name">${pxik.esc(i.name)} × ${i.qty}</span>
 <b>${pxik.money(i.price * i.qty)}</b>
 </div>`).join('')}
 <div class="o-row o-total"><span>Առաքում</span><b>${o.delivery_cost ? pxik.money(o.delivery_cost) : I18N.t('Անվճար')}</b></div>
 ${o.discount ? `<div class="o-row o-total"><span>Զեղչ</span><b>−${pxik.money(o.discount)} դր</b></div>` : ''}
 <div class="o-row o-total"><span>Ընդհանուր</span><b>${pxik.money(o.total)} դր</b></div>
 </div>
 </div>
 <div class="o-actions">
 ${o.payment_status !== 'paid' ? `<a class="btn btn-primary" href="pay.html?order=${o.id}">Վճարել առցանց</a>` : ''}
 <a class="btn ${o.payment_status === 'paid' ? 'btn-primary' : 'btn-ghost'}" href="catalog.html">Շարունակել գնումները</a>
 <a class="btn btn-ghost" href="index.html">Գլխավոր էջ</a>
 </div>
 </div>`;
 if (window.I18N) I18N.apply(document.getElementById('orderWrap'));
 }).catch((e) => {
 $('#orderWrap').innerHTML = `<div class="cart-empty"><b>${pxik.esc(e.message)}</b><p><a href="catalog.html">Դեպի կատալոգ</a></p></div>`;
 });
 }
})();
