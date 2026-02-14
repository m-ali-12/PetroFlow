// Enhanced Settings with Price History
(function() {
'use strict';

const supabase = window.supabaseClient;

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Save Fuel Prices with History
window.saveFuelPricesWithHistory = function() {
  const petrolPrice = parseFloat($('petrol-price')?.value);
  const dieselPrice = parseFloat($('diesel-price')?.value);
  const effectiveDate = $('price-effective-date')?.value;

  if (!petrolPrice || !dieselPrice || !effectiveDate) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    // Get existing history
    const fuelHistory = JSON.parse(localStorage.getItem('fuel_price_history') || '[]');
    
    // Add new entry
    fuelHistory.push({
      date: effectiveDate,
      petrol: petrolPrice,
      diesel: dieselPrice,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin'
    });

    // Save to localStorage
    localStorage.setItem('fuel_price_history', JSON.stringify(fuelHistory));
    
    // Update current prices
    const currentPrices = {
      Petrol: petrolPrice,
      Diesel: dieselPrice,
      effectiveDate: effectiveDate
    };
    localStorage.setItem('fuel_prices', JSON.stringify(currentPrices));
    localStorage.setItem('fuel_prices_updated', new Date().toISOString());

    // Update global config
    if (window.config) {
      window.config.FUEL_PRICES = currentPrices;
    }

    showToast('Fuel prices saved successfully!', 'success');
    
    // Clear inputs and reload
    $('petrol-price').value = '';
    $('diesel-price').value = '';
    loadCurrentPrices();
    loadPriceHistory();
  } catch (error) {
    console.error('Error saving fuel prices:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Save Mobil Prices with History
window.saveMobilPricesWithHistory = function() {
  const carMobilPrice = parseFloat($('car-mobil-price')?.value);
  const openMobilPrice = parseFloat($('open-mobil-price')?.value);
  const effectiveDate = $('mobil-effective-date')?.value;

  if (!carMobilPrice || !openMobilPrice || !effectiveDate) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    // Get existing history
    const mobilHistory = JSON.parse(localStorage.getItem('mobil_price_history') || '[]');
    
    // Add new entry
    mobilHistory.push({
      date: effectiveDate,
      carMobil: carMobilPrice,
      openMobil: openMobilPrice,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin'
    });

    // Save to localStorage
    localStorage.setItem('mobil_price_history', JSON.stringify(mobilHistory));
    
    // Update current prices
    const currentPrices = {
      CarMobil: carMobilPrice,
      OpenMobil: openMobilPrice,
      effectiveDate: effectiveDate
    };
    localStorage.setItem('mobil_prices', JSON.stringify(currentPrices));
    localStorage.setItem('mobil_prices_updated', new Date().toISOString());

    showToast('Mobil prices saved successfully!', 'success');
    
    // Clear inputs and reload
    $('car-mobil-price').value = '';
    $('open-mobil-price').value = '';
    loadCurrentPrices();
    loadPriceHistory();
  } catch (error) {
    console.error('Error saving mobil prices:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Get Price for Date (used when calculating old transactions)
window.getPriceForDate = function(fuelType, date) {
  const transactionDate = new Date(date);
  let priceHistory = [];

  // Determine which history to use
  if (fuelType === 'Petrol' || fuelType === 'Diesel') {
    priceHistory = JSON.parse(localStorage.getItem('fuel_price_history') || '[]');
  } else if (fuelType === 'Car Mobil' || fuelType === 'Open Mobil') {
    priceHistory = JSON.parse(localStorage.getItem('mobil_price_history') || '[]');
  }

  // Sort by date (oldest first)
  priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Find applicable price for the date
  let applicablePrice = null;
  for (const entry of priceHistory) {
    const effectiveDate = new Date(entry.date);
    if (effectiveDate <= transactionDate) {
      applicablePrice = entry;
    } else {
      break;
    }
  }

  if (!applicablePrice) {
    // Return current price if no history found
    if (fuelType === 'Petrol') return window.config?.FUEL_PRICES?.Petrol || 0;
    if (fuelType === 'Diesel') return window.config?.FUEL_PRICES?.Diesel || 0;
    if (fuelType === 'Car Mobil') {
      const mobil = JSON.parse(localStorage.getItem('mobil_prices') || '{}');
      return mobil.CarMobil || 850;
    }
    if (fuelType === 'Open Mobil') {
      const mobil = JSON.parse(localStorage.getItem('mobil_prices') || '{}');
      return mobil.OpenMobil || 800;
    }
    return 0;
  }

  // Return the price for the specific fuel type
  if (fuelType === 'Petrol') return applicablePrice.petrol;
  if (fuelType === 'Diesel') return applicablePrice.diesel;
  if (fuelType === 'Car Mobil') return applicablePrice.carMobil;
  if (fuelType === 'Open Mobil') return applicablePrice.openMobil;

  return 0;
};

// Load Current Prices
function loadCurrentPrices() {
  // Fuel prices
  const fuelPrices = JSON.parse(localStorage.getItem('fuel_prices') || '{}');
  if ($('current-petrol-price')) $('current-petrol-price').textContent = formatNumber(fuelPrices.Petrol || 0);
  if ($('current-diesel-price')) $('current-diesel-price').textContent = formatNumber(fuelPrices.Diesel || 0);

  // Mobil prices
  const mobilPrices = JSON.parse(localStorage.getItem('mobil_prices') || '{}');
  if ($('current-car-mobil-price')) $('current-car-mobil-price').textContent = formatNumber(mobilPrices.CarMobil || 0);
  if ($('current-open-mobil-price')) $('current-open-mobil-price').textContent = formatNumber(mobilPrices.OpenMobil || 0);

  // Update timestamps
  const fuelUpdate = localStorage.getItem('fuel_prices_updated');
  if (fuelUpdate && $('fuel-price-update-time')) {
    $('fuel-price-update-time').textContent = new Date(fuelUpdate).toLocaleString('en-PK');
  }

  const mobilUpdate = localStorage.getItem('mobil_prices_updated');
  if (mobilUpdate && $('mobil-price-update-time')) {
    $('mobil-price-update-time').textContent = new Date(mobilUpdate).toLocaleString('en-PK');
  }
}

// Load Price History
function loadPriceHistory() {
  // Fuel price history
  const fuelHistory = JSON.parse(localStorage.getItem('fuel_price_history') || '[]');
  const fuelHistoryTable = $('fuel-history-table');
  
  if (fuelHistoryTable) {
    if (fuelHistory.length === 0) {
      fuelHistoryTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No history yet</td></tr>';
    } else {
      let html = '';
      fuelHistory.slice().reverse().forEach(entry => {
        html += `
          <tr>
            <td>${new Date(entry.date).toLocaleDateString('en-PK')}</td>
            <td>Rs. ${formatNumber(entry.petrol)}</td>
            <td>Rs. ${formatNumber(entry.diesel)}</td>
            <td>${entry.updatedBy || 'Admin'}</td>
          </tr>
        `;
      });
      fuelHistoryTable.innerHTML = html;
    }
  }

  // Mobil price history
  const mobilHistory = JSON.parse(localStorage.getItem('mobil_price_history') || '[]');
  const mobilHistoryTable = $('mobil-history-table');
  
  if (mobilHistoryTable) {
    if (mobilHistory.length === 0) {
      mobilHistoryTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No history yet</td></tr>';
    } else {
      let html = '';
      mobilHistory.slice().reverse().forEach(entry => {
        html += `
          <tr>
            <td>${new Date(entry.date).toLocaleDateString('en-PK')}</td>
            <td>Rs. ${formatNumber(entry.carMobil)}</td>
            <td>Rs. ${formatNumber(entry.openMobil)}</td>
            <td>${entry.updatedBy || 'Admin'}</td>
          </tr>
        `;
      });
      mobilHistoryTable.innerHTML = html;
    }
  }
}

// Update Tank Capacity
window.updateTankCapacity = async function() {
  const petrolCapacity = parseFloat($('petrol-capacity-setting')?.value);
  const dieselCapacity = parseFloat($('diesel-capacity-setting')?.value);

  if (!petrolCapacity && !dieselCapacity) {
    showToast('Please enter at least one capacity', 'error');
    return;
  }

  if (!confirm('Update tank capacity? This affects stock percentages.')) return;

  try {
    if (petrolCapacity) {
      await supabase.from('tanks').update({ capacity: petrolCapacity }).eq('fuel_type', 'Petrol');
    }
    if (dieselCapacity) {
      await supabase.from('tanks').update({ capacity: dieselCapacity }).eq('fuel_type', 'Diesel');
    }

    showToast('Tank capacity updated!', 'success');
    loadTankCapacities();
    $('petrol-capacity-setting').value = '';
    $('diesel-capacity-setting').value = '';
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
};

// Load Tank Capacities
async function loadTankCapacities() {
  try {
    const { data } = await supabase
      .from('tanks')
      .select('fuel_type, capacity')
      .in('fuel_type', ['Petrol', 'Diesel']);

    const petrol = data?.find(t => t.fuel_type === 'Petrol');
    const diesel = data?.find(t => t.fuel_type === 'Diesel');

    if (petrol && $('current-petrol-capacity')) {
      $('current-petrol-capacity').textContent = formatNumber(petrol.capacity);
    }
    if (diesel && $('current-diesel-capacity')) {
      $('current-diesel-capacity').textContent = formatNumber(diesel.capacity);
    }
  } catch (error) {
    console.error('Error loading capacities:', error);
  }
}

// Load System Stats
async function loadSystemStats() {
  try {
    const { count: customers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: transactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if ($('total-customers-count')) $('total-customers-count').textContent = customers || 0;
    if ($('total-transactions-count')) $('total-transactions-count').textContent = transactions || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Export Data
window.exportData = async function() {
  try {
    showToast('Exporting data...', 'info');

    const { data: customers } = await supabase.from('customers').select('*');
    const { data: transactions } = await supabase.from('transactions').select('*');
    const { data: tanks } = await supabase.from('tanks').select('*');

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      customers: customers || [],
      transactions: transactions || [],
      tanks: tanks || [],
      settings: {
        fuelPrices: JSON.parse(localStorage.getItem('fuel_prices') || '{}'),
        mobilPrices: JSON.parse(localStorage.getItem('mobil_prices') || '{}'),
        fuelPriceHistory: JSON.parse(localStorage.getItem('fuel_price_history') || '[]'),
        mobilPriceHistory: JSON.parse(localStorage.getItem('mobil_price_history') || '[]')
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
};

// Clear Old Data
window.clearOldData = async function() {
  if (!confirm('Delete transactions older than 1 year?')) return;

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .lt('created_at', oneYearAgo.toISOString());

    if (error) throw error;

    showToast('Old transactions deleted!', 'success');
    loadSystemStats();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'settings') {
    // Set today as default date
    const today = new Date().toISOString().split('T')[0];
    if ($('price-effective-date')) $('price-effective-date').value = today;
    if ($('mobil-effective-date')) $('mobil-effective-date').value = today;

    loadCurrentPrices();
    loadPriceHistory();
    loadTankCapacities();
    loadSystemStats();

    console.log('✅ Enhanced settings initialized with price history');
  }
});

})();

// // Settings Page Management
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;

// function $(id) { return document.getElementById(id); }

// function showToast(message, type = 'info') {
//   const toast = $('liveToast');
//   if (!toast) return;

//   const toastTitle = $('toast-title');
//   const toastMessage = $('toast-message');

//   const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
//   toastTitle.textContent = titles[type] || 'Notification';
//   toastMessage.textContent = message;

//   const bsToast = new bootstrap.Toast(toast);
//   bsToast.show();
// }

// // Update Tank Capacity
// window.updateTankCapacity = async function() {
//   const petrolCapacity = parseFloat($('petrol-capacity-setting')?.value);
//   const dieselCapacity = parseFloat($('diesel-capacity-setting')?.value);

//   if (!petrolCapacity && !dieselCapacity) {
//     showToast('Please enter at least one capacity value', 'error');
//     return;
//   }

//   if (!confirm('Are you sure you want to update tank capacity? This will affect stock percentage calculations.')) {
//     return;
//   }

//   try {
//     if (petrolCapacity) {
//       const { error: petrolError } = await supabase
//         .from('tanks')
//         .update({ capacity: petrolCapacity })
//         .eq('fuel_type', 'Petrol');

//       if (petrolError) throw petrolError;
//     }

//     if (dieselCapacity) {
//       const { error: dieselError } = await supabase
//         .from('tanks')
//         .update({ capacity: dieselCapacity })
//         .eq('fuel_type', 'Diesel');

//       if (dieselError) throw dieselError;
//     }

//     showToast('Tank capacity updated successfully!', 'success');
//     loadTankCapacities();
    
//     // Clear inputs
//     if ($('petrol-capacity-setting')) $('petrol-capacity-setting').value = '';
//     if ($('diesel-capacity-setting')) $('diesel-capacity-setting').value = '';
//   } catch (error) {
//     console.error('Error updating capacity:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Load Tank Capacities
// async function loadTankCapacities() {
//   try {
//     const { data, error } = await supabase
//       .from('tanks')
//       .select('fuel_type, capacity')
//       .in('fuel_type', ['Petrol', 'Diesel']);

//     if (error) throw error;

//     const petrolTank = data.find(t => t.fuel_type === 'Petrol');
//     const dieselTank = data.find(t => t.fuel_type === 'Diesel');

//     if (petrolTank && $('current-petrol-capacity')) {
//       $('current-petrol-capacity').textContent = petrolTank.capacity.toLocaleString('en-PK');
//     }

//     if (dieselTank && $('current-diesel-capacity')) {
//       $('current-diesel-capacity').textContent = dieselTank.capacity.toLocaleString('en-PK');
//     }
//   } catch (error) {
//     console.error('Error loading capacities:', error);
//   }
// }

// // Load System Stats
// async function loadSystemStats() {
//   try {
//     // Count customers
//     const { count: customersCount } = await supabase
//       .from('customers')
//       .select('*', { count: 'exact', head: true });

//     // Count transactions
//     const { count: transactionsCount } = await supabase
//       .from('transactions')
//       .select('*', { count: 'exact', head: true });

//     if ($('total-customers-count')) {
//       $('total-customers-count').textContent = customersCount || 0;
//     }

//     if ($('total-transactions-count')) {
//       $('total-transactions-count').textContent = transactionsCount || 0;
//     }
//   } catch (error) {
//     console.error('Error loading stats:', error);
//   }
// }

// // Load Price Update Time
// function loadPriceUpdateTime() {
//   const lastUpdate = localStorage.getItem('fuel_prices_updated');
//   if (lastUpdate && $('price-update-time')) {
//     $('price-update-time').textContent = new Date(lastUpdate).toLocaleString('en-PK');
//   }
// }

// // Override saveFuelPrices to add timestamp
// const originalSaveFuelPrices = window.saveFuelPrices;
// window.saveFuelPrices = function() {
//   if (originalSaveFuelPrices) {
//     originalSaveFuelPrices();
//     localStorage.setItem('fuel_prices_updated', new Date().toISOString());
//     loadPriceUpdateTime();
//   }
// };

// // Export Data
// window.exportData = async function() {
//   try {
//     showToast('Exporting data...', 'info');

//     // Fetch all data
//     const { data: customers } = await supabase.from('customers').select('*');
//     const { data: transactions } = await supabase.from('transactions').select('*');
//     const { data: tanks } = await supabase.from('tanks').select('*');

//     const exportData = {
//       exportDate: new Date().toISOString(),
//       version: '1.0.0',
//       customers: customers || [],
//       transactions: transactions || [],
//       tanks: tanks || [],
//       settings: {
//         fuelPrices: JSON.parse(localStorage.getItem('fuel_prices') || '{}')
//       }
//     };

//     // Create download
//     const dataStr = JSON.stringify(exportData, null, 2);
//     const dataBlob = new Blob([dataStr], { type: 'application/json' });
//     const url = URL.createObjectURL(dataBlob);
    
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `petrol-pump-backup-${new Date().toISOString().split('T')[0]}.json`;
//     link.click();

//     URL.revokeObjectURL(url);
//     showToast('Data exported successfully!', 'success');
//   } catch (error) {
//     console.error('Error exporting data:', error);
//     showToast('Error exporting data: ' + error.message, 'error');
//   }
// };

// // Generate Backup Report
// window.generateBackupReport = function() {
//   showToast('Generating backup report...', 'info');
  
//   setTimeout(() => {
//     window.exportData();
//   }, 500);
// };

// // Clear All Transactions
// window.clearAllTransactions = async function() {
//   const confirmation = prompt('Type "DELETE ALL TRANSACTIONS" to confirm this action:');
  
//   if (confirmation !== 'DELETE ALL TRANSACTIONS') {
//     showToast('Action cancelled', 'info');
//     return;
//   }

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .delete()
//       .neq('id', 0); // Delete all records

//     if (error) throw error;

//     showToast('All transactions deleted successfully!', 'success');
//     loadSystemStats();
//   } catch (error) {
//     console.error('Error clearing transactions:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Reset System
// window.resetSystem = async function() {
//   const confirmation1 = prompt('Type "RESET SYSTEM" to confirm:');
  
//   if (confirmation1 !== 'RESET SYSTEM') {
//     showToast('Action cancelled', 'info');
//     return;
//   }

//   const confirmation2 = prompt('This will delete ALL data. Type "I UNDERSTAND" to proceed:');
  
//   if (confirmation2 !== 'I UNDERSTAND') {
//     showToast('Action cancelled', 'info');
//     return;
//   }

//   try {
//     // Delete all data
//     await supabase.from('transactions').delete().neq('id', 0);
//     await supabase.from('customers').delete().neq('id', 0);
    
//     // Reset tanks to default
//     await supabase.from('tanks').update({ current_stock: 0 }).neq('id', 0);

//     // Clear localStorage
//     localStorage.clear();

//     showToast('System reset complete! Reloading...', 'success');
    
//     setTimeout(() => {
//       window.location.href = 'index.html';
//     }, 2000);
//   } catch (error) {
//     console.error('Error resetting system:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Initialize Settings Page
// document.addEventListener('DOMContentLoaded', () => {
//   if (document.body.getAttribute('data-page') === 'settings') {
//     loadTankCapacities();
//     loadSystemStats();
//     loadPriceUpdateTime();

//     console.log('✅ Settings page initialized');
//   }
// });

// })();