// ============================================================
// CampusFind - Main JavaScript
// ============================================================

/* ── Session / Auth helpers ── */
const CF = {

  // Check if user is logged in (reads from localStorage cache)
  isLoggedIn() {
    return !!localStorage.getItem('cf_user');
  },

  getUser() {
    const u = localStorage.getItem('cf_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    localStorage.setItem('cf_user', JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem('cf_user');
  },

  // Update navbar based on auth state
  updateNavbar() {
    const user       = CF.getUser();
    const navAuth    = document.getElementById('nav-auth');
    const navUser    = document.getElementById('nav-user');
    const navUserName= document.getElementById('nav-user-name');

    if (user) {
      if (navAuth)    navAuth.style.display    = 'none';
      if (navUser)    navUser.style.display    = 'flex';
      if (navUserName) navUserName.textContent = user.name;
    } else {
      if (navAuth)    navAuth.style.display    = 'flex';
      if (navUser)    navUser.style.display    = 'none';
    }
  },

  // Show/hide loading overlay
  loading(show) {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.toggle('show', show);
  },

  // Show alert inside a container
  showAlert(containerId, message, type = 'success') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = `alert-cf ${type === 'success' ? 'alert-success-cf' : 'alert-error-cf'} show`;
    el.textContent = message;
    setTimeout(() => el.classList.remove('show'), 5000);
  },

  // Format a date string nicely
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  // Truncate text
  truncate(str, n) {
    return str && str.length > n ? str.substring(0, n) + '…' : str || '';
  }
};

/* ── Registration ── */
function initRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    CF.loading(true);

    const data = new FormData(form);
    try {
      const res  = await fetch('register.php', { method: 'POST', body: data });
      const json = await res.json();
      CF.showAlert('register-alert', json.message, json.success ? 'success' : 'error');
      if (json.success) {
        setTimeout(() => window.location.href = 'login.html', 1800);
      }
    } catch (err) {
      CF.showAlert('register-alert', 'Connection error. Please try again.', 'error');
    } finally {
      CF.loading(false);
    }
  });
}

/* ── Login ── */
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    CF.loading(true);

    const data = new FormData(form);
    try {
      const res  = await fetch('login.php', { method: 'POST', body: data });
      const json = await res.json();
      if (json.success) {
        CF.setUser(json.user);
        window.location.href = 'index.html';
      } else {
        CF.showAlert('login-alert', json.message, 'error');
      }
    } catch (err) {
      CF.showAlert('login-alert', 'Connection error. Please try again.', 'error');
    } finally {
      CF.loading(false);
    }
  });
}

/* ── Logout ── */
async function logout() {
  try {
    await fetch('logout.php');
  } catch (_) {}
  CF.clearUser();
  window.location.href = 'login.html';
}

/* ── Image Upload Preview ── */
function initImageUpload(inputId, previewId, zoneId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const zone    = document.getElementById(zoneId);
  if (!input || !preview || !zone) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      preview.querySelector('img').src = e.target.result;
      preview.style.display = 'block';
      zone.querySelector('.upload-default').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

/* ── Report Form ── */
function initReportForm() {
  const form = document.getElementById('report-form');
  if (!form) return;

  // Require login
  if (!CF.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  initImageUpload('img-input', 'img-preview', 'img-zone');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    CF.loading(true);

    const data = new FormData(form);
    try {
      const res  = await fetch('save_object.php', { method: 'POST', body: data });
      const json = await res.json();
      CF.showAlert('report-alert', json.message, json.success ? 'success' : 'error');
      if (json.success) {
        form.reset();
        document.getElementById('img-preview').style.display = 'none';
        document.querySelector('.upload-default').style.display = 'block';
        setTimeout(() => window.location.href = 'index.html', 1800);
      }
    } catch (err) {
      CF.showAlert('report-alert', 'Connection error. Please try again.', 'error');
    } finally {
      CF.loading(false);
    }
  });
}

/* ── Build Object Card HTML ── */
function buildCard(obj) {
  const imgSrc = obj.image
    ? obj.image
    : null;

  const imgHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${obj.name}" loading="lazy">`
    : `<div class="card-img-placeholder">📦</div>`;

  return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="object-card">
        <div class="card-img-wrap">
          ${imgHTML}
          <span class="card-status-badge badge-${obj.status}">${obj.status}</span>
        </div>
        <div class="card-body-cf">
          <div class="card-title-cf">${obj.name}</div>
          <div class="card-desc">${CF.truncate(obj.description, 90)}</div>
          <div class="card-meta">
            <div class="card-meta-item">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              ${obj.location}
            </div>
            <div class="card-meta-item">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${CF.formatDate(obj.date)}
            </div>
            <div class="card-meta-item">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8L4 7h16l-4-4z"/></svg>
              <span class="cat-badge">${obj.category}</span>
            </div>
          </div>
          <div class="card-footer-cf">
            <span class="poster-info">By ${obj.user_name}</span>
            <button class="btn-primary-cf" style="padding:0.4rem 0.9rem;font-size:0.8rem;" onclick="openContact(${obj.id},'${obj.user_name}','${obj.name}')">
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ── Load Objects (Dashboard) ── */
async function loadObjects(params = {}) {
  const grid    = document.getElementById('objects-grid');
  const counter = document.getElementById('results-count');
  if (!grid) return;

  grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-cf mx-auto"></div></div>';

  const qs = new URLSearchParams(params).toString();
  try {
    const res  = await fetch(`get_objects.php?${qs}`);
    const json = await res.json();

    if (!json.success || json.data.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h4>No objects found</h4>
            <p>Try adjusting your filters or be the first to report one!</p>
          </div>
        </div>`;
      if (counter) counter.textContent = '0 results';
      return;
    }

    grid.innerHTML = json.data.map(buildCard).join('');
    if (counter) counter.textContent = `${json.total} result${json.total !== 1 ? 's' : ''}`;
  } catch (err) {
    grid.innerHTML = '<div class="col-12 text-center text-muted py-4">Failed to load objects. Make sure XAMPP is running.</div>';
  }
}

/* ── Search & Filters (Dashboard) ── */
function initDashboardFilters() {
  const searchInput    = document.getElementById('search-input');
  const categoryFilter = document.getElementById('filter-category');
  const locationFilter = document.getElementById('filter-location');
  const dateFilter     = document.getElementById('filter-date');
  const statusTabs     = document.querySelectorAll('.status-tab');

  let activeStatus = '';

  function getFilters() {
    return {
      keyword:  searchInput?.value.trim()    || '',
      category: categoryFilter?.value        || '',
      location: locationFilter?.value.trim() || '',
      date:     dateFilter?.value            || '',
      status:   activeStatus,
    };
  }

  // Debounced search
  let timer;
  function triggerSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => loadObjects(getFilters()), 350);
  }

  searchInput?.addEventListener('input', triggerSearch);
  categoryFilter?.addEventListener('change', triggerSearch);
  locationFilter?.addEventListener('input', triggerSearch);
  dateFilter?.addEventListener('change', triggerSearch);

  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => t.classList.remove('active', 'active-found'));
      activeStatus = tab.dataset.status || '';
      if (activeStatus === 'lost')  tab.classList.add('active');
      if (activeStatus === 'found') tab.classList.add('active-found');
      triggerSearch();
    });
  });

  document.getElementById('clear-filters')?.addEventListener('click', () => {
    if (searchInput)    searchInput.value    = '';
    if (categoryFilter) categoryFilter.value = '';
    if (locationFilter) locationFilter.value = '';
    if (dateFilter)     dateFilter.value     = '';
    activeStatus = '';
    statusTabs.forEach(t => t.classList.remove('active', 'active-found'));
    loadObjects({});
  });
}

/* ── Contact Modal ── */
function openContact(objectId, posterName, objectName) {
  if (!CF.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('contact-object-id').value   = objectId;
  document.getElementById('contact-poster-name').textContent = posterName;
  document.getElementById('contact-object-name').textContent = objectName;
  document.getElementById('contact-message').value = '';

  const modal = new bootstrap.Modal(document.getElementById('contactModal'));
  modal.show();
}

async function sendContactMessage() {
  const objectId = document.getElementById('contact-object-id').value;
  const message  = document.getElementById('contact-message').value.trim();

  if (!message) {
    CF.showAlert('contact-alert', 'Please type a message.', 'error');
    return;
  }

  CF.loading(true);
  const data = new FormData();
  data.append('object_id', objectId);
  data.append('message',   message);

  try {
    const res  = await fetch('send_message.php', { method: 'POST', body: data });
    const json = await res.json();
    CF.showAlert('contact-alert', json.message, json.success ? 'success' : 'error');
    if (json.success) {
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
      }, 1600);
    }
  } catch (err) {
    CF.showAlert('contact-alert', 'Connection error.', 'error');
  } finally {
    CF.loading(false);
  }
}

/* ── Messages Inbox ── */
async function loadMessages() {
  const container = document.getElementById('messages-container');
  if (!container) return;

  if (!CF.isLoggedIn()) {
    container.innerHTML = '<p class="text-muted">Please <a href="login.html">log in</a> to view messages.</p>';
    return;
  }

  container.innerHTML = '<div class="spinner-cf mx-auto my-4"></div>';

  try {
    const res  = await fetch('get_messages.php');
    const json = await res.json();

    if (!json.success || json.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h4>No messages yet</h4>
          <p>When someone contacts you about your posted objects, messages will appear here.</p>
        </div>`;
      return;
    }

    container.innerHTML = json.data.map(m => `
      <div class="msg-item ${m.is_read ? '' : 'unread'}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="msg-sender">${m.sender_name}</div>
            <div class="msg-object">Re: <strong>${m.object_name}</strong> (${m.object_status})</div>
            <div class="msg-text">${m.message}</div>
          </div>
          <div class="msg-time">${CF.formatDate(m.created_at?.split(' ')[0])}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted">Failed to load messages.</p>';
  }
}

/* ── Init on DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {
  CF.updateNavbar();

  const page = document.body.dataset.page;

  if (page === 'home')     { initDashboardFilters(); loadObjects({}); }
  if (page === 'login')    { initLogin(); }
  if (page === 'register') { initRegister(); }
  if (page === 'report')   { initReportForm(); }
  if (page === 'messages') { loadMessages(); }

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});
