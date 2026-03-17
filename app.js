/* ─────────────────────────────────────────
   SecureAuth — OTP Login System
   app.js
───────────────────────────────────────── */

/* ── STATE ── */
let usersMap     = {};   // { username → { password, email, user_id } }
let allUsers     = [];   // flat array for table rendering
let filteredUsers= [];
let serverOTP    = null;
let otpExpiry    = null;
let timerInterval= null;
let currentUser  = null;

const OTP_TTL  = 10;     // seconds
const PAGE_SIZE= 10;
let   currentPage = 1;


/* ══════════════════════════════════════
   DATABASE — load from users.json
══════════════════════════════════════ */

async function loadDatabase() {
  try {
    const resp = await fetch('users.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status} — ${resp.statusText}`);
    const data = await resp.json();

    // Build lookup map
    data.users.forEach(u => {
      usersMap[u.username] = {
        password: u.password,
        email:    u.email,
        user_id:  u.user_id
      };
    });

    allUsers      = data.users;
    filteredUsers = [...allUsers];

    // Update banner
    document.getElementById('db-dot').className       = 'db-dot ok';
    document.getElementById('db-banner').className    = 'db-banner loaded';
    document.getElementById('db-banner-text').textContent =
      `✓ users.json loaded — ${allUsers.length} user records ready`;

    document.getElementById('stat-total').textContent  = allUsers.length;
    document.getElementById('stat-status').textContent = 'online';

    document.getElementById('login-btn').disabled = false;

    log(`DATABASE LOADED: ${allUsers.length} users from users.json`, 'ok');

  } catch (err) {
    document.getElementById('db-dot').className    = 'db-dot err';
    document.getElementById('db-banner').className = 'db-banner error';
    document.getElementById('db-banner-text').textContent =
      `✗ Failed to load users.json — ${err.message}`;
    document.getElementById('stat-status').textContent = 'error';
    document.getElementById('db-table-body').innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:20px;font-family:var(--mono);font-size:0.8rem;">
        ⚠ ${err.message}<br><br>Make sure users.json is in the same folder as index.html
      </td></tr>`;

    log(`DB LOAD ERROR: ${err.message}`, 'err');
    log(`HINT: Serve files via a local HTTP server (e.g. python3 -m http.server)`, 'warn');
  }
}


/* ══════════════════════════════════════
   TABLE — render, filter, paginate
══════════════════════════════════════ */

function renderTable() {
  const tbody = document.getElementById('db-table-body');
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredUsers.slice(start, start + PAGE_SIZE);
  const total = filteredUsers.length;
  const pages = Math.ceil(total / PAGE_SIZE);

  if (!slice.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;font-family:var(--mono);font-size:0.8rem;">No matching records</td></tr>`;
    document.getElementById('pg-info').textContent = '0 results';
    document.getElementById('pg-prev').disabled = true;
    document.getElementById('pg-next').disabled = true;
    return;
  }

  tbody.innerHTML = slice.map(u => `
    <tr id="row-${u.username}"${u.username === currentUser ? ' class="active-user"' : ''}>
      <td>${u.user_id}</td>
      <td>${u.username}</td>
      <td>${u.password}</td>
      <td>${u.email}</td>
      <td><span class="tag tag-ok">active</span></td>
    </tr>
  `).join('');

  document.getElementById('pg-info').textContent =
    `${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;
  document.getElementById('pg-prev').disabled = currentPage <= 1;
  document.getElementById('pg-next').disabled = currentPage >= pages;
}

function filterTable() {
  const q = document.getElementById('search-input').value.toLowerCase();
  filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  );
  currentPage = 1;
  renderTable();
}

function changePage(dir) {
  currentPage += dir;
  renderTable();
}

/* Scroll the logged-in user's row into view */
function highlightRow(username) {
  const idx = filteredUsers.findIndex(u => u.username === username);
  if (idx === -1) return;

  currentPage = Math.ceil((idx + 1) / PAGE_SIZE);
  renderTable();

  const row = document.getElementById(`row-${username}`);
  if (row) {
    row.classList.add('active-user');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* Show the database panel (called only after successful login) */
function revealDatabasePanel() {
  const panel = document.getElementById('db-panel');
  panel.classList.add('visible');
  renderTable();
}

/* Hide the database panel (called on sign-out) */
function hideDatabasePanel() {
  const panel = document.getElementById('db-panel');
  panel.classList.remove('visible');
}


/* ══════════════════════════════════════
   SERVER LOG
══════════════════════════════════════ */

function log(msg, type = 'info') {
  const el = document.getElementById('server-log');
  const ts = new Date().toTimeString().split(' ')[0];
  const d  = document.createElement('div');
  d.className = `log-entry ${type}`;
  d.innerHTML = `<span class="log-ts">[${ts}]</span> ${msg}`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}


/* ══════════════════════════════════════
   UI HELPERS
══════════════════════════════════════ */

function setStep(n) {
  ['s1', 's2', 's3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = 'step-dot';
    if      (i + 1 < n)  { el.classList.add('done');   el.textContent = '✓'; }
    else if (i + 1 === n) { el.classList.add('active'); el.textContent = i + 1; }
    else                  { el.textContent = i + 1; }
  });
  ['l1', 'l2'].forEach((id, i) => {
    document.getElementById(id).className =
      'step-line' + (i + 1 < n ? ' done' : '');
  });
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.className = `alert ${type} show`;
  el.innerHTML = (type === 'error' ? '✗ ' : type === 'success' ? '✓ ' : 'ℹ ') + msg;
}

function hideAlert(id) {
  document.getElementById(id).className = 'alert';
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */

function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  hideAlert('login-alert');

  if (!username || !password) {
    showAlert('login-alert', 'Please fill in both fields.', 'error');
    log(`LOGIN ATTEMPT: Empty fields submitted`, 'err');
    return;
  }

  log(`LOGIN ATTEMPT: username="${username}"`, 'info');

  const user = usersMap[username];

  if (!user) {
    showAlert('login-alert', 'Username not found in database.', 'error');
    log(`AUTH FAILED: "${username}" not found in users.json`, 'err');
    return;
  }

  if (user.password !== password) {
    showAlert('login-alert', 'Incorrect password.', 'error');
    log(`AUTH FAILED: Wrong password for "${username}"`, 'err');
    return;
  }

  /* ─ Credentials valid: generate & dispatch OTP ─ */
  currentUser = username;
  log(`AUTH OK: "${username}" verified (user_id=${user.user_id}, email=${user.email})`, 'ok');

  serverOTP = String(Math.floor(100000 + Math.random() * 900000));
  otpExpiry = Date.now() + OTP_TTL * 1000;
  log(`OTP GENERATED: ${serverOTP} → dispatching to ${user.email}`, 'warn');

  /* Populate OTP screen */
  document.getElementById('otp-email-display').textContent   = user.email;
  document.getElementById('otp-code-display').textContent    = serverOTP;
  document.getElementById('verify-btn').disabled             = false;

  for (let i = 0; i < 6; i++) {
    const d = document.getElementById(`d${i}`);
    d.value    = '';
    d.disabled = false;
  }

  hideAlert('otp-alert');
  showScreen('screen-otp');
  setStep(2);
  startTimer();
  setTimeout(() => document.getElementById('d0').focus(), 100);
}


/* ══════════════════════════════════════
   COUNTDOWN TIMER
══════════════════════════════════════ */

function startTimer() {
  clearInterval(timerInterval);
  const circle = document.getElementById('timer-circle');
  const text   = document.getElementById('timer-text');
  const status = document.getElementById('timer-status');
  status.textContent = '';
  const CIRCUMFERENCE = 138.2;

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((otpExpiry - Date.now()) / 1000));
    text.textContent = remaining;
    circle.style.strokeDashoffset = CIRCUMFERENCE * (1 - remaining / OTP_TTL);

    if      (remaining <= 3) { circle.style.stroke = 'var(--danger)'; text.style.color = 'var(--danger)'; }
    else if (remaining <= 6) { circle.style.stroke = 'var(--warn)';   text.style.color = 'var(--warn)';   }
    else                     { circle.style.stroke = 'var(--accent)'; text.style.color = 'var(--text)';   }

    if (remaining === 0) {
      clearInterval(timerInterval);
      status.textContent = 'Expired';
      serverOTP = null;
      showAlert('otp-alert', 'OTP expired. Please go back and login again.', 'error');
      document.getElementById('verify-btn').disabled = true;
      for (let i = 0; i < 6; i++) document.getElementById(`d${i}`).disabled = true;
      log(`OTP EXPIRED for "${currentUser}"`, 'err');
    }
  }, 200);
}


/* ══════════════════════════════════════
   OTP DIGIT INPUT BEHAVIOUR
══════════════════════════════════════ */

function initOtpInputs() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`d${i}`);

    el.addEventListener('input', () => {
      el.value = el.value.replace(/\D/g, '').slice(-1);
      if (el.value && i < 5) document.getElementById(`d${i + 1}`).focus();
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !el.value && i > 0)
        document.getElementById(`d${i - 1}`).focus();
      if (e.key === 'Enter') handleVerify();
    });

    el.addEventListener('paste', e => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '');
      for (let j = 0; j < 6 && j < paste.length; j++)
        document.getElementById(`d${j}`).value = paste[j];
      document.getElementById(`d${Math.min(5, paste.length - 1)}`).focus();
    });
  }
}


/* ══════════════════════════════════════
   OTP VERIFICATION
══════════════════════════════════════ */

function handleVerify() {
  hideAlert('otp-alert');
  const entered = Array.from({ length: 6 }, (_, i) =>
    document.getElementById(`d${i}`).value
  ).join('');

  if (entered.length < 6) {
    showAlert('otp-alert', 'Please enter all 6 digits.', 'error');
    return;
  }

  if (!serverOTP || Date.now() > otpExpiry) {
    serverOTP = null;
    showAlert('otp-alert', 'OTP has expired. Please login again.', 'error');
    log(`VERIFY FAILED: OTP expired at submission`, 'err');
    return;
  }

  log(`VERIFY ATTEMPT: entered="${entered}", expected="${serverOTP}"`, 'info');

  if (entered === serverOTP) {
    clearInterval(timerInterval);
    serverOTP = null;
    log(`LOGIN SUCCESS: "${currentUser}" fully authenticated ✓`, 'ok');

    document.getElementById('success-username').textContent = currentUser;
    showScreen('screen-success');
    setStep(3);

    /* ── Reveal the database panel now that user is authenticated ── */
    revealDatabasePanel();
    highlightRow(currentUser);

  } else {
    showAlert('otp-alert', 'Incorrect OTP. Please try again.', 'error');
    log(`VERIFY FAILED: Wrong OTP for "${currentUser}"`, 'err');
  }
}


/* ══════════════════════════════════════
   BACK / SIGN OUT
══════════════════════════════════════ */

function goBack() {
  clearInterval(timerInterval);
  serverOTP = null;
  showScreen('screen-login');
  setStep(1);
  hideAlert('login-alert');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function resetAll() {
  log(`SESSION ENDED: "${currentUser}" signed out`, 'info');
  currentUser = null;

  /* Hide database panel on sign-out */
  hideDatabasePanel();

  goBack();

  /* Reset timer visuals */
  document.getElementById('timer-text').textContent         = '10';
  document.getElementById('timer-circle').style.strokeDashoffset = '0';
  document.getElementById('timer-circle').style.stroke      = 'var(--accent)';
  document.getElementById('timer-text').style.color         = 'var(--text)';
  document.getElementById('timer-status').textContent       = '';
}


/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initOtpInputs();
  loadDatabase();
});
