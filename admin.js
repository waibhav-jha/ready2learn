/* ==========================================================================
   Dr. Chitra Sankar Admin Portal Logic & State Management
   ========================================================================== */

const DEFAULT_ADMIN_PIN = "2026";

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initContentFormHandlers();
});

/* ==========================================================================
   1. PIN AUTHENTICATION GATE
   ========================================================================== */
function initAdminAuth() {
  const pinForm = document.getElementById('admin-pin-form');
  const pinInput = document.getElementById('admin-pin-input');
  const errorMsg = document.getElementById('pin-error-msg');
  const lockScreen = document.getElementById('admin-lock-screen');
  const appWrapper = document.getElementById('admin-app-wrapper');

  // Check if session is already unlocked
  if (sessionStorage.getItem('dcs_admin_unlocked') === 'true') {
    lockScreen.style.display = 'none';
    appWrapper.style.display = 'block';
    loadDashboardData();
  }

  if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (pinInput.value === DEFAULT_ADMIN_PIN) {
        sessionStorage.setItem('dcs_admin_unlocked', 'true');
        lockScreen.style.display = 'none';
        appWrapper.style.display = 'block';
        errorMsg.style.display = 'none';
        loadDashboardData();
      } else {
        errorMsg.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
      }
    });
  }
}

function lockAdminPortal() {
  sessionStorage.removeItem('dcs_admin_unlocked');
  document.getElementById('admin-lock-screen').style.display = 'flex';
  document.getElementById('admin-app-wrapper').style.display = 'none';
}

/* ==========================================================================
   2. DASHBOARD DATA LOAD & ANALYTICS CALCULATION
   ========================================================================== */
function loadDashboardData() {
  // Fetch live backend metrics & merge with local dashboard
  fetch('/api/admin/stats')
    .then(res => res.ok ? res.json() : null)
    .then(stats => {
      if (stats) {
        if (stats.totalRevenue) document.getElementById('stat-total-revenue').textContent = '₹' + Math.round(stats.totalRevenue);
        if (stats.totalOrders !== undefined) document.getElementById('stat-total-orders').textContent = stats.totalOrders;
        if (stats.totalWaitlist !== undefined) document.getElementById('stat-waitlist-count').textContent = stats.totalWaitlist;
      }
    })
    .catch(() => {});

  fetch('/api/admin/waitlist')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && Array.isArray(data.waitlist) && data.waitlist.length > 0) {
        const local = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
        const merged = [...data.waitlist, ...local.filter(l => !data.waitlist.some(d => d.email === l.email))];
        localStorage.setItem('dcs_waitlist_queue', JSON.stringify(merged));
        renderWaitlistQueue();
      }
    })
    .catch(() => {});

  renderAnalytics();
  renderWaitlistQueue();
  renderProductsList();
  renderOrdersTable();
}

function renderAnalytics() {
  const orders = JSON.parse(localStorage.getItem('dcs_orders_history') || '[]');
  const waitlist = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
  const realClickLogs = JSON.parse(localStorage.getItem('dcs_real_click_analytics') || '{}');

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const waitlistCount = waitlist.length;

  let totalClicks = 0;
  let clickRowsHtml = '';

  const loggedItems = Object.keys(realClickLogs);

  if (loggedItems.length === 0) {
    clickRowsHtml = `
      <tr>
        <td colspan="4" style="text-align:center; padding:28px; color:#777;">
          <i class="fas fa-chart-line" style="font-size:1.8rem; color:var(--lavender); display:block; margin-bottom:8px;"></i>
          No live clicks recorded yet. Click on any store product, blog article, or waitlist form on the website to see real-time interaction logs here.
        </td>
      </tr>
    `;
  } else {
    loggedItems.forEach(key => {
      const item = realClickLogs[key];
      totalClicks += (item.clicks || 0);
      clickRowsHtml += `
        <tr>
          <td><strong>${item.title}</strong></td>
          <td><span class="badge badge-purple">${item.category}</span></td>
          <td style="text-align:center;">${item.type}</td>
          <td style="text-align:right; font-weight:800; color:var(--text-primary);">${item.clicks} ${item.clicks === 1 ? 'click' : 'clicks'}</td>
        </tr>
      `;
    });
  }

  document.getElementById('stat-total-revenue').textContent = '₹' + totalRevenue;
  document.getElementById('stat-total-orders').textContent = totalOrders;
  document.getElementById('stat-waitlist-count').textContent = waitlistCount;
  document.getElementById('stat-total-clicks').textContent = totalClicks;

  const tableBody = document.getElementById('analytics-click-table-body');
  if (tableBody) tableBody.innerHTML = clickRowsHtml;
}

function clearAnalyticsLogs() {
  if (confirm('Are you sure you want to reset all click analytics logs to 0?')) {
    localStorage.removeItem('dcs_real_click_analytics');
    renderAnalytics();
  }
}


/* ==========================================================================
   3. CONSULTATION WAITLIST QUEUE & CSV EXPORT
   ========================================================================== */
function renderWaitlistQueue() {
  const waitlist = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
  const tableBody = document.getElementById('waitlist-table-body');

  if (!tableBody) return;

  if (waitlist.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:32px; color:#777;">
          <i class="fas fa-inbox" style="font-size:2rem; color:var(--lavender); display:block; margin-bottom:8px;"></i>
          No consultation waitlist requests received yet.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  waitlist.forEach((item, index) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.parentName}</strong></td>
        <td>${item.email}<br><span style="font-size:0.8rem; color:#777;">${item.phone}</span></td>
        <td>${item.childAge || 'N/A'}</td>
        <td>${item.referral || 'Direct Inquiry'}</td>
        <td>${item.date || 'Today'}</td>
        <td>
          <select onchange="updateWaitlistStatus(${index}, this.value)" style="padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:700; background:var(--bg-secondary); border:1px solid var(--purple-outline);">
            <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Contacted" ${item.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Scheduled" ${item.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
          </select>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function updateWaitlistStatus(index, newStatus) {
  let waitlist = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
  if (waitlist[index]) {
    waitlist[index].status = newStatus;
    localStorage.setItem('dcs_waitlist_queue', JSON.stringify(waitlist));
  }
}

function exportWaitlistCSV() {
  const waitlist = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
  if (waitlist.length === 0) {
    alert('No waitlist entries available to export.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,ID,Parent Name,Email,Phone,Child Age,Referral,Date,Status\n";
  waitlist.forEach((row, i) => {
    csvContent += `${i + 1},"${row.parentName}","${row.email}","${row.phone}","${row.childAge}","${row.referral}","${row.date}","${row.status || 'Pending'}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Dr_Chitra_Sankar_Waitlist_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   4. CONTENT MANAGEMENT SYSTEM (Store Items, Articles, Media)
   ========================================================================== */
function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.style.display = 'none');

  event.currentTarget.classList.add('active');
  document.getElementById(tabId).style.display = 'block';
}

function initContentFormHandlers() {
  // Store Item Form
  const productForm = document.getElementById('add-product-form');
  if (productForm) {
    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newProd = {
        id: 'custom_prod_' + Date.now(),
        title: document.getElementById('prod-title').value,
        category: document.getElementById('prod-category').value,
        price: parseInt(document.getElementById('prod-price').value, 10),
        meta: document.getElementById('prod-meta').value,
        desc: document.getElementById('prod-desc').value
      };

      let customProds = JSON.parse(localStorage.getItem('dcs_custom_products') || '[]');
      customProds.push(newProd);
      localStorage.setItem('dcs_custom_products', JSON.stringify(customProds));

      alert(`✅ Published new resource: "${newProd.title}"`);
      productForm.reset();
      renderProductsList();
    });
  }

  // Article Form
  const articleForm = document.getElementById('add-article-form');
  if (articleForm) {
    articleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newArt = {
        id: 'custom_art_' + Date.now(),
        title: document.getElementById('art-title').value,
        category: document.getElementById('art-category').value,
        readTime: document.getElementById('art-readtime').value,
        body: document.getElementById('art-body').value
      };

      let customArts = JSON.parse(localStorage.getItem('dcs_custom_articles') || '[]');
      customArts.push(newArt);
      localStorage.setItem('dcs_custom_articles', JSON.stringify(customArts));

      alert(`✅ Published article: "${newArt.title}"`);
      articleForm.reset();
    });
  }

  // Media Form
  const mediaForm = document.getElementById('add-media-form');
  if (mediaForm) {
    mediaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newMedia = {
        id: 'media_' + Date.now(),
        title: document.getElementById('media-title').value,
        type: document.getElementById('media-type').value,
        url: document.getElementById('media-url').value
      };

      let customMedia = JSON.parse(localStorage.getItem('dcs_custom_media') || '[]');
      customMedia.push(newMedia);
      localStorage.setItem('dcs_custom_media', JSON.stringify(customMedia));

      alert(`✅ Saved media asset: "${newMedia.title}"`);
      mediaForm.reset();
    });
  }
}

function renderProductsList() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  const customProds = JSON.parse(localStorage.getItem('dcs_custom_products') || '[]');

  let html = `
    <div style="padding:12px; border-radius:12px; background:var(--bg-main); display:flex; justify-content:space-between; align-items:center;">
      <div><strong>Developmental Pediatrics Parent Guide</strong><br><span style="font-size:0.8rem; color:#777;">Digital Guide • ₹499</span></div>
      <span class="badge badge-purple">Core Catalog</span>
    </div>
    <div style="padding:12px; border-radius:12px; background:var(--bg-main); display:flex; justify-content:space-between; align-items:center;">
      <div><strong>Managing Toddler Behavioral Transitions</strong><br><span style="font-size:0.8rem; color:#777;">Masterclass • ₹1299</span></div>
      <span class="badge badge-purple">Core Catalog</span>
    </div>
  `;

  customProds.forEach((prod, index) => {
    html += `
      <div style="padding:12px; border-radius:12px; background:var(--white); border:1px solid var(--soft-pink); display:flex; justify-content:space-between; align-items:center;">
        <div><strong>${prod.title}</strong><br><span style="font-size:0.8rem; color:var(--purple-outline);">${prod.category} • ₹${prod.price}</span></div>
        <button onclick="deleteCustomProduct(${index})" style="color:#D32F2F; font-weight:700;"><i class="fas fa-trash"></i></button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function deleteCustomProduct(index) {
  let customProds = JSON.parse(localStorage.getItem('dcs_custom_products') || '[]');
  customProds.splice(index, 1);
  localStorage.setItem('dcs_custom_products', JSON.stringify(customProds));
  renderProductsList();
}

/* ==========================================================================
   5. ORDERS HISTORY & RE-PRINT TAX INVOICES
   ========================================================================== */
function renderOrdersTable() {
  const orders = JSON.parse(localStorage.getItem('dcs_orders_history') || '[]');
  const tableBody = document.getElementById('orders-table-body');

  if (!tableBody) return;

  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px; color:#777;">
          <i class="fas fa-receipt" style="font-size:2rem; color:var(--lavender); display:block; margin-bottom:8px;"></i>
          No completed orders in database. Process a checkout from store to generate receipts.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  orders.forEach((order) => {
    html += `
      <tr>
        <td><strong>${order.invoiceNo}</strong></td>
        <td><code>${order.paymentId}</code></td>
        <td>${order.items.map(i => i.name).join(', ')}</td>
        <td><strong>₹${order.total}</strong></td>
        <td>${order.date}</td>
        <td style="text-align:right;">
          <button class="btn btn-outline-purple" style="padding:6px 12px; font-size:0.8rem;" onclick="reprintAdminInvoice('${order.paymentId}')"><i class="fas fa-print"></i> View / Print Invoice</button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function reprintAdminInvoice(paymentId) {
  const orders = JSON.parse(localStorage.getItem('dcs_orders_history') || '[]');
  const order = orders.find(o => o.paymentId === paymentId);

  if (!order) return;

  const modal = document.getElementById('admin-invoice-modal');
  const body = document.getElementById('admin-invoice-modal-body');

  const subtotal = (order.total / 1.18).toFixed(2);
  const totalTax = (order.total - subtotal).toFixed(2);
  const cgst = (totalTax / 2).toFixed(2);
  const sgst = (totalTax / 2).toFixed(2);

  let itemRows = '';
  order.items.forEach(item => {
    itemRows += `
      <tr>
        <td>
          <span class="invoice-item-title">${item.name}</span>
          <span class="invoice-item-format">${item.meta}</span>
        </td>
        <td style="text-align:center; font-weight:700;">1</td>
        <td style="text-align:right; font-weight:800; color:var(--text-primary);">₹${item.price}</td>
      </tr>
    `;
  });

  if (modal && body) {
    body.innerHTML = `
      <div class="printable-invoice-container">
        <div class="invoice-box">
          <div class="invoice-header-row">
            <div class="invoice-brand-col">
              <div class="invoice-brand-icon"><i class="fas fa-child-reaching"></i></div>
              <div class="invoice-brand-text">
                <h2>Dr. Chitra Sankar</h2>
                <p>Developmental Pediatrician & Digital Wellness Hub</p>
                <span>GSTIN: 29AAAAA0000A1Z5</span>
              </div>
            </div>
            <div class="invoice-right-meta">
              <div class="invoice-badge-title">TAX INVOICE</div>
              <h3>${order.invoiceNo}</h3>
              <span>${order.date}</span>
            </div>
          </div>

          <div class="invoice-info-card">
            <div class="invoice-info-col">
              <h4>Billed To:</h4>
              <p>Name: <strong>waibhav jha</strong></p>
              <p>Email: <strong>waibhavj@gmail.com</strong></p>
            </div>
            <div class="invoice-info-col">
              <h4>Payment Reference:</h4>
              <p>Status: <span class="status-paid">PAID</span></p>
              <p>Payment ID: <strong>${order.paymentId}</strong></p>
            </div>
          </div>

          <table class="invoice-items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="invoice-summary-box">
            <div class="invoice-summary-row grand-total">
              <span>Grand Total</span>
              <span>₹${order.total}.00</span>
            </div>
          </div>
        </div>

        <div class="invoice-action-bar">
          <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Invoice</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }
}
