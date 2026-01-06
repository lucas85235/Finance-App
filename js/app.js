/**
 * Finance Dashboard - Main Entry Point
 * Initializes the application using ES6 modules
 */

import { FinanceManager } from './models/FinanceManager.js';
import { AppController } from './views/AppController.js';
import { initFinancingUI } from './views/FinancingUI.js';

// Initialize Application
let fm, app;

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Core Finance Manager
        fm = new FinanceManager();

        // Main Application Controller (replaces UIController)
        app = new AppController(fm);

        // Financing Module
        initFinancingUI();

        // Expose to window for inline onclick handlers (legacy support)
        window.fm = fm;
        window.app = app;

        // Legacy alias for backward compatibility
        window.ui = {
            openInspector: (type, data) => app.openInspector(type, data),
            closeInspector: () => app.closeInspector(),
            handleDelete: (id) => {
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    fm.deleteTransaction(id);
                    const { eventBus, Events } = window.__eventBus || {};
                    if (eventBus) eventBus.emit(Events.TRANSACTION_DELETED, { id });
                    location.reload(); // Fallback reload
                }
            },
            handleDeleteCategory: (id) => app.views.categories?.handleDelete(id)
        };

        console.log('Finance App initialized successfully');
    } catch (error) {
        console.error('CRITICAL APP ERROR:', error);
    }
});

// Export event bus for legacy handlers
import { eventBus, Events } from './services/EventBus.js';
window.__eventBus = { eventBus, Events };
