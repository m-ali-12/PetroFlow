// Dashboard Page Enhancements
(function() {
'use strict';

const supabase = window.supabaseClient;

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Load Today's Summary
async function loadTodaySummary() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (error) throw error;

    let totalSales = 0;
    let salesCount = 0;
    let totalVasooli = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.transaction_type === 'Credit') {
        totalSales += t.amount;
        salesCount++;
      } else if (t.transaction_type === 'Debit') {
        totalVasooli += t.amount;
      } else if (t.transaction_type === 'Expense') {
        totalExpenses += t.amount;
      }
    });

    const netCash = totalSales + totalVasooli - totalExpenses;

    // Update UI
    if ($('today-sales')) $('today-sales').textContent = 'Rs. ' + formatNumber(totalSales);
    if ($('today-sales-count')) $('today-sales-count').textContent = salesCount + ' transactions';
    if ($('today-vasooli')) $('today-vasooli').textContent = 'Rs. ' + formatNumber(totalVasooli);
    if ($('today-expenses')) $('today-expenses').textContent = 'Rs. ' + formatNumber(totalExpenses);
    if ($('today-net')) {
      $('today-net').textContent = 'Rs. ' + formatNumber(netCash);
      $('today-net').className = netCash >= 0 ? 'text-success' : 'text-danger';
    }
  } catch (error) {
    console.error('Error loading today summary:', error);
  }
}

// Check Low Stock and Show Alert
async function checkLowStock() {
  try {
    const { data: tanks, error } = await supabase
      .from('tanks')
      .select('*')
      .in('fuel_type', ['Petrol', 'Diesel']);

    if (error) throw error;

    const lowStockTanks = [];
    const threshold = 0.2; // 20% threshold

    tanks.forEach(tank => {
      const percentage = (tank.current_stock / tank.capacity) * 100;
      if (percentage < threshold * 100) {
        lowStockTanks.push({
          type: tank.fuel_type,
          current: tank.current_stock,
          capacity: tank.capacity,
          percentage: percentage.toFixed(1)
        });
      }
    });

    if (lowStockTanks.length > 0) {
      const alertDiv = $('low-stock-alert');
      const messageDiv = $('low-stock-message');
      
      if (alertDiv && messageDiv) {
        let message = 'The following fuel tanks are running low:<br>';
        lowStockTanks.forEach(tank => {
          message += `<strong>${tank.type}</strong>: ${formatNumber(tank.current)} L (${tank.percentage}% remaining)<br>`;
        });
        message += '<small>Please arrange for refill soon.</small>';
        
        messageDiv.innerHTML = message;
        alertDiv.classList.remove('d-none');
      }
    }
  } catch (error) {
    console.error('Error checking low stock:', error);
  }
}

// Enhanced Stock Display with Capacity
async function enhanceStockDisplay() {
  try {
    const { data: tanks, error } = await supabase
      .from('tanks')
      .select('*')
      .in('fuel_type', ['Petrol', 'Diesel']);

    if (error) throw error;

    const petrolTank = tanks.find(t => t.fuel_type === 'Petrol');
    const dieselTank = tanks.find(t => t.fuel_type === 'Diesel');

    if (petrolTank && $('petrol-capacity')) {
      $('petrol-capacity').textContent = formatNumber(petrolTank.capacity);
    }

    if (dieselTank && $('diesel-capacity')) {
      $('diesel-capacity').textContent = formatNumber(dieselTank.capacity);
    }
  } catch (error) {
    console.error('Error enhancing stock display:', error);
  }
}

// Initialize Dashboard Enhancements
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'index') {
    // Load additional dashboard data
    loadTodaySummary();
    checkLowStock();
    enhanceStockDisplay();

    // Refresh every 5 minutes
    setInterval(() => {
      loadTodaySummary();
      checkLowStock();
    }, 5 * 60 * 1000);

    console.log('✅ Dashboard enhancements initialized');
  }
});

})();