/**
 * CategoriesView - Categories management view
 * Handles category list, add, and delete operations
 */

import { BaseView } from './BaseView.js';
import { Events, eventBus } from '../services/EventBus.js';
import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

export class CategoriesView extends BaseView {
    constructor(financeManager) {
        super('categories', financeManager);
    }

    cacheElements() {
        this.listContainer = document.getElementById('categories-list-view');
        this.addForm = document.getElementById('add-category-form');
        this.nameInput = document.getElementById('new-cat-name');
        this.iconSelect = document.getElementById('new-cat-icon');
        this.typeSelect = document.getElementById('new-cat-type');
    }

    bindEvents() {
        this.addForm?.addEventListener('submit', (e) => this.handleSubmit(e));

        this.subscribe(Events.CATEGORY_CHANGED, () => this.render());
        this.subscribe(Events.DATA_IMPORTED, () => this.render());
    }

    render() {
        if (!this.isActive) return;
        this.renderCategoriesList();
    }

    renderCategoriesList() {
        if (!this.listContainer) return;

        if (this.fm.categories.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-hint">Nenhuma categoria encontrada.</p>';
            return;
        }

        const sorted = [...this.fm.categories].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        this.listContainer.innerHTML = `
            <div class="categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                ${sorted.map(cat => `
                    <div class="category-card" style="
                        background: var(--bg-glass);
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius-md);
                        padding: 1rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.5rem;">${cat.icon}</span>
                            <div>
                                <div style="font-weight: 500;">${escapeHtml(cat.name)}</div>
                                <small style="color: var(--text-muted);">
                                    ${cat.type === 'income' ? '💵 Receita' : '💸 Despesa'}
                                </small>
                            </div>
                        </div>
                        <button 
                            class="btn-icon-only" 
                            data-action="delete" 
                            data-id="${cat.id}" 
                            title="Excluir"
                            style="background: transparent; border: none; cursor: pointer; font-size: 1.2rem;"
                        >
                            🗑️
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        this.listContainer.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.handleDelete(id);
            });
        });
    }

    handleSubmit(e) {
        e.preventDefault();

        const name = this.nameInput?.value.trim();
        const icon = this.iconSelect?.value;
        const type = this.typeSelect?.value;

        if (!name) {
            showToast('Nome da categoria é obrigatório', 'error');
            return;
        }

        if (this.fm.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            showToast('Categoria já existe!', 'error');
            return;
        }

        this.fm.addCategory({ name, icon, type });
        eventBus.emit(Events.CATEGORY_CHANGED);

        this.addForm?.reset();
        this.render();
        showToast('Categoria adicionada!', 'success');
    }

    handleDelete(id) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            if (this.fm.deleteCategory(id)) {
                eventBus.emit(Events.CATEGORY_CHANGED);
                this.render();
                showToast('Categoria excluída!', 'success');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}
