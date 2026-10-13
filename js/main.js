/* Փղիկ.am — page shell behaviors + delegated product-card actions */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 /* ---------- Header shadow on scroll ---------- */
 const header = $('#header');
 const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
 window.addEventListener('scroll', onScroll, { passive: true });
 onScroll();

 /* ---------- Catalog dropdown ---------- */
 const catalogBtn = $('#catalogBtn');
 const catalogDrop = $('#catalogDrop');
 if (catalogBtn && catalogDrop) {
 catalogBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 catalogDrop.classList.toggle('open');
 catalogBtn.classList.toggle('active');
 });
 document.addEventListener('click', (e) => {
 if (!catalogDrop.contains(e.target)) {
 catalogDrop.classList.remove('open');
 catalogBtn.classList.remove('active');
 }
 });
 }

 /* ---------- Mobile drawer ---------- */
 const drawer = $('#drawer');
 const backdrop = $('#drawerBackdrop');
 if (drawer && backdrop) {
 const openDrawer = () => { drawer.classList.add('open'); backdrop.classList.add('show'); document.body.style.overflow = 'hidden'; };
 const closeDrawer = () => { drawer.classList.remove('open'); backdrop.classList.remove('show'); document.body.style.overflow = ''; };
 $('#burger').addEventListener('click', openDrawer);
 const closeBtn = $('#drawerClose');
 if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
 backdrop.addEventListener('click', () => { closeDrawer(); document.dispatchEvent(new CustomEvent('pxik:backdrop')); });
 $$('.drawer-nav a').forEach((a) => a.addEventListener('click', closeDrawer));
 document.addEventListener('keydown', (e) => {
 if (e.key === 'Escape') {
 closeDrawer();
 if (catalogDrop) { catalogDrop.classList.remove('open'); catalogBtn.classList.remove('active'); }
 }
 });
 }

 /* ---------- Header search → catalog ---------- */
 $$('.search').forEach((box) => {
 const input = $('input', box);
 const btn = $('.search-btn', box);
 function go() {
 const q = (input.value || '').trim();
 window.location.href = 'catalog.html' + (q ? '?q=' + encodeURIComponent(q) : '');
 }
 if (btn) btn.addEventListener('click', go);
 if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
 });

 /* ---------- Account area (guest link / user menu) ---------- */
 const T = (s) => (window.I18N ? I18N.t(s) : s);

 function renderAccount(user) {
 const area = $('#accountArea');
 if (!area) return;
 if (!user) {
 area.innerHTML = `
 <a class="h-action" href="auth.html">
 <span class="icon-wrap">
 <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>
 </span>
 <span class="h-label">${T('Մուտք')}</span>
 </a>`;
 return;
 }
 const initial = (user.name || '?').trim().charAt(0).toUpperCase();
 area.innerHTML = `
 <div class="user-menu">
 <button class="user-chip" id="userChip" aria-haspopup="true">
 <span class="user-ava">${pxik.esc(initial)}</span>
 <span class="h-label">${pxik.esc(user.name.split(' ')[0])}</span>
 <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
 </button>
 <div class="user-drop" id="userDrop" hidden>
 <div class="ud-name">${pxik.esc(user.name)}<span>${pxik.esc(user.email)}</span></div>
 <a href="account.html">${T('Իմ հաշիվը')}</a>
 <a href="account.html#fav">${T('Ընտրյալներ')}</a>
 <a href="account.html#orders">${T('Իմ պատվերները')}</a>
 ${user.is_admin ? `<a href="admin.html" class="ud-admin">${T('Ադմին-վահանակ')}</a>` : ''}
 <button type="button" id="logoutBtn">${T('Ելք')}</button>
 </div>
 </div>`;
 const chip = $('#userChip');
 const drop = $('#userDrop');
 chip.addEventListener('click', (e) => {
 e.stopPropagation();
 drop.hidden = !drop.hidden;
 });
 document.addEventListener('click', (e) => {
 if (!drop.hidden && !drop.contains(e.target)) drop.hidden = true;
 });
 $('#logoutBtn').addEventListener('click', () => pxik.logout());
 }

 /* ---------- Hero slider (home only) ---------- */
 const slider = $('#heroSlider');
 if (slider) {
 const slides = $$('.slide', slider);
 const dotsWrap = $('#heroDots');
 let idx = 0;
 let timer = null;

 slides.forEach((_, i) => {
 const dot = document.createElement('button');
 dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
 dot.setAttribute('aria-label', 'Սլայդ ' + (i + 1));
 dot.addEventListener('click', () => { go(i); restart(); });
 dotsWrap.appendChild(dot);
 });
 const dots = $$('.hero-dot', dotsWrap);

 function go(n) {
 slides[idx].classList.remove('active');
 dots[idx].classList.remove('active');
 idx = (n + slides.length) % slides.length;
 slides[idx].classList.add('active');
 dots[idx].classList.add('active');
 }
 function restart() {
 clearInterval(timer);
 timer = setInterval(() => go(idx + 1), 5500);
 }
 const prev = $('#heroPrev');
 const next = $('#heroNext');
 if (prev) prev.addEventListener('click', () => { go(idx - 1); restart(); });
 if (next) next.addEventListener('click', () => { go(idx + 1); restart(); });
 slider.addEventListener('mouseenter', () => clearInterval(timer));
 slider.addEventListener('mouseleave', restart);
 restart();
 }

 /* ---------- Scroll reveal ---------- */
 if ('IntersectionObserver' in window) {
 const io = new IntersectionObserver((entries) => {
 entries.forEach((entry) => {
 if (entry.isIntersecting) {
 entry.target.classList.add('in');
 io.unobserve(entry.target);
 }
 });
 }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
 $$('.reveal').forEach((el) => io.observe(el));
 } else {
 $$('.reveal').forEach((el) => el.classList.add('in'));
 }

 /* ---------- Delegated product-card actions ---------- */
 document.addEventListener('click', (e) => {
 const addBtn = e.target.closest('[data-add]');
 if (addBtn && !addBtn.disabled) {
 e.stopPropagation();
 pxik.addToCart(Number(addBtn.dataset.add));
 return;
 }
 const wishBtn = e.target.closest('[data-wish]');
 if (wishBtn) {
 e.stopPropagation();
 pxik.toggleFav(wishBtn.dataset.wish, wishBtn);
 return;
 }
 const card = e.target.closest('.product');
 if (card && card.dataset.id && !e.target.closest('button, a, input, select')) {
 window.location.href = 'product.html?id=' + card.dataset.id;
 }
 });

 /* ---------- Init: cart badge + category menus + account ---------- */
 (async () => {
 const boot = await pxik.initSession();
    if (boot) pxik.setCartCount(boot.cartCount);

    // строка категорий под шапкой (как в detmir)
    if (boot && !document.querySelector('.cat-nav-row')) {
      const row = document.createElement('div');
      row.className = 'cat-nav-row';
      row.innerHTML = '<div class="container cat-nav">' +
        boot.categories.map((c) =>
          `<a href="catalog.html?category=${c.slug}">${pxik.esc(I18N.t(pxik.curName(c)))}</a>`).join('') +
        `<a href="catalog.html?sale=1">${I18N.t('Զեղչեր')}</a>` + '</div>';
      header.appendChild(row);
    }
 const drop = $('#catalogDrop .drop-grid');
 if (boot && drop && !drop.children.length) {
 drop.innerHTML = boot.categories.map((c) => `
 <a class="drop-item" href="catalog.html?category=${c.slug}">
 <span class="d-emoji"><img class="d-img" src="img/cat_${c.slug}.jpg" alt="" loading="lazy"></span> ${pxik.esc(I18N.t(pxik.curName(c)))}
 </a>`).join('');
 }
 const drawerNav = $('#drawer .drawer-nav');
 if (boot && drawerNav && !drawerNav.children.length) {
 drawerNav.innerHTML = boot.categories.map((c) => `
 <a href="catalog.html?category=${c.slug}"><img class="drawer-img" src="img/cat_${c.slug}.jpg" alt="" loading="lazy"> ${pxik.esc(I18N.t(pxik.curName(c)))}</a>`).join('');
 }
 renderAccount(await pxik.loadMe());
 })();
})();
