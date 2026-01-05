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

                    // 1. Detect Separator
                    const separator = this.detectSeparator(lines);

                    // 2. Normalize Headers
                    const { indexMap } = this.normalizeHeaders(lines[0], separator);

                    if (!indexMap.amount && !indexMap.value && !indexMap.date) {
                        // Fallback for files without headers or unrecognized headers
                        // could try default index mapping? For now, fail safely or warn.
                        // But if we can't find 'amount' or 'date', it's risky.
                        // Let's check strict requirement.
                        // If strict check fails, maybe it's a raw file?
                        // For now throw error to prompt user to fix or check file.
                        // reject(new Error('Não foi possível identificar as colunas. Verifique o cabeçalho.'));
                        // return;
                    }

                    const transactions = [];

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        const parsed = this.parseLine(line, separator, indexMap);
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

    detectSeparator(lines) {
        if (lines.length === 0) return ';'; // Default
        const header = lines[0];

        const semicolons = (header.match(/;/g) || []).length;
        const commas = (header.match(/,/g) || []).length;
        const tabs = (header.match(/\t/g) || []).length;

        if (semicolons >= commas && semicolons >= tabs) return ';';
        if (commas > semicolons && commas >= tabs) return ',';
        return '\t';
    },

    normalizeHeaders(headerLine, separator) {
        const rawHeaders = this.splitCSVLine(headerLine, separator).map(h => h.toLowerCase().trim());

        const mappings = {
            'data': 'date', 'date': 'date', 'dta': 'date', 'dt': 'date',
            'descrição': 'description', 'descricao': 'description', 'description': 'description', 'desc': 'description', 'histórico': 'description', 'historico': 'description', 'memo': 'description',
            'valor': 'amount', 'value': 'amount', 'amount': 'amount', 'amt': 'amount', 'quantia': 'amount', 'saldo': 'amount',
            'tipo': 'type', 'type': 'type', 'category': 'category', 'categoria': 'category', 'cat': 'category',
            'conta': 'account', 'account': 'account', 'instituição': 'account'
        };

        const indexMap = {};

        rawHeaders.forEach((h, index) => {
            // Direct match
            if (mappings[h]) {
                indexMap[mappings[h]] = index;
                return;
            }
            // Partial match
            for (const [key, value] of Object.entries(mappings)) {
                if (h.includes(key) && !indexMap[value]) {
                    indexMap[value] = index;
                    return;
                }
            }
        });

        // Fallback: if no amount found, maybe column index 2?? NO, unsafe.
        return { indexMap };
    },

    parseLine(line, separator, indexMap) {
        const cols = this.splitCSVLine(line, separator);
        if (cols.length < 2) return null;

        // Helper to safely get value
        const getVal = (key) => {
            const idx = indexMap[key];
            if (idx !== undefined && idx < cols.length) return cols[idx];
            return null;
        };

        const description = getVal('description') || getVal('category') || 'Sem descrição';
        const account = getVal('account') || '';
        const rawDate = getVal('date');
        const rawAmount = getVal('amount');
        let rawType = getVal('type');

        // Allow fallback if no specific columns mapped but file has enough columns?
        // Risky. Let's rely on mapping.

        if (!rawDate || !rawAmount) return null;

        const date = this.parseDate(rawDate);
        if (!date) return null;

        let amount = this.parseAmount(rawAmount); // Returns float, positive or negative

        let type = 'expense';

        if (rawType) {
            const lowerType = rawType.toLowerCase();
            if (lowerType.includes('receita') || lowerType.includes('income') || lowerType.includes('credito') || lowerType.includes('crédito')) {
                type = 'income';
            } else {
                type = 'expense';
            }
            // If type is explicit, ensure amount is positive for storage? 
            // Our model stores amount as positive and uses type to distinguish.
            amount = Math.abs(amount);
        } else {
            // Derive type from amount sign
            if (amount < 0) {
                type = 'expense';
                amount = Math.abs(amount);
            } else {
                type = 'income';
            }
        }

        if (isNaN(amount) || amount === 0) return null;

        // Map category
        let category = getVal('category');
        if (category) {
            category = this.mapCategory(category, type);
        } else {
            category = type === 'income' ? 'Outros Receita' : 'Outros Despesa';
        }

        return {
            id: this.generateId(),
            type,
            amount,
            description,
            category,
            account,
            date
        };
    },

    parseDate(value) {
        if (!value) return null;
        let clean = value.trim();

        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

        // Try YYYY/MM/DD
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) return clean.replace(/\//g, '-');

        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        // Match 1 or 2 digits day/month
        const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }

        return null;
    },

    parseAmount(value) {
        if (!value) return 0;
        let clean = value.trim();

        // Handle negative parenthesis (100) -> -100
        if (clean.startsWith('(') && clean.endsWith(')')) {
            clean = '-' + clean.slice(1, -1);
        }

        // Determine format
        // If last separator is comma, it's likely decimal in EU (1.000,00)
        // If last separator is dot, it's likely decimal in US (1,000.00)

        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');

        // Case: 1000,00 (EU) -> comma is decimal
        if (lastComma > lastDot) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        }
        // Case: 1,000.00 (US) -> dot is decimal
        else if (lastDot > lastComma) {
            clean = clean.replace(/,/g, '');
        }
        // Case: 1000 (No separator) -> fine

        // Remove R$, $, whitespace
        clean = clean.replace(/[^\d.-]/g, '');

        return parseFloat(clean);
    },

    /**
     * Map external categories to internal categories
     */
    mapCategory(externalCategory, type) {
        const categoryMap = {
            'comida': 'Alimentação',
            'alimentação': 'Alimentação',
            'alimentacao': 'Alimentação',
            'supermercado': 'Compras',
            'mercado': 'Compras',
            'transporte': 'Transporte',
            'gasolina': 'Transporte',
            'uber': 'Transporte',
            'combustivel': 'Transporte',
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
            'restaurante': 'Lazer',
            'entretenimento': 'Lazer',
            'compras': 'Compras',
            'shopping': 'Compras',
            'vestuario': 'Compras',
            'contas': 'Contas',
            'luz': 'Contas',
            'agua': 'Contas',
            'internet': 'Contas',
            'telefone': 'Contas',
            'pet': 'Outros Despesa',
            'outros': type === 'income' ? 'Outros Receita' : 'Outros Despesa',
            'salário': 'Salário',
            'salario': 'Salário',
            'pagamento': 'Salário',
            'freelance': 'Freelance',
            'investimentos': 'Investimentos',
            'investimento': 'Investimentos',
            'rendimento': 'Investimentos'
        };

        const lowerCategory = (externalCategory || '').toLowerCase().trim();
        // Try exact match
        if (categoryMap[lowerCategory]) return categoryMap[lowerCategory];

        // Try partial match keys
        for (const [key, value] of Object.entries(categoryMap)) {
            if (lowerCategory.includes(key)) return value;
        }

        return (type === 'income' ? 'Outros Receita' : 'Outros Despesa');
    },

    /**
     * Split a CSV line handling quoted values
     */
    splitCSVLine(line, separator = ';') {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote "" -> "
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
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
