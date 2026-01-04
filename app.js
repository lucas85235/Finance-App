/**
 * Finance Dashboard - Main Application
 * Manages transactions, localStorage persistence, and UI rendering
 */

// ===== Finance Manager Class =====
class FinanceManager {
    constructor() {
        this.storageKey = 'finance_dashboard_data';
        this.categoriesKey = 'finance_dashboard_categories';

        this.transactions = this.loadFromStorage();
        this.categories = this.loadCategories();

        this.chart = null;
        this.monthlyChart = null;
        this.currentFilter = 'all';
        this.currentPeriod = 'all';
        this.searchQuery = '';
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Load data from localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        }
    }

    // Save data to localStorage
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Error saving data:', error);
            showToast('Erro ao salvar dados', 'error');
        }
    }

    // Load categories from localStorage
    loadCategories() {
        try {
            const data = localStorage.getItem(this.categoriesKey);
            if (data) return JSON.parse(data);

            // Default categories if none exist
            const defaults = [
                { id: 'cat_1', name: 'Salário', icon: '💼', type: 'income' },
                { id: 'cat_2', name: 'Freelance', icon: '💻', type: 'income' },
                { id: 'cat_3', name: 'Investimentos', icon: '📊', type: 'income' },
                { id: 'cat_4', name: 'Outros Receita', icon: '💰', type: 'income' },
                { id: 'cat_5', name: 'Alimentação', icon: '🍔', type: 'expense' },
                { id: 'cat_6', name: 'Transporte', icon: '🚗', type: 'expense' },
                { id: 'cat_7', name: 'Moradia', icon: '🏠', type: 'expense' },
                { id: 'cat_8', name: 'Saúde', icon: '🏥', type: 'expense' },
                { id: 'cat_9', name: 'Educação', icon: '📚', type: 'expense' },
                { id: 'cat_10', name: 'Lazer', icon: '🎮', type: 'expense' },
                { id: 'cat_11', name: 'Compras', icon: '🛒', type: 'expense' },
                { id: 'cat_12', name: 'Contas', icon: '📄', type: 'expense' },
                { id: 'cat_13', name: 'Outros Despesa', icon: '📦', type: 'expense' }
            ];
            this.saveCategories(defaults);
            return defaults;
        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    }

    // Save categories to localStorage
    saveCategories(categories = this.categories) {
        try {
            localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
        } catch (error) {
            console.error('Error saving categories:', error);
        }
    }

    // Add new category
    addCategory(category) {
        const newCategory = {
            id: this.generateId(),
            ...category
        };
        this.categories.push(newCategory);
        this.saveCategories();
        return newCategory;
    }

    // Delete category
    deleteCategory(id) {
        // Prevent deleting last category of a type
        const category = this.categories.find(c => c.id === id);
        if (!category) return false;

        const typeCount = this.categories.filter(c => c.type === (category.type || 'expense')).length;
        if (typeCount <= 1) {
            throw new Error('Deve haver pelo menos uma categoria deste tipo.');
        }

        this.categories = this.categories.filter(c => c.id !== id);
        this.saveCategories();
        return true;
    }

    // Add new transaction
    addTransaction(transaction) {
        const newTransaction = {
            id: this.generateId(),
            ...transaction
        };
        this.transactions.unshift(newTransaction); // Add to beginning
        this.saveToStorage();
        return newTransaction;
    }

    // Delete transaction by ID
    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Update transaction by ID
    updateTransaction(id, updates) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...this.transactions[index], ...updates };
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Get transaction by ID
    getTransaction(id) {
        return this.transactions.find(t => t.id === id);
    }

    // Import transactions (merge with existing)
    importTransactions(newTransactions) {
        // Add new IDs to avoid duplicates
        const imported = newTransactions.map(t => ({
            ...t,
            id: this.generateId()
        }));
        this.transactions = [...imported, ...this.transactions];
        this.saveToStorage();
        return imported.length;
    }

    // Get filtered transactions
    getFilteredTransactions() {
        let transactions = this.transactions;

        // Filter by type
        if (this.currentFilter !== 'all') {
            transactions = transactions.filter(t => t.type === this.currentFilter);
        }

        // Filter by period (YYYY-MM)
        if (this.currentPeriod !== 'all') {
            transactions = transactions.filter(t => t.date.startsWith(this.currentPeriod));
        }

        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query)
            );
        }

        return transactions;
    }

    // Calculate totals
    getTotals() {
        return this.transactions.reduce((acc, t) => {
            if (t.type === 'income') {
                acc.income += t.amount;
            } else {
                acc.expense += t.amount;
            }
            acc.balance = acc.income - acc.expense;
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }

    // Get expenses by category (for chart)
    getExpensesByCategory() {
        const categories = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
        return categories;
    }

    // Get monthly data for evolution chart
    getMonthlyData() {
        const monthlyData = {};
        const monthNames = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];

        this.transactions.forEach(t => {
            if (!t.date) return;
            const period = t.date.substring(0, 7); // YYYY-MM

            if (!monthlyData[period]) {
                monthlyData[period] = { income: 0, expense: 0 };
            }

            if (t.type === 'income') {
                monthlyData[period].income += t.amount;
            } else {
                monthlyData[period].expense += t.amount;
            }
        });

        // Sort by period and get last 12 months
        const sortedPeriods = Object.keys(monthlyData).sort().slice(-12);

        return {
            labels: sortedPeriods.map(p => {
                const [year, month] = p.split('-');
                return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
            }),
            incomes: sortedPeriods.map(p => monthlyData[p].income),
            expenses: sortedPeriods.map(p => monthlyData[p].expense)
        };
    }

    // Get top 5 expenses by category
    getTopExpenses() {
        const categories = this.getExpensesByCategory();
        const sorted = Object.entries(categories)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const maxAmount = sorted.length > 0 ? sorted[0].amount : 0;

        return sorted.map(item => ({
            ...item,
            percentage: maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
        }));
    }
}

// ===== UI Controller =====
class UIController {
    constructor(financeManager) {
        this.fm = financeManager;
        this.initElements();
        this.initEventListeners();
        this.setDefaultDate();
        this.render();
    }

    // Initialize DOM elements
    initElements() {
        this.form = document.getElementById('transaction-form');
        this.tableBody = document.getElementById('transactions-body');
        this.emptyState = document.getElementById('empty-state');
        this.chartEmpty = document.getElementById('chart-empty');
        this.filterSelect = document.getElementById('filter-type');
        this.periodSelect = document.getElementById('filter-period');
        this.searchInput = document.getElementById('search-input');
        this.importInput = document.getElementById('import-file');
        this.exportBtn = document.getElementById('export-btn');

        // Summary elements
        this.totalIncome = document.getElementById('total-income');
        this.totalExpense = document.getElementById('total-expense');
        this.totalBalance = document.getElementById('total-balance');

        // Charts
        this.chartCanvas = document.getElementById('category-chart');
        this.monthlyChartCanvas = document.getElementById('monthly-chart');
        this.monthlyChartEmpty = document.getElementById('monthly-chart-empty');

        // Top Expenses element
        this.topExpensesList = document.getElementById('top-expenses-list');

        // Edit Modal elements
        this.editModal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-form');
        this.modalClose = document.getElementById('modal-close');
        this.modalCancel = document.getElementById('modal-cancel');

        // Categories Modal elements
        this.categoriesModal = document.getElementById('categories-modal');
        this.categoriesList = document.getElementById('categories-list');
        this.addCategoryForm = document.getElementById('add-category-form');
        this.categoriesClose = document.getElementById('categories-close');
    }

    // Initialize event listeners
    initEventListeners() {
        // Form submit
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Add Category Form submit
        this.addCategoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Categories Modal actions
        this.categoriesClose.addEventListener('click', () => this.hideCategoriesModal());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.hideEditModal();
            }
            if (e.target === this.categoriesModal) {
                this.hideCategoriesModal();
            }
        });

        // Filter change
        this.filterSelect.addEventListener('change', (e) => {
            this.fm.currentFilter = e.target.value;
            this.renderTransactions();
        });

        // Period filter change
        this.periodSelect.addEventListener('change', (e) => {
            this.fm.currentPeriod = e.target.value;
            this.renderTransactions();
        });

        // Search input (with debounce)
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.fm.searchQuery = e.target.value.trim();
                this.renderTransactions();
            }, 300);
        });

        // Export CSV
        this.exportBtn.addEventListener('click', () => {
            CSVHandler.exportToCSV(this.fm.transactions);
        });

        // Import CSV
        this.importInput.addEventListener('change', (e) => this.handleImport(e));

        // Edit Modal events
        this.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.modalClose.addEventListener('click', () => this.hideEditModal());
        this.modalCancel.addEventListener('click', () => this.hideEditModal());
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.hideEditModal();
        });


        // Restore JSON
        const restoreInput = document.getElementById('restore-file');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => this.handleRestore(e));
        }

        // Backup JSON
        const backupBtn = document.getElementById('backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.handleBackup());
        }

        // Report PDF
        const reportBtn = document.getElementById('report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => this.generatePDF());
        }

        // Initialize Keyboard Shortcuts
        this.initKeyboardShortcuts();
    }

    // Generate PDF Report
    generatePDF() {
        const { jsPDF } = window.jspdf;
        const transactions = this.fm.getFilteredTransactions();
        const totals = this.fm.getTotals();
        const period = this.fm.currentPeriod === 'all' ? 'Todos os Períodos' : this.fm.currentPeriod;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Relatório Financeiro", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);
        doc.text(`Período: ${period}`, 14, 33);

        // Summary Cards
        let yPos = 45;
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(14, yPos, 60, 25, 3, 3, 'FD');
        doc.roundedRect(79, yPos, 60, 25, 3, 3, 'FD');
        doc.roundedRect(144, yPos, 60, 25, 3, 3, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text("Receitas", 19, yPos + 8);
        doc.text("Despesas", 84, yPos + 8);
        doc.text("Saldo", 149, yPos + 8);

        doc.setFontSize(14);
        doc.setTextColor(46, 204, 113); // Green
        doc.text(this.formatCurrency(totals.income), 19, yPos + 18);

        doc.setTextColor(231, 76, 60); // Red
        doc.text(this.formatCurrency(totals.expense), 84, yPos + 18);

        doc.setTextColor(52, 152, 219); // Blue
        doc.text(this.formatCurrency(totals.balance), 149, yPos + 18);

        // Table
        doc.autoTable({
            startY: yPos + 35,
            head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor']],
            body: transactions.map(t => [
                this.formatDate(t.date),
                t.description,
                t.category,
                t.account || '-',
                t.type === 'income' ? 'Receita' : 'Despesa',
                this.formatCurrency(t.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 30, 46], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 245, 250] }
        });

        // Save
        const filename = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);
        showToast('Relatório PDF gerado com sucesso! 📄');
    }

    // Handle JSON Backup
    handleBackup() {
        const data = {
            transactions: this.fm.transactions,
            categories: this.fm.categories,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `finance_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        showToast('Backup realizado com sucesso! 💾');
    }

    // Handle JSON Restore
    handleRestore(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.transactions || !Array.isArray(data.transactions)) {
                    throw new Error('Arquivo de backup inválido: transações não encontradas.');
                }

                if (confirm(`Deseja restaurar ${data.transactions.length} transações e categorias? Isso substituirá os dados atuais.`)) {
                    // Update FinanceManager state
                    this.fm.transactions = data.transactions;
                    if (data.categories && Array.isArray(data.categories)) {
                        this.fm.categories = data.categories;
                    }

                    this.fm.saveToStorage();
                    this.fm.saveCategories();

                    // Reset UI
                    this.renderTransactions();
                    this.renderSummary();
                    this.renderChart();
                    this.renderMonthlyChart();
                    this.renderTopExpenses();

                    showToast('Dados restaurados com sucesso! ♻️');
                }
            } catch (error) {
                console.error('Restore error:', error);
                alert('Erro ao restaurar arquivo: ' + error.message);
            }
            // Reset input so same file can be selected again
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    // Initialize Keyboard Shortcuts
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if focus is on an input/textarea (except for Escape and Ctrl+Enter)
            // But allow 'Esc' and 'Ctrl+Enter' even if focused
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            // Escape: Close Modals
            if (e.key === 'Escape') {
                if (!this.editModal.hidden) this.hideEditModal();
                if (!this.categoriesModal.hidden) this.hideCategoriesModal();
                return;
            }

            // Ctrl + Enter: Submit Forms
            if (e.ctrlKey && e.key === 'Enter') {
                if (!this.editModal.hidden) {
                    this.handleEditSubmit(e);
                    return;
                }
                if (!this.categoriesModal.hidden) {
                    this.handleCategorySubmit(e);
                    return;
                }
                // Default form (new transaction)
                this.handleFormSubmit(e);
                return;
            }

            // 'N': Focus New Transaction Type (if not already typing)
            if (e.key.toLowerCase() === 'n' && !isInput) {
                e.preventDefault();
                document.getElementById('type').focus();
                // Helper to open select if possible (limited browser support)
                return;
            }

            // '/': Focus Search (if not already typing)
            if (e.key === '/' && !isInput) {
                e.preventDefault();
                this.searchInput.focus();
                return;
            }
        });
    }

    // Set default date to today
    setDefaultDate() {
        const dateInput = document.getElementById('date');
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Handle form submission
    handleFormSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const transaction = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            category: formData.get('category'),
            account: formData.get('account') || '',
            date: formData.get('date')
        };

        if (transaction.amount <= 0) {
            showToast('Valor deve ser maior que zero', 'error');
            return;
        }

        this.fm.addTransaction(transaction);
        this.form.reset();
        this.setDefaultDate();
        this.render();

        showToast('Transação adicionada com sucesso!', 'success');
    }

    // Handle delete transaction
    handleDelete(id) {
        if (this.fm.deleteTransaction(id)) {
            this.render();
            showToast('Transação excluída', 'success');
        }
    }

    // Show edit modal with transaction data
    showEditModal(id) {
        const transaction = this.fm.getTransaction(id);
        if (!transaction) return;

        document.getElementById('edit-id').value = transaction.id;
        document.getElementById('edit-type').value = transaction.type;
        document.getElementById('edit-amount').value = transaction.amount;
        document.getElementById('edit-description').value = transaction.description;
        document.getElementById('edit-category').value = transaction.category;
        document.getElementById('edit-account').value = transaction.account || '';
        document.getElementById('edit-date').value = transaction.date;

        this.editModal.hidden = false;
    }

    // Hide edit modal
    hideEditModal() {
        this.editModal.hidden = true;
        this.editForm.reset();
    }

    // Handle edit form submit
    handleEditSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.editForm);
        const id = formData.get('id');
        const updates = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            category: formData.get('category'),
            account: formData.get('account') || '',
            date: formData.get('date')
        };

        if (updates.amount <= 0) {
            showToast('Valor deve ser maior que zero', 'error');
            return;
        }

        if (this.fm.updateTransaction(id, updates)) {
            this.hideEditModal();
            this.render();
            showToast('Transação atualizada!', 'success');
        }
    }

    // Handle CSV import
    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const transactions = await CSVHandler.importFromCSV(file);
            const count = this.fm.importTransactions(transactions);
            this.render();
            showToast(`${count} transações importadas com sucesso!`, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }

        // Reset input
        e.target.value = '';
    }

    // Populate period filter dropdown with unique months from transactions
    populatePeriodFilter() {
        const periods = new Set();
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        this.fm.transactions.forEach(t => {
            if (t.date) {
                const period = t.date.substring(0, 7); // YYYY-MM
                periods.add(period);
            }
        });

        // Sort periods descending (most recent first)
        const sortedPeriods = Array.from(periods).sort().reverse();

        // Keep current selection if still valid
        const currentValue = this.periodSelect.value;

        // Build options HTML
        let options = '<option value="all">Todos os períodos</option>';
        sortedPeriods.forEach(period => {
            const [year, month] = period.split('-');
            const monthName = monthNames[parseInt(month) - 1];
            const label = `${monthName} ${year}`;
            options += `<option value="${period}">${label}</option>`;
        });

        this.periodSelect.innerHTML = options;

        // Restore selection if valid
        if (sortedPeriods.includes(currentValue) || currentValue === 'all') {
            this.periodSelect.value = currentValue;
        }
    }

    // Render all UI components
    render() {
        this.populateCategorySelects();
        this.populatePeriodFilter();
        this.renderSummary();
        this.renderTransactions();
        this.renderChart();
        this.renderMonthlyChart();
        this.renderTopExpenses();
    }

    // Render summary cards
    renderSummary() {
        const totals = this.fm.getTotals();

        this.totalIncome.textContent = this.formatCurrency(totals.income);
        this.totalExpense.textContent = this.formatCurrency(totals.expense);
        this.totalBalance.textContent = this.formatCurrency(totals.balance);

        // Update balance color based on value
        const balanceCard = document.querySelector('.summary-card.balance .card-value');
        if (totals.balance < 0) {
            balanceCard.style.color = 'var(--expense-color)';
        } else {
            balanceCard.style.color = 'var(--balance-color)';
        }
    }

    // Render transactions table
    renderTransactions() {
        const transactions = this.fm.getFilteredTransactions();

        if (transactions.length === 0) {
            this.tableBody.innerHTML = '';
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');

        this.tableBody.innerHTML = transactions.map(t => `
            <tr data-id="${t.id}">
                <td>${this.formatDate(t.date)}</td>
                <td>${this.escapeHtml(t.description)}</td>
                <td><span class="category-tag">${this.escapeHtml(t.category)}</span></td>
                <td>${this.escapeHtml(t.account || '-')}</td>
                <td class="amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${this.formatCurrency(t.amount)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="ui.showEditModal('${t.id}')" title="Editar">
                            ✏️
                        </button>
                        <button class="btn btn-danger" onclick="ui.handleDelete('${t.id}')" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Render chart
    renderChart() {
        const expenses = this.fm.getExpensesByCategory();
        const categories = Object.keys(expenses);

        if (categories.length === 0) {
            if (this.fm.chart) {
                this.fm.chart.destroy();
                this.fm.chart = null;
            }
            this.chartCanvas.style.display = 'none';
            this.chartEmpty.classList.remove('hidden');
            return;
        }

        this.chartCanvas.style.display = 'block';
        this.chartEmpty.classList.add('hidden');

        // Sort expenses by value (descending)
        const entries = Object.entries(expenses).sort((a, b) => b[1] - a[1]);

        let finalLabels = [];
        let finalData = [];

        if (entries.length > 5) {
            // Take top 5
            const top5 = entries.slice(0, 5);
            // Sum the rest
            const others = entries.slice(5).reduce((sum, entry) => sum + entry[1], 0);

            finalLabels = top5.map(e => e[0]);
            finalData = top5.map(e => e[1]);

            finalLabels.push('Outros');
            finalData.push(others);
        } else {
            finalLabels = entries.map(e => e[0]);
            finalData = entries.map(e => e[1]);
        }

        const data = {
            labels: finalLabels,
            datasets: [{
                data: finalData,
                backgroundColor: this.generateColors(finalLabels.length),
                borderColor: 'rgba(15, 15, 26, 0.8)',
                borderWidth: 2
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0b0',
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${this.formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        };

        if (this.fm.chart) {
            this.fm.chart.data = data;
            this.fm.chart.update();
        } else {
            this.fm.chart = new Chart(this.chartCanvas, {
                type: 'doughnut',
                data,
                options
            });
        }
    }

    // Render monthly evolution chart
    renderMonthlyChart() {
        const data = this.fm.getMonthlyData();

        if (data.labels.length === 0) {
            if (this.fm.monthlyChart) {
                this.fm.monthlyChart.destroy();
                this.fm.monthlyChart = null;
            }
            this.monthlyChartCanvas.style.display = 'none';
            this.monthlyChartEmpty.classList.remove('hidden');
            return;
        }

        this.monthlyChartCanvas.style.display = 'block';
        this.monthlyChartEmpty.classList.add('hidden');

        const chartData = {
            labels: data.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: data.incomes,
                    borderColor: '#10b981', // income-color
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: data.expenses,
                    borderColor: '#ef4444', // expense-color
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#a0a0b0', // text-secondary
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    mode: 'index', // Show both values on hover
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#6a6a7a', // text-muted
                        callback: (value) => {
                            if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                            return value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6a6a7a'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };

        if (this.fm.monthlyChart) {
            this.fm.monthlyChart.data = chartData;
            this.fm.monthlyChart.update();
        } else {
            this.fm.monthlyChart = new Chart(this.monthlyChartCanvas, {
                type: 'line',
                data: chartData,
                options
            });
        }
    }

    // Render top 5 expenses
    renderTopExpenses() {
        const topExpenses = this.fm.getTopExpenses();

        if (topExpenses.length === 0) {
            this.topExpensesList.innerHTML = `
                <div class="empty-state">
                    <p>Adicione despesas para ver o ranking</p>
                </div>
            `;
            return;
        }

        this.topExpensesList.innerHTML = topExpenses.map(item => `
            <div class="expense-item">
                <div class="expense-header">
                    <div class="expense-category">
                        <span>${this.getCategoryIcon(item.category)}</span>
                        <span>${item.category}</span>
                    </div>
                    <span class="expense-amount">
                        ${this.formatCurrency(item.amount)}
                    </span>
                </div>
                <div class="expense-bar-bg">
                    <div class="expense-bar-fill" style="width: ${item.percentage}%"></div>
                </div>
            </div>
        `).join('');
    }

    // Helper to get category icon (dynamic)
    getCategoryIcon(categoryName) {
        const category = this.fm.categories.find(c => c.name === categoryName);
        return category ? category.icon : '📦';
    }

    // Populate category selects
    populateCategorySelects() {
        // IDs of selects to populate
        const selectIds = ['category', 'edit-category'];

        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const currentVal = select.value;
            select.innerHTML = '';

            // Group by type
            const incomes = this.fm.categories.filter(c => c.type === 'income');
            const expenses = this.fm.categories.filter(c => c.type === 'expense');

            // Sort helper
            const sortByName = (a, b) => a.name.localeCompare(b.name);
            incomes.sort(sortByName);
            expenses.sort(sortByName);

            // Add Income Categories
            incomes.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name; // Keep name as value for now to maintain compatibility
                opt.textContent = `${cat.icon} ${cat.name}`;
                select.appendChild(opt);
            });

            // Add Expense Categories
            expenses.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = `${cat.icon} ${cat.name}`;
                select.appendChild(opt);
            });

            // Restore selection
            if (currentVal && this.fm.categories.some(c => c.name === currentVal)) {
                select.value = currentVal;
            }
        });
    }

    // Show Categories Modal
    showCategoriesModal() {
        this.renderCategoriesList();
        this.categoriesModal.hidden = false;
    }

    // Hide Categories Modal
    hideCategoriesModal() {
        this.categoriesModal.hidden = true;
        this.addCategoryForm.reset();
    }

    // Render Categories List in Modal
    renderCategoriesList() {
        if (this.fm.categories.length === 0) {
            this.categoriesList.innerHTML = '<p class="empty-hint">Nenhuma categoria encontrada.</p>';
            return;
        }

        // Sort by type then name
        const sorted = [...this.fm.categories].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        this.categoriesList.innerHTML = sorted.map(cat => `
            <div class="category-item">
                <div class="category-info">
                    <span class="category-icon">${cat.icon}</span>
                    <span class="category-name">${this.escapeHtml(cat.name)}</span>
                    <small style="color: var(--text-muted); font-size: 0.8em; margin-left: 5px;">
                        (${cat.type === 'income' ? 'Receita' : 'Despesa'})
                    </small>
                </div>
                <button class="btn-icon-only" onclick="ui.handleDeleteCategory('${cat.id}')" title="Excluir">
                    🗑️
                </button>
            </div>
        `).join('');
    }

    // Handle Delete Category
    handleDeleteCategory(id) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            if (this.fm.deleteCategory(id)) {
                this.renderCategoriesList();
                this.populateCategorySelects();
                this.render(); // Re-render to update charts
                showToast('Categoria excluída!', 'success');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Handle Add Category Submit
    handleCategorySubmit(e) {
        e.preventDefault();

        const name = document.getElementById('new-cat-name').value.trim();
        const icon = document.getElementById('new-cat-icon').value;
        const type = document.getElementById('new-cat-type').value;

        if (!name) {
            showToast('Nome da categoria é obrigatório', 'error');
            return;
        }

        // Check if name exists
        if (this.fm.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            showToast('Categoria já existe!', 'error');
            return;
        }

        this.fm.addCategory({ name, icon, type });

        this.renderCategoriesList();
        this.populateCategorySelects();
        this.addCategoryForm.reset();
        showToast('Categoria adicionada!', 'success');
    }

    // Generate colors for chart
    generateColors(count) {
        const baseColors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
        ];

        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }

    // Format currency (BRL)
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Format date
    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ===== Toast Notification =====
function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== Initialize Application =====
let fm, ui;

document.addEventListener('DOMContentLoaded', () => {
    fm = new FinanceManager();
    ui = new UIController(fm);
});
