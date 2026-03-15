// =============================================
// Reports JS — Khalid & Sons Petroleum
// =============================================

async function generateReport() {
  const type = document.getElementById('report-type').value;
  const uid  = window._currentUserId;
  let fromDate, toDate, title;

  if (type === 'daily') {
    const d = document.getElementById('rpt-date').value;
    if (!d) { showToast('Select a date', 'warning'); return; }
    fromDate = d + 'T00:00:00';
    toDate   = d + 'T23:59:59';
    title    = 'Daily Report: ' + d;
  } else if (type === 'monthly') {
    const m = document.getElementById('rpt-month').value;
    if (!m) { showToast('Select a month', 'warning'); return; }
    fromDate = m + '-01T00:00:00';
    const last = new Date(m.split('-')[0], m.split('-')[1], 0).getDate();
    toDate   = m + '-' + String(last).padStart(2,'0') + 'T23:59:59';
    title    = 'Monthly Report: ' + m;
  } else if (type === 'custom') {
    const f = document.getElementById('rpt-from').value;
    const t = document.getElementById('rpt-to').value;
    if (!f || !t) { showToast('Select date range', 'warning'); return; }
    fromDate = f + 'T00:00:00';
    toDate   = t + 'T23:59:59';
    title    = 'Report: ' + f + ' to ' + t;
  } else if (type === 'customer') {
    const custId = document.getElementById('rpt-cust-id').value;
    if (!custId) { showToast('Select a customer', 'warning'); return; }
    await generateCustomerLedger(custId);
    return;
  }

  try {
    const { data: txs, error } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', uid)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Customer names
    const custIds = [...new Set((txs||[]).map(t=>t.customer_id).filter(Boolean))];
    let custMap = {};
    if (custIds.length) {
      const { data: custs } = await supabase.from('customers').select('id,name').in('id', custIds);
      (custs||[]).forEach(c => custMap[c.id] = c.name);
    }

    if (!txs || !txs.length) {
      document.getElementById('report-output').style.display = 'none';
      document.getElementById('report-empty').style.display  = 'block';
      return;
    }

    // Summary
    let cashSale=0, credit=0, debit=0, expense=0, advance=0, online=0;
    txs.forEach(t => {
      if (t.transaction_type==='CashSale') cashSale += Number(t.charges)||0;
      if (t.transaction_type==='Credit')   credit   += Number(t.charges)||0;
      if (t.transaction_type==='Debit')    debit    += Number(t.amount||t.charges)||0;
      if (t.transaction_type==='Expense')  expense  += Number(t.charges)||0;
      if (t.transaction_type==='Advance')  advance  += Number(t.charges)||0;
      try {
        const d = JSON.parse(t.description||'{}');
        online += Number(d.online_payment)||0;
      } catch(e){}
    });

    document.getElementById('rpt-summary').innerHTML = `
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Cash Sales</div>
        <div class="s-value text-primary">Rs. ${formatNumber(cashSale)}</div>
      </div></div>
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Udhaar (Credit)</div>
        <div class="s-value text-danger">Rs. ${formatNumber(credit)}</div>
      </div></div>
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Vasooli (Debit)</div>
        <div class="s-value text-success">Rs. ${formatNumber(debit)}</div>
      </div></div>
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Expenses</div>
        <div class="s-value text-warning">Rs. ${formatNumber(expense)}</div>
      </div></div>
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Online/Acct</div>
        <div class="s-value text-info">Rs. ${formatNumber(online)}</div>
      </div></div>
      <div class="col-6 col-md-2"><div class="s-card">
        <div class="s-label">Net Cash</div>
        <div class="s-value ${(cashSale+debit-expense)>=0?'profit-pos':'profit-neg'}">Rs. ${formatNumber(cashSale+debit-expense)}</div>
      </div></div>`;

    document.getElementById('rpt-table-header').textContent = title + ' — ' + txs.length + ' transactions';
    document.getElementById('rpt-thead').innerHTML = `<tr>
      <th>Date</th><th>Customer</th><th>Type</th>
      <th>Liters</th><th>Rate</th><th>Amount</th><th>Notes</th>
    </tr>`;

    const typeMap = { Credit:'tx-badge-credit', Debit:'tx-badge-debit',
      Expense:'tx-badge-expense', Advance:'tx-badge-advance', CashSale:'tx-badge-cashsale' };
    document.getElementById('rpt-tbody').innerHTML = txs.map(t => {
      const date  = new Date(t.created_at).toLocaleDateString('en-PK');
      const cname = custMap[t.customer_id] || '—';
      const badge = `<span class="${typeMap[t.transaction_type]||'tx-badge-cashsale'}">${t.transaction_type}</span>`;
      const amt   = t.transaction_type==='Debit' ? (t.amount||t.charges) : t.charges;
      let desc=''; try{const d=JSON.parse(t.description||'{}');desc=d.note||d.category||'';}catch(e){}
      return `<tr>
        <td>${date}</td><td>${cname}</td><td>${badge}</td>
        <td>${t.liters?formatNumber(t.liters,2)+' L':'—'}</td>
        <td>${t.unit_price?'Rs.'+t.unit_price:'—'}</td>
        <td class="fw-bold">Rs. ${formatNumber(amt||0)}</td>
        <td class="text-muted small">${desc}</td>
      </tr>`;
    }).join('');

    document.getElementById('report-output').style.display = 'block';
    document.getElementById('report-empty').style.display  = 'none';
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
    console.error(e);
  }
}

async function generateCustomerLedger(custId) {
  const uid = window._currentUserId;
  try {
    const { data: cust } = await supabase.from('customers').select('*').eq('id', custId).single();
    const { data: txs  } = await supabase.from('transactions')
      .select('*').eq('user_id', uid).eq('customer_id', custId)
      .order('created_at', { ascending: true });

    let runningBal = 0;
    document.getElementById('rpt-summary').innerHTML = `
      <div class="col-md-4"><div class="s-card">
        <div class="s-label">Customer</div>
        <div class="s-value">${cust?.name||'—'}</div>
        <div class="s-sub">${cust?.phone||''} · ${cust?.category||''}</div>
      </div></div>
      <div class="col-md-4"><div class="s-card">
        <div class="s-label">Current Balance (Udhaar)</div>
        <div class="s-value ${(Number(cust?.balance)||0)>0?'text-danger':'profit-pos'}">
          Rs. ${formatNumber(Math.abs(Number(cust?.balance)||0))}
        </div>
      </div></div>
      <div class="col-md-4"><div class="s-card">
        <div class="s-label">Total Transactions</div>
        <div class="s-value text-primary">${(txs||[]).length}</div>
      </div></div>`;

    document.getElementById('rpt-table-header').textContent = 'Ledger: ' + (cust?.name||'');
    document.getElementById('rpt-thead').innerHTML = `<tr>
      <th>Date</th><th>Type</th><th>Debit (Udhaar)</th>
      <th>Credit (Vasooli)</th><th>Balance</th><th>Notes</th>
    </tr>`;

    document.getElementById('rpt-tbody').innerHTML = (txs||[]).map(t => {
      const date  = new Date(t.created_at).toLocaleDateString('en-PK');
      const amt   = Number(t.charges||0);
      let dr='—', cr='—';
      if (t.transaction_type==='Credit') { dr = 'Rs. ' + formatNumber(amt); runningBal += amt; }
      if (t.transaction_type==='Debit')  { cr = 'Rs. ' + formatNumber(Number(t.amount||amt)); runningBal -= Number(t.amount||amt); }
      const balClass = runningBal>0?'text-danger':'text-success';
      let desc=''; try{const d=JSON.parse(t.description||'{}');desc=d.note||'';}catch(e){}
      return `<tr>
        <td>${date}</td>
        <td><span class="tx-badge-${t.transaction_type?.toLowerCase()}">${t.transaction_type}</span></td>
        <td class="text-danger">${dr}</td>
        <td class="text-success">${cr}</td>
        <td class="${balClass} fw-bold">Rs. ${formatNumber(Math.abs(runningBal))}</td>
        <td class="text-muted small">${desc}</td>
      </tr>`;
    }).join('');

    document.getElementById('report-output').style.display = 'block';
    document.getElementById('report-empty').style.display  = !txs?.length ? 'block' : 'none';
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}
