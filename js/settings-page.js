// =============================================
// SETTINGS PAGE - COMPLETE FIXED VERSION
// Auth disabled hai - user_id null safe hai
// price_history JSON array mein prices store hoti hain
// =============================================
(function () {
  'use strict';
  const supabase = window.supabaseClient;

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(type, title, msg) {
    const t = document.getElementById('liveToast');
    const tTitle = document.getElementById('toast-title');
    const tMsg = document.getElementById('toast-message');
    if (!t) { alert(title + ': ' + msg); return; }
    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = msg;
    t.className = `toast ${type === 'success' ? 'bg-success text-white' : type === 'warning' ? 'bg-warning' : 'bg-danger text-white'}`;
    new bootstrap.Toast(t, { delay: 3500 }).show();
  }

  // ============================================
  // SETTINGS TABLE SE DATA LOAD KARO
  // ============================================

  async function loadCurrentSettings() {
    try {
      // Bina user_id filter ke load karo (auth disabled hai)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Settings load error:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Settings exception:', e);
      return null;
    }
  }

  // ============================================
  // PAGE LOAD - Current prices display karo
  // ============================================

  async function initSettingsPage() {
    const data = await loadCurrentSettings();
    if (!data) return;

    // price_history se latest fuel prices dikhao
    if (data.price_history && data.price_history.length > 0) {
      const sorted = [...data.price_history].sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = sorted[0];

      const petrolSpan = document.getElementById('current-petrol-price');
      const dieselSpan = document.getElementById('current-diesel-price');
      if (petrolSpan) petrolSpan.textContent = latest.petrol;
      if (dieselSpan) dieselSpan.textContent = latest.diesel;

      const updateTime = document.getElementById('fuel-price-update-time');
      if (updateTime) updateTime.textContent = latest.date;

      // Fuel history table
      renderFuelHistoryTable(sorted);
    }

    // mobil_history se latest mobil prices
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
      </tr>
    `).join('');
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
      </tr>
    `).join('');
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
  // FUEL PRICES SAVE - Auth disabled safe
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
      // Pehle existing record load karo
      const existing = await loadCurrentSettings();
      let history = existing?.price_history || [];
      let existingId = existing?.id || null;

      // Same date ki entry replace karo ya new add karo
      const sameDate = history.findIndex(h => h.date === date);
      const newEntry = {
        date,
        petrol,
        diesel,
        updated_by: 'Admin',
        updated_at: new Date().toISOString()
      };

      if (sameDate >= 0) {
        history[sameDate] = newEntry; // Same date update
      } else {
        history.push(newEntry); // New date entry
      }

      // Sort by date descending
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      let error;
      if (existingId) {
        // Update existing row
        const result = await supabase
          .from('settings')
          .update({ price_history: history, updated_at: new Date().toISOString() })
          .eq('id', existingId);
        error = result.error;
      } else {
        // Insert new row (pehli baar)
        const result = await supabase
          .from('settings')
          .insert([{ price_history: history, updated_at: new Date().toISOString() }]);
        error = result.error;
      }

      if (error) {
        console.error('Save error:', error);
        alert('Error: ' + error.message);
        return;
      }

      showToast('success', 'Kamyab!', `Fuel prices saved: Petrol Rs.${petrol} | Diesel Rs.${diesel} from ${date}`);

      // Current values update karo
      const petrolSpan = document.getElementById('current-petrol-price');
      const dieselSpan = document.getElementById('current-diesel-price');
      if (petrolSpan) petrolSpan.textContent = petrol;
      if (dieselSpan) dieselSpan.textContent = diesel;
      const updateTime = document.getElementById('fuel-price-update-time');
      if (updateTime) updateTime.textContent = date;

      // Table refresh
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      renderFuelHistoryTable(history);

      // Form reset
      const petrolInput = document.getElementById('petrol-price');
      const dieselInput = document.getElementById('diesel-price');
      if (petrolInput) petrolInput.value = '';
      if (dieselInput) dieselInput.value = '';

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
      alert('Car Mobil price, Open Mobil price aur Date fill karein');
      return;
    }

    try {
      const existing = await loadCurrentSettings();
      let history = existing?.mobil_history || [];
      let existingId = existing?.id || null;

      const sameDate = history.findIndex(h => h.date === date);
      const newEntry = {
        date,
        car_mobil: carMobil,
        open_mobil: openMobil,
        updated_by: 'Admin',
        updated_at: new Date().toISOString()
      };

      if (sameDate >= 0) {
        history[sameDate] = newEntry;
      } else {
        history.push(newEntry);
      }

      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      let error;
      if (existingId) {
        const result = await supabase
          .from('settings')
          .update({ mobil_history: history, updated_at: new Date().toISOString() })
          .eq('id', existingId);
        error = result.error;
      } else {
        const result = await supabase
          .from('settings')
          .insert([{ mobil_history: history, updated_at: new Date().toISOString() }]);
        error = result.error;
      }

      if (error) {
        alert('Error: ' + error.message);
        return;
      }

      showToast('success', 'Kamyab!', `Mobil prices saved: Car Rs.${carMobil} | Open Rs.${openMobil}`);
      renderMobilHistoryTable(history);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ============================================
  // TANK CAPACITY
  // ============================================

  window.updateTankCapacity = async function () {
    const petrolCap = parseFloat(document.getElementById('petrol-capacity-setting')?.value);
    const dieselCap = parseFloat(document.getElementById('diesel-capacity-setting')?.value);

    if (!petrolCap || !dieselCap) {
      alert('Dono tank capacities enter karein');
      return;
    }

    try {
      const existing = await loadCurrentSettings();
      let error;
      if (existing?.id) {
        const result = await supabase.from('settings').update({
          petrol_capacity: petrolCap,
          diesel_capacity: dieselCap,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase.from('settings').insert([{
          petrol_capacity: petrolCap,
          diesel_capacity: dieselCap,
          updated_at: new Date().toISOString()
        }]);
        error = result.error;
      }

      if (error) { alert('Error: ' + error.message); return; }
      showToast('success', 'Kamyab!', 'Tank capacity update ho gayi!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ============================================
  // EXPORT DATA
  // ============================================

  window.exportData = async function () {
    try {
      const [{ data: customers }, { data: transactions }, { data: settings }] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('settings').select('*')
      ]);

      const exportObj = {
        exported_at: new Date().toISOString(),
        customers: customers || [],
        transactions: transactions || [],
        settings: settings || []
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petroflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('success', 'Export', 'Data export ho gaya!');
    } catch (err) {
      alert('Export error: ' + err.message);
    }
  };

  // ============================================
  // CLEAR OLD DATA
  // ============================================

  window.clearOldData = async function () {
    if (!confirm('Ek saal pehle ki transactions delete karna chahte hain?')) return;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .lt('created_at', oneYearAgo.toISOString());

      if (error) { alert('Error: ' + error.message); return; }
      showToast('success', 'Kamyab!', 'Purani transactions delete ho gayi!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ============================================
  // INIT
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.getAttribute('data-page') !== 'settings') return;
    console.log('🚀 Settings page initializing...');
    initSettingsPage();
  });

})();
// code changes here  
// =============================================
// // SETTINGS PAGE - PRICE HISTORY & SEO
// // =============================================
// (function() {
//   'use strict';
//   const supabase = window.supabaseClient;

//   window.saveFuelPricesWithHistory = async function() {
//     const petrol = parseFloat(document.getElementById('petrol-price').value);
//     const diesel = parseFloat(document.getElementById('diesel-price').value);
//     const date = document.getElementById('price-effective-date').value;

//     if(!petrol || !diesel || !date) return alert("Fill all fields");

//     const { data: { user } } = await supabase.auth.getUser();
    
//     // Get existing history
//     const { data } = await supabase.from('settings').select('price_history').eq('user_id', user.id).maybeSingle();
//     let history = data?.price_history || [];
    
//     // Add new entry
//     history.push({ date, petrol, diesel });
    
//     const { error } = await supabase.from('settings').upsert({
//       user_id: user.id,
//       price_history: history,
//       current_petrol: petrol,
//       current_diesel: diesel,
//       updated_at: new Date()
//     });

//     if(!error) alert("Prices updated for " + date);
//   };
// })();