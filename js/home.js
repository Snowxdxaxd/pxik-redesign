/* Փղիկ.am — home page: categories + tabbed products from API */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 /* ---------- Categories grid from DB ---------- */
 pxik.api('/api/bootstrap').then((data) => {
 const grid = $('#catsGrid');
 if (grid) {
 grid.innerHTML = data.categories.map((c) => `
 <a class="cat-card reveal in" href="catalog.html?category=${c.slug}" style="--tint:${c.tint}">
 <span class="cat-emoji"><img class="cat-img" src="img/cat_${c.slug}.jpg" alt="" loading="lazy"></span>
 <b>${pxik.esc(pxik.curName(c))}</b><span>${c.count} ${I18N.t('ապրանք')}</span>
 <span class="cat-arrow">→</span>
 </a>`).join('');
 }
 }).catch(console.error);

 /* ---------- Products tabs ---------- */
 const grid = $('#homeGrid');
 const tabs = $$('.tab[data-tab]');

 function loadTab(tab) {
 grid.classList.add('loading');
 pxik.api('/api/home?tab=' + tab).then((data) => {
 pxik.renderCards(grid, data.items);
 grid.classList.remove('loading');
 grid.classList.add('in-grid');
 }).catch((e) => {
 pxik.toast(' ' + e.message);
 grid.classList.remove('loading');
 });
 }

 tabs.forEach((tab) => {
 tab.addEventListener('click', () => {
 tabs.forEach((t) => t.classList.remove('active'));
 tab.classList.add('active');
 loadTab(tab.dataset.tab);
 });
 });

 if (grid) loadTab('new');
})();
