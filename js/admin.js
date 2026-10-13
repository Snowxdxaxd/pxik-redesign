/* Փղիկ.am — admin: dashboard (delivery queue), orders, product CRUD, stock */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
 const fmt = pxik.money;

 const STATUS_HY = { new: 'Նոր', confirmed: 'Հաստատված', shipped: 'Ուղարկված', done: 'Ավարտված' };
 const DELIVERY_HY = { courier: 'Երևան (առաքիչ)', region: 'Մարզ', pickup: 'Խանութից' };
 const TINTS = ['#EAF3FF', '#FFEFF5', '#FFF4DE', '#EAFBF2', '#F3EEFF', '#FFEDE4', '#E8F8FF', '#FDEEF9', '#FFF0F0'];
 let categories = [];
 let editingId = null;
 let allOrders = [];
 let currentImages = [];
 let pendingFiles = [];

 /* ---------- auth guard ---------- */
 pxik.loadMe().then((user) => {
 if (!user) {
 window.location.href = 'auth.html?next=admin.html';
 return;
 }
 if (!user.is_admin) {
 document.getElementById('adminRoot').innerHTML =
 '<div class="cart-empty"><b>Թույլտվություն չկա</b><p>Այս էջը հասանելի է միայն ադմինիստրատորներին:</p><a class="btn btn-primary" href="index.html">Դեպի խանութ</a></div>';
 return;
 }
 document.getElementById('adminLogout').textContent = user.name + ' · Ելք';
 init();
 });

 document.getElementById('adminLogout').addEventListener('click', () => pxik.logout());

 /* ---------- tabs ---------- */
 $$('.pd-tab').forEach((t) => {
 t.addEventListener('click', () => {
 $$('.pd-tab').forEach((x) => x.classList.remove('active'));
 t.classList.add('active');
 $$('#adminRoot .pd-panel').forEach((p) => p.classList.remove('active'));
 $('#panel-' + t.dataset.panel).classList.add('active');
 });
 });

 function init() {
 pxik.api('/api/bootstrap').then((data) => {
 categories = data.categories;
 $('#fCat').innerHTML = categories.map((c) => `<option value="${c.id}">${pxik.esc(c.name)}</option>`).join('');
 }).catch(console.error);
 loadStats();
 loadOrders();
 loadProducts();
 }

 /* ---------- dashboard ---------- */
 async function loadStats() {
 try {
 const s = await pxik.api('/api/admin/stats');
 const cards = [
 [s.orders_need_delivery, 'պատվեր՝ առաքման սպասող', '#6C4DF6'],
 [s.orders_total, 'պատվեր՝ ընդհանուր', '#47B5FF'],
 [s.orders_unpaid, 'չվճարված պատվեր', '#F59F00'],
 [fmt(s.revenue_paid) + ' դր', 'վճարված եկամուտ', '#12B886'],
 [s.products_total, 'ապրանք կատալոգում', '#FF5E9C'],
 [s.stock_zero, 'ապրանք՝ պահեստում բացակա', '#FF4757'],
 [s.users_total, 'գրանցված հաճախորդ', '#9A5CFF'],
 ];
 $('#dashGrid').innerHTML = cards.map(([val, label, color]) => `
 <div class="dash-card">
 <b style="color:${color}">${val}</b>
 <span>${label}</span>
 </div>`).join('');
 const low = s.low_stock;
 $('#dashGrid').insertAdjacentHTML('beforeend', `
 <div class="dash-card dash-wide">
 <b style="color:#F59F00">Սպառվում են</b>
 ${low.length ? low.map((p) => `
 <div class="dash-low">
 <span class="adm-emoji" style="--tint:${pxik.esc(p.tint)}">${pxik.esc(p.emoji)}</span>
 <span class="dash-low-name">${pxik.esc(p.name)}</span>
 <b style="color:${p.stock === 0 ? '#FF4757' : '#F59F00'}">${p.stock} հատ</b>
 </div>`).join('') : '<span class="adm-sub">Բոլոր պաշարները բավարար են</span>'}
 </div>`);
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 }

 /* ---------- orders ---------- */
 function payChip(o) {
 return o.payment_status === 'paid'
 ? `<span class="pay-chip paid">✔ Վճարված${o.card_last4 ? ' · ****' + o.card_last4 : ''}</span>`
 : '<span class="pay-chip">⏳ Չվճարված</span>';
 }

 function statusSelect(o) {
 return `
 <select class="adm-status st-${o.status}" data-order="${o.id}">
 ${Object.keys(STATUS_HY).map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_HY[s]}</option>`).join('')}
 </select>`;
 }

 function orderTr(o) {
 return `
 <tr>
 <td><b>#${o.id}</b><span class="adm-sub">${(o.created_at || '').slice(0, 16).replace('T', ' ')} · ${DELIVERY_HY[o.delivery] || o.delivery}</span></td>
 <td>${pxik.esc(o.name)}<span class="adm-sub">${pxik.esc(o.phone)}</span></td>
 <td>${pxik.esc(o.address)}</td>
 <td>${o.items.reduce((s, i) => s + i.qty, 0)} հատ<span class="adm-sub">${fmt(o.total)} դր</span></td>
 ${payChip(o)}
 <td>${statusSelect(o)}</td>
 </tr>`;
 }

 async function loadOrders() {
 try {
 const data = await pxik.api('/api/admin/orders');
 allOrders = data.orders;
 const queue = allOrders.filter((o) => ['new', 'confirmed'].includes(o.status) && o.delivery !== 'pickup');
 $('#deliveryRows').innerHTML = queue.length
 ? queue.map(orderTr).join('')
 : '<tr><td colspan="6" style="text-align:center;color:var(--ink-2)">Առաքման սպասող պատվերներ չկան </td></tr>';
 $('#orderRows').innerHTML = allOrders.length
 ? allOrders.map(orderTr).join('')
 : '<tr><td colspan="6" style="text-align:center;color:var(--ink-2)">Պատվերներ դեռ չկան</td></tr>';
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 }

 document.addEventListener('change', async (e) => {
 const sel = e.target.closest('.adm-status');
 if (!sel) return;
 try {
 await pxik.api(`/api/admin/orders/${sel.dataset.order}/status`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: sel.value }),
 });
 pxik.toast('Կարգավիճակը թարմացվեց ✔');
 sel.className = 'adm-status st-' + sel.value;
 loadStats();
 } catch (err) {
 pxik.toast(' ' + err.message);
 }
 });

 /* ---------- products ---------- */
 function renderProducts(items) {
 $('#prodRows').innerHTML = items.map((p) => `
 <tr data-id="${p.id}">
 <td><span class="adm-emoji"><img src="${pxik.esc((p.images && p.images[0]) || 'img/placeholder.svg')}" alt="" loading="lazy"></span></td>
 <td><b>${pxik.esc(p.name)}</b><span class="adm-sub">${pxik.esc(p.code)} · ${pxik.esc(p.cat_name)} · ${pxik.esc(p.brand)}</span></td>
 <td>${fmt(p.price)} դր${p.old_price ? `<s>${fmt(p.old_price)}</s>` : ''}</td>
 <td>${p.badge === 'new' ? '<span class="badge b-new">Նոր</span>' : p.badge === 'hit' ? '<span class="badge b-hot">Հիթ</span>' : '—'}</td>
 <td>
 <div class="stock-cell${p.stock === 0 ? ' zero' : p.stock <= 3 ? ' low' : ''}">
 <button class="stock-btn" data-stock="-1" data-pid="${p.id}" aria-label="Պակասեցնել">−</button>
 <input class="stock-input" data-stock-input="${p.id}" value="${p.stock}" inputmode="numeric">
 <button class="stock-btn" data-stock="1" data-pid="${p.id}" aria-label="Ավելացնել">+</button>
 </div>
 </td>
 <td class="adm-actions">
 <button class="adm-btn" data-edit="${p.id}">Փոփոխել</button>
 <button class="adm-btn danger" data-del="${p.id}">Հեռացնել</button>
 </td>
 </tr>`).join('');
 }

 async function loadProducts() {
 try {
 const d = await pxik.api('/api/admin/products');
 renderProducts(d.items);
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 }

 function openForm(p) {
 editingId = p ? p.id : null;
 $('#formTitle').textContent = p ? 'Փոփոխել ապրանքը #' + p.id : 'Նոր ապրանք';
 $('#fName').value = p ? p.name : '';
 $('#fPrice').value = p ? p.price : '';
 $('#fOld').value = p && p.old_price ? p.old_price : '';
 $('#fBadge').value = p ? (p.badge || '') : '';
 $('#fBrand').value = p ? p.brand : 'Orbis';
 $('#fEmoji').value = p ? p.emoji : '';
 $('#fTint').innerHTML = TINTS.map((t) => `<option value="${t}" ${t === p?.tint ? 'selected' : ''}>${t}</option>`).join('');
 $('#fStock').value = p ? p.stock : 10;
 $('#fDesc').value = p ? p.description : '';
 currentImages = p ? (p.images || []).slice() : [];
 pendingFiles = [];
 $('#fPhotos').value = '';
 renderPhotos();
 $$('#fCat option').forEach((o) => { o.selected = p ? o.value == p.category_id : o.value == categories[0].id; });
 $$('#fAges input').forEach((i) => { i.checked = p ? p.ages.includes(i.value) : i.value === '3-6'; });
 $('#prodForm').style.display = 'block';
 $('#prodForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 }

 $('#prodNew').addEventListener('click', () => openForm(null));
 $('#formCancel').addEventListener('click', () => { $('#prodForm').style.display = 'none'; });

 $('#prodSearch').addEventListener('input', (e) => {
 const q = e.target.value.trim().toLowerCase();
 $$('#prodRows tr').forEach((tr) => {
 tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
 });
 });

 $('#prodRows').addEventListener('click', async (e) => {
 const edit = e.target.closest('[data-edit]');
 if (edit) {
 const d = await pxik.api('/api/admin/products');
 openForm(d.items.find((x) => x.id === Number(edit.dataset.edit)));
 return;
 }
 const del = e.target.closest('[data-del]');
 if (del && confirm('Հեռացնե՞լ ապրանքը կատալոգից')) {
 try {
 await pxik.api('/api/admin/products/' + del.dataset.del, { method: 'DELETE' });
 pxik.toast('Ապրանքը հեռացվեց');
 loadProducts();
 loadStats();
 } catch (err) {
 pxik.toast(' ' + err.message);
 }
 return;
 }
 const stockBtn = e.target.closest('[data-stock]');
 if (stockBtn) {
 const pid = Number(stockBtn.dataset.pid);
 const input = document.querySelector(`[data-stock-input="${pid}"]`);
 const next = Math.max(0, (parseInt(input.value, 10) || 0) + Number(stockBtn.dataset.stock));
 input.value = next;
 await saveStock(pid, next);
 }
 });

 $('#prodRows').addEventListener('change', async (e) => {
 const input = e.target.closest('[data-stock-input]');
 if (input) await saveStock(Number(input.dataset.stockInput), parseInt(input.value, 10) || 0);
 });

 async function saveStock(pid, stock) {
 try {
 await pxik.api(`/api/admin/products/${pid}/stock`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ stock }),
 });
 loadStats();
 } catch (e) {
 pxik.toast(' ' + e.message);
 loadProducts();
 }
 }

 function renderPhotos() {
 const strip = document.getElementById('photoStrip');
 if (!strip) return;
 strip.innerHTML = '';
 currentImages.forEach((src, i) => {
 const d = document.createElement('div');
 d.className = 'photo-thumb';
 d.innerHTML = `<img src="${pxik.esc(src)}" alt=""><button type="button" class="photo-del" data-del-photo="${i}">×</button>`;
 strip.appendChild(d);
 });
 pendingFiles.forEach((f, i) => {
 const d = document.createElement('div');
 d.className = 'photo-thumb';
 d.innerHTML = `<img src="${f.preview}" alt=""><button type="button" class="photo-del" data-del-new="${i}">×</button>`;
 strip.appendChild(d);
 });
 const add = document.createElement('label');
 add.className = 'photo-add';
 add.setAttribute('for', 'fPhotos');
 add.textContent = '+';
 strip.appendChild(add);
 }

 document.getElementById('fPhotos').addEventListener('change', async (e) => {
 const files = Array.from(e.target.files || []);
 e.target.value = '';
 for (const file of files) {
 if (pendingFiles.length + currentImages.length >= 6) { pxik.toast('Առավելագույնը 6 լուսանկար'); break; }
 if (!/image[\/](jpeg|png|webp)/.test(file.type)) { pxik.toast('Миян JPG/PNG/WebP'); continue; }
 if (file.size > 6 * 1024 * 1024) { pxik.toast('Файл больше 6 МБ'); continue; }
 const data = await new Promise((res) => {
 const fr = new FileReader();
 fr.onload = () => res(fr.result);
 fr.readAsDataURL(file);
 });
 pendingFiles.push({ name: file.name, data: data.split(',')[1], preview: data });
 }
 renderPhotos();
 });

 document.getElementById('photoStrip').addEventListener('click', async (e) => {
 const delOld = e.target.closest('[data-del-photo]');
 if (delOld) { e.preventDefault();
 try {
 const res = await pxik.api(`/api/admin/products/${editingId}/photo-delete`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ index: Number(delOld.dataset.delPhoto) }),
 });
 currentImages = res.images.slice();
 renderPhotos();
 } catch (err) { pxik.toast(err.message); }
 return;
 }
 const delNew = e.target.closest('[data-del-new]');
 if (delNew) {
 pendingFiles.splice(Number(delNew.dataset.delNew), 1);
 renderPhotos();
 }
 });

 async function uploadPhotos(pid) {
 for (const f of pendingFiles) {
 await pxik.api(`/api/admin/products/${pid}/photo`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ filename: f.name, data: f.data }),
 });
 }
 pendingFiles = [];
 }

 $('#formSave').addEventListener('click', async () => {
 const ages = $$('#fAges input:checked').map((i) => i.value);
 const payload = {
 name: $('#fName').value,
 price: parseInt($('#fPrice').value, 10),
 old_price: parseInt($('#fOld').value, 10) || null,
 badge: $('#fBadge').value || null,
 brand: $('#fBrand').value,
 emoji: $('#fEmoji').value,
 tint: $('#fTint').value,
 stock: parseInt($('#fStock').value, 10) || 0,
 description: $('#fDesc').value,
 category_id: parseInt($('#fCat').value, 10),
 ages: ages.length ? ages : ['3-6'],
 };
 try {
 const res = await pxik.api('/api/admin/products' + (editingId ? '/' + editingId : ''), {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 $('#prodForm').style.display = 'none';
 if (pendingFiles.length) await uploadPhotos(res.product ? res.product.id : editingId);
 pxik.toast('Պահպանված է ✔');
 loadProducts();
 loadStats();
 } catch (e) {
 pxik.toast(' ' + e.message);
 }
 });
})();
