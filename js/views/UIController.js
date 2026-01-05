/**
 * UI Controller - View Layer
 * Handles DOM rendering, events, and user interactions
 */

import { showToast } from '../utils/toast.js';
import { formatCurrency, formatDate, escapeHtml, generateColors } from '../utils/helpers.js';
import { CSVHandler } from '../utils/csv-handler.js';
import { generatePDF } from '../utils/pdf-generator.js';

export class UIController {
    constructor(financeManager) {
        this.fm = financeManager;
        this.initElements();
        this.initEventListeners();
        this.setDefaultDate();
        this.switchView('dashboard'); // Default view
        this.render();
    }

    // View Switching
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        // Show selected view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
            // Update Nav Item
            const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
            if (navItem) navItem.classList.add('active');

            // Update Page Title
            const titleMap = {
                'dashboard': 'Dashboard',
                'transactions': 'Transações',
                'categories': 'Categorias',
                'financing': 'Financiamentos',
                'reports': 'Relatórios',
                'data': 'Gerenciar Dados'
            };
            document.getElementById('page-title').textContent = titleMap[viewName] || 'Finance';
        }
    }

    // Initialize DOM elements
    initElements() {
        // new shell elements
        this.navItems = document.querySelectorAll('.nav-item');

        // Form & Table (may be in transactions view)
        this.form = document.getElementById('transaction-form'); // This form might be hidden or moved to inspector/modal
        // Note: In new layout, new transaction is via button -> inspector/modal. 
        // For phase 1 we kept existing hidden modal structure or form. 
        // Let's assume form still exists in DOM but might need to be targeted correctly.

        this.tableBody = document.getElementById('transactions-body');
        this.emptyState = document.getElementById('empty-state');
        this.chartEmpty = document.getElementById('chart-empty');
        this.filterSelect = document.getElementById('filter-type');
        this.periodSelect = document.getElementById('filter-period-global'); // Global in topbar

        // View-specific elements
        this.searchInput = document.getElementById('search-input');

        this.importInput = document.getElementById('import-file');
        this.exportBtn = document.getElementById('export-btn');

        this.totalIncome = document.getElementById('total-income');
        this.totalExpense = document.getElementById('total-expense');
        this.totalBalance = document.getElementById('total-balance');

        this.chartCanvas = document.getElementById('category-chart');
        this.monthlyChartCanvas = document.getElementById('monthly-chart');
        this.monthlyChartEmpty = document.getElementById('monthly-chart-empty');

        this.topExpensesList = document.getElementById('top-expenses-list');



        this.categoriesModal = document.getElementById('categories-modal');
        this.categoriesList = document.getElementById('categories-list');
        this.addCategoryForm = document.getElementById('add-category-form');
        this.categoriesClose = document.getElementById('categories-close');

        // Inspector
        this.appShell = document.getElementById('app-shell');
        this.inspectorContent = document.getElementById('inspector-content');

        // New Elements
        this.btnNewTransaction = document.getElementById('btn-new-transaction');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.sidebar = document.getElementById('sidebar');
    }

    initEventListeners() {
        // Navigation Logic
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Use optional chaining or element check before adding listeners
        if (this.form) this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.addCategoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        this.categoriesClose.addEventListener('click', () => this.hideCategoriesModal());

        window.addEventListener('click', (e) => {
            // if (e.target === this.editModal) this.hideEditModal(); // removed
            if (e.target === this.categoriesModal) this.hideCategoriesModal();
        });

        this.filterSelect.addEventListener('change', (e) => {
            this.fm.currentFilter = e.target.value;
            this.renderTransactions();
        });

        this.periodSelect.addEventListener('change', (e) => {
            this.fm.currentPeriod = e.target.value;
            this.renderTransactions();
        });

        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.fm.searchQuery = e.target.value.trim();
                this.renderTransactions();
            }, 300);
        });

        this.exportBtn.addEventListener('click', () => {
            CSVHandler.exportToCSV(this.fm.transactions);
        });

        this.importInput.addEventListener('change', (e) => this.handleImport(e));

        // this.editForm is gone, dynamic handling inspector listener is attached in renderEditTransactionInspector
        // but global click close?
        // if (e.target.classList.contains('inspector-overlay')?? no overlay, just side panel)


        const restoreInput = document.getElementById('restore-file');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => this.handleRestore(e));
        }

        const backupBtn = document.getElementById('backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.handleBackup());
        }

        const reportBtn = document.getElementById('report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => generatePDF(this.fm));
        }

        this.initKeyboardShortcuts();

        // New Listeners
        if (this.btnNewTransaction) {
            this.btnNewTransaction.addEventListener('click', () => {
                this.openInspector('new-transaction');
            });
        }

        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('active');
            });
        }

        // Close sidebar when clicking a nav item on mobile
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.sidebar.classList.remove('active');
                }
            });
        });
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if (e.key === 'Escape') {
                if (this.appShell.classList.contains('inspector-open')) this.closeInspector();
                if (!this.categoriesModal.hidden) this.hideCategoriesModal();
                return;
            }

            if (e.ctrlKey && e.key === 'Enter') {
                if (this.appShell.classList.contains('inspector-open')) {
                    // Trigger submit on inspector form
                    const form = document.getElementById('inspector-edit-form');
                    if (form) form.dispatchEvent(new Event('submit'));
                    return;
                }
                if (!this.categoriesModal.hidden) {
                    this.handleCategorySubmit(e);
                    return;
                }
                this.handleFormSubmit(e);
                return;
            }

            if (e.key.toLowerCase() === 'n' && !isInput) {
                e.preventDefault();
                document.getElementById('type').focus();
                return;
            }

            if (e.key === '/' && !isInput) {
                e.preventDefault();
                this.searchInput.focus();
                return;
            }
        });
    }

    setDefaultDate() {
        const dateInput = document.getElementById('date');
        dateInput.value = new Date().toISOString().split('T')[0];
    }

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

    // Inspector System
    openInspector(type, data) {
        this.appShell.classList.add('inspector-open');

        switch (type) {
            case 'edit-transaction':
                this.renderEditTransactionInspector(data);
                break;
            case 'new-transaction':
                this.renderNewTransactionInspector();
                break;
            default:
                this.inspectorContent.innerHTML = '<p class="text-muted">Selecione um item</p>';
        }
    }

    closeInspector() {
        this.appShell.classList.remove('inspector-open');
        // Clear content after animation?
        setTimeout(() => {
            if (!this.appShell.classList.contains('inspector-open')) {
                this.inspectorContent.innerHTML = '<p class="text-muted" style="text-align: center; margin-top: 2rem;">Selecione um item para ver detalhes</p>';
            }
        }, 300);
    }

    renderEditTransactionInspector(id) {
        const transaction = this.fm.getTransaction(id);
        if (!transaction) return;

        const isExpense = transaction.type === 'expense';
        const isIncome = transaction.type === 'income';

        this.inspectorContent.innerHTML = `
            <div class="inspector-form-container">
                <form id="inspector-edit-form" class="inspector-form">
                    <input type="hidden" name="id" value="${transaction.id}">
                    
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" id="inspector-edit-type" class="form-control">
                           <option value="expense" ${isExpense ? 'selected' : ''}>Despesa</option>
                           <option value="income" ${isIncome ? 'selected' : ''}>Receita</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" class="form-control" value="${escapeHtml(transaction.description)}" required>
                    </div>

                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" name="amount" class="form-control" step="0.01" value="${transaction.amount}" required>
                    </div>

                    <div class="form-group">
                        <label>Categoria</label>
                        <select name="category" id="inspector-edit-category" class="form-control">
                            <!-- Populated via JS -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Conta / Origem</label>
                        <input type="text" name="account" class="form-control" value="${escapeHtml(transaction.account || '')}">
                    </div>

                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" name="date" class="form-control" value="${transaction.date}" required>
                    </div>

                    <div class="form-actions-inspector">
                         <button type="submit" class="btn btn-primary btn-block">Salvar Alterações</button>
                         <button type="button" class="btn btn-secondary btn-block" onclick="ui.closeInspector()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        // Populate Categories
        this.populateCategorySelects();
        // Set value after population (since populate resets it)
        const catSelect = document.getElementById('inspector-edit-category');
        if (catSelect) catSelect.value = transaction.category;

        // Attach listener
        document.getElementById('inspector-edit-form').addEventListener('submit', (e) => this.handleEditSubmit(e));
    }

    renderNewTransactionInspector() {
        this.inspectorContent.innerHTML = `
            <div class="inspector-form-container">
                <h3>Nova Transação</h3>
                <form id="inspector-new-form" class="inspector-form">
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" id="inspector-new-type" class="form-control">
                           <option value="expense" selected>Despesa</option>
                           <option value="income">Receita</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" class="form-control" placeholder="Ex: Mercado" required>
                    </div>

                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" name="amount" class="form-control" step="0.01" min="0.01" placeholder="0,00" required>
                    </div>

                    <div class="form-group">
                        <label>Categoria</label>
                        <select name="category" id="inspector-new-category" class="form-control">
                            <!-- Populated via JS -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Conta / Origem</label>
                        <input type="text" name="account" class="form-control" placeholder="Ex: NuBank">
                    </div>

                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" name="date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>

                    <div class="form-actions-inspector">
                         <button type="submit" class="btn btn-primary btn-block">Adicionar</button>
                         <button type="button" class="btn btn-secondary btn-block" onclick="ui.closeInspector()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        this.populateCategorySelects();

        // Target specific category select for new transaction if needed, but populateCategorySelects handles IDs 'category', 'edit-category', 'inspector-edit-category'.
        // We added 'inspector-new-category' in HTML, but need to update populateCategorySelects or manually populate here.
        // Let's update populateCategorySelects to include 'inspector-new-category'

        document.getElementById('inspector-new-form').addEventListener('submit', (e) => this.handleNewTransactionSubmit(e));
    }

    handleNewTransactionSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

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
        showToast('Transação adicionada!', 'success');
        this.closeInspector();
        this.render();
    }

    handleDelete(id) {
        if (this.fm.deleteTransaction(id)) {
            this.render();
            showToast('Transação excluída', 'success');
        }
    }

    showEditModal(id) {
        // Legacy support redirected to inspector
        this.openInspector('edit-transaction', id);
    }

    hideEditModal() {
        this.closeInspector();
    }

    handleEditSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
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
            // this.hideEditModal(); // Use closeInspector
            this.closeInspector();
            this.render();
            showToast('Transação atualizada!', 'success');
        }
    }

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
        e.target.value = '';
    }

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
                    this.fm.transactions = data.transactions;
                    if (data.categories && Array.isArray(data.categories)) {
                        this.fm.categories = data.categories;
                    }

                    this.fm.saveToStorage();
                    this.fm.saveCategories();

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
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    populatePeriodFilter() {
        const periods = new Set();
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        this.fm.transactions.forEach(t => {
            if (t.date) {
                const period = t.date.substring(0, 7);
                periods.add(period);
            }
        });

        const sortedPeriods = Array.from(periods).sort().reverse();
        const currentValue = this.periodSelect.value;

        let options = '<option value="all">Todos os períodos</option>';
        sortedPeriods.forEach(period => {
            const [year, month] = period.split('-');
            const monthName = monthNames[parseInt(month) - 1];
            const label = `${monthName} ${year}`;
            options += `<option value="${period}">${label}</option>`;
        });

        this.periodSelect.innerHTML = options;

        if (sortedPeriods.includes(currentValue) || currentValue === 'all') {
            this.periodSelect.value = currentValue;
        }
    }

    render() {
        this.populateCategorySelects();
        this.populatePeriodFilter();
        this.renderSummary();
        this.renderTransactions();
        this.renderChart();
        this.renderMonthlyChart();
        this.renderTopExpenses();
    }

    renderSummary() {
        const totals = this.fm.getTotals();

        this.totalIncome.textContent = formatCurrency(totals.income);
        this.totalExpense.textContent = formatCurrency(totals.expense);
        this.totalBalance.textContent = formatCurrency(totals.balance);

        const balanceCard = document.querySelector('.summary-card.balance .card-value');
        if (totals.balance < 0) {
            balanceCard.style.color = 'var(--expense-color)';
        } else {
            balanceCard.style.color = 'var(--balance-color)';
        }
    }

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
                <td>${formatDate(t.date)}</td>
                <td>${escapeHtml(t.description)}</td>
                <td><span class="category-tag">${escapeHtml(t.category)}</span></td>
                <td>${escapeHtml(t.account || '-')}</td>
                <td class="amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="ui.openInspector('edit-transaction', '${t.id}')" title="Editar">
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

        const entries = Object.entries(expenses).sort((a, b) => b[1] - a[1]);

        let finalLabels = [];
        let finalData = [];

        if (entries.length > 5) {
            const top5 = entries.slice(0, 5);
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
                backgroundColor: generateColors(finalLabels.length),
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
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${formatCurrency(value)} (${percentage}%)`;
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
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: data.expenses,
                    borderColor: '#ef4444',
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
                    labels: { color: '#a0a0b0', usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#6a6a7a',
                        callback: (value) => value >= 1000 ? 'R$ ' + (value / 1000).toFixed(1) + 'k' : value
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#6a6a7a' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
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
                        ${formatCurrency(item.amount)}
                    </span>
                </div>
                <div class="expense-bar-bg">
                    <div class="expense-bar-fill" style="width: ${item.percentage}%"></div>
                </div>
            </div>
        `).join('');
    }

    getCategoryIcon(categoryName) {
        const category = this.fm.categories.find(c => c.name === categoryName);
        return category ? category.icon : '📦';
    }

    populateCategorySelects() {
        const selectIds = ['category', 'edit-category', 'inspector-edit-category', 'inspector-new-category'];

        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const currentVal = select.value;
            select.innerHTML = '';

            const incomes = this.fm.categories.filter(c => c.type === 'income');
            const expenses = this.fm.categories.filter(c => c.type === 'expense');

            const sortByName = (a, b) => a.name.localeCompare(b.name);
            incomes.sort(sortByName);
            expenses.sort(sortByName);

            incomes.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = `${cat.icon} ${cat.name}`;
                select.appendChild(opt);
            });

            expenses.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = `${cat.icon} ${cat.name}`;
                select.appendChild(opt);
            });

            if (currentVal && this.fm.categories.some(c => c.name === currentVal)) {
                select.value = currentVal;
            }
        });
    }

    showCategoriesModal() {
        this.renderCategoriesList();
        this.categoriesModal.hidden = false;
    }

    hideCategoriesModal() {
        this.categoriesModal.hidden = true;
        this.addCategoryForm.reset();
    }

    renderCategoriesList() {
        if (this.fm.categories.length === 0) {
            this.categoriesList.innerHTML = '<p class="empty-hint">Nenhuma categoria encontrada.</p>';
            return;
        }

        const sorted = [...this.fm.categories].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        this.categoriesList.innerHTML = sorted.map(cat => `
            <div class="category-item">
                <div class="category-info">
                    <span class="category-icon">${cat.icon}</span>
                    <span class="category-name">${escapeHtml(cat.name)}</span>
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

    handleDeleteCategory(id) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            if (this.fm.deleteCategory(id)) {
                this.renderCategoriesList();
                this.populateCategorySelects();
                this.render();
                showToast('Categoria excluída!', 'success');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    handleCategorySubmit(e) {
        e.preventDefault();

        const name = document.getElementById('new-cat-name').value.trim();
        const icon = document.getElementById('new-cat-icon').value;
        const type = document.getElementById('new-cat-type').value;

        if (!name) {
            showToast('Nome da categoria é obrigatório', 'error');
            return;
        }

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
}
