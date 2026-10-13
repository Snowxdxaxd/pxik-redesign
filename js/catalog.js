/* Փղիկ.am — catalog page: dynamic products, filters, sorting, pagination */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 const grid = $('#catGrid');
 if (!grid) return;

 const foundCount = $('#foundCount');
 const noResults = $('#noResults');
 const pager = $('#pager');
 const sortSelect = $('#sortSelect');
 const priceMin = $('#priceMin');
 const priceMax = $('#priceMax');
 const ageChecks = $$('.f-age');
 const brandChecks = $$('.f-brand');
 const saleCheck = $('#fSale');
 const resetBtn = $('#filtersReset');
 const titleEl = $('#catTitle');

 const state = { page: 1, category: null, q: null };

 /* ---------- Filters off-canvas (mobile) ---------- */
 const filters = $('#filters');
 const filtersBackdrop = $('#filtersBackdrop');
 const openBtn = $('#filtersOpen');
 const closeBtn = $('#filtersClose');
 function openFilters() { filters.classList.add('open'); filtersBackdrop.classList.add('show'); document.body.style.overflow = 'hidden'; }
 function closeFilters() { filters.classList.remove('open'); filtersBackdrop.classList.remove('show'); document.body.style.overflow = ''; }
 if (openBtn) openBtn.addEventListener('click', openFilters);
 if (closeBtn) closeBtn.addEventListener('click', closeFilters);
 if (filtersBackdrop) filtersBackdrop.addEventListener('click', closeFilters);
 document.addEventListener('pxik:backdrop', closeFilters);
 document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilters(); });

 /* ---------- Initial state from URL ---------- */
 const url = new URL(location.href);
 state.category = url.searchParams.get('category');
 state.q = url.searchParams.get('q');
 if (state.q) {
 const searchInputs = $$('.search input');
 searchInputs.forEach((i) => { i.value = state.q; });
 }

 pxik.api('/api/bootstrap').then((data) => {
 if (state.category) {
 const cat = data.categories.find((c) => c.slug === state.category);
 if (cat) {
 const nm = pxik.curName(cat);
 titleEl.textContent = nm;
 document.title = nm + ' — Փղիկ.am';
 const crumb = $('#crumbCat');
 if (crumb) crumb.textContent = nm;
 }
 } else if (state.q) {
 titleEl.textContent = `${I18N.t('Որոնման արդյունքներ՝')} «${state.q}»`;
 }
 // brand filter from DB
 const brandGroup = $('#brandGroup');
 if (brandGroup) {
 brandGroup.innerHTML = data.brands.map((b) => `
 <label class="check-row"><input type="checkbox" class="f-brand" value="${pxik.esc(b)}"> ${pxik.esc(b)}</label>`).join('');
 $$('.f-brand', brandGroup).forEach((c) => c.addEventListener('change', () => load(1)));
 }
 }).catch(console.error);

 /* ---------- Load products ---------- */
 function buildQuery(page) {
 const p = new URLSearchParams();
 if (state.category) p.set('category', state.category);
 if (state.q) p.set('q', state.q);
 const min = parseInt(priceMin.value, 10);
 const max = parseInt(priceMax.value, 10);
 if (min > 0) p.set('min', min);
 if (max > 0) p.set('max', max);
 const brands = $$('.f-brand:checked').map((c) => c.value);
 if (brands.length) p.set('brands', brands.join(','));
 const ages = $$('.f-age:checked').map((c) => c.value);
 if (ages.length) p.set('ages', ages.join(','));
 if (saleCheck && saleCheck.checked) p.set('sale', '1');
 if (sortSelect.value !== 'pop') p.set('sort', sortSelect.value);
 p.set('limit', '12');
 p.set('page', String(page));
 return p.toString();
 }

 function load(page) {
 state.page = page;
 grid.classList.add('loading');
 pxik.api('/api/products?' + buildQuery(page)).then((data) => {
 pxik.renderCards(grid, data.items);
 foundCount.textContent = data.total;
 grid.classList.remove('loading');
 noResults.style.display = data.total === 0 ? 'block' : 'none';
 renderPager(data.page, data.pages);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }).catch((e) => {
 pxik.toast(' ' + e.message);
 grid.classList.remove('loading');
 });
 }

 function renderPager(page, pages) {
 if (pages <= 1) { pager.innerHTML = ''; pager.style.display = 'none'; return; }
 pager.style.display = 'flex';
 let html = '';
 for (let i = 1; i <= pages; i++) {
 if (pages > 7 && i > 3 && i < pages && Math.abs(i - page) > 1) {
 if (i === 4) html += '<button class="page-btn" disabled>…</button>';
 continue;
 }
 html += `<button class="page-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`;
 }
 html += `<button class="page-btn next" data-page="${Math.min(pages, page + 1)}" ${page === pages ? 'disabled' : ''} aria-label="Հաջորդ էջ">→</button>`;
 pager.innerHTML = html;
 }

 pager.addEventListener('click', (e) => {
 const btn = e.target.closest('button[data-page]');
 if (!btn || btn.disabled) return;
 load(Number(btn.dataset.page));
 closeFilters();
 });

 /* ---------- Filter wiring ---------- */
 [priceMin, priceMax].forEach((inp) => inp.addEventListener('change', () => load(1)));
 ageChecks.forEach((c) => c.addEventListener('change', () => load(1)));
 if (saleCheck) saleCheck.addEventListener('change', () => load(1));
 sortSelect.addEventListener('change', () => load(1));
 resetBtn.addEventListener('click', () => {
 priceMin.value = '';
 priceMax.value = '';
 $$('.f-age, .f-brand').forEach((c) => { c.checked = false; });
 if (saleCheck) saleCheck.checked = false;
 sortSelect.value = 'pop';
 load(1);
 pxik.toast('Ֆիլտրերը զրոյացված են');
 });

 load(1);
})();
