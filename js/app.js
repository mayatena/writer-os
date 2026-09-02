/* Writer OS — Aplicación Principal y Enrutador */

import { store } from './models/store.js';
import { commandPalette } from './components/commandPalette.js';
import { modal } from './components/modal.js';
import { showToast } from './components/toast.js';

import { ProjectsView } from './views/projectsView.js';
import { OverviewView } from './views/overviewView.js';
import { EditorView } from './views/editorView.js';
import { CharactersView } from './views/charactersView.js';
import { NotesView } from './views/notesView.js';

class App {
  constructor() {
    this.currentView = 'projects'; // 'projects' | 'overview' | 'editor' | 'characters' | 'notes'
    this.viewParams = {};

    this.views = {
      projects: new ProjectsView(this),
      overview: new OverviewView(this),
      editor: new EditorView(this),
      characters: new CharactersView(this),
      notes: new NotesView(this)
    };

    this.navEl = document.getElementById('app-top-nav');
    this.mainEl = document.getElementById('app-main');

    this.init();
  }

  init() {
    // Escuchar cambios de hash para navegación por URL
    window.addEventListener('hashchange', () => this.handleHashChange());

    // Configurar acciones de la paleta de comandos (Ctrl + K)
    commandPalette.setActionCallback((action, payload) => {
      this.handlePaletteAction(action, payload);
    });

    // Suscribirse a cambios en el Store
    store.subscribe(() => {
      this.updateTopNav();
    });

    // Cargar ruta inicial
    this.handleHashChange();
  }

  handleHashChange() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/');

    if (!parts[0] || parts[0] === 'proyectos') {
      this.currentView = 'projects';
      this.viewParams = {};
    } else if (parts[0] === 'proyecto' && parts[1]) {
      const projectId = parts[1];
      const viewName = parts[2] || 'resumen';

      store.setActiveProjectId(projectId);

      const viewMap = {
        resumen: 'overview',
        escribir: 'editor',
        personajes: 'characters',
        notas: 'notes'
      };

      this.currentView = viewMap[viewName] || 'overview';
      this.viewParams = {
        chapterId: parts[3] || null,
        characterId: parts[3] || null,
        noteId: parts[3] || null
      };
    }

    this.render();
  }

  navigate(view, projectId = null, params = {}) {
    this.viewParams = params;
    this.currentView = view;

    const activeProject = projectId ? store.getProject(projectId) : store.getActiveProject();

    if (view === 'projects' || !activeProject) {
      window.location.hash = '#/proyectos';
      return;
    }

    store.setActiveProjectId(activeProject.id);

    const viewSlugMap = {
      overview: 'resumen',
      editor: 'escribir',
      characters: 'personajes',
      notes: 'notas'
    };

    const slug = viewSlugMap[view] || 'resumen';
    let extra = '';
    if (params.chapterId) extra = `/${params.chapterId}`;
    else if (params.characterId) extra = `/${params.characterId}`;
    else if (params.noteId) extra = `/${params.noteId}`;

    window.location.hash = `#/proyecto/${activeProject.id}/${slug}${extra}`;
  }

  render() {
    this.updateTopNav();
    const activeViewInstance = this.views[this.currentView];
    if (activeViewInstance && this.mainEl) {
      activeViewInstance.render(this.mainEl, this.viewParams);
    }
  }

  updateTopNav() {
    if (!this.navEl) return;

    const activeProject = store.getActiveProject();
    const isProjectsView = this.currentView === 'projects' || !activeProject;
    const theme = store.getTheme();
    const isDark = theme === 'dark';

    let leftHtml = '';
    let centerHtml = '';
    let rightHtml = '';

    if (isProjectsView) {
      leftHtml = `
        <div class="nav-breadcrumbs">
          <a href="#/proyectos" class="brand-logo">
            <svg class="icon icon-lg brand-icon" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            <span>Writer OS</span>
          </a>
          <span class="nav-breadcrumb-sep">/</span>
          <span class="nav-breadcrumb-current">Mis Proyectos</span>
        </div>
      `;
    } else {
      leftHtml = `
        <div class="nav-breadcrumbs">
          <a href="#/proyectos" class="brand-logo" title="Ir a todos los proyectos">
            <svg class="icon icon-lg brand-icon" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
          </a>
          <span class="nav-breadcrumb-sep">/</span>
          <a href="#/proyectos" class="nav-breadcrumb-link" title="Volver a la biblioteca">Proyectos</a>
          <span class="nav-breadcrumb-sep">/</span>
          <span class="nav-breadcrumb-current" title="${activeProject.title}">${activeProject.title}</span>
        </div>
      `;

      centerHtml = `
        <nav class="nav-tabs">
          <button class="nav-tab ${this.currentView === 'overview' ? 'is-active' : ''}" data-nav="overview">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Resumen</span>
          </button>
          <button class="nav-tab ${this.currentView === 'editor' ? 'is-active' : ''}" data-nav="editor">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            <span>Escribir</span>
          </button>
          <button class="nav-tab ${this.currentView === 'characters' ? 'is-active' : ''}" data-nav="characters">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Personajes</span>
          </button>
          <button class="nav-tab ${this.currentView === 'notes' ? 'is-active' : ''}" data-nav="notes">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>Notas</span>
          </button>
        </nav>
      `;
    }

    rightHtml = `
      <div class="nav-right">
        <button class="search-trigger-btn" id="btn-trigger-search" title="Búsqueda y Paleta de Comandos (Ctrl + K)">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Buscar...</span>
          <span class="shortcut palette-shortcut" style="margin-left: 6px;">Ctrl K</span>
        </button>

        <button class="btn btn-subtle btn-icon btn-sm" id="btn-toggle-theme" title="${isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}">
          ${isDark
            ? `<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
            : `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`}
        </button>
      </div>
    `;

    this.navEl.innerHTML = `
      <div class="nav-left">${leftHtml}</div>
      <div class="nav-center">${centerHtml}</div>
      ${rightHtml}
    `;

    // Vincular pestañas
    this.navEl.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-nav');
        this.navigate(view);
      });
    });

    // Abrir paleta de comandos
    this.navEl.querySelector('#btn-trigger-search')?.addEventListener('click', () => {
      commandPalette.open();
    });

    // Alternar tema
    this.navEl.querySelector('#btn-toggle-theme')?.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  handlePaletteAction(action, payload) {
    const activeProject = store.getActiveProject();

    if (action === 'navigate') {
      this.navigate(payload.view, payload.projectId);
    } else if (action === 'open-chapter') {
      this.navigate('editor', payload.projectId, { chapterId: payload.chapterId });
    } else if (action === 'open-character') {
      this.navigate('characters', payload.projectId, { characterId: payload.characterId });
    } else if (action === 'open-note') {
      this.navigate('notes', payload.projectId, { noteId: payload.noteId });
    } else if (action === 'create-chapter') {
      if (activeProject) {
        const chapters = store.getChapters(activeProject.id);
        const newCh = store.createChapter({
          projectId: activeProject.id,
          title: `Capítulo ${chapters.length + 1}`,
          content: '<p></p>'
        });
        showToast('Capítulo creado', 'success');
        this.navigate('editor', activeProject.id, { chapterId: newCh.id });
      }
    } else if (action === 'create-character') {
      if (activeProject) {
        this.navigate('characters', activeProject.id);
        setTimeout(() => this.views.characters.openCharacterModal(null, activeProject.id), 150);
      }
    } else if (action === 'create-note') {
      if (activeProject) {
        this.navigate('notes', activeProject.id, { createNew: true });
      }
    } else if (action === 'create-project') {
      this.views.projects.openNewProjectModal();
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
