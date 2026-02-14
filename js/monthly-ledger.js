// Monthly Ledger Functions
(function() {
'use strict';

const supabase = window.supabaseClient;

// Helper functions
function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Get monthly transactions for a customer
window.getMonthlyLedger = async function(customerId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no, phone),
        tank:tanks(fuel_type, name)
      `)
      .eq('customer_id', customerId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by fuel type
    const summary = {
      petrol: { qty: 0, amount: 0, transactions: [] },
      diesel: { qty: 0, amount: 0, transactions: [] },
      mobilOil: { qty: 0, amount: 0, transactions: [] },
      oilFilter: { qty: 0, amount: 0, transactions: [] },
      waterServise: { qty: 0, amount: 0, transactions: [] },
      other: { qty: 0, amount: 0, transactions: [] },
      vasooli: { amount: 0, transactions: [] },
      expense: { amount: 0, transactions: [] }
    };

    let total = 0;

    data.forEach(t => {
      if (t.transaction_type === 'Credit') {
        const fuelType = t.tank?.fuel_type || t.tank?.name || 'Other';
        
        if (fuelType === 'Petrol') {
          summary.petrol.qty += t.liters || 0;
          summary.petrol.amount += t.amount;
          summary.petrol.transactions.push(t);
          total += t.amount;
        } else if (fuelType === 'Diesel') {
          summary.diesel.qty += t.liters || 0;
          summary.diesel.amount += t.amount;
          summary.diesel.transactions.push(t);
          total += t.amount;
        } else if (fuelType === 'Car Mobil' || fuelType === 'Open Mobil') {
          summary.mobilOil.qty += t.liters || 0;
          summary.mobilOil.amount += t.amount;
          summary.mobilOil.transactions.push(t);
          total += t.amount;
        } else if (t.description?.toLowerCase().includes('oil filter')) {
          summary.oilFilter.qty += 1;
          summary.oilFilter.amount += t.amount;
          summary.oilFilter.transactions.push(t);
          total += t.amount;
        } else if (t.description?.toLowerCase().includes('water')) {
          summary.waterServise.qty += 1;
          summary.waterServise.amount += t.amount;
          summary.waterServise.transactions.push(t);
          total += t.amount;
        } else {
          summary.other.qty += t.liters || 1;
          summary.other.amount += t.amount;
          summary.other.transactions.push(t);
          total += t.amount;
        }
      } else if (t.transaction_type === 'Debit') {
        summary.vasooli.amount += t.amount;
        summary.vasooli.transactions.push(t);
      } else if (t.transaction_type === 'Expense') {
        summary.expense.amount += t.amount;
        summary.expense.transactions.push(t);
      }
    });

    return {
      customer: data[0]?.customer || {},
      year,
      month,
      summary,
      total,
      allTransactions: data
    };

  } catch (error) {
    console.error('Error fetching monthly ledger:', error);
    throw error;
  }
};

// Generate monthly bill HTML
window.generateMonthlyBill = function(ledgerData) {
  const { customer, year, month, summary, total, allTransactions } = ledgerData;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  let transactionsHTML = '';
  let serialNo = 1;

  allTransactions.forEach(t => {
    if (t.transaction_type === 'Credit') {
      const fuelType = t.tank?.fuel_type || t.description || 'Other';
      transactionsHTML += `
        <tr>
          <td>${serialNo++}</td>
          <td>${formatDate(t.created_at)}</td>
          <td>${t.id}</td>
          <td>${t.tank_id || '-'}</td>
          <td>${fuelType}</td>
          <td>${formatNumber(t.liters || 0)}</td>
          <td>${formatNumber(t.unit_price || 0)}</td>
          <td>${formatNumber(t.amount)}</td>
        </tr>
      `;
    }
  });

  const summaryRows = [];
  if (summary.petrol.amount > 0) {
    summaryRows.push({ name: 'PETROL', qty: summary.petrol.qty, rate: summary.petrol.amount / summary.petrol.qty, amount: summary.petrol.amount });
  }
  if (summary.diesel.amount > 0) {
    summaryRows.push({ name: 'DIESEL', qty: summary.diesel.qty, rate: summary.diesel.amount / summary.diesel.qty, amount: summary.diesel.amount });
  }
  if (summary.oilFilter.amount > 0) {
    summaryRows.push({ name: 'OIL FILTER', qty: summary.oilFilter.qty, rate: summary.oilFilter.amount / summary.oilFilter.qty, amount: summary.oilFilter.amount });
  }
  if (summary.mobilOil.amount > 0) {
    summaryRows.push({ name: 'MOBIL OIL', qty: summary.mobilOil.qty, rate: summary.mobilOil.amount / summary.mobilOil.qty, amount: summary.mobilOil.amount });
  }
  if (summary.waterServise.amount > 0) {
    summaryRows.push({ name: 'WATER SERVISE', qty: summary.waterServise.qty, rate: summary.waterServise.amount, amount: summary.waterServise.amount });
  }

  let summaryHTML = '';
  summaryRows.forEach(row => {
    summaryHTML += `
      <tr>
        <td><strong>${row.name}</strong></td>
        <td class="text-center">${formatNumber(row.qty)}</td>
        <td class="text-end">${formatNumber(row.rate)}</td>
        <td class="text-end">${formatNumber(row.amount)}</td>
      </tr>
    `;
  });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return `
    <div class="bill-container">
      <div class="bill-header">
        <div class="company-logo">
          <img src="assets/logo.jfif" alt="Logo" height="60">
          <div class="company-info">
            <h3>Khalid & Sons</h3>
            <h4>Petroleum Services</h4>
          </div>
        </div>
        <div class="company-details">
          <p><strong>Proprietor:</strong> Muhammad Khalid</p>
          <p><strong>Phone:</strong> 0321-6001723 / 03336186866</p>
          <p style="font-size: 0.85rem;">Kacha Paka Near Shah Fardia Park Road, Bilal Colony, Sahiwal</p>
        </div>
      </div>

      <div class="bill-info">
        <div class="customer-box">
          <h5>LEG ${customer.sr_no || ''}</h5>
          <p>${customer.name || 'SAHIWAL'}</p>
        </div>
        <div class="bill-dates">
          <p><strong>To: DY.D.H.O SAHIWAL</strong></p>
          <p>From: ${formatDate(startDate)} To: ${formatDate(endDate)}</p>
          <p class="text-end"><strong>Page 1</strong></p>
        </div>
      </div>

      <div class="print-date">
        <p><strong>Print Date:</strong> ${formatDate(new Date())}</p>
      </div>

      <table class="transaction-table">
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Date</th>
            <th>Slip No.</th>
            <th>Inv.#</th>
            <th>Particular</th>
            <th>Qty/Ltrs.</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsHTML}
          <tr class="total-row">
            <td colspan="7" class="text-end"><strong>Total</strong></td>
            <td><strong>${formatNumber(total)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="summary-section">
        <h5>Summary</h5>
        <table class="summary-table">
          <thead>
            <tr>
              <th>Particular</th>
              <th class="text-center">Qty/Ltrs.</th>
              <th class="text-end">Rate</th>
              <th class="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${summaryHTML}
            <tr class="grand-total">
              <td colspan="3" class="text-end"><strong>Total</strong></td>
              <td class="text-end"><strong>${formatNumber(total)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="signature-section">
        <div class="signature-line">
          <p>_______________________</p>
          <p>Customer Signature</p>
        </div>
      </div>
    </div>
  `;
};

// Print monthly bill
window.printMonthlyBill = async function(customerId, year, month) {
  try {
    const ledgerData = await window.getMonthlyLedger(customerId, year, month);
    const billHTML = window.generateMonthlyBill(ledgerData);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Bill - ${ledgerData.customer.name}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            body { margin: 0; }
            .no-print { display: none; }
          }

          body {
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }

          .bill-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }

          .bill-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          .company-logo {
            display: flex;
            gap: 15px;
            align-items: center;
          }

          .company-info h3 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 700;
            font-style: italic;
          }

          .company-info h4 {
            margin: 0;
            font-size: 1.2rem;
            font-style: italic;
          }

          .company-details {
            text-align: right;
            font-size: 0.9rem;
          }

          .company-details p {
            margin: 2px 0;
          }

          .bill-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }

          .customer-box {
            border: 2px solid #333;
            padding: 10px 20px;
            min-width: 200px;
          }

          .customer-box h5 {
            margin: 0 0 5px 0;
            font-weight: 700;
          }

          .bill-dates p {
            margin: 3px 0;
            font-size: 0.95rem;
          }

          .print-date {
            margin-bottom: 10px;
          }

          .transaction-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 0.9rem;
          }

          .transaction-table th,
          .transaction-table td {
            border: 1px solid #333;
            padding: 6px 8px;
          }

          .transaction-table thead {
            background: #e0e0e0;
          }

          .transaction-table th {
            font-weight: 600;
            text-align: left;
          }

          .total-row {
            background: #f0f0f0;
            font-weight: 700;
          }

          .summary-section h5 {
            font-weight: 700;
            margin-bottom: 10px;
          }

          .summary-table {
            width: 100%;
            max-width: 400px;
            border-collapse: collapse;
            font-size: 0.9rem;
          }

          .summary-table th,
          .summary-table td {
            border: 1px solid #333;
            padding: 6px 10px;
          }

          .summary-table thead {
            background: #e0e0e0;
          }

          .grand-total {
            background: #f0f0f0;
            font-weight: 700;
            font-size: 1.1rem;
          }

          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-around;
          }

          .signature-line {
            text-align: center;
          }

          .signature-line p:first-child {
            margin-bottom: 5px;
          }

          .text-end { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        ${billHTML}
        <div class="text-center mt-4 no-print">
          <button class="btn btn-primary" onclick="window.print()">Print Bill</button>
          <button class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing bill:', error);
    alert('Error generating bill: ' + error.message);
  }
};

})();