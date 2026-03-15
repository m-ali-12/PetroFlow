// =============================================
// Profit & Loss JS — Khalid & Sons Petroleum
// =============================================

async function loadPL() {
  const uid   = window._currentUserId;
  const month = document.getElementById('pl-month').value;
  if (!month) { showToast('Select a month', 'warning'); return; }

  const [yr, mo] = month.split('-');
  const lastDay  = new Date(Number(yr), Number(mo), 0).getDate();
  const fromDate = `${month}-01T00:00:00`;
  const toDate   = `${month}-${String(lastDay).padStart(2,'0')}T23:59:59`;

  try {
    const { data: txs, error } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', uid)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });
    if (error) throw error;

    let cashSale=0, credit=0, vasooli=0, expense=0, advance=0, online=0;
    const byDate = {};

    (txs||[]).forEach(t => {
      const date = t.created_at?.slice(0,10) || '';
      if (!byDate[date]) byDate[date] = { cash:0, udhaar:0, vasooli:0, expense:0 };

      if (t.transaction_type==='CashSale') {
        cashSale += Number(t.charges)||0;
        byDate[date].cash += Number(t.charges)||0;
        try {
          const d = JSON.parse(t.description||'{}');
          online += Number(d.online_payment)||0;
        } catch(e){}
      }
      if (t.transaction_type==='Credit') {
        credit += Number(t.charges)||0;
        byDate[date].udhaar += Number(t.charges)||0;
      }
      if (t.transaction_type==='Debit') {
        vasooli += Number(t.amount||t.charges)||0;
        byDate[date].vasooli += Number(t.amount||t.charges)||0;
      }
      if (t.transaction_type==='Expense') {
        expense += Number(t.charges)||0;
        byDate[date].expense += Number(t.charges)||0;
      }
      if (t.transaction_type==='Advance') {
        advance += Number(t.charges)||0;
      }
    });

    // Net: cashSale + vasooli - online - expense
    const netProfit = cashSale + vasooli - online - expense;

    // Update grand total bar
    document.getElementById('pl-gross').textContent  = 'Rs. ' + formatNumber(cashSale);
    document.getElementById('pl-udhaar').textContent = 'Rs. ' + formatNumber(credit);
    document.getElementById('pl-online').textContent = 'Rs. ' + formatNumber(online);
    document.getElementById('pl-exp').textContent    = 'Rs. ' + formatNumber(expense);

    const netEl = document.getElementById('pl-net');
    netEl.textContent = 'Rs. ' + formatNumber(Math.abs(netProfit));
    netEl.className   = 'fw-bold ' + (netProfit >= 0 ? '' : 'text-danger');
    netEl.style.fontSize = '2rem';

    document.getElementById('pl-indicator').innerHTML = netProfit >= 0
      ? '<span class="badge bg-success fs-6">✓ PROFIT</span>'
      : '<span class="badge bg-danger fs-6">✗ LOSS</span>';

    // Detailed breakdown
    document.getElementById('pl-detail-tbody').innerHTML = `
      <tr class="pl-section-header"><td>INCOME</td><td></td></tr>
      <tr><td class="ps-4">Cash Sales (Machine)</td><td class="text-end text-success fw-bold">+ Rs. ${formatNumber(cashSale)}</td></tr>
      <tr><td class="ps-4">Vasooli / Payments Received</td><td class="text-end text-success">+ Rs. ${formatNumber(vasooli)}</td></tr>
      <tr class="pl-section-header"><td>DEDUCTIONS</td><td></td></tr>
      <tr><td class="ps-4">Udhaar / Credit Given</td><td class="text-end text-danger">- Rs. ${formatNumber(credit)}</td></tr>
      <tr><td class="ps-4">Online / Account Payments</td><td class="text-end text-info">- Rs. ${formatNumber(online)}</td></tr>
      <tr><td class="ps-4">Expenses</td><td class="text-end text-danger">- Rs. ${formatNumber(expense)}</td></tr>
      <tr><td class="ps-4">Cash Advances Given</td><td class="text-end text-warning">- Rs. ${formatNumber(advance)}</td></tr>
      <tr class="pl-total-row table-${netProfit>=0?'success':'danger'}">
        <td><strong>NET ${netProfit>=0?'PROFIT':'LOSS'}</strong></td>
        <td class="text-end"><strong>${netProfit>=0?'+':'-'} Rs. ${formatNumber(Math.abs(netProfit))}</strong></td>
      </tr>`;

    // Daily breakdown
    const dates = Object.keys(byDate).sort();
    if (!dates.length) {
      document.getElementById('pl-daily-tbody').innerHTML =
        '<tr><td colspan="6" class="text-center text-muted">No data</td></tr>';
      return;
    }

    document.getElementById('pl-daily-tbody').innerHTML = dates.map(date => {
      const d   = byDate[date];
      const net = d.cash + d.vasooli - d.expense;
      const cls = net >= 0 ? 'profit-pos' : 'profit-neg';
      return `<tr>
        <td>${date}</td>
        <td class="text-primary">Rs. ${formatNumber(d.cash)}</td>
        <td class="text-danger">Rs. ${formatNumber(d.udhaar)}</td>
        <td class="text-success">Rs. ${formatNumber(d.vasooli)}</td>
        <td class="text-warning">Rs. ${formatNumber(d.expense)}</td>
        <td class="${cls} fw-bold">Rs. ${formatNumber(Math.abs(net))}</td>
      </tr>`;
    }).join('');

  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
    console.error(e);
  }
}
