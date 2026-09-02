/* Writer OS — Paleta de Comandos y Búsqueda Global (Ctrl + K) */

import { store } from '../models/store.js';
import { escapeHtml } from '../models/types.js';

class CommandPalette {
  constructor() {
    this.backdrop = null;
    this.input = null;
    this.resultsContainer = null;
    this.selectedIndex = 0;
    this.items = [];
    this.onActionCallback = null;
    this.init();
  }

  init() {
    this.backdrop = document.getElementById('palette-backdrop');
    if (!this.backdrop) return;

    this.input = this.backdrop.querySelector('.palette-input');
    this.resultsContainer = this.backdrop.querySelector('.palette-results');

    // Atajo global Ctrl + K / Cmd + K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      } else if (this.isOpen()) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      }
    });

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.input.addEventListener('input', () => {
      this.render();
    });
  }

  setActionCallback(cb) {
    this.onActionCallback = cb;
  }

  isOpen() {
    return this.backdrop?.classList.contains('is-open');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (!this.backdrop) this.init();
    this.backdrop.classList.add('is-open');
    this.input.value = '';
    this.selectedIndex = 0;
    this.render();
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    this.backdrop?.classList.remove('is-open');
    this.items = [];
  }

  moveSelection(delta) {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.updateSelectionVisuals();
  }

  updateSelectionVisuals() {
    const rendered = this.resultsContainer.querySelectorAll('.palette-item');
    rendered.forEach((el, idx) => {
      if (idx === this.selectedIndex) {
        el.classList.add('is-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-selected');
      }
    });
  }

  executeSelected() {
    if (this.items[this.selectedIndex]) {
      const selected = this.items[this.selectedIndex];
      this.close();
      if (selected.action) {
        selected.action();
      }
    }
  }

  render() {
    const query = this.input.value.trim().toLowerCase();
    const activeProject = store.getActiveProject();
    this.items = [];

    let html = '';

    // Si hay búsqueda, buscar en contenidos
    if (query.length > 0) {
      const results = store.search(query);

      // Resultados en Capítulos
      if (results.chapters.length > 0) {
        html += `<div class="palette-group-title">Capítulos</div>`;
        results.chapters.forEach(c => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'chapter',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('open-chapter', { projectId: c.projectId, chapterId: c.id });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>${c.title}</span>
              </div>
              <span class="palette-item-badge">Capítulo</span>
            </div>
          `;
        });
      }

      // Resultados en Personajes
      if (results.characters.length > 0) {
        html += `<div class="palette-group-title">Personajes</div>`;
        results.characters.forEach(ch => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'character',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('open-character', { projectId: ch.projectId, characterId: ch.id });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>${ch.name} ${ch.alias ? `— <em>"${ch.alias}"</em>` : ''}</span>
              </div>
              <span class="palette-item-badge">Personaje</span>
            </div>
          `;
        });
      }

      // Resultados en Notas
      if (results.notes.length > 0) {
        html += `<div class="palette-group-title">Notas</div>`;
        results.notes.forEach(n => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'note',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('open-note', { projectId: n.projectId, noteId: n.id });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>${n.title}</span>
              </div>
              <span class="palette-item-badge">Nota</span>
            </div>
          `;
        });
      }

      // Resultados en Casas y Organizaciones
      if (results.groups && results.groups.length > 0) {
        html += `<div class="palette-group-title">Casas y Organizaciones</div>`;
        results.groups.forEach(g => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'group',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('open-group', { projectId: g.projectId, groupId: g.id });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                <span>${escapeHtml(g.name)} ${g.motto ? `— <em>"${escapeHtml(g.motto)}"</em>` : ''}</span>
              </div>
              <span class="palette-item-badge">Organización</span>
            </div>
          `;
        });
      }

      // Resultados en Relaciones
      if (results.relationships && results.relationships.length > 0) {
        html += `<div class="palette-group-title">Relaciones y Vínculos</div>`;
        results.relationships.forEach(r => {
          const itemIndex = this.items.length;
          const src = store.getEntity(r.sourceId, r.projectId);
          const tgt = store.getEntity(r.targetId, r.projectId);
          if (!src || !tgt) return;

          this.items.push({
            type: 'relationship',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('navigate', { view: 'relationships', projectId: r.projectId });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span>${escapeHtml(src.name)} ${r.isSymmetric ? '↔' : '➔'} ${escapeHtml(tgt.name)} (${escapeHtml(r.type)})</span>
              </div>
              <span class="palette-item-badge">${escapeHtml(r.category)}</span>
            </div>
          `;
        });
      }

      // Resultados en Lugares
      if (results.places && results.places.length > 0) {
        html += `<div class="palette-group-title">Mundo y Lugares</div>`;
        results.places.forEach(pl => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'place',
            action: () => {
              if (this.onActionCallback) {
                this.onActionCallback('open-place', { placeId: pl.id, projectId: pl.projectId });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span>${escapeHtml(pl.name)}</span>
              </div>
              <span class="palette-item-badge">${escapeHtml(pl.type || pl.category)}</span>
            </div>
          `;
        });
      }

      // Resultados en Proyectos
      if (results.projects.length > 0) {
        html += `<div class="palette-group-title">Proyectos</div>`;
        results.projects.forEach(p => {
          const itemIndex = this.items.length;
          this.items.push({
            type: 'project',
            action: () => {
              store.setActiveProjectId(p.id);
              if (this.onActionCallback) {
                this.onActionCallback('navigate', { view: 'overview', projectId: p.id });
              }
            }
          });
          html += `
            <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
              <div class="palette-item-left">
                <svg class="icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span>${escapeHtml(p.title)}</span>
              </div>
              <span class="palette-item-badge">Proyecto</span>
            </div>
          `;
        });
      }

      if (this.items.length === 0) {
        html = `
          <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.875rem;">
            No se encontraron coincidencias para "<strong>${escapeHtml(query)}</strong>"
          </div>
        `;
      }
    }

    // Acciones y Navegación
    const actions = [];

    if (activeProject) {
      actions.push({
        title: 'Crear nuevo capítulo',
        badge: 'Acción',
        icon: '<path d="M12 5v14M5 12h14"></path>',
        action: () => this.onActionCallback?.('create-chapter')
      });
      actions.push({
        title: 'Crear nuevo personaje',
        badge: 'Acción',
        icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
        action: () => this.onActionCallback?.('create-character')
      });
      actions.push({
        title: 'Crear nueva nota',
        badge: 'Acción',
        icon: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
        action: () => this.onActionCallback?.('create-note')
      });
      actions.push({
        title: 'Crear nueva relación',
        badge: 'Acción',
        icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>',
        action: () => this.onActionCallback?.('create-relationship')
      });
      actions.push({
        title: 'Crear nueva casa u organización',
        badge: 'Acción',
        icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
        action: () => this.onActionCallback?.('create-group')
      });
      actions.push({
        title: 'Crear nuevo lugar',
        badge: 'Acción',
        icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>',
        action: () => this.onActionCallback?.('create-place')
      });
      actions.push({
        title: 'Ir a Escribir',
        badge: 'Navegación',
        icon: '<path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>',
        action: () => this.onActionCallback?.('navigate', { view: 'editor' })
      });
      actions.push({
        title: 'Ir a Resumen de la obra',
        badge: 'Navegación',
        icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
        action: () => this.onActionCallback?.('navigate', { view: 'overview' })
      });
      actions.push({
        title: 'Ir a Personajes',
        badge: 'Navegación',
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
        action: () => this.onActionCallback?.('navigate', { view: 'characters' })
      });
      actions.push({
        title: 'Ir a Relaciones y Estructuras',
        badge: 'Navegación',
        icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>',
        action: () => this.onActionCallback?.('navigate', { view: 'relationships' })
      });
      actions.push({
        title: 'Ir a Mundo y Lugares',
        badge: 'Navegación',
        icon: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>',
        action: () => this.onActionCallback?.('navigate', { view: 'world' })
      });
      actions.push({
        title: 'Ir a Notas',
        badge: 'Navegación',
        icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
        action: () => this.onActionCallback?.('navigate', { view: 'notes' })
      });
    }

    actions.push({
      title: 'Ver todos los proyectos',
      badge: 'Biblioteca',
      icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
      action: () => this.onActionCallback?.('navigate', { view: 'projects' })
    });

    actions.push({
      title: 'Crear nuevo proyecto',
      badge: 'Acción',
      icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>',
      action: () => this.onActionCallback?.('create-project')
    });

    const isDark = store.getTheme() === 'dark';
    actions.push({
      title: isDark ? 'Cambiar a modo claro (Papel Crema)' : 'Cambiar a modo oscuro (Tinta Nocturna)',
      badge: 'Apariencia',
      icon: isDark
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
      action: () => store.toggleTheme()
    });

    // Filtrar acciones según query si hay búsqueda
    const filteredActions = query.length > 0
      ? actions.filter(a => a.title.toLowerCase().includes(query))
      : actions;

    if (filteredActions.length > 0) {
      html += `<div class="palette-group-title">Acciones y Navegación</div>`;
      filteredActions.forEach(a => {
        const itemIndex = this.items.length;
        this.items.push(a);
        html += `
          <div class="palette-item ${itemIndex === this.selectedIndex ? 'is-selected' : ''}" data-index="${itemIndex}">
            <div class="palette-item-left">
              <svg class="icon" viewBox="0 0 24 24">${a.icon}</svg>
              <span>${a.title}</span>
            </div>
            <span class="palette-item-badge">${a.badge}</span>
          </div>
        `;
      });
    }

    this.resultsContainer.innerHTML = html;

    // Vincular clics directos
    this.resultsContainer.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        this.selectedIndex = idx;
        this.executeSelected();
      });
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        this.selectedIndex = idx;
        this.updateSelectionVisuals();
      });
    });

    if (this.selectedIndex >= this.items.length) {
      this.selectedIndex = 0;
    }
    this.updateSelectionVisuals();
  }
}

export const commandPalette = new CommandPalette();
