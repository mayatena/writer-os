/* Writer OS — Almacén Central Reactivo y Persistencia */

import { sampleProjectData } from './sampleData.js';
import { countWords, createProject, createChapter, createCharacter, createNote, createGroup, createRelationship } from './types.js';

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
      notes: [],
      groups: [],
      relationships: []
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
        const parsed = JSON.parse(stored);
        this.data = {
          projects: parsed.projects || [],
          chapters: parsed.chapters || [],
          characters: parsed.characters || [],
          notes: parsed.notes || [],
          groups: parsed.groups || [],
          relationships: parsed.relationships || []
        };

        // Migración suave: si el proyecto de muestra ya existe pero no tiene grupos/relaciones
        const sampleProj = this.data.projects.find(p => p.id === 'proj-susurro-sombras');
        if (sampleProj) {
          const sampleGroups = this.data.groups.filter(g => g.projectId === 'proj-susurro-sombras');
          if (sampleGroups.length === 0 && sampleProjectData.groups) {
            this.data.groups.push(...sampleProjectData.groups);
          }
          const sampleRels = this.data.relationships.filter(r => r.projectId === 'proj-susurro-sombras');
          if (sampleRels.length === 0 && sampleProjectData.relationships) {
            this.data.relationships.push(...sampleProjectData.relationships);
          }
          // Añadir personaje Silvia Thorne si no está en la muestra anterior
          if (!this.data.characters.some(c => c.id === 'char-silvia')) {
            const silvia = sampleProjectData.characters.find(c => c.id === 'char-silvia');
            if (silvia) this.data.characters.push(silvia);
          }
        }
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
      notes: [...sampleProjectData.notes],
      groups: [...(sampleProjectData.groups || [])],
      relationships: [...(sampleProjectData.relationships || [])]
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
    this.data.groups = (this.data.groups || []).filter(g => g.projectId !== id);
    this.data.relationships = (this.data.relationships || []).filter(r => r.projectId !== id);

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

    // Eliminar relaciones vinculadas al personaje
    this.data.relationships = (this.data.relationships || []).filter(
      r => r.sourceId !== id && r.targetId !== id
    );

    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Grupos / Organizaciones / Casas Nobles / Dinastías
     ========================================================================== */
  getGroups(projectId = this.activeProjectId) {
    return (this.data.groups || [])
      .filter(g => g.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  getGroup(id) {
    return (this.data.groups || []).find(g => g.id === id) || null;
  }

  createGroup(params) {
    const projectId = params.projectId || this.activeProjectId;
    const group = createGroup({ ...params, projectId });
    if (!this.data.groups) this.data.groups = [];
    this.data.groups.push(group);
    this.touchProject(projectId);
    this.save();
    return group;
  }

  updateGroup(id, patch) {
    const group = this.getGroup(id);
    if (!group) return null;
    Object.assign(group, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(group.projectId);
    this.save();
    return group;
  }

  deleteGroup(id) {
    const group = this.getGroup(id);
    if (!group) return;
    const projectId = group.projectId;
    this.data.groups = (this.data.groups || []).filter(g => g.id !== id);

    // Eliminar relaciones vinculadas a la organización
    this.data.relationships = (this.data.relationships || []).filter(
      r => r.sourceId !== id && r.targetId !== id
    );

    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Relaciones
     ========================================================================== */
  getRelationships(projectId = this.activeProjectId) {
    return (this.data.relationships || [])
      .filter(r => r.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getRelationship(id) {
    return (this.data.relationships || []).find(r => r.id === id) || null;
  }

  createRelationship(params) {
    const projectId = params.projectId || this.activeProjectId;
    const relationship = createRelationship({ ...params, projectId });
    if (!this.data.relationships) this.data.relationships = [];
    this.data.relationships.push(relationship);
    this.touchProject(projectId);
    this.save();
    return relationship;
  }

  updateRelationship(id, patch) {
    const rel = this.getRelationship(id);
    if (!rel) return null;
    Object.assign(rel, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(rel.projectId);
    this.save();
    return rel;
  }

  deleteRelationship(id) {
    const rel = this.getRelationship(id);
    if (!rel) return;
    const projectId = rel.projectId;
    this.data.relationships = (this.data.relationships || []).filter(r => r.id !== id);
    this.touchProject(projectId);
    this.save();
  }

  /* Consultas especializadas de relaciones */
  getEntity(id) {
    const char = this.getCharacter(id);
    if (char) {
      return {
        id: char.id,
        name: char.name,
        subtitle: char.alias || char.role,
        color: char.avatarColor || '#B45309',
        type: 'character',
        original: char
      };
    }
    const group = this.getGroup(id);
    if (group) {
      return {
        id: group.id,
        name: group.name,
        subtitle: group.motto || group.type,
        color: group.color || '#4F46E5',
        type: 'group',
        original: group
      };
    }
    return null;
  }

  getCharacterRelationships(charId, projectId = this.activeProjectId) {
    const allRels = this.getRelationships(projectId);
    return allRels.filter(r => r.sourceId === charId || r.targetId === charId).map(rel => {
      const isSource = rel.sourceId === charId;
      const otherId = isSource ? rel.targetId : rel.sourceId;
      const otherEntity = this.getEntity(otherId);
      const myRole = isSource ? rel.roleSource : (rel.isSymmetric ? rel.roleSource : rel.roleTarget);
      const otherRole = isSource ? (rel.isSymmetric ? rel.roleSource : rel.roleTarget) : rel.roleSource;

      return {
        relationship: rel,
        otherEntity,
        isSource,
        myRole: myRole || rel.type,
        otherRole: otherRole || rel.type
      };
    });
  }

  getCharacterFamily(charId, projectId = this.activeProjectId) {
    const rels = this.getRelationships(projectId).filter(r => r.category === 'familiar');
    const parents = [];
    const children = [];
    const siblings = [];
    const spouses = [];
    const others = [];

    // También buscar relaciones afectivas de tipo matrimonio/pareja
    const loveRels = this.getRelationships(projectId).filter(
      r => r.category === 'afectiva' && (r.type === 'pareja' || r.type === 'matrimonio')
    );

    loveRels.forEach(r => {
      if (r.sourceId === charId || r.targetId === charId) {
        const otherId = r.sourceId === charId ? r.targetId : r.sourceId;
        const other = this.getCharacter(otherId);
        if (other && !spouses.some(s => s.character.id === other.id)) {
          spouses.push({ character: other, relationship: r });
        }
      }
    });

    rels.forEach(r => {
      const isSource = r.sourceId === charId;
      const isTarget = r.targetId === charId;
      if (!isSource && !isTarget) return;

      const otherId = isSource ? r.targetId : r.sourceId;
      const other = this.getCharacter(otherId);
      if (!other) return;

      if (r.type === 'hermanos') {
        if (!siblings.some(s => s.character.id === other.id)) {
          siblings.push({ character: other, relationship: r });
        }
      } else if (r.type === 'progenitor_descendiente' || r.type === 'adopcion') {
        if (isSource) {
          // Yo soy el progenitor, el otro es mi descendiente/hijo
          if (!children.some(c => c.character.id === other.id)) {
            children.push({ character: other, relationship: r });
          }
        } else {
          // Yo soy el descendiente, el otro es mi progenitor/padre/madre
          if (!parents.some(p => p.character.id === other.id)) {
            parents.push({ character: other, relationship: r });
          }
        }
      } else {
        if (!others.some(o => o.character.id === other.id)) {
          others.push({ character: other, relationship: r });
        }
      }
    });

    return { parents, children, siblings, spouses, others };
  }

  getGroupMembers(groupId, projectId = this.activeProjectId) {
    const rels = this.getRelationships(projectId).filter(
      r => r.category === 'pertenencia' && (r.targetId === groupId || r.sourceId === groupId)
    );

    return rels.map(r => {
      const charId = r.targetId === groupId ? r.sourceId : r.targetId;
      const character = this.getCharacter(charId);
      return {
        character,
        role: r.roleSource || 'Miembro',
        relationship: r
      };
    }).filter(m => m.character !== null);
  }

  /* ==========================================================================
     Notas
     ========================================================================== */
  getNotes(projectId = this.activeProjectId) {
    return (this.data.notes || [])
      .filter(n => n.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getNote(id) {
    return (this.data.notes || []).find(n => n.id === id) || null;
  }

  createNote(params) {
    const projectId = params.projectId || this.activeProjectId;
    const note = createNote({ ...params, projectId });
    if (!this.data.notes) this.data.notes = [];
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
    this.data.notes = (this.data.notes || []).filter(n => n.id !== id);
    this.touchProject(projectId);
    this.save();
  }

  /* ==========================================================================
     Métricas y Estadísticas
     ========================================================================== */
  getProjectStats(projectId = this.activeProjectId) {
    const project = this.getProject(projectId);
    if (!project) {
      return { totalWords: 0, totalChapters: 0, totalCharacters: 0, totalNotes: 0, totalGroups: 0, totalRelationships: 0 };
    }
    const chapters = this.getChapters(projectId);
    const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
    const totalChapters = chapters.length;
    const totalCharacters = this.getCharacters(projectId).length;
    const totalNotes = this.getNotes(projectId).length;
    const totalGroups = this.getGroups(projectId).length;
    const totalRelationships = this.getRelationships(projectId).length;

    return {
      totalWords,
      totalChapters,
      totalCharacters,
      totalNotes,
      totalGroups,
      totalRelationships,
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
    if (!query || query.trim().length === 0) {
      return { projects: [], chapters: [], characters: [], notes: [], groups: [], relationships: [] };
    }
    const q = query.toLowerCase().trim();

    const projects = this.data.projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );

    const activeId = this.activeProjectId;

    const chapters = (this.data.chapters || [])
      .filter(c => !activeId || c.projectId === activeId)
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.summary && c.summary.toLowerCase().includes(q)) ||
        (c.content && c.content.toLowerCase().includes(q))
      );

    const characters = (this.data.characters || [])
      .filter(c => !activeId || c.projectId === activeId)
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.alias && c.alias.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(q)))
      );

    const notes = (this.data.notes || [])
      .filter(n => !activeId || n.projectId === activeId)
      .filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
      );

    const groups = (this.data.groups || [])
      .filter(g => !activeId || g.projectId === activeId)
      .filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.motto && g.motto.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.type.toLowerCase().includes(q)
      );

    const relationships = (this.data.relationships || [])
      .filter(r => !activeId || r.projectId === activeId)
      .filter(r => {
        const source = this.getEntity(r.sourceId);
        const target = this.getEntity(r.targetId);
        return (
          (source && source.name.toLowerCase().includes(q)) ||
          (target && target.name.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.roleSource && r.roleSource.toLowerCase().includes(q)) ||
          (r.roleTarget && r.roleTarget.toLowerCase().includes(q)) ||
          r.type.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      });

    return { projects, chapters, characters, notes, groups, relationships };
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
          notes: parsed.notes || [],
          groups: parsed.groups || [],
          relationships: parsed.relationships || []
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
