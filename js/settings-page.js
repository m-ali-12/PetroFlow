// =============================================
// SETTINGS PAGE - COMPLETE FIXED
// Auth disabled - user.id use nahi hoga
// Direct id se update hoga
// =============================================
(function () {
  'use strict';
  const supabase = window.supabaseClient;

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(type, title, msg) {
    const t = document.getElementById('liveToast');
    if (!t) { alert(title + ': ' + msg); return; }
    const tTitle = document.getElementById('toast-title');
    const tMsg = document.getElementById('toast-message');
    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = msg;
    t.className = `toast ${type === 'success' ? 'bg-success text-white' : type === 'warning' ? 'bg-warning' : 'bg-danger text-white'}`;
    new bootstrap.Toast(t, { delay: 3500 }).show();
  }

  // ============================================
  // SETTINGS LOAD - bina user_id ke
  // ============================================
  async function loadCurrentSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Settings load error:', error.message);
        return null;
      }
      console.log('Settings loaded:', data);
      return data;
    } catch (e) {
      console.error('Settings exception:', e);
      return null;
    }
  }

  // ============================================
  // PAGE INIT - current prices show karo
  // ============================================
  async function initSettingsPage() {
    const data = await loadCurrentSettings();
    if (!data) {
      console.warn('No settings row found');
      return;
    }

    // Fuel price history se latest dikhao
    if (data.price_history && data.price_history.length > 0) {
      const sorted = [...data.price_history].sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = sorted[0];

      const petrolSpan = document.getElementById('current-petrol-price');
      const dieselSpan = document.getElementById('current-diesel-price');
      if (petrolSpan) petrolSpan.textContent = latest.petrol;
      if (dieselSpan) dieselSpan.textContent = latest.diesel;

      const updateTime = document.getElementById('fuel-price-update-time');
      if (updateTime) updateTime.textContent = latest.date;

      renderFuelHistoryTable(sorted);
    }

    // Mobil history
    if (data.mobil_history && data.mobil_history.length > 0) {
      const sorted = [...data.mobil_history].sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = sorted[0];
      const carSpan = document.getElementById('current-car-mobil-price');
      const openSpan = document.getElementById('current-open-mobil-price');
      if (carSpan) carSpan.textContent = latest.car_mobil || 0;
      if (openSpan) openSpan.textContent = latest.open_mobil || 0;
      const mobilTime = document.getElementById('mobil-price-update-time');
      if (mobilTime) mobilTime.textContent = latest.date;
      renderMobilHistoryTable(sorted);
    }

    // System info
    loadSystemInfo();
  }

  function renderFuelHistoryTable(history) {
    const tbody = document.getElementById('fuel-history-table');
    if (!tbody) return;
    if (!history || history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No history yet</td></tr>';
      return;
    }
    tbody.innerHTML = history.map((h, i) => `
      <tr ${i === 0 ? 'class="table-success fw-bold"' : ''}>
        <td>${h.date} ${i === 0 ? '<span class="badge bg-success ms-1">Current</span>' : ''}</td>
        <td>Rs. ${fmt(h.petrol)}</td>
        <td>Rs. ${fmt(h.diesel)}</td>
        <td>${h.updated_by || 'Admin'}</td>
      </tr>`).join('');
  }

  function renderMobilHistoryTable(history) {
    const tbody = document.getElementById('mobil-history-table');
    if (!tbody) return;
    if (!history || history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No history yet</td></tr>';
      return;
    }
    tbody.innerHTML = history.map((h, i) => `
      <tr ${i === 0 ? 'class="table-success fw-bold"' : ''}>
        <td>${h.date} ${i === 0 ? '<span class="badge bg-success ms-1">Current</span>' : ''}</td>
        <td>Rs. ${fmt(h.car_mobil)}</td>
        <td>Rs. ${fmt(h.open_mobil)}</td>
        <td>${h.updated_by || 'Admin'}</td>
      </tr>`).join('');
  }

  async function loadSystemInfo() {
    try {
      const { count: custCount } = await supabase.from('customers').select('id', { count: 'exact', head: true });
      const { count: txCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true });
      const custEl = document.getElementById('total-customers-count');
      const txEl = document.getElementById('total-transactions-count');
      if (custEl) custEl.textContent = custCount || 0;
      if (txEl) txEl.textContent = txCount || 0;
    } catch (e) { console.error('System info error:', e); }
  }

  // ============================================
  // FUEL PRICES SAVE - NO AUTH, id se update
  // ============================================
  window.saveFuelPricesWithHistory = async function () {
    const petrol = parseFloat(document.getElementById('petrol-price')?.value);
    const diesel = parseFloat(document.getElementById('diesel-price')?.value);
    const date = document.getElementById('price-effective-date')?.value;

    if (!petrol || !diesel || !date) {
      alert('Petrol price, Diesel price aur Date fill karein');
      return;
    }

    try {
      // Existing settings row lo - NO user.id
      const existing = await loadCurrentSettings();
      let history = existing?.price_history || [];
      const rowId = existing?.id || null;

      console.log('Existing settings:', existing);
      console.log('Row ID:', rowId);

      // Same date replace karo, ya naya add karo
      const idx = history.findIndex(h => h.date === date);
      const newEntry = {
        date,
        petrol,
        diesel,
        updated_by: 'Admin',
        updated_at: new Date().toISOString()
      };

      if (idx >= 0) {
        history[idx] = newEntry;
      } else {
        history.push(newEntry);
      }

      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      let error;

      if (rowId) {
        // Row exist karti hai - update karo ID se
        console.log('Updating row with id:', rowId);
        const result = await supabase
          .from('settings')
          .update({
            price_history: history,
            updated_at: new Date().toISOString()
          })
          .eq('id', rowId);
        error = result.error;
        console.log('Update result:', result);
      } else {
        // Koi row nahi - insert karo
        console.log('Inserting new settings row');
        const result = await supabase
          .from('settings')
          .insert([{
            price_history: history,
            updated_at: new Date().toISOString()
          }]);
        error = result.error;
        console.log('Insert result:', result);
      }

      if (error) {
        console.error('Save error:', error);
        alert('Save Error: ' + error.message + '\n\nHint: Supabase SQL Editor mein yeh run karo:\nALTER TABLE settings ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT \'[]\'::jsonb;');
        return;
      }

      showToast('success', 'Kamyab!', `Petrol Rs.${petrol} | Diesel Rs.${diesel} - ${date} se apply hoga`);

      // UI update
      const petrolSpan = document.getElementById('current-petrol-price');
      const dieselSpan = document.getElementById('current-diesel-price');
      if (petrolSpan) petrolSpan.textContent = petrol;
      if (dieselSpan) dieselSpan.textContent = diesel;
      const updateTime = document.getElementById('fuel-price-update-time');
      if (updateTime) updateTime.textContent = date;
      renderFuelHistoryTable(history);

      // Form clear
      const pInput = document.getElementById('petrol-price');
      const dInput = document.getElementById('diesel-price');
      if (pInput) pInput.value = '';
      if (dInput) dInput.value = '';

    } catch (err) {
      console.error('saveFuelPricesWithHistory exception:', err);
      alert('Error: ' + err.message);
    }
  };

  // ============================================
  // MOBIL PRICES SAVE
  // ============================================
  window.saveMobilPricesWithHistory = async function () {
    const carMobil = parseFloat(document.getElementById('car-mobil-price')?.value);
    const openMobil = parseFloat(document.getElementById('open-mobil-price')?.value);
    const date = document.getElementById('mobil-effective-date')?.value;

    if (!carMobil || !openMobil || !date) {
      alert('Car Mobil, Open Mobil price aur Date fill karein');
      return;
    }

    try {
      const existing = await loadCurrentSettings();
      let history = existing?.mobil_history || [];
      const rowId = existing?.id || null;

      const idx = history.findIndex(h => h.date === date);
      const newEntry = { date, car_mobil: carMobil, open_mobil: openMobil, updated_by: 'Admin' };
      if (idx >= 0) { history[idx] = newEntry; } else { history.push(newEntry); }
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      let error;
      if (rowId) {
        const result = await supabase.from('settings').update({ mobil_history: history, updated_at: new Date().toISOString() }).eq('id', rowId);
        error = result.error;
      } else {
        const result = await supabase.from('settings').insert([{ mobil_history: history, updated_at: new Date().toISOString() }]);
        error = result.error;
      }

      if (error) { alert('Error: ' + error.message); return; }
      showToast('success', 'Kamyab!', `Mobil prices saved!`);
      renderMobilHistoryTable(history);
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ============================================
  // TANK CAPACITY
  // ============================================
  window.updateTankCapacity = async function () {
    const petrolCap = parseFloat(document.getElementById('petrol-capacity-setting')?.value);
    const dieselCap = parseFloat(document.getElementById('diesel-capacity-setting')?.value);
    if (!petrolCap || !dieselCap) { alert('Dono capacities enter karein'); return; }

    try {
      const existing = await loadCurrentSettings();
      let error;
      if (existing?.id) {
        const result = await supabase.from('settings').update({ petrol_capacity: petrolCap, diesel_capacity: dieselCap }).eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase.from('settings').insert([{ petrol_capacity: petrolCap, diesel_capacity: dieselCap }]);
        error = result.error;
      }
      if (error) { alert('Error: ' + error.message); return; }
      showToast('success', 'Kamyab!', 'Tank capacity updated!');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ============================================
  // EXPORT & CLEAR
  // ============================================
  window.exportData = async function () {
    try {
      const [{ data: customers }, { data: transactions }, { data: settings }] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('settings').select('*')
      ]);
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), customers, transactions, settings }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petroflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Export', 'Data export ho gaya!');
    } catch (err) { alert('Export error: ' + err.message); }
  };

  window.clearOldData = async function () {
    if (!confirm('1 saal purani transactions delete karein?')) return;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    try {
      const { error } = await supabase.from('transactions').delete().lt('created_at', oneYearAgo.toISOString());
      if (error) { alert('Error: ' + error.message); return; }
      showToast('success', 'Kamyab!', 'Purani transactions delete ho gayi!');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ============================================
  // INIT
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.getAttribute('data-page') !== 'settings') return;
    console.log('🚀 Settings page init...');
    initSettingsPage();
  });

})();