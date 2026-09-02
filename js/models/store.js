/* Writer OS — Almacén Central Reactivo y Persistencia */

import { sampleProjectData } from './sampleData.js';
import { countWords, createProject, createChapter, createCharacter, createNote, createGroup, createRelationship, createPlace } from './types.js';

const STORAGE_KEY = 'writer_os_storage_v1';
const ACTIVE_PROJECT_KEY = 'writer_os_active_project_id';
const THEME_KEY = 'writer_os_theme';
const CURRENT_SCHEMA_VERSION = 3;

class Store {
  constructor() {
    this.listeners = new Set();
    this.schemaVersion = CURRENT_SCHEMA_VERSION;
    this.data = {
      projects: [],
      chapters: [],
      characters: [],
      notes: [],
      groups: [],
      relationships: [],
      places: []
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
        this.schemaVersion = parsed.schemaVersion || 1;
        this.data = {
          projects: parsed.projects || [],
          chapters: parsed.chapters || [],
          characters: parsed.characters || [],
          notes: parsed.notes || [],
          groups: parsed.groups || [],
          relationships: parsed.relationships || [],
          places: parsed.places || []
        };

        // Migración de esquema si proviene de versión previa
        if (this.schemaVersion < CURRENT_SCHEMA_VERSION) {
          if (!this.data.groups) this.data.groups = [];
          if (!this.data.relationships) this.data.relationships = [];
          if (!this.data.places) this.data.places = [];
          this.schemaVersion = CURRENT_SCHEMA_VERSION;
          this.save();
        }
      } else {
        // Inicializar con datos de muestra solo en instalación limpia
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
      relationships: [...(sampleProjectData.relationships || [])],
      places: [...(sampleProjectData.places || [])]
    };
    this.save();
  }

  save() {
    try {
      const payload = {
        schemaVersion: this.schemaVersion || CURRENT_SCHEMA_VERSION,
        ...this.data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
    this.data.places = (this.data.places || []).filter(pl => pl.projectId !== id);

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

  getCharacter(id, projectId = null) {
    return this.data.characters.find(c => c.id === id && (!projectId || c.projectId === projectId)) || null;
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

    // Desvincular de capítulos del mismo proyecto
    this.data.chapters.forEach(ch => {
      if (ch.projectId === projectId && ch.characterIds && ch.characterIds.includes(id)) {
        ch.characterIds = ch.characterIds.filter(cid => cid !== id);
      }
    });

    // Eliminar relaciones vinculadas al personaje en este proyecto
    this.data.relationships = (this.data.relationships || []).filter(
      r => !(r.projectId === projectId && (r.sourceId === id || r.targetId === id))
    );

    // Limpiar líderes o fundadores que referencien al personaje en organizaciones de este proyecto
    (this.data.groups || []).forEach(g => {
      if (g.projectId === projectId) {
        if (g.leaderId === id) g.leaderId = null;
        if (g.founderId === id) g.founderId = null;
      }
    });

    // Limpiar autoridades en lugares de este proyecto que referencien al personaje eliminado
    (this.data.places || []).forEach(p => {
      if (p.projectId === projectId && p.authorities) {
        p.authorities = p.authorities.filter(a => a.characterId !== id);
      }
    });

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

  getGroup(id, projectId = null) {
    return (this.data.groups || []).find(g => g.id === id && (!projectId || g.projectId === projectId)) || null;
  }

  validateGroupReferences(params, projectId) {
    let leaderId = params.leaderId || null;
    let founderId = params.founderId || null;

    if (leaderId) {
      const leaderChar = this.getCharacter(leaderId, projectId);
      if (!leaderChar) leaderId = null;
    }
    if (founderId) {
      const founderChar = this.getCharacter(founderId, projectId);
      if (!founderChar) founderId = null;
    }
    return { leaderId, founderId };
  }

  createGroup(params) {
    const projectId = params.projectId || this.activeProjectId;
    const { leaderId, founderId } = this.validateGroupReferences(params, projectId);
    const group = createGroup({ ...params, projectId, leaderId, founderId });
    if (!this.data.groups) this.data.groups = [];
    this.data.groups.push(group);
    this.touchProject(projectId);
    this.save();
    return group;
  }

  updateGroup(id, patch) {
    const group = this.getGroup(id);
    if (!group) return null;
    const sanitizedPatch = { ...patch };
    if (patch.leaderId !== undefined || patch.founderId !== undefined) {
      const { leaderId, founderId } = this.validateGroupReferences({
        leaderId: patch.leaderId !== undefined ? patch.leaderId : group.leaderId,
        founderId: patch.founderId !== undefined ? patch.founderId : group.founderId
      }, group.projectId);
      if (patch.leaderId !== undefined) sanitizedPatch.leaderId = leaderId;
      if (patch.founderId !== undefined) sanitizedPatch.founderId = founderId;
    }
    Object.assign(group, sanitizedPatch, { updatedAt: new Date().toISOString() });
    this.touchProject(group.projectId);
    this.save();
    return group;
  }

  deleteGroup(id) {
    const group = this.getGroup(id);
    if (!group) return;
    const projectId = group.projectId;
    this.data.groups = (this.data.groups || []).filter(g => g.id !== id);

    // Eliminar relaciones vinculadas a la organización en este proyecto
    this.data.relationships = (this.data.relationships || []).filter(
      r => !(r.projectId === projectId && (r.sourceId === id || r.targetId === id))
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

  getRelationship(id, projectId = null) {
    return (this.data.relationships || []).find(r => r.id === id && (!projectId || r.projectId === projectId)) || null;
  }

  validateRelationship(params, projectId) {
    if (!projectId) return { valid: false, error: 'Se requiere un identificador de proyecto válido' };
    if (!params.sourceId || !params.targetId) return { valid: false, error: 'Se requieren ambas entidades para establecer el vínculo' };
    if (params.sourceId === params.targetId) return { valid: false, error: 'Una entidad no puede relacionarse consigo misma' };

    const src = this.getEntity(params.sourceId, projectId);
    const tgt = this.getEntity(params.targetId, projectId);
    if (!src || !tgt) return { valid: false, error: 'Ambas entidades deben existir en el mismo proyecto' };

    // Coherencia básica de fechas si ambas son numéricas
    if (params.startDate && params.endDate) {
      const numStart = parseInt(params.startDate, 10);
      const numEnd = parseInt(params.endDate, 10);
      if (!isNaN(numStart) && !isNaN(numEnd) && numStart > numEnd) {
        return { valid: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin' };
      }
    }
    return { valid: true, src, tgt };
  }

  createRelationship(params) {
    const projectId = params.projectId || this.activeProjectId;
    const validation = this.validateRelationship(params, projectId);
    if (!validation.valid) {
      console.warn('createRelationship rechazada:', validation.error);
      return null;
    }
    const relationship = createRelationship({
      ...params,
      projectId,
      sourceType: validation.src.type,
      targetType: validation.tgt.type
    });
    if (!this.data.relationships) this.data.relationships = [];
    this.data.relationships.push(relationship);
    this.touchProject(projectId);
    this.save();
    return relationship;
  }

  updateRelationship(id, patch) {
    const rel = this.getRelationship(id);
    if (!rel) return null;
    const merged = { ...rel, ...patch };
    const validation = this.validateRelationship(merged, rel.projectId);
    if (!validation.valid) {
      console.warn('updateRelationship rechazada:', validation.error);
      return null;
    }
    Object.assign(rel, patch, {
      sourceType: validation.src.type,
      targetType: validation.tgt.type,
      updatedAt: new Date().toISOString()
    });
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

  /* Consultas especializadas de relaciones con aislamiento por proyecto */
  getEntity(id, projectId = null) {
    const char = this.getCharacter(id, projectId);
    if (char) {
      return {
        id: char.id,
        projectId: char.projectId,
        name: char.name,
        subtitle: char.alias || char.role,
        color: char.avatarColor || '#B45309',
        type: 'character',
        original: char
      };
    }
    const group = this.getGroup(id, projectId);
    if (group) {
      return {
        id: group.id,
        projectId: group.projectId,
        name: group.name,
        subtitle: group.motto || group.type,
        color: group.color || '#4F46E5',
        type: 'group',
        original: group
      };
    }
    const place = this.getPlace(id, projectId);
    if (place) {
      return {
        id: place.id,
        projectId: place.projectId,
        name: place.name,
        subtitle: place.type,
        color: place.color || '#0D9488',
        type: 'place',
        original: place
      };
    }
    return null;
  }

  getCharacterRelationships(charId, projectId = this.activeProjectId) {
    const allRels = this.getRelationships(projectId);
    return allRels.filter(r => r.sourceId === charId || r.targetId === charId).map(rel => {
      const isSource = rel.sourceId === charId;
      const otherId = isSource ? rel.targetId : rel.sourceId;
      const otherEntity = this.getEntity(otherId, projectId);
      
      const myRole = isSource ? (rel.roleSource || rel.type) : (rel.roleTarget || rel.roleSource || rel.type);
      const otherRole = isSource ? (rel.roleTarget || rel.roleSource || rel.type) : (rel.roleSource || rel.type);

      return {
        relationship: rel,
        otherEntity,
        isSource,
        myRole,
        otherRole
      };
    }).filter(item => item.otherEntity !== null);
  }

  getCharacterFamily(charId, projectId = this.activeProjectId) {
    const rels = this.getRelationships(projectId).filter(r => r.category === 'familiar');
    const parents = [];
    const children = [];
    const siblings = [];
    const spouses = [];
    const ancestors = [];
    const descendants = [];
    const others = [];

    // 1. Relaciones afectivas (cónyuges, parejas, divorcios, viudedades)
    const loveRels = this.getRelationships(projectId).filter(
      r => r.category === 'afectiva' && (
        r.type === 'pareja' ||
        r.type === 'matrimonio' ||
        r.type === 'prometidos' ||
        r.type === 'expareja' ||
        r.type === 'amantes'
      )
    );

    loveRels.forEach(r => {
      if (r.sourceId === charId || r.targetId === charId) {
        const otherId = r.sourceId === charId ? r.targetId : r.sourceId;
        if (otherId === charId) return; // Evitar autorreferencia
        const other = this.getCharacter(otherId, projectId);
        if (other && !spouses.some(s => s.character.id === other.id)) {
          spouses.push({ character: other, relationship: r });
        }
      }
    });

    // 2. Progenitores e Hijos directos
    rels.forEach(r => {
      const isSource = r.sourceId === charId;
      const isTarget = r.targetId === charId;
      if (!isSource && !isTarget) return;

      const otherId = isSource ? r.targetId : r.sourceId;
      if (otherId === charId) return; // Evitar autorreferencia
      const other = this.getCharacter(otherId, projectId);
      if (!other) return;

      if (r.type === 'hermanos') {
        if (!siblings.some(s => s.character.id === other.id)) {
          siblings.push({ character: other, relationship: r });
        }
      } else if (r.type === 'progenitor_descendiente' || r.type === 'adopcion') {
        if (isSource) {
          // charId es progenitor, other es descendiente
          if (!children.some(c => c.character.id === other.id)) {
            children.push({ character: other, relationship: r });
          }
        } else {
          // other es progenitor, charId es descendiente
          if (!parents.some(p => p.character.id === other.id)) {
            parents.push({ character: other, relationship: r });
          }
        }
      } else if (r.type === 'abuelo_nieto') {
        if (isSource) {
          // charId es abuelo, other es nieto
          if (!descendants.some(d => d.character.id === other.id)) {
            descendants.push({ character: other, relationship: r, generation: -2 });
          }
        } else {
          // other es abuelo, charId es nieto
          if (!ancestors.some(a => a.character.id === other.id)) {
            ancestors.push({ character: other, relationship: r, generation: 2 });
          }
        }
      } else {
        if (!others.some(o => o.character.id === other.id)) {
          others.push({ character: other, relationship: r });
        }
      }
    });

    // 3. Inferencia de hermanos que comparten al menos un progenitor
    parents.forEach(p => {
      const parentRels = rels.filter(r =>
        (r.type === 'progenitor_descendiente' || r.type === 'adopcion') &&
        r.sourceId === p.character.id &&
        r.targetId !== charId
      );
      parentRels.forEach(pr => {
        const siblingChar = this.getCharacter(pr.targetId, projectId);
        if (
          siblingChar &&
          siblingChar.id !== charId &&
          !parents.some(par => par.character.id === siblingChar.id) &&
          !children.some(ch => ch.character.id === siblingChar.id) &&
          !siblings.some(s => s.character.id === siblingChar.id)
        ) {
          siblings.push({
            character: siblingChar,
            relationship: {
              id: `inferred-sib-${siblingChar.id}`,
              type: 'hermanos',
              category: 'familiar',
              roleSource: 'Hermano/a',
              roleTarget: 'Hermano/a',
              status: 'activa',
              isInferred: true
            }
          });
        }
      });
    });

    // 4. Búsqueda de Ancestros (Nivel +2: abuelos y bisabuelos a través de los progenitores)
    parents.forEach(p => {
      const gparents = rels.filter(r =>
        (r.type === 'progenitor_descendiente' || r.type === 'adopcion') &&
        r.targetId === p.character.id
      );
      gparents.forEach(gpr => {
        const grandParentChar = this.getCharacter(gpr.sourceId, projectId);
        if (
          grandParentChar &&
          grandParentChar.id !== charId &&
          !parents.some(par => par.character.id === grandParentChar.id) &&
          !ancestors.some(a => a.character.id === grandParentChar.id)
        ) {
          ancestors.push({
            character: grandParentChar,
            relationship: gpr,
            generation: 2,
            via: p.character
          });
        }
      });
    });

    // 5. Búsqueda de Descendientes (Nivel -2: nietos y bisnietos a través de los hijos)
    children.forEach(c => {
      const gchildren = rels.filter(r =>
        (r.type === 'progenitor_descendiente' || r.type === 'adopcion') &&
        r.sourceId === c.character.id
      );
      gchildren.forEach(gcr => {
        const grandChildChar = this.getCharacter(gcr.targetId, projectId);
        if (
          grandChildChar &&
          grandChildChar.id !== charId &&
          !children.some(ch => ch.character.id === grandChildChar.id) &&
          !descendants.some(d => d.character.id === grandChildChar.id)
        ) {
          descendants.push({
            character: grandChildChar,
            relationship: gcr,
            generation: -2,
            via: c.character
          });
        }
      });
    });

    return { ancestors, parents, children, siblings, spouses, descendants, others };
  }

  getGroupMembers(groupId, projectId = this.activeProjectId) {
    const rels = this.getRelationships(projectId).filter(
      r => r.category === 'pertenencia' && (r.targetId === groupId || r.sourceId === groupId)
    );

    return rels.map(r => {
      const isGroupTarget = r.targetId === groupId;
      const charId = isGroupTarget ? r.sourceId : r.targetId;
      const character = this.getCharacter(charId, projectId);
      const role = isGroupTarget ? (r.roleSource || 'Miembro') : (r.roleTarget || 'Miembro');

      return {
        character,
        role,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        relationship: r
      };
    }).filter(m => m.character !== null);
  }

  /* ==========================================================================
     Mundo y Lugares (Worldbuilding)
     ========================================================================== */
  getPlaces(projectId = this.activeProjectId) {
    return (this.data.places || [])
      .filter(p => p.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  getPlace(id, projectId = null) {
    return (this.data.places || []).find(p => p.id === id && (!projectId || p.projectId === projectId)) || null;
  }

  isPlaceAncestor(potentialAncestorId, targetId, projectId = this.activeProjectId) {
    if (!potentialAncestorId || !targetId) return false;
    if (potentialAncestorId === targetId) return true;

    let current = this.getPlace(targetId, projectId);
    const visited = new Set([targetId]);

    while (current && current.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      if (visited.has(current.parentId)) break; // Prevenir bucle infinito ante ciclos preexistentes
      visited.add(current.parentId);
      current = this.getPlace(current.parentId, projectId);
    }
    return false;
  }

  validatePlace(params, projectId, currentPlaceId = null) {
    if (!projectId) return { valid: false, error: 'Se requiere un identificador de proyecto válido' };
    if (!params.name || !params.name.trim()) return { valid: false, error: 'El lugar debe tener un nombre' };

    // Validar parentId
    if (params.parentId) {
      if (currentPlaceId && params.parentId === currentPlaceId) {
        return { valid: false, error: 'Un lugar no puede ser padre de sí mismo' };
      }
      const parent = this.getPlace(params.parentId, projectId);
      if (!parent) {
        return { valid: false, error: 'El lugar padre no existe en este proyecto' };
      }
      // Detección de ciclos: el nuevo padre no puede ser descendiente del lugar actual
      if (currentPlaceId && this.isPlaceAncestor(currentPlaceId, params.parentId, projectId)) {
        return { valid: false, error: 'La asignación crearía un ciclo jerárquico no permitido' };
      }
    }

    // Validar autoridades
    if (params.authorities && Array.isArray(params.authorities)) {
      for (const auth of params.authorities) {
        if (auth.characterId && !this.getCharacter(auth.characterId, projectId)) {
          return { valid: false, error: 'Una autoridad hace referencia a un personaje inexistente o foráneo' };
        }
      }
    }

    // Sanitizar extremos lineales si existen
    if (params.specificData) {
      if (params.specificData.originPlaceId && !this.getPlace(params.specificData.originPlaceId, projectId)) {
        params.specificData.originPlaceId = null;
      }
      if (params.specificData.destinationPlaceId && !this.getPlace(params.specificData.destinationPlaceId, projectId)) {
        params.specificData.destinationPlaceId = null;
      }
      if (params.specificData.mouthPlaceId && !this.getPlace(params.specificData.mouthPlaceId, projectId)) {
        params.specificData.mouthPlaceId = null;
      }
    }

    return { valid: true };
  }

  createPlace(params) {
    const projectId = params.projectId || this.activeProjectId;
    const validation = this.validatePlace(params, projectId);
    if (!validation.valid) {
      console.warn('createPlace rechazada:', validation.error);
      return null;
    }

    const place = createPlace({ ...params, projectId });
    if (!this.data.places) this.data.places = [];
    this.data.places.push(place);
    this.touchProject(projectId);
    this.save();
    return place;
  }

  updatePlace(id, patch) {
    const place = this.getPlace(id);
    if (!place) return null;

    const merged = { ...place, ...patch };
    const validation = this.validatePlace(merged, place.projectId, id);
    if (!validation.valid) {
      console.warn('updatePlace rechazada:', validation.error);
      return null;
    }

    Object.assign(place, patch, { updatedAt: new Date().toISOString() });
    this.touchProject(place.projectId);
    this.save();
    return place;
  }

  deletePlace(id) {
    const place = this.getPlace(id);
    if (!place) return;
    const projectId = place.projectId;

    // Eliminar el lugar
    this.data.places = (this.data.places || []).filter(p => p.id !== id);

    // 1. Limpiar relaciones donde el lugar sea origen o destino en este proyecto
    this.data.relationships = (this.data.relationships || []).filter(
      r => !(r.projectId === projectId && (r.sourceId === id || r.targetId === id))
    );

    // 2. Desvincular lugares hijos que tuvieran este lugar como padre
    (this.data.places || []).forEach(p => {
      if (p.projectId === projectId && p.parentId === id) {
        p.parentId = null;
      }
      // Limpiar también referencias en specificData (vías, ríos)
      if (p.projectId === projectId && p.specificData) {
        if (p.specificData.originPlaceId === id) p.specificData.originPlaceId = null;
        if (p.specificData.destinationPlaceId === id) p.specificData.destinationPlaceId = null;
        if (p.specificData.mouthPlaceId === id) p.specificData.mouthPlaceId = null;
      }
    });

    // 3. Desvincular notas asociadas a este lugar en este proyecto
    (this.data.notes || []).forEach(n => {
      if (n.projectId === projectId && n.placeId === id) {
        n.placeId = null;
      }
    });

    this.touchProject(projectId);
    this.save();
  }

  getPlaceHierarchy(projectId = this.activeProjectId) {
    const allPlaces = this.getPlaces(projectId);
    const placeMap = new Map();
    allPlaces.forEach(p => placeMap.set(p.id, { ...p, children: [] }));

    const roots = [];
    placeMap.forEach(place => {
      if (place.parentId && placeMap.has(place.parentId)) {
        placeMap.get(place.parentId).children.push(place);
      } else {
        roots.push(place);
      }
    });

    // Ordenar recursivamente los hijos por nombre
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) sortNodes(n.children);
      });
    };
    sortNodes(roots);

    return roots;
  }

  getPlaceBreadcrumbs(placeId, projectId = this.activeProjectId) {
    const breadcrumbs = [];
    let current = this.getPlace(placeId, projectId);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      breadcrumbs.unshift(current);
      if (!current.parentId) break;
      current = this.getPlace(current.parentId, projectId);
    }
    return breadcrumbs;
  }

  getPlaceDescendants(placeId, projectId = this.activeProjectId) {
    const descendants = [];
    const allPlaces = this.getPlaces(projectId);
    const queue = [placeId];
    const visited = new Set([placeId]);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = allPlaces.filter(p => p.parentId === currentId && !visited.has(p.id));
      children.forEach(ch => {
        visited.add(ch.id);
        descendants.push(ch);
        queue.push(ch.id);
      });
    }
    return descendants;
  }

  getPlaceRelationships(placeId, projectId = this.activeProjectId) {
    const allRels = this.getRelationships(projectId);
    return allRels.filter(r => r.sourceId === placeId || r.targetId === placeId).map(rel => {
      const isSource = rel.sourceId === placeId;
      const otherId = isSource ? rel.targetId : rel.sourceId;
      const otherEntity = this.getEntity(otherId, projectId);
      
      const myRole = isSource ? (rel.roleSource || rel.type) : (rel.roleTarget || rel.roleSource || rel.type);
      const otherRole = isSource ? (rel.roleTarget || rel.roleSource || rel.type) : (rel.roleSource || rel.type);

      return {
        relationship: rel,
        otherEntity,
        isSource,
        myRole,
        otherRole
      };
    }).filter(item => item.otherEntity !== null);
  }

  getNotesByPlace(placeId, projectId = this.activeProjectId) {
    return (this.data.notes || []).filter(n => n.projectId === projectId && n.placeId === placeId);
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
    let placeId = params.placeId || null;
    if (placeId && !this.getPlace(placeId, projectId)) {
      placeId = null;
    }
    const note = createNote({ ...params, projectId, placeId });
    if (!this.data.notes) this.data.notes = [];
    this.data.notes.push(note);
    this.touchProject(projectId);
    this.save();
    return note;
  }

  updateNote(id, patch) {
    const note = this.getNote(id);
    if (!note) return null;
    const sanitizedPatch = { ...patch };
    if (patch.placeId !== undefined) {
      if (patch.placeId && !this.getPlace(patch.placeId, note.projectId)) {
        sanitizedPatch.placeId = null;
      }
    }
    Object.assign(note, sanitizedPatch, { updatedAt: new Date().toISOString() });
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
      return { totalWords: 0, totalChapters: 0, totalCharacters: 0, totalNotes: 0, totalGroups: 0, totalRelationships: 0, totalPlaces: 0 };
    }
    const chapters = this.getChapters(projectId);
    const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
    const totalChapters = chapters.length;
    const totalCharacters = this.getCharacters(projectId).length;
    const totalNotes = this.getNotes(projectId).length;
    const totalGroups = this.getGroups(projectId).length;
    const totalRelationships = this.getRelationships(projectId).length;
    const totalPlaces = this.getPlaces(projectId).length;

    return {
      totalWords,
      totalChapters,
      totalCharacters,
      totalNotes,
      totalGroups,
      totalRelationships,
      totalPlaces,
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

    const places = (this.data.places || [])
      .filter(pl => !activeId || pl.projectId === activeId)
      .filter(pl =>
        pl.name.toLowerCase().includes(q) ||
        (pl.description && pl.description.toLowerCase().includes(q)) ||
        (pl.history && pl.history.toLowerCase().includes(q)) ||
        (pl.notes && pl.notes.toLowerCase().includes(q)) ||
        (pl.tags && pl.tags.some(t => t.toLowerCase().includes(q))) ||
        pl.type.toLowerCase().includes(q) ||
        pl.category.toLowerCase().includes(q)
      );

    const relationships = (this.data.relationships || [])
      .filter(r => !activeId || r.projectId === activeId)
      .filter(r => {
        const source = this.getEntity(r.sourceId, r.projectId);
        const target = this.getEntity(r.targetId, r.projectId);
        if (!source || !target) return false;
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

    return { projects, chapters, characters, notes, groups, relationships, places };
  }

  /* ==========================================================================
     Copia de Seguridad (Exportar / Importar)
     ========================================================================== */
  exportData() {
    return JSON.stringify({
      schemaVersion: this.schemaVersion || CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      projects: this.data.projects,
      chapters: this.data.chapters,
      characters: this.data.characters,
      notes: this.data.notes,
      groups: this.data.groups,
      relationships: this.data.relationships,
      places: this.data.places || []
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.projects)) {
        return false;
      }
      this.schemaVersion = parsed.schemaVersion || CURRENT_SCHEMA_VERSION;

      const projects = (parsed.projects || []).filter(p => p && p.id);
      const projectIds = new Set(projects.map(p => p.id));

      const chapters = (parsed.chapters || []).filter(c => c && c.id && projectIds.has(c.projectId));
      const characters = (parsed.characters || []).filter(c => c && c.id && projectIds.has(c.projectId));

      // Mapeo de personajes por proyecto
      const charMap = new Map();
      characters.forEach(c => {
        if (!charMap.has(c.projectId)) charMap.set(c.projectId, new Set());
        charMap.get(c.projectId).add(c.id);
      });

      // Sanitizar grupos: limpiar founderId o leaderId si no existen o son de otro proyecto
      const groups = (parsed.groups || [])
        .filter(g => g && g.id && projectIds.has(g.projectId))
        .map(g => {
          const charsInProj = charMap.get(g.projectId);
          const validLeader = g.leaderId && charsInProj && charsInProj.has(g.leaderId) ? g.leaderId : null;
          const validFounder = g.founderId && charsInProj && charsInProj.has(g.founderId) ? g.founderId : null;
          return {
            ...g,
            leaderId: validLeader,
            founderId: validFounder
          };
        });

      const groupMap = new Map();
      groups.forEach(g => {
        if (!groupMap.has(g.projectId)) groupMap.set(g.projectId, new Set());
        groupMap.get(g.projectId).add(g.id);
      });

      // Validar y sanear lugares
      const rawPlaces = (parsed.places || []).filter(pl => pl && pl.id && projectIds.has(pl.projectId));
      const placeMapByProj = new Map();
      rawPlaces.forEach(pl => {
        if (!placeMapByProj.has(pl.projectId)) placeMapByProj.set(pl.projectId, new Set());
        placeMapByProj.get(pl.projectId).add(pl.id);
      });

      const places = rawPlaces.map(pl => {
        const projPlaces = placeMapByProj.get(pl.projectId);
        const charsInProj = charMap.get(pl.projectId);

        // Sanear parentId: debe existir en el mismo proyecto y no ser él mismo
        let parentId = pl.parentId && projPlaces && projPlaces.has(pl.parentId) && pl.parentId !== pl.id
          ? pl.parentId
          : null;

        // Sanear autoridades: personajes deben existir en el proyecto
        const authorities = (pl.authorities || []).filter(a => a && a.characterId && charsInProj && charsInProj.has(a.characterId));

        // Sanear referencias lineales en specificData
        const spec = { ...(pl.specificData || {}) };
        if (spec.originPlaceId && (!projPlaces || !projPlaces.has(spec.originPlaceId))) spec.originPlaceId = null;
        if (spec.destinationPlaceId && (!projPlaces || !projPlaces.has(spec.destinationPlaceId))) spec.destinationPlaceId = null;
        if (spec.mouthPlaceId && (!projPlaces || !projPlaces.has(spec.mouthPlaceId))) spec.mouthPlaceId = null;

        return {
          ...pl,
          parentId,
          authorities,
          specificData: spec
        };
      });

      // Re-comprobar ciclos simples en jerarquía tras sanitización
      const finalPlacesMap = new Map(places.map(p => [p.id, p]));
      places.forEach(p => {
        if (p.parentId) {
          let curr = finalPlacesMap.get(p.parentId);
          const visited = new Set([p.id]);
          let hasCycle = false;
          while (curr && curr.parentId) {
            if (visited.has(curr.parentId)) {
              hasCycle = true;
              break;
            }
            visited.add(curr.id);
            curr = finalPlacesMap.get(curr.parentId);
          }
          if (hasCycle) p.parentId = null;
        }
      });

      // Sanitizar notas: placeId debe existir en el mismo proyecto si viene informado
      const notes = (parsed.notes || [])
        .filter(n => n && n.id && projectIds.has(n.projectId))
        .map(n => {
          const projPlaces = placeMapByProj.get(n.projectId);
          const validPlaceId = n.placeId && projPlaces && projPlaces.has(n.placeId) ? n.placeId : null;
          return {
            ...n,
            placeId: validPlaceId
          };
        });

      // Validar relaciones: soportar character, group y place
      const relationships = (parsed.relationships || []).filter(r => {
        if (!r || !r.id || !projectIds.has(r.projectId)) return false;
        if (!r.sourceId || !r.targetId || r.sourceId === r.targetId) return false;

        const charsInProj = charMap.get(r.projectId);
        const groupsInProj = groupMap.get(r.projectId);
        const placesInProj = placeMapByProj.get(r.projectId);

        const isSourceChar = charsInProj && charsInProj.has(r.sourceId);
        const isSourceGroup = groupsInProj && groupsInProj.has(r.sourceId);
        const isSourcePlace = placesInProj && placesInProj.has(r.sourceId);

        const isTargetChar = charsInProj && charsInProj.has(r.targetId);
        const isTargetGroup = groupsInProj && groupsInProj.has(r.targetId);
        const isTargetPlace = placesInProj && placesInProj.has(r.targetId);

        // Ambas entidades deben existir en el mismo proyecto
        if ((!isSourceChar && !isSourceGroup && !isSourcePlace) || (!isTargetChar && !isTargetGroup && !isTargetPlace)) {
          return false;
        }

        // Si sourceType o targetType están especificados pero discrepan de la entidad real, descartar
        if (r.sourceType === 'character' && !isSourceChar) return false;
        if (r.sourceType === 'group' && !isSourceGroup) return false;
        if (r.sourceType === 'place' && !isSourcePlace) return false;
        if (r.targetType === 'character' && !isTargetChar) return false;
        if (r.targetType === 'group' && !isTargetGroup) return false;
        if (r.targetType === 'place' && !isTargetPlace) return false;

        return true;
      });

      this.data = {
        projects,
        chapters,
        characters,
        notes,
        groups,
        relationships,
        places
      };
      if (this.data.projects.length > 0) {
        this.activeProjectId = this.data.projects[0].id;
      } else {
        this.activeProjectId = null;
      }
      this.save();
      return true;
    } catch (e) {
      console.error('Error al importar datos JSON:', e);
      return false;
    }
  }
}

export const store = new Store();
