// =============================================
// Rent Management JS — Khalid & Sons Petroleum
// =============================================

async function loadRent() {
  const uid   = window._currentUserId;
  const month = document.getElementById('rent-month')?.value;

  try {
    let query = supabase.from('rent_records').select('*').eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (month) query = query.eq('rent_month', month);

    const { data, error } = await query;
    if (error) throw error;

    // Stats
    const allData = data || [];
    const tenants = [...new Set(allData.map(d=>d.tenant))].length;
    const totalDue = allData.reduce((s,d) => s + (Number(d.rent_amount)||0), 0);
    const collected = allData.filter(d=>d.status==='Paid').reduce((s,d) => s + (Number(d.paid_amount)||0), 0);
    const pending   = totalDue - collected;

    document.getElementById('rent-tenants').textContent  = tenants;
    document.getElementById('rent-due').textContent       = 'Rs. ' + formatNumber(totalDue);
    document.getElementById('rent-collected').textContent = 'Rs. ' + formatNumber(collected);
    document.getElementById('rent-pending').textContent   = 'Rs. ' + formatNumber(Math.max(0, pending));

    renderRentTable(allData);
  } catch(e) {
    document.getElementById('rent-tbody').innerHTML =
      `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-info-circle me-2"></i>Please create a <code>rent_records</code> table in Supabase.</td></tr>`;
    console.warn('Rent table error:', e.message);
  }
}

function renderRentTable(data) {
  const tbody = document.getElementById('rent-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No records for this month</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(d => {
    const paid    = Number(d.paid_amount)||0;
    const due     = Number(d.rent_amount)||0;
    const balance = due - paid;
    const statusBadge = d.status === 'Paid'
      ? '<span class="badge bg-success">Paid</span>'
      : balance > 0
        ? `<span class="badge bg-warning text-dark">Partial (Rs. ${formatNumber(balance)} pending)</span>`
        : '<span class="badge bg-danger">Unpaid</span>';

    return `<tr>
      <td><strong>${d.tenant||'—'}</strong></td>
      <td>Rs. ${formatNumber(due)}</td>
      <td>Rs. ${formatNumber(paid)}</td>
      <td>${d.date_paid ? new Date(d.date_paid).toLocaleDateString('en-PK') : '—'}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline-success me-1" onclick="markPaid('${d.id}',${due})">
          <i class="bi bi-check-circle"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRent('${d.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function saveRent() {
  const uid    = window._currentUserId;
  const tenant = document.getElementById('r-tenant').value.trim();
  const rent   = parseFloat(document.getElementById('r-rent').value) || 0;
  const paid   = parseFloat(document.getElementById('r-paid').value) || 0;
  const date   = document.getElementById('r-date').value;
  const month  = document.getElementById('r-month').value;
  const notes  = document.getElementById('r-notes').value.trim();

  if (!tenant) { showToast('Enter tenant name', 'warning'); return; }
  if (!rent)   { showToast('Enter rent amount', 'warning'); return; }

  const status = paid >= rent ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

  try {
    const { error } = await supabase.from('rent_records').insert({
      user_id: uid, tenant, rent_amount: rent, paid_amount: paid,
      date_paid: date || null, rent_month: month || null,
      status, notes: notes || null
    });
    if (error) throw error;
    showToast('Rent recorded!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addRentModal'))?.hide();
    ['r-tenant','r-rent','r-paid','r-notes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    await loadRent();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function markPaid(id, amount) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { error } = await supabase.from('rent_records').update({
      paid_amount: amount, status: 'Paid', date_paid: today
    }).eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Marked as paid!', 'success');
    await loadRent();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function deleteRent(id) {
  if (!confirm('Delete this rent record?')) return;
  try {
    const { error } = await supabase.from('rent_records')
      .delete().eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Deleted', 'success');
    await loadRent();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}
