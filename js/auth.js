/* Փղիկ.am — login / register */
(function () {
 'use strict';

 const $ = (s, c) => (c || document).querySelector(s);
 const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

 const next = new URL(location.href).searchParams.get('next') || 'account.html';

 /* tabs */
 $$('.pd-tab').forEach((t) => {
 t.addEventListener('click', () => {
 $$('.pd-tab').forEach((x) => x.classList.remove('active'));
 t.classList.add('active');
 $$('.auth-form').forEach((f) => f.classList.remove('active'));
 $('#panel-' + t.dataset.panel).classList.add('active');
 });
 });

 /* already logged in → account */
 pxik.loadMe().then((user) => {
 if (user) window.location.href = next;
 });

 $('#loginBtn').addEventListener('click', async () => {
 const btn = $('#loginBtn');
 btn.disabled = true;
 try {
 await pxik.api('/api/auth/login', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: $('#lEmail').value, password: $('#lPassword').value }),
 });
 await pxik.loadMe();
 await pxik.mergeGuestFavorites();
 pxik.toast('Բարի գալուստ ✔');
 setTimeout(() => { window.location.href = next; }, 500);
 } catch (e) {
 pxik.toast(' ' + e.message);
 btn.disabled = false;
 }
 });

 $('#registerBtn').addEventListener('click', async () => {
 const btn = $('#registerBtn');
 btn.disabled = true;
 try {
 await pxik.api('/api/auth/register', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: $('#rName').value, email: $('#rEmail').value,
 phone: $('#rPhone').value, password: $('#rPassword').value,
 }),
 });
 await pxik.loadMe();
 await pxik.mergeGuestFavorites();
 pxik.toast('Հաշիվը ստեղծվեց ');
 setTimeout(() => { window.location.href = next; }, 500);
 } catch (e) {
 pxik.toast(' ' + e.message);
 btn.disabled = false;
 }
 });

 /* enter submits */
 [['#lPassword', '#loginBtn'], ['#rPassword', '#registerBtn']].forEach(([inp, btn]) => {
 const el = $(inp);
 if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') $(btn).click(); });
 });
})();
