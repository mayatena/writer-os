/* Writer OS — Vista de Escritura y Panel Contextual */

import { store } from '../models/store.js';
import { countWords, estimateReadingTime } from '../models/types.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export class EditorView {
  constructor(app) {
    this.app = app;
    this.currentChapterId = null;
    this.saveTimeout = null;
    this.isInspectorOpen = true;
    this.isSidebarOpen = true;
    this.isSansFont = false;
  }

  render(container, params = {}) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    const chapters = store.getChapters(project.id);
    if (chapters.length === 0) {
      // Crear capítulo por defecto si no existe ninguno
      const newCh = store.createChapter({
        projectId: project.id,
        title: 'Capítulo 1: Comienzo',
        content: '<p></p>'
      });
      this.currentChapterId = newCh.id;
    } else if (params.chapterId && chapters.some(c => c.id === params.chapterId)) {
      this.currentChapterId = params.chapterId;
    } else if (!this.currentChapterId || !chapters.some(c => c.id === this.currentChapterId)) {
      this.currentChapterId = chapters[0].id;
    }

    const currentChapter = store.getChapter(this.currentChapterId);

    container.innerHTML = `
      <div class="editor-workspace">
        
        <!-- BARRA LATERAL IZQUIERDA: LISTA DE CAPÍTULOS -->
        <aside class="chapters-sidebar ${this.isSidebarOpen ? '' : 'is-collapsed'}" id="chapters-sidebar">
          <div class="chapters-sidebar-header">
            <span class="chapters-sidebar-title">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Capítulos (${chapters.length})</span>
            </span>
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-add-chapter" title="Añadir nuevo capítulo">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <div class="chapters-list" id="chapters-list">
            ${this.renderChaptersList(chapters, this.currentChapterId)}
          </div>
        </aside>

        <!-- ÁREA CENTRAL DE ESCRITURA -->
        <main class="editor-main">
          
          <!-- Barra de herramientas de texto -->
          <div class="editor-toolbar">
            <div class="toolbar-group">
              <button class="toolbar-btn" id="btn-toggle-sidebar" title="Alternar panel de capítulos">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              </button>
              <div class="toolbar-divider"></div>
              <button class="toolbar-btn" data-command="bold" title="Negrita (Ctrl + B)">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
              </button>
              <button class="toolbar-btn" data-command="italic" title="Cursiva (Ctrl + I)">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
              </button>
              <button class="toolbar-btn" data-command="formatBlock" data-value="h2" title="Encabezado de sección">
                <span style="font-weight: 700; font-size: 0.85rem;">H2</span>
              </button>
              <button class="toolbar-btn" data-command="formatBlock" data-value="h3" title="Subencabezado">
                <span style="font-weight: 700; font-size: 0.8rem;">H3</span>
              </button>
              <button class="toolbar-btn" data-command="formatBlock" data-value="blockquote" title="Cita textual">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>
              </button>
              <button class="toolbar-btn" id="btn-insert-divider" title="Separador de escena (* * *)">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <button class="toolbar-btn" data-command="insertUnorderedList" title="Lista de viñetas">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>

            <div class="toolbar-group">
              <button class="toolbar-btn ${this.isSansFont ? 'is-active' : ''}" id="btn-toggle-font" title="Alternar tipografía Serif / Sans">
                <span style="font-size: 0.8125rem;">${this.isSansFont ? 'Sans' : 'Serif'}</span>
              </button>
              <button class="toolbar-btn" id="btn-zen-mode" title="Modo concentración sin distracciones">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
              </button>
              <div class="toolbar-divider"></div>
              <button class="toolbar-btn ${this.isInspectorOpen ? 'is-active' : ''}" id="btn-toggle-inspector" title="Panel contextual de la obra">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
              </button>
            </div>
          </div>

          <!-- Lienzo de Lectura y Escritura -->
          <div class="editor-scroll-area">
            <div class="editor-document">
              <input
                type="text"
                class="chapter-title-input"
                id="chapter-title-input"
                value="${currentChapter ? currentChapter.title : ''}"
                placeholder="Título del capítulo..."
              />
              <div
                class="editor-body ${this.isSansFont ? 'font-sans' : ''}"
                id="editor-body"
                contenteditable="true"
                spellcheck="true"
                data-placeholder="Comienza a escribir este capítulo..."
              >${currentChapter ? currentChapter.content : ''}</div>
            </div>
          </div>

          <!-- Barra de Estado Inferior -->
          <div class="editor-status-bar">
            <div class="status-left">
              <span id="stat-chapter-words">0 palabras</span>
              <span>•</span>
              <span id="stat-chapter-chars">0 caracteres</span>
              <span>•</span>
              <span id="stat-reading-time">1 min de lectura</span>
            </div>
            <div class="status-right">
              <div class="save-indicator">
                <span class="save-dot" id="save-dot"></span>
                <span id="save-status-text">Guardado</span>
              </div>
            </div>
          </div>

        </main>

        <!-- BARRA LATERAL DERECHA: PANEL CONTEXTUAL -->
        <aside class="inspector-sidebar ${this.isInspectorOpen ? '' : 'is-collapsed'}" id="inspector-sidebar">
          ${this.renderInspectorContent(project, currentChapter)}
        </aside>

      </div>
    `;

    this.bindEvents(container, project);
    this.updateCounters();
  }

  renderChaptersList(chapters, currentId) {
    return chapters.map((c, index) => {
      const words = countWords(c.content);
      const isActive = c.id === currentId;
      return `
        <div class="chapter-item ${isActive ? 'is-active' : ''}" data-id="${c.id}">
          <div class="chapter-item-content">
            <span class="chapter-item-title">${c.title || 'Sin título'}</span>
            <span class="chapter-item-meta">${words.toLocaleString('es-ES')} pal.</span>
          </div>
          <div class="chapter-item-actions">
            ${index > 0 ? `
              <button class="chapter-move-btn btn-move-up" data-id="${c.id}" title="Subir capítulo">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
            ` : ''}
            ${index < chapters.length - 1 ? `
              <button class="chapter-move-btn btn-move-down" data-id="${c.id}" title="Bajar capítulo">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            ` : ''}
            <button class="chapter-move-btn btn-delete-chapter" data-id="${c.id}" title="Eliminar capítulo">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderInspectorContent(project, chapter) {
    if (!chapter) {
      return `<div style="padding: var(--space-md); color: var(--text-muted);">Selecciona un capítulo</div>`;
    }

    const assignedCharacters = (chapter.characterIds || [])
      .map(id => store.getCharacter(id))
      .filter(Boolean);

    const allProjectCharacters = store.getCharacters(project.id);
    const unassignedCharacters = allProjectCharacters.filter(
      ch => !(chapter.characterIds || []).includes(ch.id)
    );

    const projectNotes = store.getNotes(project.id);

    return `
      <div class="inspector-header">
        <span class="inspector-title">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Contexto del Capítulo</span>
        </span>
        <button class="btn btn-subtle btn-icon btn-sm" id="btn-close-inspector" title="Cerrar panel">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="inspector-content">
        <!-- Sinopsis del Capítulo -->
        <div class="inspector-section">
          <span class="inspector-section-title">
            <span>Sinopsis / Objetivo de escena</span>
          </span>
          <textarea
            class="form-textarea"
            id="chapter-summary-input"
            placeholder="¿Qué debe ocurrir en este capítulo? ¿Cuál es el giro o revelación?"
            style="min-height: 80px; font-size: 0.8125rem;"
          >${chapter.summary || ''}</textarea>
        </div>

        <!-- Personajes en este Capítulo -->
        <div class="inspector-section">
          <div class="inspector-section-title">
            <span>Personajes en escena (${assignedCharacters.length})</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;" id="inspector-chars-list">
            ${assignedCharacters.length === 0 ? `
              <div class="inspector-empty">No hay personajes asociados a este capítulo.</div>
            ` : assignedCharacters.map(ch => `
              <div class="inspector-character-tag" data-char-id="${ch.id}">
                <div style="display: flex; align-items: center;" class="char-clickable-name">
                  <span class="inspector-character-avatar" style="background-color: ${ch.avatarColor || 'var(--accent)'};">
                    ${ch.name.charAt(0).toUpperCase()}
                  </span>
                  <strong>${ch.name}</strong>
                  ${ch.alias ? `<span style="color: var(--text-muted); margin-left: 4px; font-size: 0.75rem;">("${ch.alias}")</span>` : ''}
                </div>
                <button class="btn btn-subtle btn-icon btn-sm btn-remove-char" data-char-id="${ch.id}" title="Quitar de este capítulo" style="width: 22px; height: 22px;">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Selector para asociar personajes -->
          ${unassignedCharacters.length > 0 ? `
            <div style="margin-top: 6px; display: flex; gap: 4px;">
              <select class="form-select" id="select-add-character" style="font-size: 0.8125rem; padding: 4px 8px;">
                <option value="">+ Asociar personaje...</option>
                ${unassignedCharacters.map(ch => `
                  <option value="${ch.id}">${ch.name} (${ch.alias || ch.role})</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Notas rápidas de consulta -->
        <div class="inspector-section">
          <div class="inspector-section-title">
            <span>Notas de consulta (${projectNotes.length})</span>
            <button class="btn btn-subtle btn-sm" id="btn-inspector-new-note" style="padding: 2px 6px; font-size: 0.6875rem;">+ Nueva</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${projectNotes.length === 0 ? `
              <div class="inspector-empty">No hay notas en el proyecto.</div>
            ` : projectNotes.slice(0, 4).map(n => `
              <div class="card card-clickable inspector-note-row" data-note-id="${n.id}" style="padding: 8px 10px;">
                <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);">${n.title}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${n.content}</div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  bindEvents(container, project) {
    const titleInput = container.querySelector('#chapter-title-input');
    const editorBody = container.querySelector('#editor-body');
    const summaryInput = container.querySelector('#chapter-summary-input');

    // Manejar entrada de texto con autoguardado suave
    const triggerAutoSave = () => {
      this.setSaveStatus('saving');
      this.updateCounters();
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveCurrentChapter();
      }, 600);
    };

    titleInput?.addEventListener('input', triggerAutoSave);
    editorBody?.addEventListener('input', triggerAutoSave);
    summaryInput?.addEventListener('input', triggerAutoSave);

    // Herramientas de formateo del editor (execCommand)
    container.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-command');
        const val = btn.getAttribute('data-value') || null;
        document.execCommand(cmd, false, val);
        editorBody?.focus();
        triggerAutoSave();
      });
    });

    // Separador de escena (* * *)
    container.querySelector('#btn-insert-divider')?.addEventListener('click', () => {
      document.execCommand('insertHorizontalRule', false, null);
      editorBody?.focus();
      triggerAutoSave();
    });

    // Alternar tipografía Serif / Sans
    container.querySelector('#btn-toggle-font')?.addEventListener('click', (e) => {
      this.isSansFont = !this.isSansFont;
      editorBody?.classList.toggle('font-sans', this.isSansFont);
      const btn = container.querySelector('#btn-toggle-font');
      btn.classList.toggle('is-active', this.isSansFont);
      btn.innerHTML = `<span style="font-size: 0.8125rem;">${this.isSansFont ? 'Sans' : 'Serif'}</span>`;
    });

    // Modo concentración / Zen
    container.querySelector('#btn-zen-mode')?.addEventListener('click', () => {
      const isZen = document.body.classList.toggle('zen-mode');
      const sidebar = container.querySelector('#chapters-sidebar');
      const inspector = container.querySelector('#inspector-sidebar');
      if (isZen) {
        sidebar?.classList.add('is-collapsed');
        inspector?.classList.add('is-collapsed');
        showToast('Modo concentración activado. Pulsa de nuevo para salir.', 'info');
      } else {
        sidebar?.classList.toggle('is-collapsed', !this.isSidebarOpen);
        inspector?.classList.toggle('is-collapsed', !this.isInspectorOpen);
      }
    });

    // Alternar barra de capítulos
    container.querySelector('#btn-toggle-sidebar')?.addEventListener('click', () => {
      this.isSidebarOpen = !this.isSidebarOpen;
      container.querySelector('#chapters-sidebar')?.classList.toggle('is-collapsed', !this.isSidebarOpen);
    });

    // Alternar panel contextual
    container.querySelector('#btn-toggle-inspector')?.addEventListener('click', () => {
      this.isInspectorOpen = !this.isInspectorOpen;
      container.querySelector('#inspector-sidebar')?.classList.toggle('is-collapsed', !this.isInspectorOpen);
      container.querySelector('#btn-toggle-inspector')?.classList.toggle('is-active', this.isInspectorOpen);
    });
    container.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
      this.isInspectorOpen = false;
      container.querySelector('#inspector-sidebar')?.classList.add('is-collapsed');
      container.querySelector('#btn-toggle-inspector')?.classList.remove('is-active');
    });

    // Añadir capítulo
    container.querySelector('#btn-add-chapter')?.addEventListener('click', () => {
      this.saveCurrentChapter();
      const chapters = store.getChapters(project.id);
      const nextNum = chapters.length + 1;
      const newCh = store.createChapter({
        projectId: project.id,
        title: `Capítulo ${nextNum}`,
        content: '<p></p>'
      });
      showToast(`Creado: Capítulo ${nextNum}`, 'success');
      this.currentChapterId = newCh.id;
      this.render(container, { chapterId: newCh.id });
    });

    // Clic en capítulo de la lista
    container.querySelectorAll('.chapter-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chapter-move-btn')) return;
        const id = item.getAttribute('data-id');
        if (id === this.currentChapterId) return;
        this.saveCurrentChapter();
        this.currentChapterId = id;
        this.render(container, { chapterId: id });
      });
    });

    // Reordenar capítulos: subir
    container.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        store.reorderChapter(id, 'up');
        this.render(container, { chapterId: this.currentChapterId });
      });
    });

    // Reordenar capítulos: bajar
    container.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        store.reorderChapter(id, 'down');
        this.render(container, { chapterId: this.currentChapterId });
      });
    });

    // Eliminar capítulo
    container.querySelectorAll('.btn-delete-chapter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const ch = store.getChapter(id);
        if (!ch) return;

        modal.confirm({
          title: `¿Eliminar "${ch.title}"?`,
          message: 'Se borrará el contenido del capítulo. Esta acción no se puede deshacer.',
          confirmText: 'Eliminar capítulo',
          isDanger: true,
          onConfirm: () => {
            store.deleteChapter(id);
            showToast('Capítulo eliminado', 'info');
            this.currentChapterId = null;
            this.render(container);
          }
        });
      });
    });

    // Inspector: Asociar personaje
    const charSelect = container.querySelector('#select-add-character');
    charSelect?.addEventListener('change', (e) => {
      const charId = e.target.value;
      if (!charId) return;
      const ch = store.getChapter(this.currentChapterId);
      if (ch) {
        const ids = ch.characterIds || [];
        if (!ids.includes(charId)) {
          store.updateChapter(ch.id, { characterIds: [...ids, charId] });
          showToast('Personaje asociado al capítulo', 'success');
          this.refreshInspector(container, project);
        }
      }
    });

    // Inspector: Quitar personaje asociado
    this.bindInspectorCharRemovals(container, project);

    // Inspector: Clic en personaje para ver su ficha
    this.bindInspectorCharClicks(container, project);

    // Inspector: Crear nota rápida
    container.querySelector('#btn-inspector-new-note')?.addEventListener('click', () => {
      this.app.navigate('notes', project.id, { createNew: true });
    });

    // Inspector: Clic en nota para verla
    container.querySelectorAll('.inspector-note-row').forEach(row => {
      row.addEventListener('click', () => {
        const noteId = row.getAttribute('data-note-id');
        this.app.navigate('notes', project.id, { noteId });
      });
    });
  }

  bindInspectorCharRemovals(container, project) {
    container.querySelectorAll('.btn-remove-char').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const charId = btn.getAttribute('data-char-id');
        const ch = store.getChapter(this.currentChapterId);
        if (ch) {
          const ids = (ch.characterIds || []).filter(id => id !== charId);
          store.updateChapter(ch.id, { characterIds: ids });
          this.refreshInspector(container, project);
        }
      });
    });
  }

  bindInspectorCharClicks(container, project) {
    container.querySelectorAll('.inspector-character-tag').forEach(tag => {
      tag.querySelector('.char-clickable-name')?.addEventListener('click', () => {
        const charId = tag.getAttribute('data-char-id');
        const character = store.getCharacter(charId);
        if (!character) return;

        // Mostrar ficha de personaje en modal sin salir del editor
        modal.open({
          title: character.name,
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: var(--space-md);">
              <div style="display: flex; align-items: center; gap: var(--space-md);">
                <div style="width: 44px; height: 44px; border-radius: 50%; background-color: ${character.avatarColor || 'var(--accent)'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;">
                  ${character.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style="font-size: 1.1rem; font-family: var(--font-serif);">${character.name}</h3>
                  <div style="font-size: 0.8125rem; color: var(--text-muted);">${character.alias ? `"${character.alias}" • ` : ''}${character.role}</div>
                </div>
              </div>

              ${character.description ? `
                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Descripción</div>
                  <p style="font-size: 0.875rem; line-height: 1.6;">${character.description}</p>
                </div>
              ` : ''}

              ${character.notes ? `
                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Secretos y Trasfondo</div>
                  <div style="background-color: var(--bg-subtle); padding: 10px; border-radius: var(--radius-md); font-size: 0.8125rem; line-height: 1.6; color: var(--text-secondary); border-left: 3px solid var(--accent);">
                    ${character.notes}
                  </div>
                </div>
              ` : ''}

              ${character.tags && character.tags.length > 0 ? `
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${character.tags.map(t => `<span class="badge">#${t}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `,
          confirmText: 'Cerrar ficha',
          showFooter: true
        });
      });
    });
  }

  refreshInspector(container, project) {
    const inspector = container.querySelector('#inspector-sidebar');
    const currentChapter = store.getChapter(this.currentChapterId);
    if (inspector && currentChapter) {
      inspector.innerHTML = this.renderInspectorContent(project, currentChapter);
      container.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
        this.isInspectorOpen = false;
        container.querySelector('#inspector-sidebar')?.classList.add('is-collapsed');
        container.querySelector('#btn-toggle-inspector')?.classList.remove('is-active');
      });
      const charSelect = container.querySelector('#select-add-character');
      charSelect?.addEventListener('change', (e) => {
        const charId = e.target.value;
        if (!charId) return;
        const ch = store.getChapter(this.currentChapterId);
        if (ch) {
          const ids = ch.characterIds || [];
          if (!ids.includes(charId)) {
            store.updateChapter(ch.id, { characterIds: [...ids, charId] });
            this.refreshInspector(container, project);
          }
        }
      });
      this.bindInspectorCharRemovals(container, project);
      this.bindInspectorCharClicks(container, project);
    }
  }

  saveCurrentChapter() {
    if (!this.currentChapterId) return;
    const titleInput = document.getElementById('chapter-title-input');
    const editorBody = document.getElementById('editor-body');
    const summaryInput = document.getElementById('chapter-summary-input');

    if (!titleInput || !editorBody) return;

    const title = titleInput.value.trim() || 'Sin título';
    const content = editorBody.innerHTML;
    const summary = summaryInput ? summaryInput.value.trim() : '';

    store.updateChapter(this.currentChapterId, {
      title,
      content,
      summary
    });

    // Actualizar nombre en la lista lateral
    const currentItem = document.querySelector(`.chapter-item[data-id="${this.currentChapterId}"] .chapter-item-title`);
    if (currentItem) {
      currentItem.textContent = title;
    }
    const currentMeta = document.querySelector(`.chapter-item[data-id="${this.currentChapterId}"] .chapter-item-meta`);
    if (currentMeta) {
      currentMeta.textContent = `${countWords(content).toLocaleString('es-ES')} pal.`;
    }

    this.setSaveStatus('saved');
  }

  updateCounters() {
    const editorBody = document.getElementById('editor-body');
    if (!editorBody) return;

    const text = editorBody.innerText || '';
    const words = countWords(text);
    const chars = text.length;
    const readingTime = estimateReadingTime(words);

    const wordsEl = document.getElementById('stat-chapter-words');
    const charsEl = document.getElementById('stat-chapter-chars');
    const readingEl = document.getElementById('stat-reading-time');

    if (wordsEl) wordsEl.textContent = `${words.toLocaleString('es-ES')} palabras`;
    if (charsEl) charsEl.textContent = `${chars.toLocaleString('es-ES')} caracteres`;
    if (readingEl) readingEl.textContent = readingTime;
  }

  setSaveStatus(status) {
    const dot = document.getElementById('save-dot');
    const text = document.getElementById('save-status-text');
    if (!dot || !text) return;

    if (status === 'saving') {
      dot.classList.add('is-saving');
      text.textContent = 'Guardando...';
    } else {
      dot.classList.remove('is-saving');
      text.textContent = 'Guardado';
    }
  }
}
