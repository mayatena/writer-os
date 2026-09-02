/* Writer OS — Vista de Notas Creativas */

import { store } from '../models/store.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export class NotesView {
  constructor(app) {
    this.app = app;
    this.selectedTag = 'all';
    this.searchQuery = '';
  }

  render(container, params = {}) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    const allNotes = store.getNotes(project.id);

    // Extraer todas las etiquetas únicas existentes en el proyecto
    const uniqueTags = Array.from(
      new Set(allNotes.flatMap(n => n.tags || []))
    ).sort((a, b) => a.localeCompare(b, 'es'));

    const filteredNotes = allNotes.filter(n => {
      const matchTag = this.selectedTag === 'all' || (n.tags && n.tags.includes(this.selectedTag));
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));
      return matchTag && matchQuery;
    });

    container.innerHTML = `
      <div class="view-container">
        <!-- Cabecera de sección -->
        <div class="section-header">
          <div>
            <h1 class="section-header-title">Notas e Ideas</h1>
            <p class="section-header-subtitle">Cuaderno de investigación, reglas del mundo, pistas y ocurrencias de la trama.</p>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-new-note">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nueva Nota</span>
            </button>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);">
          
          <!-- Filtro por Etiquetas -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="tags-filter-bar">
            <button class="btn btn-sm ${this.selectedTag === 'all' ? 'btn-primary' : 'btn-secondary'} btn-filter-tag" data-tag="all">Todas (${allNotes.length})</button>
            ${uniqueTags.map(tag => `
              <button class="btn btn-sm ${this.selectedTag === tag ? 'btn-primary' : 'btn-secondary'} btn-filter-tag" data-tag="${tag}">#${tag}</button>
            `).join('')}
          </div>

          <!-- Buscador -->
          <div style="min-width: 240px;">
            <input
              type="text"
              class="form-input"
              id="notes-search-input"
              placeholder="Buscar en títulos o contenido..."
              value="${this.searchQuery}"
              style="padding: 7px 12px; font-size: 0.875rem;"
            />
          </div>
        </div>

        <!-- Cuadrícula de Notas -->
        ${filteredNotes.length === 0 ? this.renderEmptyState(allNotes.length) : this.renderNotesGrid(filteredNotes)}
      </div>
    `;

    this.bindEvents(container, project);

    // Si veníamos con parámetro para abrir o crear nota
    if (params.noteId) {
      const noteToOpen = store.getNote(params.noteId);
      if (noteToOpen) {
        setTimeout(() => this.openNoteModal(noteToOpen, project.id), 100);
      }
    } else if (params.createNew) {
      setTimeout(() => this.openNoteModal(null, project.id), 100);
    }
  }

  renderEmptyState(totalCount) {
    if (totalCount === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <h2 class="empty-state-title">No hay notas registradas</h2>
          <p class="empty-state-desc">Guarda destellos de inspiración, citas, detalles de ambientación o dudas históricas para tu manuscrito.</p>
          <button class="btn btn-primary" id="btn-new-note-empty">Crear mi primera nota</button>
        </div>
      `;
    }
    return `
      <div class="card" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
        No se encontraron notas con el criterio de búsqueda seleccionado.
      </div>
    `;
  }

  renderNotesGrid(notes) {
    const cardsHtml = notes.map(n => {
      const formattedDate = new Date(n.updatedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const linkedPlace = n.placeId ? store.getPlace(n.placeId, project.id) : null;

      return `
        <div class="card card-clickable note-card" data-note-id="${n.id}" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <h2 style="font-size: 1.15rem; font-family: var(--font-serif); line-height: 1.3; margin: 0;">${n.title}</h2>
                ${linkedPlace ? `
                  <div style="margin-top: 4px;">
                    <span class="place-badge place-cat-${linkedPlace.category}" style="font-size: 0.6875rem;">
                      ${linkedPlace.mapData?.icon || '📍'} ${linkedPlace.name}
                    </span>
                  </div>
                ` : ''}
              </div>
              <button class="btn btn-subtle btn-icon btn-sm btn-delete-note" data-note-id="${n.id}" title="Eliminar nota">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line;">
              ${n.content}
            </p>
          </div>

          <div style="margin-top: var(--space-md); padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${n.tags && n.tags.length > 0 ? n.tags.map(t => `<span class="badge" style="font-size: 0.6875rem;">#${t}</span>`).join('') : '<span style="font-size: 0.75rem; color: var(--text-muted);">Sin etiquetas</span>'}
            </div>
            <span style="font-size: 0.6875rem; color: var(--text-muted);">${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-lg);">
        ${cardsHtml}
      </div>
    `;
  }

  bindEvents(container, project) {
    // Filtro por etiqueta
    container.querySelectorAll('.btn-filter-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTag = btn.getAttribute('data-tag');
        this.render(container);
      });
    });

    // Búsqueda en vivo
    const searchInput = container.querySelector('#notes-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      const allNotes = store.getNotes(project.id);
      const filtered = allNotes.filter(n => {
        const matchTag = this.selectedTag === 'all' || (n.tags && n.tags.includes(this.selectedTag));
        const q = this.searchQuery.toLowerCase().trim();
        const matchQuery = !q ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));
        return matchTag && matchQuery;
      });

      const gridArea = container.querySelector('.view-container > div:last-child');
      if (gridArea) {
        gridArea.outerHTML = filtered.length === 0
          ? this.renderEmptyState(1)
          : this.renderNotesGrid(filtered);
        this.bindCardEvents(container, project);
      }
    });

    // Nueva Nota
    container.querySelector('#btn-new-note')?.addEventListener('click', () => {
      this.openNoteModal(null, project.id);
    });
    container.querySelector('#btn-new-note-empty')?.addEventListener('click', () => {
      this.openNoteModal(null, project.id);
    });

    this.bindCardEvents(container, project);
  }

  bindCardEvents(container, project) {
    // Abrir nota al hacer clic
    container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-note')) return;
        const noteId = card.getAttribute('data-note-id');
        const note = store.getNote(noteId);
        if (note) {
          this.openNoteModal(note, project.id);
        }
      });
    });

    // Eliminar nota
    container.querySelectorAll('.btn-delete-note').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteId = btn.getAttribute('data-note-id');
        const n = store.getNote(noteId);
        if (!n) return;

        modal.confirm({
          title: `¿Eliminar la nota "${n.title}"?`,
          message: 'Esta nota se borrará definitivamente. No se podrá recuperar.',
          confirmText: 'Eliminar nota',
          isDanger: true,
          onConfirm: () => {
            store.deleteNote(noteId);
            showToast('Nota eliminada', 'info');
            this.render(container);
          }
        });
      });
    });
  }

  openNoteModal(note, projectId) {
    const isEditing = !!note;
    const places = store.getPlaces(projectId);

    modal.open({
      title: isEditing ? 'Editar nota' : 'Nueva nota creativa',
      contentHtml: `
        <form id="form-note">
          <div class="form-group">
            <label class="form-label" for="note-title">Título de la nota *</label>
            <input type="text" id="note-title" class="form-input" value="${note ? note.title : ''}" placeholder="Ej: Las leyes de la alquimia lunar" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="note-place">Lugar vinculado (Opcional)</label>
            <select id="note-place" class="form-input">
              <option value="">-- Sin lugar asociado --</option>
              ${places.map(p => `
                <option value="${p.id}" ${note && note.placeId === p.id ? 'selected' : ''}>
                  ${p.mapData?.icon || '📍'} ${p.name} (${p.type})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="note-content">Contenido / Ideas</label>
            <textarea id="note-content" class="form-textarea" style="min-height: 160px;" placeholder="Escribe aquí tus reflexiones, datos de investigación o fragmentos de diálogo...">${note ? note.content : ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="note-tags">Etiquetas (separadas por coma)</label>
            <input type="text" id="note-tags" class="form-input" value="${note && note.tags ? note.tags.join(', ') : ''}" placeholder="Ej: mundo, magia, misterio, trama" />
            <span class="form-hint">Las etiquetas te permitirán organizar y filtrar tus notas rápidamente.</span>
          </div>
        </form>
      `,
      confirmText: isEditing ? 'Guardar nota' : 'Crear nota',
      onConfirm: (modalEl) => {
        const titleInput = modalEl.querySelector('#note-title');
        const contentInput = modalEl.querySelector('#note-content');
        const tagsInput = modalEl.querySelector('#note-tags');
        const placeSelect = modalEl.querySelector('#note-place');

        const title = titleInput.value.trim();
        if (!title) {
          titleInput.focus();
          showToast('La nota debe tener un título', 'error');
          return false;
        }

        const tags = tagsInput.value
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0);

        const placeId = placeSelect?.value || null;

        const data = {
          title,
          content: contentInput.value.trim(),
          tags,
          placeId
        };

        if (isEditing) {
          store.updateNote(note.id, data);
          showToast('Nota actualizada', 'success');
        } else {
          store.createNote({ ...data, projectId });
          showToast('Nota creada', 'success');
        }

        this.render(document.getElementById('app-main'));
        return true;
      }
    });
  }
}
