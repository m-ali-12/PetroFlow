// =============================================
// Mobil Oil Stock JS — Khalid & Sons Petroleum
// =============================================

let mobilItems = [];

async function loadMobilStock() {
  const uid = window._currentUserId;
  try {
    const { data, error } = await supabase.from('mobil_stock')
      .select('*').eq('user_id', uid).eq('entry_type','stock')
      .order('entry_date', { ascending: false });
    if (error) throw error;

    // Group by item and calculate current qty
    const itemMap = {};
    // Get all entries to calculate stock
    const { data: allEntries } = await supabase.from('mobil_stock')
      .select('*').eq('user_id', uid);

    (allEntries||[]).forEach(e => {
      if (!itemMap[e.item]) itemMap[e.item] = { item: e.item, sell_price: e.sell_price, qty: 0 };
      if (e.entry_type === 'stock') itemMap[e.item].qty += Number(e.qty)||0;
      if (e.entry_type === 'sale')  itemMap[e.item].qty -= Number(e.qty)||0;
    });

    mobilItems = Object.values(itemMap);
    renderMobilCards(mobilItems);

    // Populate sell item dropdown
    const sel = document.getElementById('sell-item');
    if (sel) {
      sel.innerHTML = mobilItems.map(i =>
        `<option value="${i.item}">${i.item} (Stock: ${i.qty})</option>`
      ).join('');
    }
  } catch(e) {
    document.getElementById('mobil-stock-cards').innerHTML =
      '<div class="col-12 text-center py-3 text-muted"><i class="bi bi-info-circle me-2"></i>Please create a <code>mobil_stock</code> table in Supabase.</div>';
  }
}

function renderMobilCards(items) {
  const container = document.getElementById('mobil-stock-cards');
  if (!items.length) {
    container.innerHTML = '<div class="col-12 text-muted text-center py-3">No stock items. Add stock to get started.</div>';
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="col-6 col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <div class="fw-bold text-muted mb-1 small">${item.item}</div>
          <div class="fw-bold fs-4 ${item.qty<=0?'text-danger':'text-success'}">${item.qty}</div>
          <small class="text-muted">units in stock</small>
          ${item.sell_price ? `<div class="mt-1 small text-primary">Rs. ${item.sell_price} each</div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

async function loadMobilHistory() {
  const uid    = window._currentUserId;
  const filter = document.getElementById('mobil-filter')?.value || 'all';
  try {
    let query = supabase.from('mobil_stock').select('*').eq('user_id', uid)
      .order('entry_date', { ascending: false });
    if (filter === 'sale')  query = query.eq('entry_type','sale');
    if (filter === 'stock') query = query.eq('entry_type','stock');

    const { data, error } = await query;
    if (error) throw error;

    const tbody = document.getElementById('mobil-tbody');
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">No records yet</td></tr>';
      return;
    }

    tbody.innerHTML = (data||[]).map(d => `
      <tr>
        <td>${new Date(d.entry_date).toLocaleDateString('en-PK')}</td>
        <td>${d.item||'—'}</td>
        <td><span class="badge ${d.entry_type==='stock'?'bg-success':'bg-primary'}">${d.entry_type==='stock'?'Stock In':'Sale'}</span></td>
        <td>${d.qty||0}</td>
        <td>${d.cost_price?'Rs. '+d.cost_price:'—'}</td>
        <td>${d.sell_price?'Rs. '+formatNumber((d.qty||0)*(d.sell_price||0)):'—'}</td>
        <td class="text-muted small">${d.notes||'—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteMobilEntry('${d.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  } catch(e) {
    console.warn('Mobil history error:', e.message);
  }
}

async function addMobilStock() {
  const uid  = window._currentUserId;
  const item = document.getElementById('ms-item').value.trim();
  const qty  = parseFloat(document.getElementById('ms-qty').value) || 0;
  const cost = parseFloat(document.getElementById('ms-cost').value) || 0;
  const sell = parseFloat(document.getElementById('ms-sell').value) || 0;
  const date = document.getElementById('ms-date').value;

  if (!item) { showToast('Enter item name', 'warning'); return; }
  if (!qty)  { showToast('Enter quantity', 'warning'); return; }

  try {
    const { error } = await supabase.from('mobil_stock').insert({
      user_id: uid, item, qty, cost_price: cost, sell_price: sell,
      entry_type: 'stock', entry_date: date
    });
    if (error) throw error;
    showToast('Stock added!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addMobilModal'))?.hide();
    ['ms-item','ms-qty','ms-cost','ms-sell'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    await loadMobilStock();
    await loadMobilHistory();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function recordMobilSale() {
  const uid   = window._currentUserId;
  const item  = document.getElementById('sell-item').value;
  const qty   = parseFloat(document.getElementById('sell-qty').value) || 0;
  const price = parseFloat(document.getElementById('sell-price').value) || 0;
  const date  = document.getElementById('sell-date').value;
  const notes = document.getElementById('sell-notes').value.trim();

  if (!item) { showToast('Select an item', 'warning'); return; }
  if (!qty)  { showToast('Enter quantity', 'warning'); return; }

  try {
    const { error } = await supabase.from('mobil_stock').insert({
      user_id: uid, item, qty, sell_price: price, entry_type: 'sale',
      entry_date: date, notes: notes || null
    });
    if (error) throw error;
    showToast('Sale recorded!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('sellMobilModal'))?.hide();
    await loadMobilStock();
    await loadMobilHistory();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function deleteMobilEntry(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    const { error } = await supabase.from('mobil_stock')
      .delete().eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Deleted', 'success');
    await loadMobilStock();
    await loadMobilHistory();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}
