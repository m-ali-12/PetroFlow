// Enhanced Settings with Price History (FIXED: Supabase settings sync + auth + per-user stats)
(function() {
'use strict';

const supabase = window.supabaseClient;

let currentUserId = null;

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
  if (toastTitle) toastTitle.textContent = titles[type] || 'Notification';
  if (toastMessage) toastMessage.textContent = message;

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// ---------- AUTH ----------
async function getUserOrNull() {
  try {
    if (window.auth && typeof window.auth.getCurrentUser === 'function') {
      const u = await window.auth.getCurrentUser();
      if (u?.id) return u;
      if (u?.user?.id) return u.user;
      if (u?.data?.user?.id) return u.data.user;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user || null;
  } catch (e) {
    console.error('getUserOrNull error:', e);
    return null;
  }
}

async function requireUserId() {
  const user = await getUserOrNull();
  if (!user?.id) {
    window.location.href = 'login.html';
    return null;
  }
  currentUserId = user.id;
  return currentUserId;
}

function isMissingColumnError(err, column) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
}

async function safeSettingsUpsert(patch) {
  // settings table expected to have user_id as unique key
  const row = { user_id: currentUserId, ...patch, updated_at: new Date().toISOString() };
  let res = await supabase.from('settings').upsert([row], { onConflict: 'user_id' }).select().single();
  if (res.error && isMissingColumnError(res.error, 'user_id')) {
    // older schema - fallback to single row update (not ideal, but prevents crash)
    res = await supabase.from('settings').update(patch).select().maybeSingle();
  }
  return res;
}

async function safeSettingsGet() {
  let q = supabase.from('settings').select('*');
  if (currentUserId) q = q.eq('user_id', currentUserId);
  let res = await q.maybeSingle();
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    res = await supabase.from('settings').select('*').maybeSingle();
  }
  return res;
}

// ------------------------------
// Save Fuel Prices with History (Local + Supabase)
// ------------------------------
window.saveFuelPricesWithHistory = async function() {
  const petrolPrice = parseFloat($('petrol-price')?.value);
  const dieselPrice = parseFloat($('diesel-price')?.value);
  const effectiveDate = $('price-effective-date')?.value;

  if (!petrolPrice || !dieselPrice || !effectiveDate) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    // Local history (kept)
    const fuelHistory = JSON.parse(localStorage.getItem('fuel_price_history') || '[]');
    fuelHistory.push({
      date: effectiveDate,
      petrol: petrolPrice,
      diesel: dieselPrice,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin'
    });
    localStorage.setItem('fuel_price_history', JSON.stringify(fuelHistory));

    // Current prices
    const currentPrices = { Petrol: petrolPrice, Diesel: dieselPrice, effectiveDate };
    localStorage.setItem('fuel_prices', JSON.stringify(currentPrices));
    localStorage.setItem('fuel_prices_updated', new Date().toISOString());

    // Update global config (used in sale pages)
    if (window.config) window.config.FUEL_PRICES = currentPrices;

    // Supabase settings (THIS fixes "default price" problem on New Sale)
    const up = await safeSettingsUpsert({
      petrol_price: petrolPrice,
      diesel_price: dieselPrice,
      effective_date: effectiveDate
    });
    if (up.error) {
      console.warn('Settings upsert failed:', up.error);
      // still continue (local already saved)
    }

    showToast('Fuel prices saved successfully!', 'success');

    if ($('petrol-price')) $('petrol-price').value = '';
    if ($('diesel-price')) $('diesel-price').value = '';
    loadCurrentPrices();
    loadPriceHistory();
  } catch (error) {
    console.error('Error saving fuel prices:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// ------------------------------
// Save Mobil Prices with History (Local + optional Supabase columns)
// ------------------------------
window.saveMobilPricesWithHistory = async function() {
  const carMobilPrice = parseFloat($('car-mobil-price')?.value);
  const openMobilPrice = parseFloat($('open-mobil-price')?.value);
  const effectiveDate = $('mobil-effective-date')?.value;

  if (!carMobilPrice || !openMobilPrice || !effectiveDate) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    const mobilHistory = JSON.parse(localStorage.getItem('mobil_price_history') || '[]');
    mobilHistory.push({
      date: effectiveDate,
      carMobil: carMobilPrice,
      openMobil: openMobilPrice,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin'
    });
    localStorage.setItem('mobil_price_history', JSON.stringify(mobilHistory));

    const currentPrices = { CarMobil: carMobilPrice, OpenMobil: openMobilPrice, effectiveDate };
    localStorage.setItem('mobil_prices', JSON.stringify(currentPrices));
    localStorage.setItem('mobil_prices_updated', new Date().toISOString());

    // Optional: save to settings table if these columns exist
    const up = await safeSettingsUpsert({
      car_mobil_price: carMobilPrice,
      open_mobil_price: openMobilPrice,
      mobil_effective_date: effectiveDate
    });
    if (up.error && !isMissingColumnError(up.error, 'car_mobil_price')) {
      console.warn('Mobil price settings upsert warning:', up.error);
    }

    showToast('Mobil prices saved successfully!', 'success');

    if ($('car-mobil-price')) $('car-mobil-price').value = '';
    if ($('open-mobil-price')) $('open-mobil-price').value = '';
    loadCurrentPrices();
    loadPriceHistory();
  } catch (error) {
    console.error('Error saving mobil prices:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Get Price for Date (used when calculating old transactions)
window.getPriceForDate = function(fuelType, date) {
  const transactionDate = new Date(date);
  let priceHistory = [];

  if (fuelType === 'Petrol' || fuelType === 'Diesel') {
    priceHistory = JSON.parse(localStorage.getItem('fuel_price_history') || '[]');
  } else if (fuelType === 'Car Mobil' || fuelType === 'Open Mobil') {
    priceHistory = JSON.parse(localStorage.getItem('mobil_price_history') || '[]');
  }

  priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  let applicablePrice = null;
  for (const entry of priceHistory) {
    const effectiveDate = new Date(entry.date);
    if (effectiveDate <= transactionDate) applicablePrice = entry;
    else break;
  }

  if (!applicablePrice) {
    if (fuelType === 'Petrol') return window.config?.FUEL_PRICES?.Petrol || 0;
    if (fuelType === 'Diesel') return window.config?.FUEL_PRICES?.Diesel || 0;
    if (fuelType === 'Car Mobil') return (JSON.parse(localStorage.getItem('mobil_prices') || '{}').CarMobil) || 850;
    if (fuelType === 'Open Mobil') return (JSON.parse(localStorage.getItem('mobil_prices') || '{}').OpenMobil) || 800;
    return 0;
  }

  if (fuelType === 'Petrol') return applicablePrice.petrol;
  if (fuelType === 'Diesel') return applicablePrice.diesel;
  if (fuelType === 'Car Mobil') return applicablePrice.carMobil;
  if (fuelType === 'Open Mobil') return applicablePrice.openMobil;

  return 0;
};

// Load Current Prices
function loadCurrentPrices() {
  const fuelPrices = JSON.parse(localStorage.getItem('fuel_prices') || '{}');
  if ($('current-petrol-price')) $('current-petrol-price').textContent = formatNumber(fuelPrices.Petrol || 0);
  if ($('current-diesel-price')) $('current-diesel-price').textContent = formatNumber(fuelPrices.Diesel || 0);

  const mobilPrices = JSON.parse(localStorage.getItem('mobil_prices') || '{}');
  if ($('current-car-mobil-price')) $('current-car-mobil-price').textContent = formatNumber(mobilPrices.CarMobil || 0);
  if ($('current-open-mobil-price')) $('current-open-mobil-price').textContent = formatNumber(mobilPrices.OpenMobil || 0);

  const fuelUpdate = localStorage.getItem('fuel_prices_updated');
  if (fuelUpdate && $('fuel-price-update-time')) $('fuel-price-update-time').textContent = new Date(fuelUpdate).toLocaleString('en-PK');

  const mobilUpdate = localStorage.getItem('mobil_prices_updated');
  if (mobilUpdate && $('mobil-price-update-time')) $('mobil-price-update-time').textContent = new Date(mobilUpdate).toLocaleString('en-PK');
}

// Load Price History
function loadPriceHistory() {
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

// Update Tank Capacity (kept, with safe user_id filter fallback)
window.updateTankCapacity = async function() {
  const petrolCapacity = parseFloat($('petrol-capacity-setting')?.value);
  const dieselCapacity = parseFloat($('diesel-capacity-setting')?.value);

  if (!petrolCapacity && !dieselCapacity) {
    showToast('Please enter at least one capacity', 'error');
    return;
  }

  if (!confirm('Update tank capacity? This affects stock percentages.')) return;

  try {
    if (!currentUserId) await requireUserId();

    if (petrolCapacity) {
      let q = supabase.from('tanks').update({ capacity: petrolCapacity }).eq('fuel_type', 'Petrol');
      if (currentUserId) q = q.eq('user_id', currentUserId);
      let res = await q;
      if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
        res = await supabase.from('tanks').update({ capacity: petrolCapacity }).eq('fuel_type', 'Petrol');
      }
      if (res.error) throw res.error;
    }

    if (dieselCapacity) {
      let q = supabase.from('tanks').update({ capacity: dieselCapacity }).eq('fuel_type', 'Diesel');
      if (currentUserId) q = q.eq('user_id', currentUserId);
      let res = await q;
      if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
        res = await supabase.from('tanks').update({ capacity: dieselCapacity }).eq('fuel_type', 'Diesel');
      }
      if (res.error) throw res.error;
    }

    showToast('Tank capacity updated!', 'success');
    loadTankCapacities();
    if ($('petrol-capacity-setting')) $('petrol-capacity-setting').value = '';
    if ($('diesel-capacity-setting')) $('diesel-capacity-setting').value = '';
  } catch (error) {
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Load Tank Capacities
async function loadTankCapacities() {
  try {
    if (!currentUserId) return;

    let q = supabase.from('tanks').select('fuel_type, capacity').in('fuel_type', ['Petrol', 'Diesel']);
    if (currentUserId) q = q.eq('user_id', currentUserId);
    let { data, error } = await q;
    if (error && currentUserId && isMissingColumnError(error, 'user_id')) {
      ({ data, error } = await supabase.from('tanks').select('fuel_type, capacity').in('fuel_type', ['Petrol', 'Diesel']));
    }
    if (error) throw error;

    const petrol = data?.find(t => t.fuel_type === 'Petrol');
    const diesel = data?.find(t => t.fuel_type === 'Diesel');

    if (petrol && $('current-petrol-capacity')) $('current-petrol-capacity').textContent = formatNumber(petrol.capacity);
    if (diesel && $('current-diesel-capacity')) $('current-diesel-capacity').textContent = formatNumber(diesel.capacity);
  } catch (error) {
    console.error('Error loading capacities:', error);
  }
}

// Load System Stats (per user)
async function loadSystemStats() {
  try {
    if (!currentUserId) return;

    let cq = supabase.from('customers').select('*', { count: 'exact', head: true });
    let tq = supabase.from('transactions').select('*', { count: 'exact', head: true });

    if (currentUserId) {
      cq = cq.eq('user_id', currentUserId);
      tq = tq.eq('user_id', currentUserId);
    }

    let cRes = await cq;
    let tRes = await tq;

    if (cRes.error && currentUserId && isMissingColumnError(cRes.error, 'user_id')) {
      cRes = await supabase.from('customers').select('*', { count: 'exact', head: true });
    }
    if (tRes.error && currentUserId && isMissingColumnError(tRes.error, 'user_id')) {
      tRes = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    }

    if ($('total-customers-count')) $('total-customers-count').textContent = cRes.count || 0;
    if ($('total-transactions-count')) $('total-transactions-count').textContent = tRes.count || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Export Data (per user)
window.exportData = async function() {
  try {
    if (!currentUserId) await requireUserId();

    showToast('Exporting data...', 'info');

    let cQ = supabase.from('customers').select('*');
    let tQ = supabase.from('transactions').select('*');
    let kQ = supabase.from('tanks').select('*');
    let sQ = supabase.from('settings').select('*');

    if (currentUserId) {
      cQ = cQ.eq('user_id', currentUserId);
      tQ = tQ.eq('user_id', currentUserId);
      kQ = kQ.eq('user_id', currentUserId);
      sQ = sQ.eq('user_id', currentUserId);
    }

    let { data: customers, error: cErr } = await cQ;
    if (cErr && currentUserId && isMissingColumnError(cErr, 'user_id')) ({ data: customers } = await supabase.from('customers').select('*'));

    let { data: transactions, error: tErr } = await tQ;
    if (tErr && currentUserId && isMissingColumnError(tErr, 'user_id')) ({ data: transactions } = await supabase.from('transactions').select('*'));

    let { data: tanks, error: kErr } = await kQ;
    if (kErr && currentUserId && isMissingColumnError(kErr, 'user_id')) ({ data: tanks } = await supabase.from('tanks').select('*'));

    let { data: settingsRows } = await sQ;

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      customers: customers || [],
      transactions: transactions || [],
      tanks: tanks || [],
      settings_db: settingsRows || [],
      settings_local: {
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
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Clear Old Data (per user)
window.clearOldData = async function() {
  if (!confirm('Delete transactions older than 1 year?')) return;

  try {
    if (!currentUserId) await requireUserId();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let q = supabase.from('transactions').delete().lt('created_at', oneYearAgo.toISOString());
    if (currentUserId) q = q.eq('user_id', currentUserId);
    let res = await q;

    if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
      res = await supabase.from('transactions').delete().lt('created_at', oneYearAgo.toISOString());
    }
    if (res.error) throw res.error;

    showToast('Old transactions deleted!', 'success');
    loadSystemStats();
  } catch (error) {
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Sync from DB to localStorage (so UI always matches)
async function syncFromDbToLocal() {
  try {
    if (!currentUserId) return;

    const res = await safeSettingsGet();
    if (res.error || !res.data) return;

    const s = res.data;

    // Fuel
    if (typeof s.petrol_price === 'number' && typeof s.diesel_price === 'number') {
      const current = { Petrol: s.petrol_price, Diesel: s.diesel_price, effectiveDate: s.effective_date || '' };
      localStorage.setItem('fuel_prices', JSON.stringify(current));
      localStorage.setItem('fuel_prices_updated', s.updated_at || new Date().toISOString());
      if (window.config) window.config.FUEL_PRICES = current;
    }

    // Mobil (optional)
    if (typeof s.car_mobil_price === 'number' && typeof s.open_mobil_price === 'number') {
      const mobil = { CarMobil: s.car_mobil_price, OpenMobil: s.open_mobil_price, effectiveDate: s.mobil_effective_date || '' };
      localStorage.setItem('mobil_prices', JSON.stringify(mobil));
      localStorage.setItem('mobil_prices_updated', s.updated_at || new Date().toISOString());
    }
  } catch (e) {
    console.warn('syncFromDbToLocal warning:', e);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.getAttribute('data-page') === 'settings') {
    await requireUserId();

    const today = new Date().toISOString().split('T')[0];
    if ($('price-effective-date')) $('price-effective-date').value = today;
    if ($('mobil-effective-date')) $('mobil-effective-date').value = today;

    await syncFromDbToLocal();

    loadCurrentPrices();
    loadPriceHistory();
    loadTankCapacities();
    loadSystemStats();

    console.log('✅ Enhanced settings initialized (DB+local synced)');
  }
});

})();