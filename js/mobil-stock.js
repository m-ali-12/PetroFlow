// =============================================
// MOBIL STOCK MANAGEMENT - js/mobil-stock.js
// Settings table se kaam karta hai
// No auth required
// =============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;
  let settingsId = null;
  let allArrivals = [];
  let allSales    = [];
  let activeMonth = ''; // 'YYYY-MM' format

  function $(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function fmtL(num) {
    return Number(num || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function showToast(message, type = 'info') {
    const toast = $('liveToast');
    if (!toast) { alert(message); return; }
    const titles = { success: 'Kamyab!', error: 'Ghalati', info: 'Info' };
    if ($('toast-title')) $('toast-title').textContent = titles[type] || 'Info';
    if ($('toast-message')) $('toast-message').textContent = message;
    toast.className = `toast align-items-center border-0 ${
      type === 'success' ? 'bg-success text-white' :
      type === 'error'   ? 'bg-danger text-white'  : 'bg-secondary text-white'
    }`;
    new bootstrap.Toast(toast, { delay: 3500 }).show();
  }

  // ── Load Settings Row ──────────────────────────────────────
  async function loadSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveSettings(patch) {
    if (!settingsId) throw new Error('Settings row nahi mili');
    const { error } = await supabase
      .from('settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', settingsId);
    if (error) throw error;
  }

  // ── Init Page ──────────────────────────────────────────────
  async function initPage() {
    try {
      const settings = await loadSettings();
      if (!settings) {
        showToast('Settings table empty hai — pehle settings page visit karein', 'error');
        return;
      }

      settingsId = settings.id;
      allArrivals = Array.isArray(settings.mobil_arrivals) ? settings.mobil_arrivals : [];
      allSales    = Array.isArray(settings.mobil_sales)    ? settings.mobil_sales    : [];

      // Set current month as default filter
      const now = new Date();
      activeMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      if ($('filter-month')) $('filter-month').value = activeMonth;

      renderAll();
    } catch (err) {
      console.error('initPage error:', err);
      showToast('Load error: ' + err.message, 'error');
    }
  }

  // ── Filter ─────────────────────────────────────────────────
  window.applyMonthFilter = function () {
    activeMonth = $('filter-month')?.value || '';
    renderAll();
  };

  window.clearFilter = function () {
    activeMonth = '';
    if ($('filter-month')) $('filter-month').value = '';
    renderAll();
  };

  function filterByMonth(arr) {
    if (!activeMonth) return arr;
    return arr.filter(r => (r.date || '').startsWith(activeMonth));
  }

  // ── Render All ─────────────────────────────────────────────
  function renderAll() {
    const filteredArrivals = filterByMonth(allArrivals);
    const filteredSales    = filterByMonth(allSales);

    renderArrivals(filteredArrivals);
    renderSales(filteredSales);
    renderMonthly();
    renderStockCards();
    updateFilterInfo(filteredArrivals.length, filteredSales.length);
  }

  function updateFilterInfo(a, s) {
    const el = $('filter-info');
    if (!el) return;
    if (activeMonth) {
      const d = new Date(activeMonth + '-01');
      const lbl = d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
      el.textContent = `${lbl}: ${a} arrivals, ${s} sales`;
    } else {
      el.textContent = `Total: ${allArrivals.length} arrivals, ${allSales.length} sales`;
    }
  }

  // ── Stock Cards ────────────────────────────────────────────
  function renderStockCards() {
    // Current stock = total arrived - total sold (all time)
    const carArrived  = allArrivals.filter(r => r.type === 'Car Mobil').reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    const openArrived = allArrivals.filter(r => r.type === 'Open Mobil').reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    const carSold     = allSales.filter(r => r.type === 'Car Mobil').reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    const openSold    = allSales.filter(r => r.type === 'Open Mobil').reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);

    const carStock  = Math.max(0, carArrived  - carSold);
    const openStock = Math.max(0, openArrived - openSold);

    if ($('card-car-stock'))  $('card-car-stock').textContent  = fmtL(carStock);
    if ($('card-open-stock')) $('card-open-stock').textContent = fmtL(openStock);

    // Revenue — this month
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthRevenue = allSales
      .filter(r => (r.date || '').startsWith(thisMonth))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalRevenue = allSales.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    if ($('card-month-revenue')) $('card-month-revenue').textContent = 'Rs. ' + fmt(monthRevenue);
    if ($('card-total-revenue')) $('card-total-revenue').textContent = 'Rs. ' + fmt(totalRevenue);
  }

  // ── Arrivals Table ─────────────────────────────────────────
  function renderArrivals(arr) {
    const tbody = $('arrivals-table');
    if (!tbody) return;

    if (!arr.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi arrival record nahi hai</td></tr>';
      $('arrival-total-qty').textContent  = '0.00 L';
      $('arrival-total-cost').textContent = 'Rs. 0.00';
      return;
    }

    const sorted = [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
    let totalQty = 0, totalCost = 0;

    tbody.innerHTML = sorted.map((r, i) => {
      totalQty  += parseFloat(r.qty)  || 0;
      totalCost += parseFloat(r.total) || 0;
      const realIdx = allArrivals.findIndex(x => x.id === r.id);
      return `<tr>
        <td>${r.date}</td>
        <td><span class="badge ${r.type === 'Car Mobil' ? 'bg-primary' : 'bg-success'}">${r.type}</span></td>
        <td>${r.supplier || '-'}</td>
        <td>${fmtL(r.qty)} L</td>
        <td>Rs. ${fmt(r.rate)}</td>
        <td><strong>Rs. ${fmt(r.total)}</strong></td>
        <td>${r.invoice || '-'}</td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteArrival('${r.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    if ($('arrival-total-qty'))  $('arrival-total-qty').textContent  = fmtL(totalQty) + ' L';
    if ($('arrival-total-cost')) $('arrival-total-cost').textContent = 'Rs. ' + fmt(totalCost);
  }

  // ── Sales Table ────────────────────────────────────────────
  function renderSales(arr) {
    const tbody = $('sales-table');
    if (!tbody) return;

    if (!arr.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi sale record nahi hai</td></tr>';
      $('sale-total-qty').textContent     = '0.00 L';
      $('sale-total-revenue').textContent = 'Rs. 0.00';
      return;
    }

    const sorted = [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
    let totalQty = 0, totalRev = 0;

    tbody.innerHTML = sorted.map((r) => {
      totalQty += parseFloat(r.qty)    || 0;
      totalRev += parseFloat(r.amount) || 0;
      const payBadge = r.payment === 'credit'
        ? '<span class="badge bg-warning text-dark">Udhaar</span>'
        : '<span class="badge bg-success">Cash</span>';
      return `<tr>
        <td>${r.date}</td>
        <td><span class="badge ${r.type === 'Car Mobil' ? 'bg-primary' : 'bg-success'}">${r.type}</span></td>
        <td>${r.customer || '-'}</td>
        <td>${fmtL(r.qty)} L</td>
        <td>Rs. ${fmt(r.rate)}</td>
        <td><strong>Rs. ${fmt(r.amount)}</strong></td>
        <td>${payBadge}</td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSale('${r.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    if ($('sale-total-qty'))     $('sale-total-qty').textContent     = fmtL(totalQty) + ' L';
    if ($('sale-total-revenue')) $('sale-total-revenue').textContent = 'Rs. ' + fmt(totalRev);
  }

  // ── Monthly Summary Table ──────────────────────────────────
  function renderMonthly() {
    const tbody = $('monthly-table');
    if (!tbody) return;

    // Collect all months from arrivals + sales
    const months = new Set();
    [...allArrivals, ...allSales].forEach(r => {
      if (r.date) months.add(r.date.substring(0, 7));
    });

    if (!months.size) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Koi data nahi hai</td></tr>';
      return;
    }

    const sortedMonths = [...months].sort((a, b) => b.localeCompare(a));

    tbody.innerHTML = sortedMonths.map(month => {
      const mArrivals = allArrivals.filter(r => (r.date || '').startsWith(month));
      const mSales    = allSales.filter(r => (r.date || '').startsWith(month));

      const arrQty  = mArrivals.reduce((s, r) => s + (parseFloat(r.qty)    || 0), 0);
      const arrCost = mArrivals.reduce((s, r) => s + (parseFloat(r.total)  || 0), 0);
      const salQty  = mSales.reduce((s, r)    => s + (parseFloat(r.qty)    || 0), 0);
      const salRev  = mSales.reduce((s, r)    => s + (parseFloat(r.amount) || 0), 0);
      const profit  = salRev - arrCost;

      const d = new Date(month + '-01');
      const monthLabel = d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

      return `<tr>
        <td><strong>${monthLabel}</strong></td>
        <td>${fmtL(arrQty)} L</td>
        <td>${fmtL(salQty)} L</td>
        <td>Rs. ${fmt(arrCost)}</td>
        <td class="text-success fw-bold">Rs. ${fmt(salRev)}</td>
        <td class="${profit >= 0 ? 'text-success' : 'text-danger'} fw-bold">
          ${profit >= 0 ? '+' : ''}Rs. ${fmt(profit)}
        </td>
      </tr>`;
    }).join('');
  }

  // ── Save Arrival ───────────────────────────────────────────
  window.saveArrival = async function () {
    const type     = $('arr-type')?.value;
    const supplier = $('arr-supplier')?.value || '';
    const qty      = parseFloat($('arr-qty')?.value);
    const rate     = parseFloat($('arr-rate')?.value);
    const total    = qty * rate;
    const date     = $('arr-date')?.value;
    const invoice  = $('arr-invoice')?.value || '';
    const notes    = $('arr-notes')?.value || '';

    if (!type || !qty || !rate || !date) {
      showToast('Type, Quantity, Rate aur Date zaroor bharein', 'error');
      return;
    }

    try {
      const settings = await loadSettings();
      const arrivals = Array.isArray(settings.mobil_arrivals) ? settings.mobil_arrivals : [];

      const newRecord = {
        id:       Date.now().toString(),
        date,
        type,
        supplier,
        qty,
        rate,
        total,
        invoice,
        notes,
        created_at: new Date().toISOString()
      };

      arrivals.push(newRecord);

      await saveSettings({ mobil_arrivals: arrivals });

      // Update local state
      allArrivals = arrivals;

      showToast(`${qty} L ${type} arrival save ho gaya!`, 'success');

      const modal = bootstrap.Modal.getInstance($('arrivalModal'));
      if (modal) modal.hide();
      if ($('arrivalForm')) $('arrivalForm').reset();
      if ($('arr-date')) $('arr-date').value = new Date().toISOString().split('T')[0];

      renderAll();

    } catch (err) {
      console.error('saveArrival error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ── Delete Arrival ─────────────────────────────────────────
  window.deleteArrival = async function (id) {
    if (!confirm('Yeh arrival record delete karein?')) return;
    try {
      const settings = await loadSettings();
      const arrivals = (settings.mobil_arrivals || []).filter(r => r.id !== id);
      await saveSettings({ mobil_arrivals: arrivals });
      allArrivals = arrivals;
      showToast('Arrival delete ho gaya!', 'success');
      renderAll();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ── Delete Sale ────────────────────────────────────────────
  window.deleteSale = async function (id) {
    if (!confirm('Yeh sale record delete karein?')) return;
    try {
      const settings = await loadSettings();
      const sales = (settings.mobil_sales || []).filter(r => r.id !== id);
      await saveSettings({ mobil_sales: sales });
      allSales = sales;
      showToast('Sale delete ho gaya!', 'success');
      renderAll();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'mobil-stock') return;

    console.log('Mobil Stock init...');

    // Default date
    const today = new Date().toISOString().split('T')[0];
    if ($('arr-date')) $('arr-date').value = today;

    // Auto calculate total cost
    const qtyEl   = $('arr-qty');
    const rateEl  = $('arr-rate');
    const totalEl = $('arr-total');
    if (qtyEl && rateEl && totalEl) {
      const calc = () => {
        const q = parseFloat(qtyEl.value)  || 0;
        const r = parseFloat(rateEl.value) || 0;
        totalEl.value = (q * r).toFixed(2);
      };
      qtyEl.addEventListener('input', calc);
      rateEl.addEventListener('input', calc);
    }

    await initPage();
    console.log('Mobil Stock ready!');
  });

})();