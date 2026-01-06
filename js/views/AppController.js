/**
 * AppController - Main Application Controller
 * Coordinates views, manages navigation, and handles global functionality
 */

import { eventBus, Events } from '../services/EventBus.js';
import { DashboardView } from './DashboardView.js';
import { TransactionsView } from './TransactionsView.js';
import { CategoriesView } from './CategoriesView.js';
import { DataView } from './DataView.js';
import { ReportsView } from './ReportsView.js';
import { showToast } from '../utils/toast.js';
import { formatCurrency, escapeHtml } from '../utils/helpers.js';
import { validateTransaction, showFormErrors, clearFormErrors } from '../utils/validators.js';

export class AppController {
    constructor(financeManager) {
        this.fm = financeManager;
        this.currentView = null;
        this.views = {};
        this.privacyMode = false;

        this.init();
    }

    init() {
        this.cacheElements();
        this.initViews();
        this.bindEvents();
        this.switchView('dashboard');
        this.populatePeriodFilter();
        this.populateCategorySelects();
    }

    cacheElements() {
        this.appShell = document.getElementById('app-shell');
        this.navItems = document.querySelectorAll('.nav-item');
        this.pageTitle = document.getElementById('page-title');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.periodSelect = document.getElementById('filter-period-global');
        this.privacyToggle = document.getElementById('toggle-privacy');
        this.btnNewTransaction = document.getElementById('btn-new-transaction');
        this.globalSearchInput = document.getElementById('global-search-input');
        this.inspectorContent = document.getElementById('inspector-content');
        this.inspectorCloseBtn = document.querySelector('.inspector-close');
    }

    initViews() {
        const inspectorManager = {
            openEditTransaction: (id) => this.openInspector('edit-transaction', id),
            openNewTransaction: () => this.openInspector('new-transaction')
        };

        this.views = {
            dashboard: new DashboardView(this.fm),
            transactions: new TransactionsView(this.fm, inspectorManager),
            categories: new CategoriesView(this.fm),
            data: new DataView(this.fm),
            reports: new ReportsView(this.fm)
        };

        Object.values(this.views).forEach(view => view.init());
    }

    bindEvents() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = item.dataset.view;
                this.switchView(viewName);

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    this.sidebar.classList.remove('active');
                }
            });
        });

        // Sidebar toggle (mobile)
        this.sidebarToggle?.addEventListener('click', () => {
            this.sidebar.classList.toggle('active');
        });

        // Period filter
        this.periodSelect?.addEventListener('change', (e) => {
            this.handlePeriodChange(e.target.value);
        });

        // Privacy toggle
        this.privacyToggle?.addEventListener('click', () => {
            this.togglePrivacy();
        });

        // New transaction button
        this.btnNewTransaction?.addEventListener('click', () => {
            this.openInspector('new-transaction');
        });

        // Global search
        let searchTimeout;
        this.globalSearchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleGlobalSearch(e.target.value);
            }, 300);
        });

        // Inspector close
        this.inspectorCloseBtn?.addEventListener('click', () => {
            this.closeInspector();
        });

        // Keyboard shortcuts
        this.initKeyboardShortcuts();

        // Event subscriptions
        eventBus.on(Events.CATEGORY_CHANGED, () => this.populateCategorySelects());
        eventBus.on(Events.DATA_IMPORTED, () => this.populatePeriodFilter());
        eventBus.on(Events.DATA_RESET, () => {
            this.populatePeriodFilter();
            this.populateCategorySelects();
        });
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if (e.key === 'Escape') {
                if (this.appShell.classList.contains('inspector-open')) {
                    this.closeInspector();
                }
                return;
            }

            if (e.ctrlKey && e.key === 'Enter') {
                if (this.appShell.classList.contains('inspector-open')) {
                    const form = document.getElementById('inspector-edit-form') ||
                        document.getElementById('inspector-new-form');
                    if (form) form.dispatchEvent(new Event('submit'));
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.globalSearchInput?.focus();
                return;
            }

            if (e.key.toLowerCase() === 'n' && !isInput) {
                e.preventDefault();
                this.openInspector('new-transaction');
                return;
            }
        });
    }

    switchView(viewName) {
        // Deactivate current view
        if (this.currentView && this.views[this.currentView]) {
            this.views[this.currentView].deactivate();
        }

        // Update DOM
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');

            const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
            if (navItem) navItem.classList.add('active');
        }

        // Update title
        const titleMap = {
            dashboard: 'Dashboard',
            transactions: 'Transações',
            categories: 'Categorias',
            financing: 'Financiamentos',
            reports: 'Relatórios',
            data: 'Gerenciar Dados'
        };
        this.pageTitle.textContent = titleMap[viewName] || 'Finance';

        // Activate new view
        this.currentView = viewName;
        if (this.views[viewName]) {
            this.views[viewName].activate();
        }

        eventBus.emit(Events.VIEW_CHANGED, { view: viewName });
    }

    handlePeriodChange(value) {
        if (value === 'month') {
            const now = new Date();
            this.fm.currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        } else if (value === '90days') {
            this.fm.currentPeriod = 'all'; // Simplified for now
        } else if (value === 'custom') {
            // Could open a date picker modal
            showToast('Filtro personalizado em desenvolvimento', 'info');
            return;
        } else {
            this.fm.currentPeriod = value;
        }

        eventBus.emit(Events.PERIOD_CHANGED, { period: this.fm.currentPeriod });
    }

    togglePrivacy() {
        this.privacyMode = !this.privacyMode;
        document.body.classList.toggle('privacy-mode', this.privacyMode);

        const icon = this.privacyToggle.textContent.includes('👁️') ? '🙈' : '👁️';
        this.privacyToggle.textContent = icon;

        eventBus.emit(Events.PRIVACY_TOGGLED, { enabled: this.privacyMode });
        showToast(this.privacyMode ? 'Modo privacidade ativado' : 'Modo privacidade desativado', 'success');
    }

    handleGlobalSearch(query) {
        this.fm.searchQuery = query.trim();

        // Switch to transactions view for search results
        if (query.trim() && this.currentView !== 'transactions') {
            this.switchView('transactions');
        }

        eventBus.emit(Events.FILTER_CHANGED, { query });
    }

    populatePeriodFilter() {
        if (!this.periodSelect) return;

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

        let options = `
            <option value="month">Este Mês</option>
            <option value="90days">Últimos 90 dias</option>
            <option value="all">Todos os períodos</option>
        `;

        if (sortedPeriods.length > 0) {
            options += '<option disabled>──────────</option>';
            sortedPeriods.forEach(period => {
                const [year, month] = period.split('-');
                const monthName = monthNames[parseInt(month) - 1];
                const label = `${monthName} ${year}`;
                options += `<option value="${period}">${label}</option>`;
            });
        }

        this.periodSelect.innerHTML = options;

        if (currentValue) {
            this.periodSelect.value = currentValue;
        }
    }

    populateCategorySelects() {
        const selectIds = ['category', 'edit-category', 'inspector-edit-category', 'inspector-new-category', 'filter-category'];

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

            if (id === 'filter-category') {
                const allOpt = document.createElement('option');
                allOpt.value = 'all';
                allOpt.textContent = 'Todas as Categorias';
                select.appendChild(allOpt);
            }

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

    // Inspector Panel Methods
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
        setTimeout(() => {
            if (!this.appShell.classList.contains('inspector-open')) {
                this.inspectorContent.innerHTML = '<p class="text-muted" style="text-align: center; margin-top: 2rem;">Selecione um item para ver detalhes</p>';
            }
        }, 300);
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
                         <button type="button" class="btn btn-secondary btn-block" id="inspector-cancel">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        this.populateCategorySelects();

        const form = document.getElementById('inspector-new-form');
        form?.addEventListener('submit', (e) => this.handleNewTransactionSubmit(e));

        document.getElementById('inspector-cancel')?.addEventListener('click', () => this.closeInspector());
    }

    renderEditTransactionInspector(id) {
        const transaction = this.fm.getTransaction(id);
        if (!transaction) return;

        const isExpense = transaction.type === 'expense';
        const isIncome = transaction.type === 'income';

        this.inspectorContent.innerHTML = `
            <div class="inspector-form-container">
                <h3>Editar Transação</h3>
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
                         <button type="button" class="btn btn-secondary btn-block" id="inspector-cancel">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        this.populateCategorySelects();

        const catSelect = document.getElementById('inspector-edit-category');
        if (catSelect) catSelect.value = transaction.category;

        const form = document.getElementById('inspector-edit-form');
        form?.addEventListener('submit', (e) => this.handleEditSubmit(e));

        document.getElementById('inspector-cancel')?.addEventListener('click', () => this.closeInspector());
    }

    handleNewTransactionSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const rawTransaction = {
            type: formData.get('type'),
            amount: formData.get('amount'),
            description: formData.get('description'),
            category: formData.get('category'),
            account: formData.get('account') || '',
            date: formData.get('date')
        };

        const validation = validateTransaction(rawTransaction);

        if (!validation.valid) {
            showFormErrors(validation.errors, form);
            const firstError = Object.values(validation.errors)[0];
            showToast(firstError, 'error');
            return;
        }

        clearFormErrors(form);
        this.fm.addTransaction(validation.data);
        eventBus.emit(Events.TRANSACTION_ADDED, validation.data);
        showToast('Transação adicionada!', 'success');
        this.closeInspector();
    }

    handleEditSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const id = formData.get('id');

        const rawUpdates = {
            type: formData.get('type'),
            amount: formData.get('amount'),
            description: formData.get('description'),
            category: formData.get('category'),
            account: formData.get('account') || '',
            date: formData.get('date')
        };

        const validation = validateTransaction(rawUpdates);

        if (!validation.valid) {
            showFormErrors(validation.errors, form);
            const firstError = Object.values(validation.errors)[0];
            showToast(firstError, 'error');
            return;
        }

        clearFormErrors(form);
        if (this.fm.updateTransaction(id, validation.data)) {
            eventBus.emit(Events.TRANSACTION_UPDATED, { id, ...validation.data });
            this.closeInspector();
            showToast('Transação atualizada!', 'success');
        }
    }
}
