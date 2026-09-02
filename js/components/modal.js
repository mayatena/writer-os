/* Writer OS — Controlador de Modales */

class ModalController {
  constructor() {
    this.backdrop = null;
    this.container = null;
    this.titleEl = null;
    this.bodyEl = null;
    this.footerEl = null;
    this.closeBtn = null;
    this.currentCallback = null;
    this.init();
  }

  init() {
    this.backdrop = document.getElementById('app-modal-backdrop');
    if (!this.backdrop) return;

    this.container = this.backdrop.querySelector('.modal-container');
    this.titleEl = this.backdrop.querySelector('.modal-title');
    this.bodyEl = this.backdrop.querySelector('.modal-body');
    this.footerEl = this.backdrop.querySelector('.modal-footer');
    this.closeBtn = this.backdrop.querySelector('.modal-close-btn');

    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.backdrop?.classList.contains('is-open');
  }

  open({
    title = '',
    contentHtml = '',
    confirmText = 'Guardar',
    cancelText = 'Cancelar',
    isDanger = false,
    showFooter = true,
    onConfirm = null,
    onOpen = null
  }) {
    if (!this.backdrop) this.init();

    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = contentHtml;
    this.currentCallback = onConfirm;

    if (showFooter) {
      this.footerEl.style.display = 'flex';
      const confirmBtnClass = isDanger ? 'btn-danger' : 'btn-primary';
      this.footerEl.innerHTML = `
        <button type="button" class="btn btn-secondary modal-cancel-btn">${cancelText}</button>
        <button type="button" class="btn ${confirmBtnClass} modal-confirm-btn">${confirmText}</button>
      `;

      this.footerEl.querySelector('.modal-cancel-btn')?.addEventListener('click', () => this.close());
      this.footerEl.querySelector('.modal-confirm-btn')?.addEventListener('click', async (e) => {
        if (this.currentCallback) {
          const shouldClose = await this.currentCallback(this.bodyEl);
          if (shouldClose !== false) {
            this.close();
          }
        } else {
          this.close();
        }
      });
    } else {
      this.footerEl.style.display = 'none';
      this.footerEl.innerHTML = '';
    }

    this.backdrop.classList.add('is-open');

    // Callback posterior a abrir para focus de inputs
    if (onOpen) {
      setTimeout(() => onOpen(this.bodyEl), 50);
    } else {
      setTimeout(() => {
        const firstInput = this.bodyEl.querySelector('input, textarea, select');
        firstInput?.focus();
      }, 50);
    }
  }

  close() {
    this.backdrop?.classList.remove('is-open');
    this.currentCallback = null;
  }

  confirm({
    title = '¿Confirmar acción?',
    message = 'Esta acción no se puede deshacer.',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = true,
    onConfirm
  }) {
    this.open({
      title,
      contentHtml: `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
      confirmText,
      cancelText,
      isDanger,
      onConfirm
    });
  }
}

export const modal = new ModalController();
