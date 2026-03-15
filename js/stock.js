// =============================================
// Stock JS — Khalid & Sons Petroleum
// =============================================

async function loadStock() {
  const uid = window._currentUserId;
  try {
    const { data, error } = await supabase.from('fuel_stock')
      .select('*').eq('user_id', uid)
      .order('stock_date', { ascending: false });
    if (error) throw error;

    // Latest dipping per fuel type
    const petrolEntries = (data||[]).filter(d => d.fuel_type === 'Petrol');
    const dieselEntries = (data||[]).filter(d => d.fuel_type === 'Diesel');

    const latestPetrol = petrolEntries[0];
    const latestDiesel = dieselEntries[0];

    document.getElementById('petrol-stock').textContent =
      latestPetrol ? formatNumber(latestPetrol.dipping || 0, 2) + ' L' : '0 L';
    document.getElementById('diesel-stock').textContent =
      latestDiesel ? formatNumber(latestDiesel.dipping || 0, 2) + ' L' : '0 L';

    const latest = (data||[])[0];
    document.getElementById('stock-updated').textContent =
      latest ? new Date(latest.stock_date).toLocaleDateString('en-PK') : '—';

    renderStockTable(data || []);
  } catch(e) {
    // Table might not exist — show graceful message
    document.getElementById('stock-tbody').innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-info-circle me-2"></i>Please create a <code>fuel_stock</code> table in Supabase to use this feature.</td></tr>';
    console.warn('Stock table error:', e.message);
  }
}

function renderStockTable(data) {
  const tbody = document.getElementById('stock-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No stock entries yet</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(d => `
    <tr>
      <td>${new Date(d.stock_date).toLocaleDateString('en-PK')}</td>
      <td><span class="badge ${d.fuel_type==='Petrol'?'bg-primary':'bg-warning text-dark'}">${d.fuel_type}</span></td>
      <td>${formatNumber(d.dipping||0, 2)} L</td>
      <td>${formatNumber(d.received||0, 2)} L</td>
      <td class="text-muted small">${d.notes||'—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteStock('${d.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function saveStock() {
  const uid      = window._currentUserId;
  const date     = document.getElementById('st-date').value;
  const fuel     = document.getElementById('st-fuel').value;
  const dipping  = parseFloat(document.getElementById('st-dipping').value) || 0;
  const received = parseFloat(document.getElementById('st-received').value) || 0;
  const notes    = document.getElementById('st-notes').value.trim();

  if (!date) { showToast('Select a date', 'warning'); return; }

  try {
    const { error } = await supabase.from('fuel_stock').insert({
      user_id:    uid,
      stock_date: date,
      fuel_type:  fuel,
      dipping,
      received,
      notes: notes || null
    });
    if (error) throw error;
    showToast('Stock entry saved!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addStockModal'))?.hide();
    ['st-dipping','st-received','st-notes'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value='';
    });
    await loadStock();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function deleteStock(id) {
  if (!confirm('Delete this stock entry?')) return;
  try {
    const { error } = await supabase.from('fuel_stock')
      .delete().eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Deleted', 'success');
    await loadStock();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}
