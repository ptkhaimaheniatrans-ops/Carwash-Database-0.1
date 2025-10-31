/* script.js - final version
   - Uses JSONP for GET (getEntries)
   - Uses POST (no-cors) for add/delete
   - Footer navigation fixed
   - Groupview date display, month totals
   - Confirm modal for delete (Yes/No)
*/

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby6kaTUvBrOV7yZ2wn9Gpw8HwWA8g6Vmk5pHpGsK7f4yiAGJ3PlHeKDkXVYSWySSAaCdg/exec';

const sound = {
  klik: document.getElementById('soundKlik'),
  error: document.getElementById('soundError'),
  success: document.getElementById('soundSuccess'),
  welcome: document.getElementById('soundWelcome'),
  logout: document.getElementById('soundLogout')
};
function play(name){ try { sound[name].currentTime = 0; sound[name].play().catch(()=>{}); } catch(e){} }

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let currentUser = null; // 'admin'|'viewer'
let paymentMethod = null;
let entriesCache = [];
let selectionMode = false;

/* init */
document.addEventListener('DOMContentLoaded', ()=>{
  // loading -> show login after 3s
  setTimeout(()=> {
    $('#loading').classList.add('hidden');
    $('#login').classList.remove('hidden');
  }, 3000);

  // set default date
  if ($('#dateBox')) $('#dateBox').value = (new Date()).toISOString().slice(0,10);

  attachListeners();
});

function attachListeners(){
  // login
  $('#connectBtn').addEventListener('click', onConnect);
  $('#connectBtn').addEventListener('click', ()=>{ bounce($('#connectBtn')); play('klik'); });

  // footer nav
  $('#navInput').addEventListener('click', ()=>{ showSection('inputEntry'); play('klik'); bounce($('#navInput')); });
  $('#navDb').addEventListener('click', ()=>{ showSection('database'); play('klik'); bounce($('#navDb')); });

  // leave
  $('#leaveBtn').addEventListener('click', ()=>{ play('logout'); logout(); });

  // payment buttons (delegated after rendering input section)
  // submit
  $('#submitBtn') && $('#submitBtn').addEventListener('click', onSubmit);

  // database toolbar
  $('#searchBtn') && $('#searchBtn').addEventListener('click', onSearch);
  $('#selectBtn') && $('#selectBtn').addEventListener('click', toggleSelectMode);
  $('#deleteBtn') && $('#deleteBtn').addEventListener('click', onDelete);

  // modal confirm
  $('#confirmYes') && $('#confirmYes').addEventListener('click', onConfirmYes);
  $('#confirmNo') && $('#confirmNo').addEventListener('click', ()=>{ $('#confirmModal').classList.add('hidden'); play('klik'); });
}

/* small UI helpers */
function bounce(el){ if(!el) return; el.classList.add('bounce'); setTimeout(()=>el.classList.remove('bounce'),200); }
function showSection(id){
  ['dashboard','inputEntry','database'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
  if (id === 'database') fetchEntries();
  if (id === 'inputEntry') setupInputHandlers();
}

/* login */
function onConnect(){
  const code = $('#codeInput').value.trim();
  if (!code){ play('error'); showPop('Please enter secret code'); return; }
  if (code === 'Bungas03'){ currentUser = 'admin'; afterLogin(); }
  else if (code === 'Khai2020'){ currentUser = 'viewer'; afterLogin(); }
  else { play('error'); showPop('Wrong code'); }
}

function afterLogin(){
  play('success');
  $('#login').classList.add('hidden');
  $('#main').classList.remove('hidden');
  showSection('dashboard');
  $('#popout').classList.remove('hidden');
  $('#popout').innerText = 'Welcome!';
  $('#popout').style.display = 'block';
  $('#popout').style.opacity = '1';
  play('welcome');
  setTimeout(()=>{ $('#popout').style.display='none'; $('#popout').classList.add('hidden'); }, 1200);
  if (currentUser === 'viewer'){
    $('#navInput').style.display = 'none';
  } else {
    $('#navInput').style.display = '';
  }
}

/* logout */
function logout(){
  $('#main').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('#codeInput').value = '';
  // reset states
  paymentMethod = null; entriesCache = []; selectionMode = false;
}

/* setup input handlers (after showing input section) */
function setupInputHandlers(){
  // attach payment buttons
  $('#transferBtn') && $('#transferBtn').addEventListener('click', ()=>{
    paymentMethod = 'Transfer';
    $('#transferBtn').classList.add('active');
    $('#cashBtn').classList.remove('active');
    bounce($('#transferBtn')); play('klik');
  });
  $('#cashBtn') && $('#cashBtn').addEventListener('click', ()=>{
    paymentMethod = 'Cash';
    $('#cashBtn').classList.add('active');
    $('#transferBtn').classList.remove('active');
    bounce($('#cashBtn')); play('klik');
  });
  // ensure submit button has listener (in case of re-render)
  $('#submitBtn') && $('#submitBtn').addEventListener('click', onSubmit);
}

/* submit entry */
async function onSubmit(){
  bounce($('#submitBtn')); play('klik');
  const date = $('#dateBox').value;
  const driver = $('#driverBox').value.trim();
  const unit = $('#unitBox').value.trim();
  const payment = paymentMethod;
  if (!date || !driver || !unit || !payment){ play('error'); showPopIcon(false,'Oopsie! Wrong Input.'); return; }

  const payload = { action: 'addEntry', date: date, driver: driver, unit: unit, payment: payment };
  try {
    // POST (no-cors) to GAS (works from GitHub Pages)
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    // assume success (no-cors) -> give feedback then refresh
    play('success');
    showPopIcon(true,'Success!');
    resetInputForm();
    setTimeout(()=> fetchEntries(), 700);
  } catch (err){
    play('error');
    showPopIcon(false,'Oopsie! Wrong Input.');
  }
}

function resetInputForm(){
  if ($('#dateBox')) $('#dateBox').value = (new Date()).toISOString().slice(0,10);
  if ($('#driverBox')) $('#driverBox').value = '';
  if ($('#unitBox')) $('#unitBox').value = '';
  paymentMethod = null;
  $('#transferBtn') && $('#transferBtn').classList.remove('active');
  $('#cashBtn') && $('#cashBtn').classList.remove('active');
}

/* popup with icon */
function showPopIcon(success, text){
  const msg = success ? '✅ Success!' : '❌ ' + text;
  showPop(msg);
}

/* simple popout */
function showPop(text){
  const p = $('#popout');
  p.innerText = text;
  p.classList.remove('hidden');
  p.style.display = 'block';
  setTimeout(()=>{ p.classList.add('hidden'); p.style.display='none'; }, 1400);
}

/* fetchEntries via JSONP to avoid CORS */
function fetchEntries(month, year){
  const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  window[cb] = function(res){
    try {
      if (res && res.ok && Array.isArray(res.entries)) entriesCache = res.entries;
      else if (Array.isArray(res)) entriesCache = res;
      else entriesCache = [];
      renderTable();
    } catch(e){ entriesCache = []; renderTable(); }
    const s = document.getElementById(cb);
    if (s) s.remove();
    try { delete window[cb]; } catch(e){}
  };
  let url = GAS_WEB_APP_URL + '?action=getEntries&callback=' + cb;
  if (month && year) url += '&month=' + encodeURIComponent(month) + '&year=' + encodeURIComponent(year);
  url += '&_r=' + Math.random();
  const script = document.createElement('script'); script.src = url; script.id = cb; document.body.appendChild(script);
}

/* render grouped table (short date view) */
function renderTable(){
  const container = $('#tableArea');
  container.innerHTML = '';

  if (!entriesCache || entriesCache.length === 0){
    container.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }

  // --- Format tanggal menjadi "1 Oct 2025" ---
  function formatShortDate(ts){
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', opts).replace(',', '');
  }

  // --- Group berdasarkan tanggal pendek ---
  const groups = {};
  entriesCache.forEach(e => {
    const shortDate = e.date_display || formatShortDate(e.timestamp);
    if (!groups[shortDate]) groups[shortDate] = [];
    groups[shortDate].push(e);
  });

  // --- Urutkan dari tanggal awal ke akhir ---
  const dates = Object.keys(groups).sort((a,b)=>{
    const parse = s => {
      const [day, mon, year] = s.split(' ');
      const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
      return new Date(+year, months[mon] || 0, +day);
    };
    return parse(a) - parse(b);
  });

  // --- Render ke DOM ---
  const wrapper = document.createElement('div');
  wrapper.className = 'dataTable';

dates.forEach(dateKey => {
  const header = document.createElement('div');
  header.className = 'dateHeader';

  // format dateKey (bisa dari "Fri Oct 31 2025 00:00:00 GMT+0700 (Waktu Indochina)")
  const d = new Date(dateKey);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  const displayDate = `${weekday}, ${month} ${day} ${year}`;

  header.innerText = displayDate;
  wrapper.appendChild(header);

    groups[dateKey].forEach(item => {
      const row = document.createElement('div');
      row.className = 'rowEntry';
      row.dataset.uid = item.unique_id;

      const left = document.createElement('div');
      left.className = 'rowLeft';
      left.textContent = item.driver;

      const mid = document.createElement('div');
      mid.className = 'rowMid';
      mid.textContent = item.unit;

      const right = document.createElement('div');
      right.className = 'cellPayment ' + 
        (item.payment.toLowerCase() === 'cash' ? 'cash' : 'transfer');
      right.textContent = item.payment;

      const select = document.createElement('div');
      select.className = 'rowSelect';
      select.innerHTML = '<input type="checkbox" class="rowCheckbox hidden" />';

      row.appendChild(left);
      row.appendChild(mid);
      row.appendChild(right);
      row.appendChild(select);
      wrapper.appendChild(row);
    });
  });

  // --- Total entri per bulan ---
  const totals = {};
  entriesCache.forEach(e => {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}-${('0'+(d.getMonth()+1)).slice(-2)}`;
    totals[key] = (totals[key]||0) + 1;
  });

  container.appendChild(wrapper);

  const footer = document.createElement('div');
  footer.className = 'tableFooter';
  footer.textContent = Object.keys(totals)
    .map(k => `${k}: ${totals[k]} entries`).join('   ');
  container.appendChild(footer);
}

/* toggle select mode */
function toggleSelectMode(){
  selectionMode = !selectionMode;
  $$('.rowCheckbox').forEach(cb => {
    if (selectionMode) cb.classList.remove('hidden'); else { cb.classList.add('hidden'); cb.checked = false; }
  });
  play('klik'); bounce($('#selectBtn'));
}

/* delete flow: show modal Yes/No */
function onDelete(){
  if (!selectionMode){
    alert('Click Select first to choose rows to delete');
    return;
  }
  const checks = $$('.rowCheckbox').filter(cb => cb.checked);
  if (checks.length === 0){ alert('No rows selected'); return; }
  $('#confirmModal').classList.remove('hidden');
}

/* confirm yes handler */
function onConfirmYes(){
  play('klik');
  const checks = $$('.rowCheckbox').filter(cb => cb.checked);
  const toDelete = checks.map(cb => cb.closest('.rowEntry').getAttribute('data-uid'));
  $('#confirmModal').classList.add('hidden');
  if (toDelete.length === 0) return;
  // POST delete (no-cors)
  fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action: 'deleteEntries', unique_ids: toDelete })
  }).then(()=>{
    play('success');
    // refresh via JSONP
    setTimeout(()=> fetchEntries(), 700);
    selectionMode = false;
  }).catch(()=>{
    play('error'); alert('Delete failed');
  });
}

/* search by month */
function onSearch(){
  play('klik'); bounce($('#searchBtn'));
  const val = $('#filterMonth').value; // yyyy-mm
  if (!val){ fetchEntries(); return; }
  const [y,m] = val.split('-').map(Number);
  fetchEntries(Number(m), Number(y));
}
