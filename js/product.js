/* Փղիկ.am — product page: detail from API, gallery, qty, installment, tabs */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 const root = $('[data-page="product"]');
 if (!root) return;

 const url = new URL(location.href);
 const id = Number(url.searchParams.get('id')) || 1;
 let price = 0;

 const fmt = pxik.money;

 function renderBreadcrumb(p, catSlug) {
 const crumb = $('#crumbCat');
 if (crumb) {
 crumb.href = 'catalog.html?category=' + catSlug;
 pxik.api('/api/bootstrap').then((data) => {
 const cat = data.categories.find((c) => c.slug === catSlug);
 if (cat) crumb.textContent = pxik.curName(cat);
 }).catch(() => { crumb.textContent = p.category_name || 'Կատալոգ'; });
 }
 const crumbName = $('#crumbName');
 if (crumbName) crumbName.textContent = pxik.locName(p);
 }

 function render(p) {
 price = p.price;
 document.title = p.name + ' — Փղիկ.am';

 const imgs = (p.images && p.images.length) ? p.images : ['img/placeholder.svg'];
 $('#pdMedia').style.setProperty('--tint', p.tint);
 $('#pdImg').src = imgs[0];
 $('#pdBadges').innerHTML = pxik.badgesHtml(p);

 $('#pdThumbs').innerHTML = imgs.map((src, i) =>
 `<button class="pd-thumb${i === 0 ? ' active' : ''}" data-src="${src}" aria-label="Լուսանկար ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`).join('');

 $('#pdName').textContent = pxik.locName(p);
 $('#pdRate').innerHTML = `★ ${Number(p.rating).toFixed(1)} <span>(${p.reviews_count} կարծիք)</span>`;
 $('#pdCode').textContent = 'Կոդ՝ ' + p.code;
 $('#pdStock').textContent = I18N.t(p.stock > 0 ? '● Առկա է' : '● Սպառված');
 $('#pdStock').style.color = p.stock > 0 ? 'var(--mint)' : 'var(--danger)';

 $('#pdPrice').innerHTML = `<b>${fmt(p.price)}</b>` +
 (p.old_price ? ` <s>${fmt(p.old_price)}</s>` : '') +
 (p.old_price ? `<span class="pd-saving">${I18N.t('խնայում եք')} ${fmt(p.old_price - p.price)}</span>` : '');

 $('#pdDesc').textContent = pxik.locDesc(p);
 $('#pdSpecs').innerHTML = (p.specs || []).map((s) => `<tr><td>${pxik.esc(s[0])}</td><td>${pxik.esc(s[1])}</td></tr>`).join('');
 $('#pdReviewsCount').textContent = `${I18N.t('Կարծիքներ')} (${p.reviews_count})`;
 $('#pdRatingNum').textContent = Number(p.rating).toFixed(1);

 const bars = [72, 19, 6, 2, 1];
 $('#pdRatingBars').innerHTML = bars.map((w, i) =>
 `<div class="r-bar"><span>${5 - i}★</span><div class="track"><div class="fill" style="width:${w}%"></div></div><span>${w}%</span></div>`).join('');

 $('#pdReviews').innerHTML = (p.reviews || []).map((r) => `
 <div class="review">
 <div class="r-head">
 <span class="r-ava" style="--tint:#EAF3FF">${pxik.esc(r.author[0])}</span>
 <div><div class="r-name">${pxik.esc(r.author)}</div><div class="r-date">${pxik.esc(r.date_label)}</div></div>
 <span class="r-stars">${pxik.stars(r.stars)}</span>
 </div>
 <p>${pxik.esc(r.text)}</p>
 </div>`).join('');

 pxik.renderCards($('#relatedGrid'), p.related);

 const wishBtn = $('#pdWish');
 wishBtn.classList.toggle('on', pxik.isFav(p.id));
 wishBtn.dataset.wish = p.id;

 updateInstallment();
 updateTotal();

 // gallery wiring
 $$('#pdThumbs .pd-thumb').forEach((t) => {
 t.addEventListener('click', () => {
 $$('#pdThumbs .pd-thumb').forEach((x) => x.classList.remove('active'));
 t.classList.add('active');
 $('#pdImg').src = t.dataset.src;
 });
 });
 }

 /* ---------- Quantity + totals ---------- */
 const qtyInput = $('#qtyInput');
 function qty() {
 return Math.min(99, Math.max(1, parseInt(qtyInput.value, 10) || 1));
 }
 function updateTotal() {
 $('#qtyTotal').textContent = fmt(price * qty());
 }
 $('#qtyMinus').addEventListener('click', () => { qtyInput.value = qty() - 1; updateTotal(); });
 $('#qtyPlus').addEventListener('click', () => { qtyInput.value = qty() + 1; updateTotal(); });
 qtyInput.addEventListener('change', updateTotal);

 /* ---------- Installment ---------- */
 function updateInstallment() {
 const months = parseInt($('#instMonths').value, 10);
 const monthly = Math.ceil(price / months / 10) * 10;
 const mon = pxik.lang() === 'ru' ? 'мес' : 'ամիս';
 $('#instMonth').textContent = `${fmt(monthly)} / ${mon} × ${months}`;
 }
 $('#instMonths').addEventListener('change', updateInstallment);

 /* ---------- Add / buy ---------- */
 $('#pdAdd').addEventListener('click', () => pxik.addToCart(id, qty()));
 $('#pdBuy').addEventListener('click', async () => {
 await pxik.addToCart(id, qty());
 setTimeout(() => { window.location.href = 'cart.html'; }, 450);
 });

 /* ---------- Info tabs ---------- */
 const pdTabs = $$('.pd-tab');
 pdTabs.forEach((t) => {
 t.addEventListener('click', () => {
 pdTabs.forEach((x) => x.classList.remove('active'));
 t.classList.add('active');
 $$('.pd-panel').forEach((p) => p.classList.remove('active'));
 $('#panel-' + t.dataset.panel).classList.add('active');
 });
 });

 /* ---------- Load ---------- */
 pxik.api('/api/product/' + id).then((p) => {
 renderBreadcrumb(p, p.category_slug);
 render(p);
 }).catch((e) => {
 pxik.toast(' ' + e.message);
 document.querySelector('.pd-grid').innerHTML =
 '<div class="cart-empty" style="grid-column:1/-1"><b>Ապրանքը չի գտնվել</b><p>Հնարավոր է այն հեռացվել է կատալոգից:</p><a class="btn btn-primary" href="catalog.html">Դեպի կատալոգ</a></div>';
 });
})();
