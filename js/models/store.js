/* Writer OS — Almacén Central Reactivo y Persistencia */

import { sampleProjectData } from './sampleData.js';
import { countWords, createProject, createChapter, createCharacter, createNote } from './types.js';

const STORAGE_KEY = 'writer_os_storage_v1';
const ACTIVE_PROJECT_KEY = 'writer_os_active_project_id';
const THEME_KEY = 'writer_os_theme';

class Store {
  constructor() {
    this.listeners = new Set();
    this.data = {
      projects: [],
      chapters: [],
      characters: [],
      notes: []
    };
    this.activeProjectId = null;
    this.theme = 'light';
    this.init();
  }

  init() {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', this.theme);

    // Cargar datos
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        // Inicializar con datos de muestra la primera vez
        this.loadSampleData();
      }
    } catch (err) {
      console.error('Error al cargar datos desde localStorage:', err);
      this.loadSampleData();
    }

    // Cargar proyecto activo
    const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (savedActiveId && this.data.projects.some(p => p.id === savedActiveId)) {
      this.activeProjectId = savedActiveId;
    } else if (this.data.projects.length > 0) {
      this.activeProjectId = this.data.projects[0].id;
    }
  }

  loadSampleData() {
    this.data = {
      projects: [sampleProjectData.project],
      chapters: [...sampleProjectData.chapters],
      characters: [...sampleProjectData.characters],
      notes: [...sampleProjectData.notes]
    };
    this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.error('Error al persistir en localStorage:', err);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('Error en suscriptor del Store:', err);
      }
    }
  }

  /* ==========================================================================
     Tema
     ========================================================================== */
  getTheme() {
    return this.theme;
  }

  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, this.theme);
    document.documentElement.setAttribute('data-theme', this.theme);
    this.notify();
  }

  toggleTheme() {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
  }

  /* ==========================================================================
     Proyectos
     ========================================================================== */
  getProjects() {
    return [...this.data.projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getProject(id) {
    return this.data.projects.find(p => p.id === id) || null;
  }

  getActiveProjectId() {
    return this.activeProjectId;
  }

  getActiveProject() {
    return this.getProject(this.activeProjectId);
  }

  setActiveProjectId(id) {
    if (id === null || this.data.projects.some(p => p.id === id)) {
      this.activeProjectId = id;
      if (id) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
      this.notify();
    }
  }

  createProject(params) {
    const project = createProject(params);
    this.data.projects.unshift(project);

    // Crear un primer capítulo de bienvenida vacío
    const initialChapter = createChapter({
      projectId: project.id,
      title: 'Capítulo 1: Inicio',
      order: 0,
      content: '<p>Comienza a escribir aquí la historia...</p>'
    });
    this.data.chapters.push(initialChapter);

    this.activeProjectId = project.id;
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    this.save();
    return project;
  }

  updateProject(id, patch) {
    const project = this.getProject(id);
    if (!project) return null;
    Object.assign(project, patch, { updatedAt: new Date().toISOString() });
    this.save();
    return project;
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.data.chapters = this.data.chapters.filter(c => c.projectId !== id);
    this.data.characters = this.data.characters.filter(ch => ch.projectId !== id);
    this.data.notes = this.data.notes.filter(n => n.projectId !== id);

    if (this.activeProjectId === id) {
      this.activeProjectId = this.data.projects.length > 0 ? this.data.projects[0].id : null;
      if (this.activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, this.activeProjectId);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    }
    this.save();
  }

  /* ==========================================================================
     Capítulos
     ========================================================================== */
  getChapters(projectId = this.activeProjectId) {
    return this.data.chapters
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  getChapter(id) {
    return this.data.chapters.find(c => c.id === id) || null;
  }

  createChapter(params) {
    const projectId = params.projectId || this.activeProjectId;
    const existing = this.getChapters(projectId);
    const order = existing.length;

    const chapter = createChapter({
      ...params,
      projectId,
      order
    });
    this.data.chapters.push(chapter);

    // Actualizar fecha del proyecto
    this.touchProject(projectId);
    this.save();
    return chapter;
  }

  updateChapter(id, patch) {
    const chapter = this.getChapter(id);
    if (!chapter) return null;
    Object.assign(chapter, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(chapter.projectId);
    this.save();
    return chapter;
  }

  reorderChapter(id, direction) {
    const chapter = this.getChapter(id);
    if (!chapter) return;
    const chapters = this.getChapters(chapter.projectId);
    const index = chapters.findIndex(c => c.id === id);

    if (direction === 'up' && index > 0) {
      const prev = chapters[index - 1];
      const temp = chapter.order;
      chapter.order = prev.order;
      prev.order = temp;
    } else if (direction === 'down' && index < chapters.length - 1) {
      const next = chapters[index + 1];
      const temp = chapter.order;
      chapter.order = next.order;
      next.order = temp;
    }

    this.touchProject(chapter.projectId);
    this.save();
  }

  deleteChapter(id) {
    const chapter = this.getChapter(id);
    if (!chapter) return;
    const projectId = chapter.projectId;
    this.data.chapters = this.data.chapters.filter(c => c.id !== id);

    // Reordenar índices
    const remaining = this.getChapters(projectId);
    remaining.forEach((chap, idx) => {
      chap.order = idx;
    });

    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Personajes
     ========================================================================== */
  getCharacters(projectId = this.activeProjectId) {
    return this.data.characters
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  getCharacter(id) {
    return this.data.characters.find(c => c.id === id) || null;
  }

  createCharacter(params) {
    const projectId = params.projectId || this.activeProjectId;
    const character = createCharacter({ ...params, projectId });
    this.data.characters.push(character);
    this.touchProject(projectId);
    this.save();
    return character;
  }

  updateCharacter(id, patch) {
    const character = this.getCharacter(id);
    if (!character) return null;
    Object.assign(character, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(character.projectId);
    this.save();
    return character;
  }

  deleteCharacter(id) {
    const character = this.getCharacter(id);
    if (!character) return;
    const projectId = character.projectId;
    this.data.characters = this.data.characters.filter(c => c.id !== id);

    // Desvincular de capítulos
    this.data.chapters.forEach(ch => {
      if (ch.characterIds && ch.characterIds.includes(id)) {
        ch.characterIds = ch.characterIds.filter(cid => cid !== id);
      }
    });

    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Notas
     ========================================================================== */
  getNotes(projectId = this.activeProjectId) {
    return this.data.notes
      .filter(n => n.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getNote(id) {
    return this.data.notes.find(n => n.id === id) || null;
  }

  createNote(params) {
    const projectId = params.projectId || this.activeProjectId;
    const note = createNote({ ...params, projectId });
    this.data.notes.push(note);
    this.touchProject(projectId);
    this.save();
    return note;
  }

  updateNote(id, patch) {
    const note = this.getNote(id);
    if (!note) return null;
    Object.assign(note, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(note.projectId);
    this.save();
    return note;
  }

  deleteNote(id) {
    const note = this.getNote(id);
    if (!note) return;
    const projectId = note.projectId;
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Métricas y Estadísticas
     ========================================================================== */
  getProjectStats(projectId = this.activeProjectId) {
    const project = this.getProject(projectId);
    if (!project) {
      return { totalWords: 0, totalChapters: 0, totalCharacters: 0, totalNotes: 0 };
    }
    const chapters = this.getChapters(projectId);
    const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
    const totalChapters = chapters.length;
    const totalCharacters = this.getCharacters(projectId).length;
    const totalNotes = this.getNotes(projectId).length;

    return {
      totalWords,
      totalChapters,
      totalCharacters,
      totalNotes,
      lastModified: project.updatedAt
    };
  }

  touchProject(projectId) {
    const p = this.getProject(projectId);
    if (p) {
      p.updatedAt = new Date().toISOString();
    }
  }

  /* ==========================================================================
     Búsqueda Global
     ========================================================================== */
  search(query) {
    if (!query || query.trim().length === 0) return { projects: [], chapters: [], characters: [], notes: [] };
    const q = query.toLowerCase().trim();

    const projects = this.data.projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );

    const activeId = this.activeProjectId;

    const chapters = this.data.chapters
      .filter(c => !activeId || c.projectId === activeId)
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.summary && c.summary.toLowerCase().includes(q)) ||
        (c.content && c.content.toLowerCase().includes(q))
      );

    const characters = this.data.characters
      .filter(c => !activeId || c.projectId === activeId)
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.alias && c.alias.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(q)))
      );

    const notes = this.data.notes
      .filter(n => !activeId || n.projectId === activeId)
      .filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
      );

    return { projects, chapters, characters, notes };
  }

  /* ==========================================================================
     Copia de Seguridad (Exportar / Importar)
     ========================================================================== */
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.projects)) {
        this.data = {
          projects: parsed.projects || [],
          chapters: parsed.chapters || [],
          characters: parsed.characters || [],
          notes: parsed.notes || []
        };
        if (this.data.projects.length > 0) {
          this.activeProjectId = this.data.projects[0].id;
        } else {
          this.activeProjectId = null;
        }
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error al importar datos JSON:', e);
      return false;
    }
  }
}

export const store = new Store();
