// =============================================
// FILE: js/settings-page.js
// Settings & Configuration Management
// Handles Fuel/Mobil Price History & Tank Capacity
// =============================================
(function () {
  'use strict';

  // State
  let currentSettings = null;

  // Helpers
  const $ = id => document.getElementById(id);
  const sb = () => window.supabaseClient;
  const fmt = n => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  function showToast(msg, type = 'success') {
    const t = $('liveToast');
    const m = $('toast-message');
    const title = $('toast-title');
    if (!t || !m) return;
    m.textContent = msg;
    title.textContent = type === 'danger' ? 'Error' : type === 'warning' ? 'Warning' : 'Success';
    t.className = `toast bg-${type} text-white`;
    new bootstrap.Toast(t).show();
  }

  // ── Init ─────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase & Auth
    function wait() {
      if (window.supabaseClient && window.PETRO_SESSION_READY) {
        init();
      } else {
        setTimeout(wait, 100);
      }
    }
    wait();
  });

  async function init() {
    console.log('⚙️ Settings Page Initializing...');
    await loadSettings();
    await loadCounts();
  }

  // ── Load Data ────────────────────────────────────────────────
  async function loadSettings() {
    try {
      const { data, error } = await sb()
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        console.log('No settings row found yet. Will create one on first save.');
        currentSettings = null;
        return;
      }

      currentSettings = data;

      // Populate current prices
      if ($('current-petrol-price')) $('current-petrol-price').textContent = fmt(data.petrol_price);
      if ($('current-diesel-price')) $('current-diesel-price').textContent = fmt(data.diesel_price);
      if ($('current-car-mobil-price')) $('current-car-mobil-price').textContent = fmt(data.car_mobil_price);
      if ($('current-open-mobil-price')) $('current-open-mobil-price').textContent = fmt(data.open_mobil_price);

      // Populate Inputs (defaults)
      if ($('petrol-price')) $('petrol-price').value = data.petrol_price || '';
      if ($('diesel-price')) $('diesel-price').value = data.diesel_price || '';
      if ($('car-mobil-price')) $('car-mobil-price').value = data.car_mobil_price || '';
      if ($('open-mobil-price')) $('open-mobil-price').value = data.open_mobil_price || '';

      // Price period defaults
      const today = new Date().toISOString().split('T')[0];
      if ($('price-start-date')) $('price-start-date').value = today;
      if ($('price-end-date')) $('price-end-date').value = '';
      if ($('mobil-start-date')) $('mobil-start-date').value = today;
      if ($('mobil-end-date')) $('mobil-end-date').value = '';

      // Update time
      if ($('fuel-price-update-time')) {
        $('fuel-price-update-time').textContent = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'Never';
      }
      if ($('mobil-price-update-time')) {
        $('mobil-price-update-time').textContent = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'Never';
      }

      renderHistory();
      await loadTankCapacities();
    } catch (e) {
      console.error('loadSettings error:', e);
      showToast('Error loading settings', 'danger');
    }
  }

  async function loadTankCapacities() {
    try {
      const { data, error } = await sb().from('tanks').select('id, name, fuel_type, capacity');
      if (error) throw error;

      const petrol = data.find(t => t.fuel_type === 'Petrol');
      const diesel = data.find(t => t.fuel_type === 'Diesel');

      if (petrol) {
        if ($('current-petrol-capacity')) $('current-petrol-capacity').textContent = petrol.capacity;
        if ($('petrol-capacity-setting')) $('petrol-capacity-setting').value = petrol.capacity;
      }
      if (diesel) {
        if ($('current-diesel-capacity')) $('current-diesel-capacity').textContent = diesel.capacity;
        if ($('diesel-capacity-setting')) $('diesel-capacity-setting').value = diesel.capacity;
      }
    } catch (e) {
      console.error('loadTankCapacities error:', e);
    }
  }

  async function loadCounts() {
    try {
      const [cust, trans] = await Promise.all([
        sb().from('customers').select('id', { count: 'exact', head: true }),
        sb().from('transactions').select('id', { count: 'exact', head: true })
      ]);
      if ($('total-customers-count')) $('total-customers-count').textContent = cust.count || 0;
      if ($('total-transactions-count')) $('total-transactions-count').textContent = trans.count || 0;
    } catch (e) {}
  }

  // ── Rendering History ────────────────────────────────────────
  function renderHistory() {
    // Fuel History
    const fuelHistory = currentSettings?.price_history || [];
    const fuelTbody = $('fuel-history-table');
    if (fuelTbody) {
      if (fuelHistory.length === 0) {
        fuelTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No history yet</td></tr>';
      } else {
        fuelTbody.innerHTML = [...fuelHistory]
          .sort((a,b) => new Date(b.start_date || b.date) - new Date(a.start_date || a.date))
          .map(h => `
          <tr>
            <td>${h.start_date || h.date || '-'}</td>
            <td>${h.end_date || 'Current'}</td>
            <td class="text-primary fw-bold">Rs. ${fmt(h.petrol)}</td>
            <td class="text-warning fw-bold">Rs. ${fmt(h.diesel)}</td>
            <td class="small text-muted">${h.updated_by || 'Unknown'}</td>
          </tr>
        `).join('');
      }
    }

    // Mobil History
    const mobilHistory = currentSettings?.mobil_history || [];
    const mobilTbody = $('mobil-history-table');
    if (mobilTbody) {
      if (mobilHistory.length === 0) {
        mobilTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No history yet</td></tr>';
      } else {
        mobilTbody.innerHTML = [...mobilHistory]
          .sort((a,b) => new Date(b.start_date || b.date) - new Date(a.start_date || a.date))
          .map(h => `
          <tr>
            <td>${h.start_date || h.date || '-'}</td>
            <td>${h.end_date || 'Current'}</td>
            <td class="text-success fw-bold">Rs. ${fmt(h.car)}</td>
            <td class="text-info fw-bold">Rs. ${fmt(h.open)}</td>
            <td class="small text-muted">${h.updated_by || 'Unknown'}</td>
          </tr>
        `).join('');
      }
    }
  }

  // ── Actions ──────────────────────────────────────────────────
  window.saveFuelPricesWithHistory = async function () {
    const petrol = parseFloat($('petrol-price').value);
    const diesel = parseFloat($('diesel-price').value);
    const startDate = $('price-start-date').value;
    const endDate = $('price-end-date')?.value || '';

    if (isNaN(petrol) || isNaN(diesel) || !startDate) {
      showToast('Please fill all required fields correctly.', 'warning');
      return;
    }

    try {
      const history = currentSettings?.price_history || [];
      const user = window.currentUserProfile?.full_name || 'Admin';

      // Check if entry for this date already exists, update it, or add new
      if (endDate && new Date(endDate) < new Date(startDate)) { showToast('End date start date se pehle nahi ho sakti.', 'warning'); return; }
      const existingIdx = history.findIndex(h => (h.start_date || h.date) === startDate);
      const newEntry = { date: startDate, start_date: startDate, end_date: endDate || null, petrol, diesel, updated_by: user };

      if (existingIdx >= 0) {
        history[existingIdx] = newEntry;
      } else {
        history.push(newEntry);
      }

      let error;
      if (currentSettings) {
        ({ error } = await sb()
          .from('settings')
          .update({
            petrol_price: petrol,
            diesel_price: diesel,
            price_history: history,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSettings.id));
      } else {
        ({ error } = await sb()
          .from('settings')
          .insert({
            petrol_price: petrol,
            diesel_price: diesel,
            price_history: history,
            user_id: window.currentUser?.id
          }));
      }

      if (error) throw error;

      // Update LocalStorage to keep app.js in sync
      localStorage.setItem('fuel_prices', JSON.stringify({ Petrol: petrol, Diesel: diesel }));
      window.config = window.config || {};
      window.config.FUEL_PRICES = { Petrol: petrol, Diesel: diesel };

      showToast('✅ Fuel prices updated successfully!');
      await loadSettings();
    } catch (e) {
      console.error(e);
      showToast('Error saving fuel prices: ' + e.message, 'danger');
    }
  };

  window.saveMobilPricesWithHistory = async function () {
    const car = parseFloat($('car-mobil-price').value);
    const open = parseFloat($('open-mobil-price').value);
    const startDate = $('mobil-start-date').value;
    const endDate = $('mobil-end-date')?.value || '';

    if (isNaN(car) || isNaN(open) || !startDate) {
      showToast('Please fill all required fields correctly.', 'warning');
      return;
    }

    try {
      const history = currentSettings?.mobil_history || [];
      const user = window.currentUserProfile?.full_name || 'Admin';

      if (endDate && new Date(endDate) < new Date(startDate)) { showToast('End date start date se pehle nahi ho sakti.', 'warning'); return; }
      const existingIdx = history.findIndex(h => (h.start_date || h.date) === startDate);
      const newEntry = { date: startDate, start_date: startDate, end_date: endDate || null, car, open, updated_by: user };

      if (existingIdx >= 0) {
        history[existingIdx] = newEntry;
      } else {
        history.push(newEntry);
      }

      let error;
      if (currentSettings) {
        ({ error } = await sb()
          .from('settings')
          .update({
            car_mobil_price: car,
            open_mobil_price: open,
            mobil_history: history,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSettings.id));
      } else {
        ({ error } = await sb()
          .from('settings')
          .insert({
            car_mobil_price: car,
            open_mobil_price: open,
            mobil_history: history,
            user_id: window.currentUser?.id
          }));
      }

      if (error) throw error;

      showToast('✅ Mobil prices updated successfully!');
      await loadSettings();
    } catch (e) {
      console.error(e);
      showToast('Error saving mobil prices: ' + e.message, 'danger');
    }
  };

  window.updateTankCapacity = async function () {
    const petrolCap = parseFloat($('petrol-capacity-setting').value);
    const dieselCap = parseFloat($('diesel-capacity-setting').value);

    if (isNaN(petrolCap) || isNaN(dieselCap)) {
      showToast('Invalid capacity values', 'warning');
      return;
    }

    try {
      const updates = [];
      const { data: tanks } = await sb().from('tanks').select('id, fuel_type');
      
      const pTank = tanks.find(t => t.fuel_type === 'Petrol');
      const dTank = tanks.find(t => t.fuel_type === 'Diesel');

      if (pTank) updates.push(sb().from('tanks').update({ capacity: petrolCap }).eq('id', pTank.id));
      if (dTank) updates.push(sb().from('tanks').update({ capacity: dieselCap }).eq('id', dTank.id));

      await Promise.all(updates);
      showToast('✅ Tank capacities updated!');
      await loadTankCapacities();
    } catch (e) {
      console.error(e);
      showToast('Error updating capacity', 'danger');
    }
  };

  window.exportData = function () {
    alert('Exporting system data to JSON... This feature will generate a backup file.');
    // Implementation for exporting JSON logic could go here
  };

  window.clearOldData = function () {
    if (confirm('Are you sure? This will delete all transactions older than 1 year.')) {
      alert('Feature pending: Database cleanup requires direct SQL script for safety.');
    }
  };

  console.log('✅ settings-page.js loaded');
})();
