/**
 * Financing UI Controller
 * Handles rendering and events for the financing module
 */

import { FinancingManager } from '../models/FinancingManager.js';
import { simulateExtraAmortization } from '../utils/amortization.js';
import { showToast } from '../utils/toast.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

export class FinancingUI {
    constructor() {
        this.fm = new FinancingManager();
        this.currentFinancingId = null;
    }

    /**
     * Initialize the financing UI
     */
    init() {
        this.initElements();
        this.initEventListeners();
        this.render();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        // Main section
        this.financingSection = document.getElementById('financing-section');
        this.financingsList = document.getElementById('financings-list');
        this.financingSummary = document.getElementById('financing-summary');

        // Add financing modal
        this.addFinancingModal = document.getElementById('add-financing-modal');
        this.addFinancingForm = document.getElementById('add-financing-form');
        this.addFinancingClose = document.getElementById('add-financing-close');

        // Amortization table modal
        this.amortizationModal = document.getElementById('amortization-modal');
        this.amortizationTable = document.getElementById('amortization-table-body');
        this.amortizationClose = document.getElementById('amortization-close');
        this.amortizationTitle = document.getElementById('amortization-title');

        // Extra Amortization Modal
        this.extraAmortizationModal = document.getElementById('extra-amortization-modal');
        this.extraForm = document.getElementById('extra-amortization-form');
        this.extraClose = document.getElementById('extra-amortization-close');
        this.simulationResult = document.getElementById('simulation-result');

        // Scenario Comparison Modal
        this.scenarioModal = document.getElementById('scenario-modal');
        this.scenarioGrid = document.getElementById('scenario-results');
        this.scenarioClose = this.scenarioModal?.querySelector('.close-modal');
        this.btnSimulateScenarios = document.getElementById('btn-simulate-scenarios');
        this.scenarioAmountInput = document.getElementById('scenario-amount');

        // Edit Financing Modal
        this.editFinancingModal = document.getElementById('edit-financing-modal');
        this.editFinancingForm = document.getElementById('edit-financing-form');
        this.editFinancingClose = document.getElementById('edit-financing-close');
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add financing button
        const addBtn = document.getElementById('add-financing-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Add financing form
        if (this.addFinancingForm) {
            this.addFinancingForm.addEventListener('submit', (e) => this.handleAddFinancing(e));
        }

        // Close modals
        if (this.addFinancingClose) {
            this.addFinancingClose.addEventListener('click', () => this.hideAddModal());
        }
        if (this.amortizationClose) {
            this.amortizationClose.addEventListener('click', () => this.hideAmortizationModal());
        }
        if (this.extraClose) {
            this.extraClose.addEventListener('click', () => this.hideExtraModal());
        }

        // Extra Amortization Form
        if (this.extraForm) {
            // Real-time simulation
            const inputs = this.extraForm.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('change', () => this.handleSimulateExtra());
                if (input.type === 'number') input.addEventListener('keyup', () => this.handleSimulateExtra());
            });

            this.extraForm.addEventListener('submit', (e) => this.handleApplyExtra(e));
        }

        // Close on overlay click
        window.addEventListener('click', (e) => {
            if (e.target === this.addFinancingModal) this.hideAddModal();
            if (e.target === this.amortizationModal) this.hideAmortizationModal();
            if (e.target === this.extraAmortizationModal) this.hideExtraModal();
            if (e.target === this.scenarioModal) this.hideScenarioModal();
            if (e.target === this.editFinancingModal) this.hideEditModal();
        });

        // Scenario listeners
        if (this.scenarioClose) {
            this.scenarioClose.addEventListener('click', () => this.hideScenarioModal());
        }
        if (this.btnSimulateScenarios) {
            this.btnSimulateScenarios.addEventListener('click', () => this.handleSimulateScenarios());
        }
        if (this.scenarioAmountInput) {
            this.scenarioAmountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSimulateScenarios();
            });
        }

        // Edit Financing listeners
        if (this.editFinancingClose) {
            this.editFinancingClose.addEventListener('click', () => this.hideEditModal());
        }
        if (this.editFinancingForm) {
            this.editFinancingForm.addEventListener('submit', (e) => this.handleEditFinancing(e));
        }
    }

    /**
     * Render all financing components
     */
    render() {
        this.renderSummary();
        this.renderFinancingsList();
    }

    /**
     * Render summary cards
     */
    renderSummary() {
        if (!this.financingSummary) return;

        const financings = this.fm.getAllFinancings();
        const totalBalance = this.fm.getTotalRemainingBalance();
        const overdueCount = this.fm.getOverdueCount();
        const upcoming = this.fm.getUpcomingInstallments(3);

        this.financingSummary.innerHTML = `
            <div class="financing-summary-cards">
                <div class="summary-card">
                    <div class="card-icon">🏦</div>
                    <div class="card-content">
                        <span class="card-label">Financiamentos Ativos</span>
                        <span class="card-value">${financings.length}</span>
                    </div>
                </div>
                <div class="summary-card expense">
                    <div class="card-icon">💳</div>
                    <div class="card-content">
                        <span class="card-label">Saldo Devedor Total</span>
                        <span class="card-value">${formatCurrency(totalBalance)}</span>
                    </div>
                </div>
                ${overdueCount > 0 ? `
                <div class="summary-card" style="border-left-color: var(--expense-color);">
                    <div class="card-icon">⚠️</div>
                    <div class="card-content">
                        <span class="card-label">Parcelas Atrasadas</span>
                        <span class="card-value" style="color: var(--expense-color);">${overdueCount}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            ${upcoming.length > 0 ? `
            <div class="upcoming-installments">
                <h4>📅 Próximas Parcelas</h4>
                <div class="upcoming-list">
                    ${upcoming.map(i => `
                        <div class="upcoming-item ${i.status}">
                            <div class="upcoming-info">
                                <span class="upcoming-name">${i.financingName}</span>
                                <span class="upcoming-number">Parcela ${i.number}</span>
                            </div>
                            <div class="upcoming-details">
                                <span class="upcoming-date">${formatDate(i.dueDate)}</span>
                                <span class="upcoming-amount">${formatCurrency(i.payment)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    /**
     * Render financings list
     */
    renderFinancingsList() {
        if (!this.financingsList) return;

        const financings = this.fm.getAllFinancings();

        if (financings.length === 0) {
            this.financingsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏠</div>
                    <p>Nenhum financiamento cadastrado</p>
                    <p class="empty-hint">Clique em "Novo Financiamento" para adicionar</p>
                </div>
            `;
            return;
        }

        this.financingsList.innerHTML = financings.map(f => {
            const summary = this.fm.getFinancingSummary(f.id);
            const typeIcons = { house: '🏠', vehicle: '🚗', other: '📋' };

            return `
                <div class="financing-card" data-id="${f.id}">
                    <div class="financing-header">
                        <div class="financing-title">
                            <span class="financing-icon">${typeIcons[f.type] || '📋'}</span>
                            <h4>${f.name}</h4>
                        </div>
                        <div class="financing-actions">
                            <button class="btn btn-secondary btn-sm" onclick="financingUI.showAmortizationTable('${f.id}')" title="Ver Tabela">
                                📊 Tabela
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="financingUI.showExtraModal('${f.id}')" title="Amortizar Extra">
                                💰 Amortizar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="financingUI.showScenarioModal('${f.id}')" title="Simular Cenários">
                                ⚖️ Comparar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="financingUI.showEditModal('${f.id}')" title="Editar">
                                ✏️
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="financingUI.deleteFinancing('${f.id}')" title="Excluir">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="financing-info">
                        <div class="info-row">
                            <span>Principal:</span>
                            <strong>${formatCurrency(f.principal)}</strong>
                        </div>
                        <div class="info-row">
                            <span>Taxa:</span>
                            <strong>${f.annualRate}% a.a. (${f.system})</strong>
                        </div>
                        <div class="info-row">
                            <span>Prazo:</span>
                            <strong>${f.termMonths} meses</strong>
                        </div>
                        <div class="info-row">
                            <span>Saldo Devedor:</span>
                            <strong style="color: var(--expense-color);">${formatCurrency(summary.remainingBalance)}</strong>
                        </div>
                    </div>
                    <div class="financing-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${summary.progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${summary.paidCount}/${f.termMonths} parcelas pagas (${summary.progressPercent}%)</span>
                    </div>
                    <div class="financing-status">
                        <span class="status-badge paid">🟢 ${summary.paidCount} pagas</span>
                        <span class="status-badge pending">🟡 ${summary.pendingCount} pendentes</span>
                        ${summary.overdueCount > 0 ? `<span class="status-badge overdue">🔴 ${summary.overdueCount} atrasadas</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Show add financing modal
     */
    showAddModal() {
        if (this.addFinancingModal) {
            // Set default date to today
            const dateInput = document.getElementById('financing-start-date');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            this.addFinancingModal.classList.remove('hidden');
        }
    }

    /**
     * Hide add financing modal
     */
    hideAddModal() {
        if (this.addFinancingModal) {
            this.addFinancingModal.classList.add('hidden');
            this.addFinancingForm?.reset();
        }
    }

    /**
     * Show edit financing modal
     */
    showEditModal(financingId) {
        const financing = this.fm.getFinancing(financingId);
        if (!financing) return;

        this.currentFinancingId = financingId;

        // Fill form fields
        document.getElementById('edit-financing-id').value = financing.id;
        document.getElementById('edit-financing-name').value = financing.name;
        document.getElementById('edit-financing-type').value = financing.type;
        document.getElementById('edit-financing-system').value = financing.system.toUpperCase();
        document.getElementById('edit-financing-principal').value = `R$ ${financing.principal.toLocaleString('pt-BR')}`;
        document.getElementById('edit-financing-rate').value = `${financing.annualRate}%`;
        document.getElementById('edit-financing-term').value = `${financing.termMonths} meses`;
        document.getElementById('edit-financing-start').value = financing.startDate;

        if (this.editFinancingModal) {
            this.editFinancingModal.classList.remove('hidden');
        }
    }

    /**
     * Hide edit financing modal
     */
    hideEditModal() {
        if (this.editFinancingModal) {
            this.editFinancingModal.classList.add('hidden');
            this.currentFinancingId = null;
        }
    }

    /**
     * Handle edit financing form submit
     */
    handleEditFinancing(e) {
        e.preventDefault();

        const formData = new FormData(this.editFinancingForm);
        const id = formData.get('id');
        const updates = {
            name: formData.get('name'),
            type: formData.get('type')
        };

        if (!updates.name) {
            showToast('Nome é obrigatório', 'error');
            return;
        }

        try {
            if (this.fm.updateFinancing(id, updates)) {
                this.hideEditModal();
                this.render();
                showToast('Financiamento atualizado!', 'success');
            }
        } catch (error) {
            showToast('Erro ao atualizar: ' + error.message, 'error');
        }
    }

    /**
     * Handle add financing form submit
     */
    handleAddFinancing(e) {
        e.preventDefault();

        const formData = new FormData(this.addFinancingForm);
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            principal: parseFloat(formData.get('principal')),
            annualRate: parseFloat(formData.get('annualRate')),
            termMonths: parseInt(formData.get('termMonths')),
            system: formData.get('system'),
            cetRate: formData.get('cetRate') ? parseFloat(formData.get('cetRate')) : null,
            startDate: formData.get('startDate'),
            paidInstallments: parseInt(formData.get('paidInstallments')) || 0,
            anticipatedInstallments: parseInt(formData.get('anticipatedInstallments')) || 0
        };

        // Validation
        if (!data.name || !data.principal || !data.annualRate || !data.termMonths || !data.startDate) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (data.principal <= 0) {
            showToast('Valor principal deve ser maior que zero', 'error');
            return;
        }

        try {
            this.fm.addFinancing(data);
            this.hideAddModal();
            this.render();
            showToast('Financiamento cadastrado com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao cadastrar: ' + error.message, 'error');
        }
    }

    /**
     * Show amortization table modal
     */
    showAmortizationTable(financingId) {
        const financing = this.fm.getFinancing(financingId);
        if (!financing) return;

        this.currentFinancingId = financingId;

        if (this.amortizationTitle) {
            this.amortizationTitle.textContent = `Tabela de Amortização - ${financing.name}`;
        }

        if (this.amortizationTable) {
            this.amortizationTable.innerHTML = financing.installments.map(i => {
                const statusClass = i.status;
                const statusIcon = { paid: '🟢', pending: '🟡', overdue: '🔴' }[i.status];

                return `
                    <tr class="${statusClass}">
                        <td>${i.number}</td>
                        <td>${formatDate(i.dueDate)}</td>
                        <td>${formatCurrency(i.principal)}</td>
                        <td>${formatCurrency(i.interest)}</td>
                        <td><strong>${formatCurrency(i.payment)}</strong></td>
                        <td>${formatCurrency(i.balance)}</td>
                        <td>
                            <span class="status-icon">${statusIcon}</span>
                            ${i.status === 'pending' || i.status === 'overdue' ?
                        `<button class="btn btn-sm btn-primary" onclick="financingUI.markAsPaid('${financingId}', ${i.number})">
                                    Pagar
                                </button>` :
                        (i.paidDate ? formatDate(i.paidDate) : 'Pago')
                    }
                        </td>
                    </tr>
                `;
            }).join('');
        }

        if (this.amortizationModal) {
            this.amortizationModal.classList.remove('hidden');
        }
    }

    /**
     * Hide amortization modal
     */
    hideAmortizationModal() {
        if (this.amortizationModal) {
            this.amortizationModal.classList.add('hidden');
            this.currentFinancingId = null;
        }
    }

    /**
     * Mark installment as paid with optional transaction creation
     */
    markAsPaid(financingId, installmentNumber) {
        const financing = this.fm.getFinancing(financingId);
        const installment = financing.installments.find(i => i.number === installmentNumber);

        if (!installment) return;

        // Confirm
        if (!confirm(`Confirmar pagamento da parcela ${installmentNumber} no valor de ${formatCurrency(installment.payment)}?`)) return;

        // Ask to create transaction
        if (confirm('Deseja criar uma despesa associada a este pagamento?')) {
            try {
                // Use global finance manager (fm)
                if (window.fm) {
                    const transaction = window.fm.addTransaction({
                        type: 'expense',
                        amount: installment.payment,
                        category: 'Financiamento',
                        description: `Pagamento Parcela ${installment.number}/${financing.termMonths} - ${financing.name}`,
                        date: new Date().toISOString().split('T')[0],
                        account: 'Tabela' // Optional
                    });

                    // Link transaction ID
                    this.fm.markInstallmentPaid(financingId, installmentNumber, null, transaction.id);

                    // Refresh main UI
                    if (window.ui) {
                        window.ui.render();
                        window.ui.updateSummary(); // If exists
                    }

                    showToast('Parcela paga e despesa criada!', 'success');
                } else {
                    // Fallback if fm not available
                    this.fm.markInstallmentPaid(financingId, installmentNumber);
                    showToast('Parcela marcada como paga (sem despesa vinculada)', 'warning');
                }
            } catch (error) {
                console.error(error);
                showToast('Erro ao criar despesa: ' + error.message, 'error');
            }
        } else {
            // Just mark as paid
            this.fm.markInstallmentPaid(financingId, installmentNumber);
            showToast('Parcela marcada como paga!', 'success');
        }

        this.render();
        this.showAmortizationTable(financingId);
    }

    /**
     * Delete financing
     */
    deleteFinancing(financingId) {
        if (!confirm('Tem certeza que deseja excluir este financiamento?')) return;

        if (this.fm.deleteFinancing(financingId)) {
            this.render();
            showToast('Financiamento excluído!', 'success');
        }
    }

    /**
     * Show Extra Amortization Modal
     */
    showExtraModal(financingId) {
        this.currentFinancingId = financingId;
        const financing = this.fm.getFinancing(financingId);
        if (!financing) return;

        // Reset form
        if (this.extraForm) {
            this.extraForm.reset();
            document.getElementById('extra-financing-name').textContent = financing.name;
        }
        if (this.simulationResult) {
            this.simulationResult.innerHTML = '';
            this.simulationResult.hidden = true;
        }

        if (this.extraAmortizationModal) {
            this.extraAmortizationModal.classList.remove('hidden');
        }
    }

    hideExtraModal() {
        if (this.extraAmortizationModal) {
            this.extraAmortizationModal.classList.add('hidden');
            this.currentFinancingId = null;
        }
    }

    /**
     * Handle Simulation
     */
    handleSimulateExtra() {
        if (!this.currentFinancingId) return;

        const amount = parseFloat(document.getElementById('extra-amount').value);
        const strategy = document.querySelector('input[name="extra-strategy"]:checked').value;

        if (!amount || amount <= 0) {
            this.simulationResult.hidden = true;
            return;
        }

        const financing = this.fm.getFinancing(this.currentFinancingId);
        if (!financing) return;

        // Call logic directly from utils (imported via manager or directly? 
        // Manager doesn't expose simulate directly, but we added logic in manager? 
        // Actually, we imported simulateExtraAmortization in FinancingManager.
        // We should probably expose a simulation method in Manager or import utility here.
        // Since we didn't export it from Manager, let's import it here or add a helper in Manager.
        const result = simulateExtraAmortization(financing, amount, strategy);

        if (result && this.simulationResult) {
            this.simulationResult.hidden = false;
            this.simulationResult.innerHTML = `
                <div class="simulation-box">
                    <h5>Resultado da Simulação</h5>
                    <div class="sim-row">
                        <span>Nova Parcela:</span>
                        <strong>${formatCurrency(result.newInstallments[0].payment)}</strong>
                    </div>
                    <div class="sim-row">
                        <span>Novos Juros:</span>
                        <strong>${formatCurrency(result.newInstallments.reduce((s, i) => s + i.interest, 0))}</strong>
                    </div>
                    <div class="sim-row highlight">
                        <span>Economia Prevista:</span>
                        <strong>${formatCurrency(result.savings.interest)}</strong>
                    </div>
                    <div class="sim-row">
                        <span>Meses Reduzidos:</span>
                        <strong>${result.savings.months} meses</strong>
                    </div>
                </div>
            `;
        }
    }

    /** 
     * Handle Apply Extra Amortization
     */
    handleApplyExtra(e) {
        e.preventDefault();

        if (!this.currentFinancingId) return;

        const amount = parseFloat(document.getElementById('extra-amount').value);
        const strategy = document.querySelector('input[name="extra-strategy"]:checked').value;

        if (!amount || amount <= 0) return;

        /* Confirm action */
        if (!confirm(`Confirma amortização extra de ${formatCurrency(amount)}?`)) return;

        try {
            // 1. Create Transaction (Optional?)
            // Usually extra amortization comes from wallet.
            let transactionId = null;
            if (window.fm && confirm('Deseja lançar isso como despesa de saída?')) {
                const trans = window.fm.addTransaction({
                    type: 'expense',
                    amount: amount,
                    category: 'Financiamento',
                    description: `Amortização Extra - ${document.getElementById('extra-financing-name').textContent}`,
                    date: new Date().toISOString().split('T')[0],
                    account: 'Extra'
                });
                transactionId = trans.id;
            }

            // 2. Apply Logic
            const result = this.fm.applyExtraAmortization(this.currentFinancingId, amount, strategy);

            if (result) {
                showToast(`Amortização aplicada! Novo prazo: ${result.newTerm} meses. Economia: ${formatCurrency(result.savings.interest)}`, 'success');
                this.hideExtraModal();
                this.render();
            }
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, 'error');
        }
    }

    /**
     * Show Scenario Comparison Modal
     */
    showScenarioModal(financingId) {
        this.currentFinancingId = financingId;
        const financing = this.fm.getFinancing(financingId);
        if (!financing) return;

        // Reset
        if (this.scenarioAmountInput) this.scenarioAmountInput.value = '';
        if (this.scenarioGrid) {
            this.scenarioGrid.innerHTML = '';
            this.scenarioGrid.classList.add('hidden');
        }

        if (this.scenarioModal) {
            this.scenarioModal.hidden = false;
            this.scenarioModal.classList.remove('hidden'); // Ensure CSS class is toggled if used
            // If using hidden attribute, standard is enough, but index.html uses class="modal-overlay hidden"
            // So we need to manage the class 'hidden'
            this.scenarioModal.classList.remove('hidden');
        }
    }

    /**
     * Hide Scenario Modal
     */
    hideScenarioModal() {
        if (this.scenarioModal) {
            this.scenarioModal.classList.add('hidden');
            this.currentFinancingId = null;
        }
    }

    /**
     * Handle Scenario Simulation
     */
    handleSimulateScenarios() {
        if (!this.currentFinancingId) return;

        const amount = parseFloat(this.scenarioAmountInput.value);
        if (!amount || amount <= 0) {
            showToast('Digite um valor válido para simulação', 'warning');
            return;
        }

        const financing = this.fm.getFinancing(this.currentFinancingId);
        if (!financing) return;

        // Simulate both strategies
        const resultTerm = simulateExtraAmortization(financing, amount, 'reduce_term');
        const resultPayment = simulateExtraAmortization(financing, amount, 'reduce_payment');

        if (!resultTerm || !resultPayment) {
            showToast('Não há parcelas pendentes para simular', 'error');
            return;
        }

        this.renderScenarioCards(financing, resultTerm, resultPayment, amount);
    }

    /**
     * Render Scenario Comparison Cards
     */
    renderScenarioCards(current, termResult, paymentResult, extraAmount) {
        if (!this.scenarioGrid) return;

        // Calculate Current Stats (Approximation of remaining)
        const pending = current.installments.filter(i => i.status !== 'paid');
        const currentTotal = pending.reduce((sum, i) => sum + i.payment, 0);
        const currentInterest = pending.reduce((sum, i) => sum + i.interest, 0);
        const currentTerm = pending.length;
        const currentLastDate = pending.length > 0 ? pending[pending.length - 1].dueDate : '-';

        const scenarios = [
            {
                title: 'Cenário Atual',
                badge: 'current',
                badgeText: 'Sem alteração',
                term: currentTerm,
                total: currentTotal,
                interest: currentInterest,
                savings: 0,
                savingsTime: 0,
                lastDate: currentLastDate,
                desc: 'Pagamento normal das parcelas restantes.'
            },
            {
                title: 'Reduzir Prazo',
                badge: 'term',
                badgeText: 'Recomendado',
                term: termResult.newTerm,
                total: termResult.newInstallments.reduce((s, i) => s + i.payment, 0),
                interest: termResult.newInstallments.reduce((s, i) => s + i.interest, 0),
                savings: termResult.savings.interest,
                savingsTime: termResult.savings.months,
                lastDate: termResult.newInstallments.length > 0 ? termResult.newInstallments[termResult.newInstallments.length - 1].dueDate : 'Hoje',
                desc: `Antecipa o fim do contrato em ${termResult.savings.months} meses.`,
                highlight: true
            },
            {
                title: 'Reduzir Parcela',
                badge: 'payment',
                badgeText: 'Fluxo de Caixa',
                term: termResult.newTerm, // Usually term is same as original for reduce_payment, but let's check
                // For reduce_payment, term is usually maintained, but re-calculated. 
                // Wait, simulateExtraAmortization for reduce_payment usually keeps the term.
                // Let's check paymentResult
                term: paymentResult.newTerm,
                total: paymentResult.newInstallments.reduce((s, i) => s + i.payment, 0),
                interest: paymentResult.newInstallments.reduce((s, i) => s + i.interest, 0),
                savings: paymentResult.savings.interest,
                savingsTime: paymentResult.savings.months, // Should be 0 usually
                lastDate: paymentResult.newInstallments.length > 0 ? paymentResult.newInstallments[paymentResult.newInstallments.length - 1].dueDate : '-',
                desc: `Reduz parcela mensal para ${formatCurrency(paymentResult.newInstallments[0].payment)}.`,
                highlight: false
            }
        ];

        this.scenarioGrid.innerHTML = scenarios.map(s => `
            <div class="scenario-card ${s.highlight ? 'highlight' : ''}">
                <div class="scenario-header">
                    <h4>${s.title}</h4>
                    <span class="scenario-badge ${s.badge}">${s.badgeText}</span>
                </div>
                <div class="scenario-details">
                    <div class="scenario-item">
                        <span class="label">Total a Pagar:</span>
                        <span class="value">${formatCurrency(s.total)}</span>
                    </div>
                    <div class="scenario-item">
                        <span class="label">Juros Totais:</span>
                        <span class="value">${formatCurrency(s.interest)}</span>
                    </div>
                    <div class="scenario-item">
                        <span class="label">Prazo Restante:</span>
                        <span class="value ${s.savingsTime > 0 ? 'term-change' : ''}">${s.term} meses</span>
                    </div>
                    <div class="scenario-item">
                        <span class="label">Última Parcela:</span>
                        <span class="value">${s.lastDate ? formatDate(s.lastDate) : '-'}</span>
                    </div>
                    ${s.savings > 0 ? `
                    <div class="scenario-item" style="margin-top: 0.5rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
                        <span class="label">Economia:</span>
                        <span class="value saving">${formatCurrency(s.savings)}</span>
                    </div>
                    ` : ''}
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: auto;">
                    ${s.desc}
                </p>
                ${s.savings > 0 ? `
                <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 1rem;" 
                    onclick="financingUI.applySimulation('${this.currentFinancingId}', ${extraAmount}, '${s.badge === 'term' ? 'reduce_term' : 'reduce_payment'}')">
                    Aplicar Este
                </button>
                ` : ''}
            </div>
        `).join('');

        this.scenarioGrid.classList.remove('hidden');
    }

    /**
     * Apply simulation directly from card
     */
    applySimulation(id, amount, strategy) {
        if (confirm(`Deseja aplicar esta amortização de ${formatCurrency(amount)}?`)) {
            try {
                // Reuse existing logic via applyExtraAmortization
                // We just call the logic directly since we bypassed the form
                const result = this.fm.applyExtraAmortization(id, amount, strategy);
                if (result) {
                    showToast(`Amortização aplicada com sucesso!`, 'success');
                    this.hideScenarioModal();
                    this.render();
                }
            } catch (e) {
                showToast('Erro: ' + e.message, 'error');
            }
        }
    }
}

// Global instance for onclick handlers
export let financingUI = null;

export function initFinancingUI() {
    financingUI = new FinancingUI();
    financingUI.init();
    window.financingUI = financingUI;
    return financingUI;
}
