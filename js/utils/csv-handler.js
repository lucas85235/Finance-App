/**
 * CSV Handler Module
 * Handles import and export of transaction data in CSV format
 */

import { showToast } from './toast.js';

export const CSVHandler = {
    /**
     * Export transactions to CSV file
     */
    exportToCSV(transactions) {
        if (!transactions || transactions.length === 0) {
            showToast('Não há transações para exportar', 'error');
            return;
        }

        const headers = ['ID', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Conta', 'Data'];

        const rows = transactions.map(t => {
            return [
                t.id,
                t.type === 'income' ? 'Receita' : 'Despesa',
                t.amount.toFixed(2).replace('.', ','),
                `"${t.description.replace(/"/g, '""')}"`,
                t.category,
                t.account || '',
                t.date
            ].join(';');
        });

        const csvContent = [headers.join(';'), ...rows].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];

        link.setAttribute('href', url);
        link.setAttribute('download', `financas_${date}.csv`);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`${transactions.length} transações exportadas com sucesso!`, 'success');
    },

    /**
     * Import transactions from CSV file
     */
    importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const lines = content.split(/\r?\n/).filter(line => line.trim());

                    if (lines.length < 2) {
                        reject(new Error('Arquivo CSV vazio ou inválido'));
                        return;
                    }

                    const header = lines[0].toLowerCase();
                    const isMockDataFormat = header.includes('date') && header.includes('account');

                    const transactions = [];

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        let parsed;

                        if (isMockDataFormat) {
                            parsed = this.parseMockDataLine(line);
                        } else {
                            parsed = this.parseCSVLine(line);
                        }

                        if (parsed) {
                            transactions.push(parsed);
                        }
                    }

                    if (transactions.length === 0) {
                        reject(new Error('Nenhuma transação válida encontrada no arquivo'));
                        return;
                    }

                    resolve(transactions);
                } catch (error) {
                    reject(new Error('Erro ao processar arquivo CSV: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('Erro ao ler o arquivo'));
            };

            reader.readAsText(file, 'UTF-8');
        });
    },

    /**
     * Parse a MockData.csv format line
     */
    parseMockDataLine(line) {
        const parts = this.splitCSVLine(line);

        if (parts.length < 5) {
            return null;
        }

        const [dateStr, description, valueStr, account, category] = parts;
        const value = parseFloat(valueStr.replace(',', '.').replace(/[^\d.-]/g, ''));

        if (isNaN(value) || value === 0) {
            return null;
        }

        const type = value < 0 ? 'expense' : 'income';
        const amount = Math.abs(value);

        const dateParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateParts) {
            return null;
        }
        const date = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
        const mappedCategory = this.mapCategory(category, type);

        return {
            id: this.generateId(),
            type,
            amount,
            description: description || category || 'Sem descrição',
            category: mappedCategory,
            account: account || '',
            date
        };
    },

    /**
     * Map external categories to internal categories
     */
    mapCategory(externalCategory, type) {
        const categoryMap = {
            'comida': 'Alimentação',
            'alimentação': 'Alimentação',
            'supermercado': 'Compras',
            'mercado': 'Compras',
            'transporte': 'Transporte',
            'gasolina': 'Transporte',
            'uber': 'Transporte',
            'casa': 'Moradia',
            'moradia': 'Moradia',
            'aluguel': 'Moradia',
            'saúde': 'Saúde',
            'saude': 'Saúde',
            'farmácia': 'Saúde',
            'farmacia': 'Saúde',
            'educação': 'Educação',
            'educacao': 'Educação',
            'lazer': 'Lazer',
            'entretenimento': 'Lazer',
            'compras': 'Compras',
            'contas': 'Contas',
            'pet': 'Outros Despesa',
            'outros': type === 'income' ? 'Outros Receita' : 'Outros Despesa',
            'salário': 'Salário',
            'salario': 'Salário',
            'freelance': 'Freelance',
            'investimentos': 'Investimentos',
            'investimento': 'Investimentos'
        };

        const lowerCategory = (externalCategory || '').toLowerCase().trim();
        return categoryMap[lowerCategory] || (type === 'income' ? 'Outros Receita' : 'Outros Despesa');
    },

    /**
     * Parse a standard CSV line (our export format)
     */
    parseCSVLine(line) {
        const parts = this.splitCSVLine(line);

        if (parts.length < 6) {
            return null;
        }

        const [id, typeStr, amountStr, description, category, account, date] = parts;
        const type = typeStr.toLowerCase().includes('receita') ? 'income' : 'expense';
        const amount = parseFloat(amountStr.replace(',', '.').replace(/[^\d.-]/g, ''));

        if (isNaN(amount) || amount <= 0) {
            return null;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const dateField = date || parts[5]; // Handle both with and without account
        if (!dateRegex.test(dateField)) {
            return null;
        }

        return {
            id: id || this.generateId(),
            type,
            amount,
            description: description.replace(/^"|"$/g, '').replace(/""/g, '"'),
            category: category || 'Outros',
            account: account || '',
            date: dateField
        };
    },

    /**
     * Split a CSV line handling quoted values
     */
    splitCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
                parts.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim().replace(/^"|"$/g, ''));

        return parts;
    },

    /**
     * Generate a unique ID
     */
    generateId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () => {
            return Math.floor(Math.random() * 16).toString(16);
        });
    }
};
