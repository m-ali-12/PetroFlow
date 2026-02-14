// Reports System
(function() {
'use strict';

const supabase = window.supabaseClient;

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

// Select Report Type
window.selectReportType = function(type) {
  // Hide all sections
  document.querySelectorAll('.report-section').forEach(s => s.style.display = 'none');
  
  // Show selected section
  const section = $(`${type}-report-section`);
  if (section) {
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Generate Daily Report
window.generateDailyReport = async function() {
  const date = $('daily-date').value;
  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Fetch transactions for the day
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(fuel_type, name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate statistics
    const stats = {
      totalSales: 0,
      totalCash: 0,
      totalCredit: 0,
      totalVasooli: 0,
      totalExpense: 0,
      petrol: { liters: 0, amount: 0 },
      diesel: { liters: 0, amount: 0 },
      mobilOil: { liters: 0, amount: 0 }
    };

    transactions.forEach(t => {
      if (t.transaction_type === 'Credit') {
        stats.totalSales += t.amount;
        const paymentDesc = t.description?.toLowerCase() || '';
        if (!paymentDesc.includes('udhaar') && !paymentDesc.includes('credit')) {
          stats.totalCash += t.amount;
        } else {
          stats.totalCredit += t.amount;
        }

        // Fuel breakdown
        if (t.tank?.fuel_type === 'Petrol') {
          stats.petrol.liters += t.liters || 0;
          stats.petrol.amount += t.amount;
        } else if (t.tank?.fuel_type === 'Diesel') {
          stats.diesel.liters += t.liters || 0;
          stats.diesel.amount += t.amount;
        } else if (t.tank?.name?.includes('Mobil')) {
          stats.mobilOil.liters += t.liters || 0;
          stats.mobilOil.amount += t.amount;
        }
      } else if (t.transaction_type === 'Debit') {
        stats.totalVasooli += t.amount;
      } else if (t.transaction_type === 'Expense') {
        stats.totalExpense += t.amount;
      }
    });

    // Generate HTML
    const html = `
      <div class="report-content">
        <div class="report-header">
          <h4>Daily Report - ${formatDate(date)}</h4>
          <p class="text-muted mb-0">Generated on: ${formatDate(new Date())}</p>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="stat-box success">
              <h6 class="text-muted mb-1">Total Sales</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalSales)}</h3>
              <small>Cash: Rs. ${formatNumber(stats.totalCash)} | Credit: Rs. ${formatNumber(stats.totalCredit)}</small>
            </div>
          </div>
          <div class="col-md-6">
            <div class="stat-box primary">
              <h6 class="text-muted mb-1">Total Vasooli (Collections)</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalVasooli)}</h3>
            </div>
          </div>
          <div class="col-md-6">
            <div class="stat-box danger">
              <h6 class="text-muted mb-1">Total Expenses</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalExpense)}</h3>
            </div>
          </div>
          <div class="col-md-6">
            <div class="stat-box warning">
              <h6 class="text-muted mb-1">Net Cash Flow</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalCash + stats.totalVasooli - stats.totalExpense)}</h3>
              <small>Cash Sales + Vasooli - Expenses</small>
            </div>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-md-12">
            <h5 class="border-bottom pb-2 mb-3">Fuel Sales Breakdown</h5>
          </div>
          <div class="col-md-4">
            <div class="stat-box success">
              <h6 class="text-muted">Petrol</h6>
              <p class="mb-1"><strong>${formatNumber(stats.petrol.liters)} L</strong></p>
              <p class="mb-0">Rs. ${formatNumber(stats.petrol.amount)}</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box warning">
              <h6 class="text-muted">Diesel</h6>
              <p class="mb-1"><strong>${formatNumber(stats.diesel.liters)} L</strong></p>
              <p class="mb-0">Rs. ${formatNumber(stats.diesel.amount)}</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box info">
              <h6 class="text-muted">Mobil Oil</h6>
              <p class="mb-1"><strong>${formatNumber(stats.mobilOil.liters)} L</strong></p>
              <p class="mb-0">Rs. ${formatNumber(stats.mobilOil.amount)}</p>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="border-bottom pb-2 mb-3">Transaction Details</h5>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead class="table-light">
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Fuel</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleTimeString('en-PK', { timeStyle: 'short' })}</td>
                    <td>${t.customer?.name || 'N/A'}</td>
                    <td><span class="badge badge-sm bg-${t.transaction_type === 'Credit' ? 'success' : t.transaction_type === 'Debit' ? 'primary' : 'danger'}">${t.transaction_type}</span></td>
                    <td>${t.tank?.fuel_type || t.tank?.name || '-'}</td>
                    <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
                    <td>Rs. ${formatNumber(t.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="text-center no-print">
          <button class="btn btn-primary me-2" onclick="window.print()">
            <i class="bi bi-printer me-1"></i>Print Report
          </button>
          <button class="btn btn-secondary" onclick="exportReport('daily', '${date}')">
            <i class="bi bi-download me-1"></i>Export PDF
          </button>
        </div>
      </div>
    `;

    $('daily-report-content').innerHTML = html;
    showToast('Daily report generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating daily report:', error);
    showToast('Error generating report: ' + error.message, 'error');
  }
};

// Generate Monthly Report
window.generateMonthlyReport = async function() {
  const month = parseInt($('monthly-month').value);
  const year = parseInt($('monthly-year').value);

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(fuel_type, name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Calculate stats (similar to daily)
    const stats = {
      totalSales: 0,
      totalCash: 0,
      totalCredit: 0,
      totalVasooli: 0,
      totalExpense: 0,
      petrol: { liters: 0, amount: 0, transactions: 0 },
      diesel: { liters: 0, amount: 0, transactions: 0 },
      mobilOil: { liters: 0, amount: 0, transactions: 0 }
    };

    const customerSales = {};

    transactions.forEach(t => {
      if (t.transaction_type === 'Credit') {
        stats.totalSales += t.amount;
        stats.totalCash += t.amount;

        if (t.tank?.fuel_type === 'Petrol') {
          stats.petrol.liters += t.liters || 0;
          stats.petrol.amount += t.amount;
          stats.petrol.transactions++;
        } else if (t.tank?.fuel_type === 'Diesel') {
          stats.diesel.liters += t.liters || 0;
          stats.diesel.amount += t.amount;
          stats.diesel.transactions++;
        } else if (t.tank?.name?.includes('Mobil')) {
          stats.mobilOil.liters += t.liters || 0;
          stats.mobilOil.amount += t.amount;
          stats.mobilOil.transactions++;
        }

        // Customer-wise
        const custName = t.customer?.name || 'Unknown';
        if (!customerSales[custName]) {
          customerSales[custName] = 0;
        }
        customerSales[custName] += t.amount;
      } else if (t.transaction_type === 'Debit') {
        stats.totalVasooli += t.amount;
      } else if (t.transaction_type === 'Expense') {
        stats.totalExpense += t.amount;
      }
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const topCustomers = Object.entries(customerSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const html = `
      <div class="report-content">
        <div class="report-header">
          <h4>Monthly Report - ${monthNames[month - 1]} ${year}</h4>
          <p class="text-muted mb-0">Generated on: ${formatDate(new Date())}</p>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="stat-box success">
              <h6 class="text-muted mb-1">Total Sales</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalSales)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box primary">
              <h6 class="text-muted mb-1">Vasooli</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalVasooli)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box danger">
              <h6 class="text-muted mb-1">Expenses</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalExpense)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box warning">
              <h6 class="text-muted mb-1">Net Profit</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalSales - stats.totalExpense)}</h3>
            </div>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-md-12">
            <h5 class="border-bottom pb-2 mb-3">Monthly Fuel Sales</h5>
          </div>
          <div class="col-md-4">
            <div class="stat-box success">
              <h6 class="text-muted">Petrol</h6>
              <p class="mb-1"><strong>${formatNumber(stats.petrol.liters)} L</strong> (${stats.petrol.transactions} sales)</p>
              <p class="mb-0">Rs. ${formatNumber(stats.petrol.amount)}</p>
              <small>Avg: Rs. ${formatNumber(stats.petrol.amount / stats.petrol.liters || 0)}/L</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box warning">
              <h6 class="text-muted">Diesel</h6>
              <p class="mb-1"><strong>${formatNumber(stats.diesel.liters)} L</strong> (${stats.diesel.transactions} sales)</p>
              <p class="mb-0">Rs. ${formatNumber(stats.diesel.amount)}</p>
              <small>Avg: Rs. ${formatNumber(stats.diesel.amount / stats.diesel.liters || 0)}/L</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box info">
              <h6 class="text-muted">Mobil Oil</h6>
              <p class="mb-1"><strong>${formatNumber(stats.mobilOil.liters)} L</strong> (${stats.mobilOil.transactions} sales)</p>
              <p class="mb-0">Rs. ${formatNumber(stats.mobilOil.amount)}</p>
              <small>Avg: Rs. ${formatNumber(stats.mobilOil.amount / stats.mobilOil.liters || 0)}/L</small>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="border-bottom pb-2 mb-3">Top 10 Customers</h5>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead class="table-light">
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${topCustomers.map((c, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${c[0]}</td>
                    <td><strong>Rs. ${formatNumber(c[1])}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="text-center no-print">
          <button class="btn btn-primary me-2" onclick="window.print()">
            <i class="bi bi-printer me-1"></i>Print Report
          </button>
          <button class="btn btn-secondary" onclick="exportReport('monthly', '${month}-${year}')">
            <i class="bi bi-download me-1"></i>Export PDF
          </button>
        </div>
      </div>
    `;

    $('monthly-report-content').innerHTML = html;
    showToast('Monthly report generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating monthly report:', error);
    showToast('Error generating report: ' + error.message, 'error');
  }
};

// Generate Customer Report
window.generateCustomerReport = async function() {
  const customerId = $('customer-select').value;
  const fromDate = $('customer-from-date').value;
  const toDate = $('customer-to-date').value;

  if (!customerId || !fromDate || !toDate) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        tank:tanks(fuel_type, name)
      `)
      .eq('customer_id', customerId)
      .gte('created_at', new Date(fromDate).toISOString())
      .lte('created_at', new Date(toDate + 'T23:59:59').toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate stats
    let totalCredit = 0;
    let totalDebit = 0;
    const fuelBreakdown = { petrol: 0, diesel: 0, mobil: 0 };

    transactions.forEach(t => {
      if (t.transaction_type === 'Credit') {
        totalCredit += t.amount;
        if (t.tank?.fuel_type === 'Petrol') fuelBreakdown.petrol += t.liters || 0;
        else if (t.tank?.fuel_type === 'Diesel') fuelBreakdown.diesel += t.liters || 0;
        else if (t.tank?.name?.includes('Mobil')) fuelBreakdown.mobil += t.liters || 0;
      } else if (t.transaction_type === 'Debit') {
        totalDebit += t.amount;
      }
    });

    const html = `
      <div class="report-content">
        <div class="report-header">
          <h4>Customer Report - ${customer.name}</h4>
          <p class="text-muted mb-0">Period: ${formatDate(fromDate)} to ${formatDate(toDate)}</p>
          <p class="text-muted">SR No: ${customer.sr_no} | Phone: ${customer.phone || 'N/A'}</p>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="stat-box danger">
              <h6 class="text-muted mb-1">Total Credit (Udhaar)</h6>
              <h3 class="mb-0">Rs. ${formatNumber(totalCredit)}</h3>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box success">
              <h6 class="text-muted mb-1">Total Debit (Paid)</h6>
              <h3 class="mb-0">Rs. ${formatNumber(totalDebit)}</h3>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box ${customer.balance > 0 ? 'danger' : 'success'}">
              <h6 class="text-muted mb-1">Current Balance</h6>
              <h3 class="mb-0">Rs. ${formatNumber(Math.abs(customer.balance))}</h3>
              <small>${customer.balance > 0 ? 'Udhaar' : customer.balance < 0 ? 'Advance' : 'Clear'}</small>
            </div>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-md-12">
            <h5 class="border-bottom pb-2 mb-3">Fuel Consumption</h5>
          </div>
          <div class="col-md-4">
            <div class="stat-box primary">
              <h6>Petrol</h6>
              <p class="mb-0"><strong>${formatNumber(fuelBreakdown.petrol)} L</strong></p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box warning">
              <h6>Diesel</h6>
              <p class="mb-0"><strong>${formatNumber(fuelBreakdown.diesel)} L</strong></p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-box info">
              <h6>Mobil Oil</h6>
              <p class="mb-0"><strong>${formatNumber(fuelBreakdown.mobil)} L</strong></p>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <h5 class="border-bottom pb-2 mb-3">Transaction History</h5>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead class="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Fuel</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => {
                  let runningBalance = customer.balance;
                  return `
                    <tr>
                      <td>${formatDate(t.created_at)}</td>
                      <td><span class="badge bg-${t.transaction_type === 'Credit' ? 'danger' : 'success'}">${t.transaction_type}</span></td>
                      <td>${t.tank?.fuel_type || t.tank?.name || '-'}</td>
                      <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
                      <td>Rs. ${formatNumber(t.amount)}</td>
                      <td>-</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="text-center no-print">
          <button class="btn btn-primary me-2" onclick="window.print()">
            <i class="bi bi-printer me-1"></i>Print Report
          </button>
        </div>
      </div>
    `;

    $('customer-report-content').innerHTML = html;
    showToast('Customer report generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating customer report:', error);
    showToast('Error generating report: ' + error.message, 'error');
  }
};

// Generate Summary Report
window.generateSummaryReport = async function() {
  const fromDate = $('summary-from-date').value;
  const toDate = $('summary-to-date').value;

  if (!fromDate || !toDate) {
    showToast('Please select date range', 'error');
    return;
  }

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', new Date(fromDate).toISOString())
      .lte('created_at', new Date(toDate + 'T23:59:59').toISOString());

    if (error) throw error;

    // Comprehensive stats
    const stats = {
      totalSales: 0,
      totalVasooli: 0,
      totalExpense: 0,
      totalTransactions: transactions.length
    };

    transactions.forEach(t => {
      if (t.transaction_type === 'Credit') stats.totalSales += t.amount;
      else if (t.transaction_type === 'Debit') stats.totalVasooli += t.amount;
      else if (t.transaction_type === 'Expense') stats.totalExpense += t.amount;
    });

    const netProfit = stats.totalSales - stats.totalExpense;
    const cashFlow = stats.totalSales + stats.totalVasooli - stats.totalExpense;

    const html = `
      <div class="report-content">
        <div class="report-header">
          <h4>Summary Report</h4>
          <p class="text-muted mb-0">Period: ${formatDate(fromDate)} to ${formatDate(toDate)}</p>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="stat-box success">
              <h6 class="text-muted mb-1">Total Sales</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalSales)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box primary">
              <h6 class="text-muted mb-1">Total Vasooli</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalVasooli)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box danger">
              <h6 class="text-muted mb-1">Total Expenses</h6>
              <h3 class="mb-0">Rs. ${formatNumber(stats.totalExpense)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-box warning">
              <h6 class="text-muted mb-1">Net Profit</h6>
              <h3 class="mb-0">Rs. ${formatNumber(netProfit)}</h3>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="stat-box info">
              <h6 class="text-muted mb-1">Total Transactions</h6>
              <h3 class="mb-0">${stats.totalTransactions}</h3>
            </div>
          </div>
          <div class="col-md-6">
            <div class="stat-box ${cashFlow >= 0 ? 'success' : 'danger'}">
              <h6 class="text-muted mb-1">Net Cash Flow</h6>
              <h3 class="mb-0">Rs. ${formatNumber(cashFlow)}</h3>
              <small>Sales + Vasooli - Expenses</small>
            </div>
          </div>
        </div>

        <div class="text-center no-print">
          <button class="btn btn-primary me-2" onclick="window.print()">
            <i class="bi bi-printer me-1"></i>Print Report
          </button>
        </div>
      </div>
    `;

    $('summary-report-content').innerHTML = html;
    showToast('Summary report generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating summary report:', error);
    showToast('Error generating report: ' + error.message, 'error');
  }
};

// Export Report (placeholder)
window.exportReport = function(type, identifier) {
  showToast('PDF export feature coming soon!', 'info');
  // TODO: Implement PDF export using jsPDF or similar
};

// Load Customer Dropdown
async function loadCustomerDropdown() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, sr_no, name')
      .order('sr_no');

    if (error) throw error;

    const select = $('customer-select');
    if (!select) return;

    select.innerHTML = '<option value="">Select Customer</option>';
    data.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Initialize Year Dropdown
function initYearDropdown() {
  const currentYear = new Date().getFullYear();
  const yearSelect = $('monthly-year');
  
  if (!yearSelect) return;

  for (let i = currentYear; i >= currentYear - 5; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    if (i === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }

  // Set current month
  const currentMonth = new Date().getMonth() + 1;
  if ($('monthly-month')) $('monthly-month').value = currentMonth;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'reports') {
    const today = new Date().toISOString().split('T')[0];
    
    // Set default dates
    if ($('daily-date')) $('daily-date').value = today;
    if ($('customer-from-date')) $('customer-from-date').value = new Date(new Date().setDate(1)).toISOString().split('T')[0];
    if ($('customer-to-date')) $('customer-to-date').value = today;
    if ($('summary-from-date')) $('summary-from-date').value = new Date(new Date().setDate(1)).toISOString().split('T')[0];
    if ($('summary-to-date')) $('summary-to-date').value = today;

    initYearDropdown();
    loadCustomerDropdown();

    console.log('✅ Reports system initialized');
  }
});

})();