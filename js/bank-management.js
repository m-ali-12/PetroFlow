// Bank Management JavaScript
const supabase = window.supabaseClient;

// Global state
let currentUser = null;
let banks = [];
let deposits = [];
let transfers = [];
let bankTransactions = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadInitialData();
});

// Check authentication
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;
}

// Load all initial data
async function loadInitialData() {
    await Promise.all([
        loadBanks(),
        loadDeposits(),
        loadTransfers(),
        loadBankTransactions()
    ]);
    
    populateBankDropdowns();
    await updateReconciliationStats();
}

// Load banks
async function loadBanks() {
    try {
        const { data, error } = await supabase
            .from('banks')
            .select('*')
            .order('name');

        if (error) throw error;

        banks = data || [];
        displayBankCards();
    } catch (error) {
        console.error('Error loading banks:', error);
        alert('Error loading banks: ' + error.message);
    }
}

// Display bank cards
function displayBankCards() {
    const container = document.getElementById('bank-cards-container');
    container.innerHTML = '';

    banks.forEach(bank => {
        const card = `
            <div class="bank-card">
                <h3>${bank.name}</h3>
                <div class="account">${bank.account_number || 'No account number'}</div>
                <div class="balance">Rs. ${parseFloat(bank.balance || 0).toLocaleString()}</div>
                <div style="font-size: 13px; opacity: 0.8;">Current Balance</div>
                <div class="actions">
                    <button class="btn-sm" onclick="editBank(${bank.id})">Edit</button>
                    <button class="btn-sm" onclick="viewBankStatement(${bank.id})">Statement</button>
                    <button class="btn-sm" onclick="adjustBalance(${bank.id})">Adjust</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// Load deposits
async function loadDeposits() {
    try {
        const filterBank = document.getElementById('filter-deposit-bank')?.value;
        const filterFrom = document.getElementById('filter-deposit-from')?.value;
        const filterTo = document.getElementById('filter-deposit-to')?.value;

        let query = supabase
            .from('cash_deposits')
            .select(`
                *,
                banks!cash_deposits_bank_id_fkey (
                    name,
                    account_number
                )
            `)
            .order('deposit_date', { ascending: false });

        if (filterBank) query = query.eq('bank_id', filterBank);
        if (filterFrom) query = query.gte('deposit_date', filterFrom);
        if (filterTo) query = query.lte('deposit_date', filterTo);

        const { data, error } = await query;
        if (error) throw error;

        deposits = data || [];
        displayDeposits();
    } catch (error) {
        console.error('Error loading deposits:', error);
        alert('Error loading deposits: ' + error.message);
    }
}

// Display deposits
function displayDeposits() {
    const tbody = document.querySelector('#deposits-table tbody');
    tbody.innerHTML = '';

    deposits.forEach(deposit => {
        const row = `
            <tr>
                <td>${new Date(deposit.deposit_date).toLocaleDateString()}</td>
                <td>${deposit.banks?.name || '-'}</td>
                <td><strong>Rs. ${parseFloat(deposit.amount).toLocaleString()}</strong></td>
                <td>${deposit.deposited_by || '-'}</td>
                <td>${deposit.reference || '-'}</td>
                <td>${deposit.note || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteDeposit(${deposit.id})">Delete</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Load transfers
async function loadTransfers() {
    try {
        const filterFrom = document.getElementById('filter-transfer-from')?.value;
        const filterTo = document.getElementById('filter-transfer-to')?.value;

        let query = supabase
            .from('bank_transfers')
            .select(`
                *,
                from_bank:banks!bank_transfers_from_bank_id_fkey (
                    name
                ),
                to_bank:banks!bank_transfers_to_bank_id_fkey (
                    name
                )
            `)
            .order('transfer_date', { ascending: false });

        if (filterFrom) query = query.gte('transfer_date', filterFrom);
        if (filterTo) query = query.lte('transfer_date', filterTo);

        const { data, error } = await query;
        if (error) throw error;

        transfers = data || [];
        displayTransfers();
    } catch (error) {
        console.error('Error loading transfers:', error);
        alert('Error loading transfers: ' + error.message);
    }
}

// Display transfers
function displayTransfers() {
    const tbody = document.querySelector('#transfers-table tbody');
    tbody.innerHTML = '';

    transfers.forEach(transfer => {
        const row = `
            <tr>
                <td>${new Date(transfer.transfer_date).toLocaleDateString()}</td>
                <td>${transfer.from_bank?.name || '-'}</td>
                <td>${transfer.to_bank?.name || '-'}</td>
                <td><strong>Rs. ${parseFloat(transfer.amount).toLocaleString()}</strong></td>
                <td>${transfer.transfer_type || '-'}</td>
                <td>${transfer.reference_no || '-'}</td>
                <td>${transfer.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransfer(${transfer.id})">Delete</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Load bank transactions
async function loadBankTransactions() {
    try {
        const filterBank = document.getElementById('filter-txn-bank')?.value;
        const filterType = document.getElementById('filter-txn-type')?.value;
        const filterFrom = document.getElementById('filter-txn-from')?.value;
        const filterTo = document.getElementById('filter-txn-to')?.value;

        let query = supabase
            .from('bank_transactions')
            .select(`
                *,
                banks!bank_transactions_bank_id_fkey (
                    name
                )
            `)
            .order('transaction_date', { ascending: false })
            .limit(100);

        if (filterBank) query = query.eq('bank_id', filterBank);
        if (filterType) query = query.eq('transaction_type', filterType);
        if (filterFrom) query = query.gte('transaction_date', filterFrom);
        if (filterTo) query = query.lte('transaction_date', filterTo);

        const { data, error } = await query;
        if (error) throw error;

        bankTransactions = data || [];
        displayBankTransactions();
    } catch (error) {
        console.error('Error loading bank transactions:', error);
        alert('Error loading bank transactions: ' + error.message);
    }
}

// Display bank transactions
function displayBankTransactions() {
    const tbody = document.querySelector('#bank-transactions-table tbody');
    tbody.innerHTML = '';

    bankTransactions.forEach(txn => {
        const row = `
            <tr>
                <td>${new Date(txn.transaction_date).toLocaleDateString()}</td>
                <td>${txn.banks?.name || '-'}</td>
                <td><span class="badge">${txn.transaction_type}</span></td>
                <td><strong>Rs. ${parseFloat(txn.amount).toLocaleString()}</strong></td>
                <td>${txn.description || '-'}</td>
                <td>Rs. ${parseFloat(txn.balance_before || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(txn.balance_after || 0).toLocaleString()}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Update reconciliation stats
async function updateReconciliationStats() {
    try {
        const { data, error } = await supabase
            .from('v_bank_balance_summary')
            .select('*');

        if (error) throw error;

        const summary = data || [];
        
        const totalBalance = summary.reduce((sum, b) => sum + parseFloat(b.current_balance || 0), 0);
        const totalDeposits = summary.reduce((sum, b) => sum + parseFloat(b.total_deposits || 0), 0);
        const totalWithdrawals = summary.reduce((sum, b) => sum + parseFloat(b.total_withdrawals || 0), 0);
        const netFlow = totalDeposits - totalWithdrawals;

        document.getElementById('stat-total-balance').textContent = `Rs. ${totalBalance.toLocaleString()}`;
        document.getElementById('stat-total-deposits').textContent = `Rs. ${totalDeposits.toLocaleString()}`;
        document.getElementById('stat-total-withdrawals').textContent = `Rs. ${totalWithdrawals.toLocaleString()}`;
        document.getElementById('stat-net-flow').textContent = `Rs. ${netFlow.toLocaleString()}`;

        displayReconciliationTable(summary);
    } catch (error) {
        console.error('Error updating reconciliation stats:', error);
    }
}

// Display reconciliation table
function displayReconciliationTable(summary) {
    const tbody = document.querySelector('#reconciliation-table tbody');
    tbody.innerHTML = '';

    summary.forEach(bank => {
        const row = `
            <tr>
                <td>${bank.name}</td>
                <td>${bank.account_number || '-'}</td>
                <td><strong>Rs. ${parseFloat(bank.current_balance || 0).toLocaleString()}</strong></td>
                <td>Rs. ${parseFloat(bank.total_deposits || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(bank.total_withdrawals || 0).toLocaleString()}</td>
                <td>-</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Populate bank dropdowns
function populateBankDropdowns() {
    const selects = [
        'deposit-bank-select',
        'from-bank-select',
        'to-bank-select',
        'filter-deposit-bank',
        'filter-txn-bank'
    ];

    const options = banks.map(b => 
        `<option value="${b.id}">${b.name} - ${b.account_number || 'No Account'}</option>`
    ).join('');

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = firstOption.outerHTML + options;
        }
    });
}

// Modal functions
window.showAddBankModal = function() {
    document.getElementById('add-bank-modal').classList.add('active');
};

window.showDepositModal = function() {
    document.querySelector('#deposit-form input[name="deposit_date"]').value = 
        new Date().toISOString().split('T')[0];
    document.getElementById('deposit-modal').classList.add('active');
};

window.showTransferModal = function() {
    document.querySelector('#transfer-form input[name="transfer_date"]').value = 
        new Date().toISOString().split('T')[0];
    document.getElementById('transfer-modal').classList.add('active');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Tab switching
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'reconciliation') {
        updateReconciliationStats();
    }
};

// Save bank
window.saveBank = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.created_by = currentUser.id;

    try {
        const { error } = await supabase
            .from('banks')
            .insert([data]);

        if (error) throw error;

        alert('Bank added successfully!');
        closeModal('add-bank-modal');
        event.target.reset();
        await loadBanks();
        populateBankDropdowns();
    } catch (error) {
        console.error('Error saving bank:', error);
        alert('Error: ' + error.message);
    }
};

// Save deposit
window.saveDeposit = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.created_by = currentUser.id;

    try {
        // Insert deposit
        const { data: depositData, error: depositError } = await supabase
            .from('cash_deposits')
            .insert([data])
            .select()
            .single();

        if (depositError) throw depositError;

        // Update bank balance
        const bank = banks.find(b => b.id == data.bank_id);
        const newBalance = parseFloat(bank.balance || 0) + parseFloat(data.amount);

        const { error: updateError } = await supabase
            .from('banks')
            .update({ balance: newBalance })
            .eq('id', data.bank_id);

        if (updateError) throw updateError;

        // Record transaction
        await supabase.from('bank_transactions').insert([{
            bank_id: data.bank_id,
            transaction_date: data.deposit_date,
            transaction_type: 'deposit',
            amount: data.amount,
            description: `Cash deposit - ${data.note || ''}`,
            balance_before: bank.balance,
            balance_after: newBalance,
            created_by: currentUser.id
        }]);

        alert('Deposit recorded successfully!');
        closeModal('deposit-modal');
        event.target.reset();
        await loadBanks();
        await loadDeposits();
        await loadBankTransactions();
    } catch (error) {
        console.error('Error saving deposit:', error);
        alert('Error: ' + error.message);
    }
};

// Save transfer
window.saveTransfer = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    if (data.from_bank_id === data.to_bank_id) {
        alert('Cannot transfer to the same bank!');
        return;
    }

    data.created_by = currentUser.id;

    try {
        // Insert transfer
        const { data: transferData, error: transferError } = await supabase
            .from('bank_transfers')
            .insert([data])
            .select()
            .single();

        if (transferError) throw transferError;

        // Update from bank balance
        const fromBank = banks.find(b => b.id == data.from_bank_id);
        const newFromBalance = parseFloat(fromBank.balance || 0) - parseFloat(data.amount);

        await supabase
            .from('banks')
            .update({ balance: newFromBalance })
            .eq('id', data.from_bank_id);

        // Update to bank balance
        const toBank = banks.find(b => b.id == data.to_bank_id);
        const newToBalance = parseFloat(toBank.balance || 0) + parseFloat(data.amount);

        await supabase
            .from('banks')
            .update({ balance: newToBalance })
            .eq('id', data.to_bank_id);

        // Record transactions
        await supabase.from('bank_transactions').insert([
            {
                bank_id: data.from_bank_id,
                transaction_date: data.transfer_date,
                transaction_type: 'transfer_out',
                amount: data.amount,
                description: `Transfer to ${toBank.name}`,
                balance_before: fromBank.balance,
                balance_after: newFromBalance,
                created_by: currentUser.id
            },
            {
                bank_id: data.to_bank_id,
                transaction_date: data.transfer_date,
                transaction_type: 'transfer_in',
                amount: data.amount,
                description: `Transfer from ${fromBank.name}`,
                balance_before: toBank.balance,
                balance_after: newToBalance,
                created_by: currentUser.id
            }
        ]);

        alert('Transfer completed successfully!');
        closeModal('transfer-modal');
        event.target.reset();
        await loadBanks();
        await loadTransfers();
        await loadBankTransactions();
    } catch (error) {
        console.error('Error saving transfer:', error);
        alert('Error: ' + error.message);
    }
};

// Update transfer display
window.updateTransferDisplay = function() {
    const fromBankId = document.getElementById('from-bank-select').value;
    const toBankId = document.getElementById('to-bank-select').value;

    const fromBank = banks.find(b => b.id == fromBankId);
    const toBank = banks.find(b => b.id == toBankId);

    document.getElementById('from-bank-display').textContent = fromBank ? fromBank.name : 'Select Bank';
    document.getElementById('from-bank-balance').textContent = fromBank ? 
        `Balance: Rs. ${parseFloat(fromBank.balance || 0).toLocaleString()}` : 'Balance: -';

    document.getElementById('to-bank-display').textContent = toBank ? toBank.name : 'Select Bank';
    document.getElementById('to-bank-balance').textContent = toBank ? 
        `Balance: Rs. ${parseFloat(toBank.balance || 0).toLocaleString()}` : 'Balance: -';
};

// Export functions
window.loadDeposits = loadDeposits;
window.loadTransfers = loadTransfers;
window.loadBankTransactions = loadBankTransactions;
