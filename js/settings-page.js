// =============================================
// Settings Page JS — Khalid & Sons Petroleum
// =============================================

async function loadSettings() {
  const uid = window._currentUserId;
  try {
    const { data } = await supabase.from('settings')
      .select('*').eq('user_id', uid).maybeSingle();

    if (data) {
      document.getElementById('petrol-price').value = data.petrol_price || '';
      document.getElementById('diesel-price').value = data.diesel_price || '';
      if (data.pump_name)    document.getElementById('pump-name').value    = data.pump_name;
      if (data.owner_name)   document.getElementById('owner-name').value   = data.owner_name;
      if (data.pump_phone)   document.getElementById('pump-phone').value   = data.pump_phone;
      if (data.pump_address) document.getElementById('pump-address').value = data.pump_address;

      // Price history
      const history = data.price_history || [];
      renderPriceHistory(history);
    }
  } catch(e) {
    console.error('loadSettings error:', e);
  }
}

function renderPriceHistory(history) {
  const tbody = document.getElementById('price-history-tbody');
  if (!history || !history.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No history yet</td></tr>';
    return;
  }
  const sorted = [...history].sort((a,b) => b.date?.localeCompare(a.date||'')||0);
  tbody.innerHTML = sorted.slice(0, 20).map(h => `
    <tr>
      <td>${h.date || '—'}</td>
      <td>Rs. ${h.petrol || 0}</td>
      <td>Rs. ${h.diesel || 0}</td>
    </tr>
  `).join('');
}

async function savePrices() {
  const uid     = window._currentUserId;
  const petrol  = parseFloat(document.getElementById('petrol-price').value) || 0;
  const diesel  = parseFloat(document.getElementById('diesel-price').value) || 0;

  try {
    // Get existing settings
    const { data: existing } = await supabase.from('settings')
      .select('id,price_history').eq('user_id', uid).maybeSingle();

    const history = existing?.price_history || [];
    history.push({ date: new Date().toISOString().split('T')[0], petrol, diesel });
    // Keep last 50 entries
    if (history.length > 50) history.splice(0, history.length - 50);

    if (existing?.id) {
      const { error } = await supabase.from('settings').update({
        petrol_price: petrol, diesel_price: diesel, price_history: history
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('settings').insert({
        user_id: uid, petrol_price: petrol, diesel_price: diesel, price_history: history
      });
      if (error) throw error;
    }

    showToast('Fuel prices updated!', 'success');
    renderPriceHistory(history);
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function savePumpInfo() {
  const uid = window._currentUserId;
  const info = {
    pump_name:    document.getElementById('pump-name').value.trim(),
    owner_name:   document.getElementById('owner-name').value.trim(),
    pump_phone:   document.getElementById('pump-phone').value.trim(),
    pump_address: document.getElementById('pump-address').value.trim()
  };

  try {
    const { data: existing } = await supabase.from('settings')
      .select('id').eq('user_id', uid).maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('settings').update(info).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('settings').insert({ user_id: uid, ...info });
      if (error) throw error;
    }
    showToast('Pump info saved!', 'success');
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function changePassword() {
  const pass    = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;
  if (!pass)          { showToast('Enter new password', 'warning'); return; }
  if (pass.length < 6){ showToast('Password must be at least 6 characters', 'warning'); return; }
  if (pass !== confirm){ showToast('Passwords do not match', 'warning'); return; }

  try {
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) throw error;
    showToast('Password changed successfully!', 'success');
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}
