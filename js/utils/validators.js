/**
 * Validators - Input Validation Utilities
 * Provides robust validation for financial data
 */

/**
 * Validates a monetary amount
 * @param {number|string} value - The value to validate
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
export function validateAmount(value) {
    if (value === null || value === undefined || value === '') {
        return { valid: false, error: 'Valor é obrigatório' };
    }

    const numValue = typeof value === 'string'
        ? parseFloat(value.replace(',', '.'))
        : value;

    if (isNaN(numValue)) {
        return { valid: false, error: 'Valor deve ser um número válido' };
    }

    if (numValue <= 0) {
        return { valid: false, error: 'Valor deve ser maior que zero' };
    }

    if (numValue > 999999999.99) {
        return { valid: false, error: 'Valor excede o limite máximo' };
    }

    // Round to 2 decimal places to avoid floating point issues
    const roundedValue = Math.round(numValue * 100) / 100;

    return { valid: true, value: roundedValue };
}

/**
 * Validates a date string
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {{ valid: boolean, value?: string, error?: string }}
 */
export function validateDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return { valid: false, error: 'Data é obrigatória' };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
        return { valid: false, error: 'Data deve estar no formato AAAA-MM-DD' };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Data inválida' };
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const reconstructed = new Date(year, month - 1, day);

    if (reconstructed.getFullYear() !== year ||
        reconstructed.getMonth() !== month - 1 ||
        reconstructed.getDate() !== day) {
        return { valid: false, error: 'Data inválida' };
    }

    // Check reasonable date range (1990 to 2100)
    if (year < 1990 || year > 2100) {
        return { valid: false, error: 'Ano deve estar entre 1990 e 2100' };
    }

    return { valid: true, value: dateStr };
}

/**
 * Validates a text field
 * @param {string} text - Text to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether field is required
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {string} options.fieldName - Field name for error messages
 * @returns {{ valid: boolean, value?: string, error?: string }}
 */
export function validateText(text, options = {}) {
    const {
        required = true,
        minLength = 1,
        maxLength = 500,
        fieldName = 'Campo'
    } = options;

    if (!text || typeof text !== 'string') {
        if (required) {
            return { valid: false, error: `${fieldName} é obrigatório` };
        }
        return { valid: true, value: '' };
    }

    const trimmed = text.trim();

    if (required && trimmed.length === 0) {
        return { valid: false, error: `${fieldName} é obrigatório` };
    }

    if (trimmed.length < minLength) {
        return { valid: false, error: `${fieldName} deve ter pelo menos ${minLength} caracteres` };
    }

    if (trimmed.length > maxLength) {
        return { valid: false, error: `${fieldName} deve ter no máximo ${maxLength} caracteres` };
    }

    return { valid: true, value: trimmed };
}

/**
 * Validates transaction type
 * @param {string} type - Transaction type ('income' or 'expense')
 * @returns {{ valid: boolean, value?: string, error?: string }}
 */
export function validateTransactionType(type) {
    const validTypes = ['income', 'expense'];

    if (!type || !validTypes.includes(type)) {
        return { valid: false, error: 'Tipo de transação inválido' };
    }

    return { valid: true, value: type };
}

/**
 * Validates a complete transaction object
 * @param {Object} transaction - Transaction to validate
 * @returns {{ valid: boolean, data?: Object, errors?: Object }}
 */
export function validateTransaction(transaction) {
    const errors = {};
    const data = {};

    // Validate type
    const typeResult = validateTransactionType(transaction.type);
    if (!typeResult.valid) {
        errors.type = typeResult.error;
    } else {
        data.type = typeResult.value;
    }

    // Validate description
    const descResult = validateText(transaction.description, {
        fieldName: 'Descrição',
        minLength: 2,
        maxLength: 200
    });
    if (!descResult.valid) {
        errors.description = descResult.error;
    } else {
        data.description = descResult.value;
    }

    // Validate amount
    const amountResult = validateAmount(transaction.amount);
    if (!amountResult.valid) {
        errors.amount = amountResult.error;
    } else {
        data.amount = amountResult.value;
    }

    // Validate date
    const dateResult = validateDate(transaction.date);
    if (!dateResult.valid) {
        errors.date = dateResult.error;
    } else {
        data.date = dateResult.value;
    }

    // Validate category (required)
    const categoryResult = validateText(transaction.category, {
        fieldName: 'Categoria',
        minLength: 1,
        maxLength: 100
    });
    if (!categoryResult.valid) {
        errors.category = categoryResult.error;
    } else {
        data.category = categoryResult.value;
    }

    // Validate account (optional)
    const accountResult = validateText(transaction.account || '', {
        fieldName: 'Conta',
        required: false,
        maxLength: 100
    });
    if (!accountResult.valid) {
        errors.account = accountResult.error;
    } else {
        data.account = accountResult.value;
    }

    const hasErrors = Object.keys(errors).length > 0;

    return hasErrors
        ? { valid: false, errors }
        : { valid: true, data };
}

/**
 * Sanitizes a string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Shows validation errors on form fields
 * @param {Object} errors - Object with field names as keys and error messages as values
 * @param {HTMLFormElement} form - The form element
 */
export function showFormErrors(errors, form) {
    // Clear previous errors
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    Object.entries(errors).forEach(([field, message]) => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.classList.add('input-error');

            const errorEl = document.createElement('span');
            errorEl.className = 'field-error';
            errorEl.textContent = message;
            input.parentElement.appendChild(errorEl);
        }
    });
}

/**
 * Clears all validation errors from a form
 * @param {HTMLFormElement} form - The form element
 */
export function clearFormErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}
