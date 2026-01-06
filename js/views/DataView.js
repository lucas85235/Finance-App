/**
 * DataView - Data management view
 * Handles import/export, backup/restore, and data reset
 */

import { BaseView } from './BaseView.js';
import { Events, eventBus } from '../services/EventBus.js';
import { CSVHandler } from '../utils/csv-handler.js';
import { generatePDF } from '../utils/pdf-generator.js';
import { showToast } from '../utils/toast.js';

export class DataView extends BaseView {
    constructor(financeManager) {
        super('data', financeManager);
    }

    cacheElements() {
        this.importInput = document.getElementById('import-file');
        this.restoreInput = document.getElementById('restore-file');
        this.exportBtn = document.getElementById('export-btn');
        this.backupBtn = document.getElementById('backup-btn');
        this.reportBtn = document.getElementById('report-btn');
        this.resetBtn = document.getElementById('reset-all-data-btn');
    }

    bindEvents() {
        this.importInput?.addEventListener('change', (e) => this.handleImport(e));
        this.restoreInput?.addEventListener('change', (e) => this.handleRestore(e));
        this.exportBtn?.addEventListener('click', () => this.handleExport());
        this.backupBtn?.addEventListener('click', () => this.handleBackup());
        this.reportBtn?.addEventListener('click', () => this.handleReport());
        this.resetBtn?.addEventListener('click', () => this.handleReset());
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const transactions = await CSVHandler.importFromCSV(file);
            const count = this.fm.importTransactions(transactions);
            eventBus.emit(Events.DATA_IMPORTED);
            showToast(`${count} transações importadas com sucesso!`, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
        e.target.value = '';
    }

    handleExport() {
        CSVHandler.exportToCSV(this.fm.transactions);
        showToast('Exportação CSV concluída!', 'success');
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

        showToast('Backup realizado com sucesso! 💾', 'success');
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

                    eventBus.emit(Events.DATA_IMPORTED);
                    showToast('Dados restaurados com sucesso! ♻️', 'success');
                }
            } catch (error) {
                console.error('Restore error:', error);
                showToast('Erro ao restaurar arquivo: ' + error.message, 'error');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    handleReport() {
        generatePDF(this.fm);
        showToast('Relatório PDF gerado!', 'success');
    }

    handleReset() {
        const confirmed = confirm(
            '⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados!\n\n' +
            '• Todas as transações\n' +
            '• Todos os financiamentos\n' +
            '• Todas as categorias personalizadas\n\n' +
            'Esta ação NÃO pode ser desfeita. Deseja continuar?'
        );

        if (!confirmed) return;

        const doubleConfirm = confirm(
            'Tem certeza ABSOLUTA?\n\n' +
            'Digite OK para confirmar a exclusão de todos os dados.'
        );

        if (!doubleConfirm) return;

        try {
            localStorage.removeItem('finance_dashboard_data');
            localStorage.removeItem('finance_dashboard_categories');
            localStorage.removeItem('finance_dashboard_financings');

            this.fm.transactions = [];
            this.fm.categories = [];
            this.fm.currentFilter = 'all';
            this.fm.currentPeriod = 'all';
            this.fm.searchQuery = '';

            eventBus.emit(Events.DATA_RESET);
            showToast('Todos os dados foram apagados!', 'success');
        } catch (error) {
            showToast('Erro ao apagar dados: ' + error.message, 'error');
        }
    }
}
