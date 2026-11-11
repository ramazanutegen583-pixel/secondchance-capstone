const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items = [];
let apiAvailable = !location.hostname.endsWith('github.io');
let token = '';
let currentUser = null;
const imageUrl = item => item.image ? item.image.replace(/^\//, '') : 'images/bookshelf1.jpeg';

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(token ? {Authorization:'Bearer ' + token} : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function loadItems() {
  if (apiAvailable) {
    try { items = await request('api/secondchanceitems'); }
    catch { apiAvailable = false; }
  }
  if (!apiAvailable) items = await fetch('data/items.json').then(response => response.json());
  $('#account-button').hidden = !apiAvailable;
  $('#add-item-button').hidden = !currentUser;
  const categories = [...new Set(items.map(item => item.category))].sort();
  $('#search-category').innerHTML = '<option value="">All categories</option>' + categories.map(category => '<option>' + escapeHTML(category) + '</option>').join('');
}
function renderItems(results) {
  $('#results-status').textContent = results.length + (results.length === 1 ? ' item found' : ' items found');
  $('#item-grid').innerHTML = results.length ? results.map(item => '<a class="item-card" href="#/item/' + encodeURIComponent(item.id) + '"><img loading="lazy" src="' + escapeHTML(imageUrl(item)) + '" alt="' + escapeHTML(item.name) + '"><div><span class="category">' + escapeHTML(item.category) + '</span><h2>' + escapeHTML(item.name) + '</h2><p>' + escapeHTML(item.condition) + ' · ' + escapeHTML(item.age_years || 0) + ' years</p></div></a>').join('') : '<p class="empty">No items match those filters. Try a different search.</p>';
}
async function route() {
  const hash = location.hash || '#/';
  $('#landing').hidden = hash.startsWith('#/items') || hash.startsWith('#/item/');
  $('#catalog').hidden = !hash.startsWith('#/items');
  $('#detail').hidden = !hash.startsWith('#/item/');
  if (!$('#catalog').hidden) { await loadItems(); renderItems(items); window.scrollTo(0,0); }
  if (!$('#detail').hidden) {
    if (!items.length) await loadItems();
    const id = decodeURIComponent(hash.slice(7));
    let item = items.find(value => value.id === id);
    if (apiAvailable) { try { item = await request('api/secondchanceitems/' + encodeURIComponent(id)); } catch {} }
    $('#detail').innerHTML = !item ? '<h1>Item not found</h1><a href="#/items">Back to catalog</a>' : '<a class="detail-back" href="#/items">← Back to all items</a><div class="detail-grid"><img src="' + escapeHTML(imageUrl(item)) + '" alt="' + escapeHTML(item.name) + '"><div><p class="eyebrow">' + escapeHTML(item.category) + '</p><h1>' + escapeHTML(item.name) + '</h1><p>' + escapeHTML(item.description) + '</p><dl><dt>Condition</dt><dd>' + escapeHTML(item.condition) + '</dd><dt>Age</dt><dd>' + escapeHTML(item.age_years || 0) + ' years</dd><dt>ZIP code</dt><dd>' + escapeHTML(item.zipcode || 'Not provided') + '</dd></dl>' + (currentUser && item.posted_by === currentUser.id ? '<button class="text-button" id="delete-item">Delete my item</button>' : '') + '</div></div><div class="detail-comments"><h2>Sample community comments</h2>' + (item.comments || []).map(comment => '<article class="comment"><strong>' + escapeHTML(comment.author) + '</strong><p>' + escapeHTML(comment.comment) + '</p></article>').join('') + '</div>';
    if ($('#delete-item')) $('#delete-item').onclick = async () => { await request('api/secondchanceitems/' + encodeURIComponent(id), {method:'DELETE'}); location.hash = '#/items'; };
    window.scrollTo(0,0);
  }
}
document.querySelectorAll('[data-action="catalog"]').forEach(button => button.onclick = () => { location.hash = '#/items'; });
$('#search-form').onsubmit = async event => {
  event.preventDefault();
  const name = $('#search-name').value.trim();
  const category = $('#search-category').value;
  const condition = $('#search-condition').value;
  const age = $('#search-age').value;
  try {
    const results = apiAvailable
      ? await request('api/secondchance/search?' + new URLSearchParams({name, category, condition, ...(age !== '' ? {age_years:age} : {})}))
      : items.filter(item => (!name || item.name.toLowerCase().includes(name.toLowerCase())) && (!category || item.category === category) && (!condition || item.condition === condition) && (age === '' || item.age_years <= Number(age)));
    renderItems(results);
  } catch (error) { $('#results-status').textContent = error.message; }
};
function accountView(mode = 'login') {
  const loggedIn = Boolean(currentUser);
  $('#account-content').innerHTML = '<h2>' + (loggedIn ? 'Your profile' : mode === 'register' ? 'Join SecondChance' : 'Welcome back') + '</h2><form id="account-form">' + (loggedIn || mode === 'register' ? '<label>First name<input name="firstName" required value="' + escapeHTML(currentUser?.firstName || '') + '"></label><label>Last name<input name="lastName" required value="' + escapeHTML(currentUser?.lastName || '') + '"></label>' : '') + (!loggedIn ? '<label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" minlength="8" required autocomplete="' + (mode === 'register' ? 'new-password' : 'current-password') + '"></label>' : '') + '<button class="button" type="submit">' + (loggedIn ? 'Save profile' : mode === 'register' ? 'Create account' : 'Sign in') + '</button><p class="form-message" role="status"></p></form><div class="account-links"><button class="text-button" id="account-switch">' + (loggedIn ? 'Sign out' : mode === 'register' ? 'Already a member? Sign in' : 'Create an account') + '</button></div>';
  $('#account-switch').onclick = () => {
    if (loggedIn) { token=''; currentUser=null; $('#add-item-button').hidden=true; $('#account-dialog').close(); }
    else accountView(mode === 'login' ? 'register' : 'login');
  };
  $('#account-form').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    try {
      if (loggedIn) {
        const data = await request('api/auth/update', {method:'PUT',body:JSON.stringify(payload)});
        currentUser=data.user; $('#account-dialog').close();
      } else if (mode === 'register') {
        await request('api/auth/register', {method:'POST',body:JSON.stringify(payload)});
        accountView('login'); $('#account-form .form-message').textContent='Account created. Please sign in.';
      } else {
        const data=await request('api/auth/login', {method:'POST',body:JSON.stringify(payload)});
        token=data.token; currentUser=data.user; $('#add-item-button').hidden=false; $('#account-dialog').close();
      }
    } catch(error) { $('#account-form .form-message').textContent=error.message; }
  };
}
$('#account-button').onclick = () => { accountView(); $('#account-dialog').showModal(); };
$('#add-item-button').onclick = () => $('#item-dialog').showModal();
document.querySelectorAll('.dialog-close').forEach(button => button.onclick = () => button.closest('dialog').close());
$('#add-item-form').onsubmit = async event => {
  event.preventDefault();
  try {
    const data = await request('api/secondchanceitems', {method:'POST',body:new FormData(event.target)});
    event.target.reset(); $('#item-dialog').close(); location.hash='#/item/' + encodeURIComponent(data.id); await route();
  } catch(error) { $('#add-item-form .form-message').textContent=error.message; }
};
window.addEventListener('hashchange', () => route().catch(error => { $('#results-status').textContent=error.message; }));
route().catch(console.error);
