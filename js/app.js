

// Wrap everything in IIFE to avoid global scope conflicts
(function() {
'use strict';

// =============================
// Global Cache
// =============================
let customersCache = [];
let transactionsCache = [];
let tanksCache = [];

// =============================
// Get Supabase instance
// =============================
const supabase = window.supabaseClient;

// =============================
// Helpers
// =============================
function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  const n = Number(num || 0);
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info') {
  const toast = $('liveToast');
  if (!toast) return;

  const toastTitle = $('toast-title');
  const toastMessage = $('toast-message');

  const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
  toastTitle.textContent = titles[type] || 'Notification';
  toastMessage.textContent = message;

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// =============================
// Layout Loaders (Navbar/Footer)
// =============================
async function loadComponent(placeholderId, url) {
  const ph = $(placeholderId);
  if (!ph) {
    console.warn(`Placeholder ${placeholderId} not found`);
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
      return;
    }
    const html = await res.text();
    ph.innerHTML = html;
    console.log(`✅ Loaded: ${url}`);
  } catch (error) {
    console.error(`Error loading component ${url}:`, error);
  }
}

function setActiveNav() {
  const bodyPage = document.body.getAttribute('data-page');
  if (!bodyPage) return;

  document.querySelectorAll('.nav-link[data-page], .footer-link[data-page]').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('data-page') === bodyPage) a.classList.add('active');
  });
}

function initClock() {
  const dEl = $('current-date');
  const tEl = $('current-time');
  if (!dEl || !tEl) return;

  function tick() {
    const now = new Date();
    dEl.textContent = now.toLocaleDateString('en-PK', { dateStyle: 'medium' });
    tEl.textContent = now.toLocaleTimeString('en-PK', { timeStyle: 'short' });
  }
  tick();
  setInterval(tick, 1000 * 30);
}

function initFooterYear() {
  const y = $('footer-year');
  if (y) y.textContent = new Date().getFullYear();
}

// =============================
// Data Loaders
// =============================
async function loadTanks() {
  try {
    const { data, error } = await supabase
      .from('tanks')
      .select('*')
      .order('id');

    if (error) throw error;
    tanksCache = data || [];
    updateStockDisplay();
  } catch (e) {
    console.error(e);
    showToast('Error loading stock data', 'error');
  }
}

function updateStockDisplay() {
  const petrolTank = tanksCache.find(t => t.fuel_type === 'Petrol');
  const dieselTank = tanksCache.find(t => t.fuel_type === 'Diesel');

  if (petrolTank && $('petrol-stock')) {
    $('petrol-stock').textContent = formatNumber(petrolTank.current_stock);
    if ($('petrol-progress')) {
      const pct = (petrolTank.current_stock / petrolTank.capacity) * 100;
      $('petrol-progress').style.width = pct + '%';
    }
  }

  if (dieselTank && $('diesel-stock')) {
    $('diesel-stock').textContent = formatNumber(dieselTank.current_stock);
    if ($('diesel-progress')) {
      const pct = (dieselTank.current_stock / dieselTank.capacity) * 100;
      $('diesel-progress').style.width = pct + '%';
    }
  }

  const carMobil = tanksCache.find(t => t.name === 'Car Mobil');
  const openMobil = tanksCache.find(t => t.name === 'Open Mobil');

  if (carMobil && $('mobil-car-stock-page')) $('mobil-car-stock-page').textContent = `${formatNumber(carMobil.current_stock)} Liters`;
  if (openMobil && $('mobil-open-stock-page')) $('mobil-open-stock-page').textContent = `${formatNumber(openMobil.current_stock)} Liters`;

  if (carMobil && $('car-mobil-stock')) $('car-mobil-stock').innerHTML = `${formatNumber(carMobil.current_stock)} <small>liters</small>`;
  if (openMobil && $('open-mobil-stock')) $('open-mobil-stock').innerHTML = `${formatNumber(openMobil.current_stock)} <small>liters</small>`;
}

async function loadCustomers() {
  try {
    const user = await window.auth.getCurrentUser();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq ('user_id, user.id') // add this for auth athentication
      .order('sr_no');

    if (error) throw error;
    customersCache = data || [];
    updateCustomersTable();
    populateCustomerDropdowns();
  } catch (e) {
    console.error(e);
    showToast('Error loading customers', 'error');
  }
}

function updateCustomersTable() {
  const tbody = $('customers-table');
  if (!tbody) return;

  if (customersCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers found</td></tr>';
    return;
  }

  let html = '';
  customersCache.forEach(c => {
    const balanceClass = c.balance > 0 ? 'balance-positive' : c.balance < 0 ? 'balance-negative' : 'balance-zero';
    const balanceText = c.balance > 0 ? `Udhaar: Rs. ${formatNumber(c.balance)}` :
      c.balance < 0 ? `Advance: Rs. ${formatNumber(Math.abs(c.balance))}` : 'Zero';

    html += `
      <tr>
        <td>${c.sr_no}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '-'}</td>
        <td><span class="badge badge-info">${c.category}</span></td>
        <td class="${balanceClass}">${balanceText}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerDetails(${c.id})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function populateCustomerDropdowns() {
  const saleCustomer = $('sale-customer');
  const vasooliCustomer = $('vasooli-customer');

  let options = '<option value="">Select Customer</option>';
  customersCache.forEach(c => options += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`);

  if (saleCustomer) saleCustomer.innerHTML = options;
  if (vasooliCustomer) vasooliCustomer.innerHTML = options;
}

async function loadTransactions() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, customer:customers(name, sr_no), tank:tanks(fuel_type)`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    transactionsCache = data || [];
    updateTransactionsTable();
    updateRecentTransactions();
  } catch (e) {
    console.error(e);
    showToast('Error loading transactions', 'error');
  }
}

function updateTransactionsTable() {
  const tbody = $('transactions-table');
  if (!tbody) return;

  if (transactionsCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No transactions found</td></tr>';
    return;
  }

  let html = '';
  transactionsCache.forEach(t => {
    const date = new Date(t.created_at);
    const typeClass = t.transaction_type === 'Credit' ? 'badge-danger' :
      t.transaction_type === 'Debit' ? 'badge-success' : 'badge-warning';

    html += `
      <tr>
        <td>${date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${t.customer?.name || 'N/A'} (${t.customer?.sr_no || '-'})</td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td>${t.tank?.fuel_type || '-'}</td>
        <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
        <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
        <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
        <td>${t.description || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${t.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateRecentTransactions() {
  const tbody = $('recent-transactions');
  if (!tbody) return;

  const recent = transactionsCache.slice(0, 10);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions yet</td></tr>';
    return;
  }

  let html = '';
  recent.forEach(t => {
    const date = new Date(t.created_at);
    const typeClass = t.transaction_type === 'Credit' ? 'badge-danger' :
      t.transaction_type === 'Debit' ? 'badge-success' : 'badge-warning';

    html += `
      <tr>
        <td>${date.toLocaleString('en-PK', { timeStyle: 'short' })}</td>
        <td>${t.customer?.name || 'N/A'}</td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
        <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Make functions globally accessible
window.viewCustomerDetails = function(id) {
  const c = customersCache.find(x => x.id === id);
  if (!c) return;
  alert(`Customer Details:\n\nSR No: ${c.sr_no}\nName: ${c.name}\nPhone: ${c.phone || 'N/A'}\nCategory: ${c.category}\nBalance: Rs. ${formatNumber(c.balance)}`);
};

window.deleteTransaction = async function(id) {
  if (!confirm('Are you sure you want to delete this transaction? This cannot be undone.')) return;
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    showToast('Transaction deleted successfully!', 'success');
    await loadTransactions();
  } catch (e) {
    console.error(e);
    showToast('Error deleting transaction: ' + e.message, 'error');
  }
};

// Transaction Functions
window.addSale = async function() {
  const customerId = $('sale-customer')?.value;
  const fuelType = $('sale-fuel-type')?.value;
  const liters = parseFloat($('sale-liters')?.value);
  const unitPrice = parseFloat($('sale-unit-price')?.value);
  const amount = parseFloat($('sale-amount')?.value);
  const paymentType = $('sale-payment-type')?.value;
  const description = $('sale-description')?.value;

  if (!customerId || !fuelType || !(liters > 0) || !(amount > 0)) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const tank = tanksCache.find(t => t.fuel_type === fuelType);
  if (!tank) return showToast('Tank not found', 'error');

  if (tank.current_stock < liters) {
    showToast('Not enough stock! Current: ' + tank.current_stock + ' L', 'error');
    return;
  }

  try {
    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        tank_id: tank.id,
        transaction_type: 'Credit',
        amount,
        liters,
        unit_price: unitPrice,
        description: description || null
      }]);

    if (transError) throw transError;

    const { error: tankError } = await supabase
      .from('tanks')
      .update({ current_stock: tank.current_stock - liters, last_updated: new Date().toISOString() })
      .eq('id', tank.id);

    if (tankError) throw tankError;

    if (paymentType === 'credit') {
      const customer = customersCache.find(c => c.id === parseInt(customerId));
      const { error: customerError } = await supabase
        .from('customers')
        .update({ balance: parseFloat(customer.balance) + amount })
        .eq('id', customerId);

      if (customerError) throw customerError;
    }

    showToast('Sale added successfully!', 'success');
    const modalEl = $('newSaleModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    $('newSaleForm')?.reset();

    await loadTanks();
    await loadCustomers();
    await loadTransactions();
  } catch (e) {
    console.error(e);
    showToast('Error adding sale: ' + e.message, 'error');
  }
};

window.addVasooli = async function() {
  const customerId = $('vasooli-customer')?.value;
  const amount = parseFloat($('vasooli-amount')?.value);
  const description = $('vasooli-description')?.value;

  if (!customerId || !(amount > 0)) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        tank_id: null,
        transaction_type: 'Debit',
        amount,
        liters: 0,
        unit_price: null,
        description: description || 'Vasooli'
      }]);

    if (transError) throw transError;

    const customer = customersCache.find(c => c.id === parseInt(customerId));
    const { error: customerError } = await supabase
      .from('customers')
      .update({ balance: parseFloat(customer.balance) - amount })
      .eq('id', customerId);

    if (customerError) throw customerError;

    showToast('Vasooli recorded successfully!', 'success');
    const modalEl = $('vasooliModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    $('vasooliForm')?.reset();

    await loadCustomers();
    await loadTransactions();
  } catch (e) {
    console.error(e);
    showToast('Error recording vasooli: ' + e.message, 'error');
  }
};

window.addExpense = async function() {
  const amount = parseFloat($('expense-amount')?.value);
  const description = $('expense-description')?.value;

  if (!(amount > 0) || !description) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    const owner = customersCache.find(c => c.category === 'Owner' && c.sr_no === 0);
    if (!owner) return showToast('Owner account not found. Please create one first.', 'error');

    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: owner.id,
        tank_id: null,
        transaction_type: 'Expense',
        amount,
        liters: 0,
        unit_price: null,
        description
      }]);

    if (error) throw error;

    showToast('Expense recorded successfully!', 'success');
    const modalEl = $('expenseModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    $('expenseForm')?.reset();

    await loadTransactions();
  } catch (e) {
    console.error(e);
    showToast('Error recording expense: ' + e.message, 'error');
  }
};

// =============================
// Settings
// =============================
function loadFuelPrices() {
  const stored = localStorage.getItem('fuel_prices');
  if (stored && window.config) {
    window.config.FUEL_PRICES = JSON.parse(stored);
  }

  if ($('petrol-price') && window.config) $('petrol-price').value = window.config.FUEL_PRICES.Petrol;
  if ($('diesel-price') && window.config) $('diesel-price').value = window.config.FUEL_PRICES.Diesel;
}

window.saveFuelPrices = function() {
  const petrolPrice = parseFloat($('petrol-price')?.value);
  const dieselPrice = parseFloat($('diesel-price')?.value);

  if (!(petrolPrice > 0) || !(dieselPrice > 0)) {
    showToast('Please enter valid prices', 'error');
    return;
  }

  if (window.config) {
    window.config.FUEL_PRICES.Petrol = petrolPrice;
    window.config.FUEL_PRICES.Diesel = dieselPrice;
    localStorage.setItem('fuel_prices', JSON.stringify(window.config.FUEL_PRICES));
  }
  showToast('Fuel prices saved!', 'success');
};

// =============================
// Init
// =============================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 App initializing...');
  
  // Load navbar/footer
  await loadComponent('navbar-placeholder', 'components/navbar.html');
  await loadComponent('footer-placeholder', 'components/footer.html');

  setActiveNav();
  initClock();
  initFooterYear();
  loadFuelPrices();

  const page = document.body.getAttribute('data-page');
  console.log(`📄 Current page: ${page}`);

  await loadTanks();
  await loadCustomers();

  if (page === 'index') {
    await loadTransactions();
  }

  if (page === 'transactions') {
    await loadTransactions();
  }

  if (page === 'reports') {
    if ($('report-date')) $('report-date').value = new Date().toISOString().split('T')[0];
  }

  console.log('✅ App initialized successfully!');
});

// Add this at the END of app.js (before closing })();)

// =============================
// Authentication Integration
// =============================
async function initializeAuthenticatedData() {
  try {
    const user = await window.auth.getCurrentUser();
    if (!user) return;

    // Get user_id for all queries
    const userId = user.id;

    // Update all Supabase queries to include user_id
    // Example for customers:
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)  // ← ADD THIS FILTER
      .order('sr_no');

    // Do same for transactions, tanks, etc.
  } catch (error) {
    console.error('Auth initialization error:', error);
  }
}

// Call on page load if authenticated
if (window.auth) {
  initializeAuthenticatedData();
}

})(); // End IIFE