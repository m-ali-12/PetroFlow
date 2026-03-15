// =============================================
// FILE: js/monthly-ledger.js — WITH USER_ID
// =============================================
(function() {
'use strict';

function sb() { return window.supabaseClient; }
function uid() { return window.currentUserId; }
function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'2-digit',year:'numeric'}); }

window.getMonthlyLedger = async function(customerId, year, month) {
    const startDate = new Date(year, month-1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await sb()
        .from('transactions')
        .select('*, customer:customers(name, sr_no, phone), tank:tanks(fuel_type)')
        .eq('customer_id', customerId)
        .eq('user_id', uid())
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw error;

    const summary = {
        petrol:       { qty:0, amount:0, transactions:[] },
        diesel:       { qty:0, amount:0, transactions:[] },
        mobilOil:     { qty:0, amount:0, transactions:[] },
        oilFilter:    { qty:0, amount:0, transactions:[] },
        waterServise: { qty:0, amount:0, transactions:[] },
        other:        { qty:0, amount:0, transactions:[] },
        vasooli:      { amount:0, transactions:[] },
        expense:      { amount:0, transactions:[] }
    };
    let total = 0;

    (data||[]).forEach(t => {
        if (t.transaction_type === 'Credit') {
            const ft = t.tank?.fuel_type || 'Other';
            total += parseFloat(t.amount||0);
            if (ft==='Petrol')                                    { summary.petrol.qty+=t.liters||0; summary.petrol.amount+=parseFloat(t.amount||0); summary.petrol.transactions.push(t); }
            else if (ft==='Diesel')                               { summary.diesel.qty+=t.liters||0; summary.diesel.amount+=parseFloat(t.amount||0); summary.diesel.transactions.push(t); }
            else if (ft.includes('Mobil'))                        { summary.mobilOil.qty+=t.liters||0; summary.mobilOil.amount+=parseFloat(t.amount||0); summary.mobilOil.transactions.push(t); }
            else if (t.description?.toLowerCase().includes('oil filter')) { summary.oilFilter.qty+=1; summary.oilFilter.amount+=parseFloat(t.amount||0); summary.oilFilter.transactions.push(t); }
            else if (t.description?.toLowerCase().includes('water'))      { summary.waterServise.qty+=1; summary.waterServise.amount+=parseFloat(t.amount||0); summary.waterServise.transactions.push(t); }
            else                                                  { summary.other.qty+=t.liters||1; summary.other.amount+=parseFloat(t.amount||0); summary.other.transactions.push(t); }
        } else if (t.transaction_type==='Debit')   { summary.vasooli.amount+=parseFloat(t.amount||0); summary.vasooli.transactions.push(t); }
        else if (t.transaction_type==='Expense')   { summary.expense.amount+=parseFloat(t.amount||0); summary.expense.transactions.push(t); }
    });

    return { customer: data?.[0]?.customer||{}, year, month, summary, total, allTransactions: data||[] };
};

window.printMonthlyBill = async function(customerId, year, month) {
    try {
        const d = await window.getMonthlyLedger(customerId, year, month);
        const html = window.generateMonthlyBill(d);
        const w = window.open('','_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>Bill - ${d.customer.name||''}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>body{font-family:Arial,sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #333;padding:6px 8px} .no-print{display:none} @media print{.no-print{display:none}}</style>
        </head><body>${html}<div class="text-center mt-3 no-print"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div></body></html>`);
        w.document.close();
    } catch(e) { alert('Error: ' + e.message); }
};

window.generateMonthlyBill = function(ld) {
    const { customer, year, month, summary, total, allTransactions } = ld;
    const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let rows = '', sn = 1;
    allTransactions.forEach(t => {
        if (t.transaction_type==='Credit') {
            rows += `<tr><td>${sn++}</td><td>${fmtDate(t.created_at)}</td><td>${t.id}</td><td>${t.tank_id||'-'}</td><td>${t.tank?.fuel_type||t.description||'-'}</td><td>${fmt(t.liters||0)}</td><td>${fmt(t.unit_price||0)}</td><td>${fmt(t.amount||0)}</td></tr>`;
        }
    });
    let sumRows = '';
    [['Petrol',summary.petrol],['Diesel',summary.diesel],['Mobil Oil',summary.mobilOil],['Oil Filter',summary.oilFilter],['Water Service',summary.waterServise]].forEach(([name,s]) => {
        if (s.amount>0) sumRows += `<tr><td><strong>${name}</strong></td><td class="text-center">${fmt(s.qty)}</td><td class="text-end">${fmt(s.qty>0?s.amount/s.qty:0)}</td><td class="text-end">${fmt(s.amount)}</td></tr>`;
    });
    return `<div style="max-width:800px;margin:0 auto;background:white;padding:30px">
        <div style="display:flex;justify-content:space-between;border-bottom:3px solid #333;padding-bottom:15px;margin-bottom:20px">
            <div style="display:flex;gap:15px;align-items:center"><img src="assets/logo.jfif" height="60" style="border-radius:50%"><div><h3 style="margin:0;font-style:italic">Khalid &amp; Sons</h3><h4 style="margin:0;font-style:italic">Petroleum Services</h4></div></div>
            <div style="text-align:right;font-size:.9rem"><p style="margin:2px 0"><strong>Proprietor:</strong> Muhammad Khalid</p><p style="margin:2px 0"><strong>Phone:</strong> 0321-6001723</p><p style="margin:2px 0;font-size:.8rem">Kacha Paka, Bilal Colony, Sahiwal</p></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:15px">
            <div style="border:2px solid #333;padding:10px 20px"><h5>LEG ${customer.sr_no||''}</h5><p>${customer.name||''}</p></div>
            <div><p>From: <strong>${new Date(year,month-1,1).toLocaleDateString('en-PK')}</strong> To: <strong>${new Date(year,month,0).toLocaleDateString('en-PK')}</strong></p></div>
        </div>
        <table><thead><tr><th>#</th><th>Date</th><th>Slip No.</th><th>Inv.#</th><th>Item</th><th>Qty/Ltrs</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${rows}<tr style="background:#f0f0f0"><td colspan="7" style="text-align:right"><strong>Total</strong></td><td><strong>${fmt(total)}</strong></td></tr></tbody></table>
        <div style="margin-top:20px"><h5>Summary</h5>
        <table style="max-width:400px"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${sumRows}<tr style="background:#f0f0f0"><td colspan="3" style="text-align:right"><strong>Total</strong></td><td style="text-align:right"><strong>${fmt(total)}</strong></td></tr></tbody></table></div>
        <div style="margin-top:60px;display:flex;justify-content:space-around"><div style="text-align:center"><p>_______________________</p><p>Customer Signature</p></div></div>
    </div>`;
};

})();
