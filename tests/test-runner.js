/**
 * Automated Test Script for Finance Dashboard
 * Run this in the browser console or include in the page for testing
 */

const TestRunner = {
    results: [],

    // Run all tests
    async runAll() {
        console.log('🧪 Starting Finance Dashboard Tests...\n');
        this.results = [];

        // Clear existing data for fresh tests
        localStorage.removeItem('finance_dashboard_data');
        fm.transactions = [];
        ui.render();

        await this.delay(300);

        // Run tests
        await this.testAddIncomeTransaction();
        await this.testAddExpenseTransaction();
        await this.testAddMultipleTransactions();
        await this.testSummaryCalculations();
        await this.testFilterTransactions();
        await this.testDeleteTransaction();
        await this.testLocalStoragePersistence();
        await this.testCSVExport();
        await this.testCSVImport();
        await this.testChartRendering();

        // Print results
        this.printResults();
    },

    // Helper to add delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Helper to log test result
    log(testName, passed, message = '') {
        this.results.push({ testName, passed, message });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${testName}${message ? ': ' + message : ''}`);
    },

    // Test 1: Add income transaction
    async testAddIncomeTransaction() {
        const initialCount = fm.transactions.length;

        // Simulate form submission
        fm.addTransaction({
            type: 'income',
            amount: 5000,
            description: 'Salário de Janeiro',
            category: 'Salário',
            date: '2026-01-04'
        });
        ui.render();
        await this.delay(100);

        const passed = fm.transactions.length === initialCount + 1 &&
            fm.transactions[0].type === 'income' &&
            fm.transactions[0].amount === 5000;

        this.log('Add Income Transaction', passed);
    },

    // Test 2: Add expense transaction
    async testAddExpenseTransaction() {
        const initialCount = fm.transactions.length;

        fm.addTransaction({
            type: 'expense',
            amount: 1500,
            description: 'Aluguel',
            category: 'Moradia',
            date: '2026-01-04'
        });
        ui.render();
        await this.delay(100);

        const passed = fm.transactions.length === initialCount + 1 &&
            fm.transactions[0].type === 'expense' &&
            fm.transactions[0].amount === 1500;

        this.log('Add Expense Transaction', passed);
    },

    // Test 3: Add multiple transactions
    async testAddMultipleTransactions() {
        const expenses = [
            { type: 'expense', amount: 500, description: 'Supermercado', category: 'Alimentação', date: '2026-01-03' },
            { type: 'expense', amount: 200, description: 'Gasolina', category: 'Transporte', date: '2026-01-02' },
            { type: 'income', amount: 300, description: 'Freelance', category: 'Freelance', date: '2026-01-01' }
        ];

        expenses.forEach(t => fm.addTransaction(t));
        ui.render();
        await this.delay(100);

        const passed = fm.transactions.length >= 5;
        this.log('Add Multiple Transactions', passed, `Total: ${fm.transactions.length} transactions`);
    },

    // Test 4: Summary calculations
    async testSummaryCalculations() {
        const totals = fm.getTotals();

        // Expected: 5000 + 300 income, 1500 + 500 + 200 expense
        const expectedIncome = 5300;
        const expectedExpense = 2200;
        const expectedBalance = 3100;

        const passed = totals.income === expectedIncome &&
            totals.expense === expectedExpense &&
            totals.balance === expectedBalance;

        this.log('Summary Calculations', passed,
            `Income: ${totals.income}, Expense: ${totals.expense}, Balance: ${totals.balance}`);
    },

    // Test 5: Filter transactions
    async testFilterTransactions() {
        // Test expense filter
        fm.currentFilter = 'expense';
        const expenseOnly = fm.getFilteredTransactions();
        const allExpenses = expenseOnly.every(t => t.type === 'expense');

        // Test income filter
        fm.currentFilter = 'income';
        const incomeOnly = fm.getFilteredTransactions();
        const allIncomes = incomeOnly.every(t => t.type === 'income');

        // Reset filter
        fm.currentFilter = 'all';

        const passed = allExpenses && allIncomes &&
            expenseOnly.length === 3 && incomeOnly.length === 2;

        this.log('Filter Transactions', passed,
            `Expenses: ${expenseOnly.length}, Incomes: ${incomeOnly.length}`);
    },

    // Test 6: Delete transaction
    async testDeleteTransaction() {
        const initialCount = fm.transactions.length;
        const idToDelete = fm.transactions[0].id;

        fm.deleteTransaction(idToDelete);
        ui.render();
        await this.delay(100);

        const passed = fm.transactions.length === initialCount - 1 &&
            !fm.transactions.find(t => t.id === idToDelete);

        this.log('Delete Transaction', passed);
    },

    // Test 7: LocalStorage persistence
    async testLocalStoragePersistence() {
        const currentData = fm.transactions;
        const storedData = JSON.parse(localStorage.getItem('finance_dashboard_data'));

        const passed = storedData !== null &&
            storedData.length === currentData.length;

        this.log('LocalStorage Persistence', passed,
            `Stored: ${storedData?.length || 0} transactions`);
    },

    // Test 8: CSV Export
    async testCSVExport() {
        // Check if CSVHandler exists and has exportToCSV method
        const hasExport = typeof CSVHandler !== 'undefined' &&
            typeof CSVHandler.exportToCSV === 'function';

        // We can't fully test download, but we can check the function exists
        this.log('CSV Export Function', hasExport);
    },

    // Test 9: CSV Import
    async testCSVImport() {
        // Test parsing function with MockData.csv format
        // Format: "Date";"Description";"Value";"Account";"Category"
        const testLine = '"04/01/2026";"Teste Import";"-100,50";"C6";"Comida";""';
        const parsed = CSVHandler.parseMockDataLine(testLine);

        const passed = parsed !== null &&
            parsed.type === 'expense' &&
            parsed.amount === 100.50 &&
            parsed.category === 'Alimentação'; // Mapped from 'Comida'

        this.log('CSV Import Parsing', passed,
            parsed ? `Parsed: ${parsed.description} - R$ ${parsed.amount} (${parsed.category})` : 'Failed to parse');
    },

    // Test 10: Chart rendering
    async testChartRendering() {
        const expenses = fm.getExpensesByCategory();
        const categories = Object.keys(expenses);

        const hasChart = fm.chart !== null || categories.length === 0;
        const hasCategories = categories.length > 0;

        this.log('Chart Data Generation', hasCategories,
            `Categories: ${categories.join(', ')}`);
    },

    // Print final results
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const percentage = ((passed / total) * 100).toFixed(0);

        console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);

        const failed = this.results.filter(r => !r.passed);
        if (failed.length > 0) {
            console.log('\n❌ Failed tests:');
            failed.forEach(f => console.log(`   - ${f.testName}: ${f.message}`));
        }

        console.log('\n' + '='.repeat(50));
        return { passed, total, percentage };
    }
};

// Auto-run message
console.log('🧪 Test script loaded. Run TestRunner.runAll() to execute all tests.');
