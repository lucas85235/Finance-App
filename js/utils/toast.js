/**
 * Toast Notification Utility
 */

export function showToast(message, type = 'success') {
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
