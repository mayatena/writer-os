/* Writer OS — Vista de Proyectos */

import { store } from '../models/store.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export class ProjectsView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const projects = store.getProjects();

    container.innerHTML = `
      <div class="view-container">
        <div class="section-header">
          <div>
            <h1 class="section-header-title">Mis Proyectos</h1>
            <p class="section-header-subtitle">Tu biblioteca de obras, novelas y relatos en desarrollo.</p>
          </div>
          <div style="display: flex; gap: var(--space-sm); align-items: center;">
            <button class="btn btn-secondary" id="btn-export-all" title="Descargar copia de seguridad de todos tus proyectos">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Exportar copia</span>
            </button>
            <button class="btn btn-secondary" id="btn-import-all" title="Restaurar copia de seguridad desde un archivo JSON">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Importar</span>
            </button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" />
            <button class="btn btn-primary" id="btn-new-project">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nuevo Proyecto</span>
            </button>
          </div>
        </div>

        ${projects.length === 0 ? this.renderEmptyState() : this.renderProjectsGrid(projects)}
      </div>
    `;

    this.bindEvents(container);
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </div>
        <h2 class="empty-state-title">No hay proyectos todavía</h2>
        <p class="empty-state-desc">Toda gran historia comienza con una primera página en blanco. Crea tu primer proyecto para empezar a escribir.</p>
        <button class="btn btn-primary btn-lg" id="btn-new-project-empty">
          Crear mi primer proyecto
        </button>
      </div>
    `;
  }

  renderProjectsGrid(projects) {
    const cardsHtml = projects.map(p => {
      const stats = store.getProjectStats(p.id);
      const formattedDate = new Date(p.updatedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <div class="card card-clickable project-card" data-project-id="${p.id}">
          <div class="project-card-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="project-card-type">${this.formatType(p.type)}</span>
              <div class="dropdown-actions" style="display: flex; gap: 4px;">
                <button class="btn btn-subtle btn-icon btn-sm btn-project-menu" data-project-id="${p.id}" title="Opciones">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
              </div>
            </div>
            <h2 class="project-card-title">${p.title}</h2>
            <p class="project-card-desc">${p.description || 'Sin descripción.'}</p>
          </div>
          <div class="project-card-footer">
            <div style="display: flex; gap: var(--space-md);">
              <span><strong>${stats.totalChapters}</strong> ${stats.totalChapters === 1 ? 'capítulo' : 'capítulos'}</span>
              <span><strong>${stats.totalWords.toLocaleString('es-ES')}</strong> palabras</span>
            </div>
            <span>${formattedDate}</span>
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

  formatType(type) {
    const map = {
      novela: 'Novela',
      relato: 'Relato corto',
      guion: 'Guion cinematográfico',
      antologia: 'Antología',
      otro: 'Obra literaria'
    };
    return map[type] || 'Obra';
  }

  bindEvents(container) {
    // Abrir proyecto al hacer clic en tarjeta
    container.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-project-menu')) return;
        const id = card.getAttribute('data-project-id');
        this.openProject(id);
      });
    });

    // Menú de opciones de proyecto
    container.querySelectorAll('.btn-project-menu').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-project-id');
        this.showProjectMenu(id);
      });
    });

    // Nuevo Proyecto
    container.querySelector('#btn-new-project')?.addEventListener('click', () => this.openNewProjectModal());
    container.querySelector('#btn-new-project-empty')?.addEventListener('click', () => this.openNewProjectModal());

    // Exportar todo
    container.querySelector('#btn-export-all')?.addEventListener('click', () => {
      const dataStr = store.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `writer-os-copia-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad descargada correctamente', 'success');
    });

    // Importar archivo
    const fileInput = container.querySelector('#import-file-input');
    container.querySelector('#btn-import-all')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const ok = store.importData(content);
          if (ok) {
            showToast('Datos restaurados con éxito', 'success');
            this.app.render();
          } else {
            showToast('El archivo JSON no es válido', 'error');
          }
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }

  openProject(id) {
    store.setActiveProjectId(id);
    this.app.navigate('overview', id);
  }

  openNewProjectModal() {
    modal.open({
      title: 'Crear nuevo proyecto',
      contentHtml: `
        <form id="form-new-project">
          <div class="form-group">
            <label class="form-label" for="proj-title">Título de la obra *</label>
            <input type="text" id="proj-title" class="form-input" placeholder="Ej: La Ciudad de las Sombras" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-type">Tipo de obra</label>
            <select id="proj-type" class="form-select">
              <option value="novela">Novela</option>
              <option value="relato">Relato corto</option>
              <option value="guion">Guion</option>
              <option value="antologia">Antología</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-desc">Sinopsis o premisa breve</label>
            <textarea id="proj-desc" class="form-textarea" placeholder="¿De qué trata tu historia? ¿Cuál es el conflicto principal?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-target">Meta de palabras (opcional)</label>
            <input type="number" id="proj-target" class="form-input" value="60000" step="1000" />
            <span class="form-hint">Te ayudará a visualizar tu progreso general en el resumen.</span>
          </div>
        </form>
      `,
      confirmText: 'Crear proyecto',
      onConfirm: (container) => {
        const titleInput = container.querySelector('#proj-title');
        const typeInput = container.querySelector('#proj-type');
        const descInput = container.querySelector('#proj-desc');
        const targetInput = container.querySelector('#proj-target');

        const title = titleInput.value.trim();
        if (!title) {
          titleInput.focus();
          showToast('Por favor, indica un título para el proyecto', 'error');
          return false;
        }

        const project = store.createProject({
          title,
          type: typeInput.value,
          description: descInput.value,
          targetWordCount: parseInt(targetInput.value, 10) || 50000
        });

        showToast(`Proyecto "${project.title}" creado`, 'success');
        this.app.navigate('overview', project.id);
        return true;
      }
    });
  }

  showProjectMenu(projectId) {
    const project = store.getProject(projectId);
    if (!project) return;

    modal.open({
      title: `Opciones de "${project.title}"`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <button class="btn btn-secondary" id="btn-edit-metadata" style="justify-content: flex-start;">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>Editar detalles del proyecto</span>
          </button>
          <button class="btn btn-danger" id="btn-delete-project" style="justify-content: flex-start; margin-top: var(--space-md);">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Eliminar proyecto definitivamente</span>
          </button>
        </div>
      `,
      showFooter: false,
      onOpen: (container) => {
        container.querySelector('#btn-edit-metadata')?.addEventListener('click', () => {
          modal.close();
          this.openEditProjectModal(project);
        });

        container.querySelector('#btn-delete-project')?.addEventListener('click', () => {
          modal.close();
          modal.confirm({
            title: `¿Eliminar "${project.title}"?`,
            message: `Se eliminarán permanentemente todos sus capítulos, personajes y notas asociadas. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar proyecto',
            isDanger: true,
            onConfirm: () => {
              store.deleteProject(project.id);
              showToast('Proyecto eliminado', 'info');
              this.app.render();
            }
          });
        });
      }
    });
  }

  openEditProjectModal(project) {
    modal.open({
      title: 'Editar proyecto',
      contentHtml: `
        <form id="form-edit-project">
          <div class="form-group">
            <label class="form-label" for="edit-proj-title">Título de la obra *</label>
            <input type="text" id="edit-proj-title" class="form-input" value="${project.title}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-proj-type">Tipo de obra</label>
            <select id="edit-proj-type" class="form-select">
              <option value="novela" ${project.type === 'novela' ? 'selected' : ''}>Novela</option>
              <option value="relato" ${project.type === 'relato' ? 'selected' : ''}>Relato corto</option>
              <option value="guion" ${project.type === 'guion' ? 'selected' : ''}>Guion</option>
              <option value="antologia" ${project.type === 'antologia' ? 'selected' : ''}>Antología</option>
              <option value="otro" ${project.type === 'otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-proj-desc">Sinopsis o premisa breve</label>
            <textarea id="edit-proj-desc" class="form-textarea">${project.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-proj-target">Meta de palabras</label>
            <input type="number" id="edit-proj-target" class="form-input" value="${project.targetWordCount || 50000}" step="1000" />
          </div>
        </form>
      `,
      confirmText: 'Guardar cambios',
      onConfirm: (container) => {
        const titleInput = container.querySelector('#edit-proj-title');
        const typeInput = container.querySelector('#edit-proj-type');
        const descInput = container.querySelector('#edit-proj-desc');
        const targetInput = container.querySelector('#edit-proj-target');

        const title = titleInput.value.trim();
        if (!title) {
          showToast('El título no puede estar vacío', 'error');
          return false;
        }

        store.updateProject(project.id, {
          title,
          type: typeInput.value,
          description: descInput.value,
          targetWordCount: parseInt(targetInput.value, 10) || 50000
        });

        showToast('Proyecto actualizado', 'success');
        this.app.render();
        return true;
      }
    });
  }
}
