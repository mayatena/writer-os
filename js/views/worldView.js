/* Writer OS — Vista de Mundo y Lugares (Worldbuilding) */

import { store } from '../models/store.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { PLACE_CATEGORIES, PLACE_TYPES_BY_CATEGORY, getPlaceCategoryIcon, escapeHtml } from '../models/types.js';

export class WorldView {
  constructor(app) {
    this.app = app;
    this.currentMode = 'categories'; // 'categories' (Explorador) | 'tree' (Jerarquía)
    this.selectedCategory = 'all';
    this.selectedSubtype = 'all';
    this.selectedTag = 'all';
    this.searchQuery = '';
    this.sortBy = 'name'; // 'name' | 'type' | 'recent'
    this.selectedPlaceId = null;
    this.collapsedTreeNodes = new Set();
    this.collapsedCategories = new Set();
    this.activeDetailTab = 'general'; // 'general' | 'location' | 'entities' | 'notes'
  }

  render(container) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    const allPlaces = store.getPlaces(project.id);
    const categoryCounts = {
      all: allPlaces.length,
      geografia: allPlaces.filter(p => p.category === 'geografia').length,
      asentamientos: allPlaces.filter(p => p.category === 'asentamientos').length,
      naturaleza: allPlaces.filter(p => p.category === 'naturaleza').length,
      infraestructura: allPlaces.filter(p => p.category === 'infraestructura').length,
      especiales: allPlaces.filter(p => p.category === 'especiales').length
    };

    container.innerHTML = `
      <div class="view-container">
        <div class="world-container">
          
          <!-- Encabezado de la Vista -->
          <div class="world-header">
            <div>
              <h1 class="world-header-title">Mundo y Lugares</h1>
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">
                Geografía, reinos, asentamientos, vías y enclaves de <em>${escapeHtml(project.title)}</em>
              </p>
            </div>
            <div class="world-header-actions">
              <!-- Selector de Modos: Explorador y Jerarquía -->
              <div class="world-subnav-modes">
                <button class="world-subnav-btn ${this.currentMode === 'categories' ? 'is-active' : ''}" data-mode="categories" title="Explorador por Categorías">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Explorador</span>
                </button>
                <button class="world-subnav-btn ${this.currentMode === 'tree' ? 'is-active' : ''}" data-mode="tree" title="Árbol Jerárquico">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
                  <span>Jerarquía</span>
                </button>
              </div>

              <!-- Botón Crear Nuevo Lugar -->
              <button class="btn btn-primary" id="btn-new-place">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Nuevo Lugar</span>
              </button>
            </div>
          </div>

          <!-- Contenido según el modo activo -->
          ${this.renderModeContent(project, allPlaces, categoryCounts)}

        </div>
      </div>
    `;

    this.bindEvents(container, project);
  }

  renderModeContent(project, allPlaces, categoryCounts) {
    if (this.currentMode === 'tree') {
      return this.renderTreeView(project);
    }
    return this.renderCategoriesView(project, allPlaces, categoryCounts);
  }

  /* ==========================================================================
     MODO 1: EXPLORADOR DE LUGARES
     ========================================================================== */
  renderCategoriesView(project, allPlaces, categoryCounts) {
    // 1. Filtrar por categoría
    let filtered = allPlaces;
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // 2. Filtrar por subtipo si aplica
    if (this.selectedSubtype !== 'all') {
      filtered = filtered.filter(p => p.type === this.selectedSubtype);
    }

    // 3. Filtrar por etiqueta si aplica
    if (this.selectedTag !== 'all') {
      filtered = filtered.filter(p => p.tags && p.tags.includes(this.selectedTag));
    }

    // 4. Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 5. Ordenar
    if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (this.sortBy === 'type') {
      filtered.sort((a, b) => a.type.localeCompare(b.type, 'es'));
    } else if (this.sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Subtipos disponibles para el selector cuando una categoría está activa
    const availableSubtypes = this.selectedCategory !== 'all'
      ? (PLACE_TYPES_BY_CATEGORY[this.selectedCategory] || [])
      : [];

    const isGroupedView = this.selectedCategory === 'all' && !this.searchQuery.trim() && this.selectedTag === 'all';

    return `
      <!-- Filtros Principales de Categoría -->
      <div class="world-category-pills">
        <button class="world-cat-pill ${this.selectedCategory === 'all' ? 'is-active' : ''}" data-category="all">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span>Todos los Lugares</span>
          <span class="world-cat-count">${categoryCounts.all}</span>
        </button>
        <button class="world-cat-pill ${this.selectedCategory === 'geografia' ? 'is-active' : ''}" data-category="geografia">
          ${getPlaceCategoryIcon('geografia', 'icon icon-sm')}
          <span>Geografía Mayor</span>
          <span class="world-cat-count">${categoryCounts.geografia}</span>
        </button>
        <button class="world-cat-pill ${this.selectedCategory === 'asentamientos' ? 'is-active' : ''}" data-category="asentamientos">
          ${getPlaceCategoryIcon('asentamientos', 'icon icon-sm')}
          <span>Asentamientos</span>
          <span class="world-cat-count">${categoryCounts.asentamientos}</span>
        </button>
        <button class="world-cat-pill ${this.selectedCategory === 'naturaleza' ? 'is-active' : ''}" data-category="naturaleza">
          ${getPlaceCategoryIcon('naturaleza', 'icon icon-sm')}
          <span>Geografía Natural</span>
          <span class="world-cat-count">${categoryCounts.naturaleza}</span>
        </button>
        <button class="world-cat-pill ${this.selectedCategory === 'infraestructura' ? 'is-active' : ''}" data-category="infraestructura">
          ${getPlaceCategoryIcon('infraestructura', 'icon icon-sm')}
          <span>Vías e Infraestructura</span>
          <span class="world-cat-count">${categoryCounts.infraestructura}</span>
        </button>
        <button class="world-cat-pill ${this.selectedCategory === 'especiales' ? 'is-active' : ''}" data-category="especiales">
          ${getPlaceCategoryIcon('especiales', 'icon icon-sm')}
          <span>Lugares Especiales</span>
          <span class="world-cat-count">${categoryCounts.especiales}</span>
        </button>
      </div>

      <!-- Barra de Búsqueda, Filtros y Ordenación -->
      <div class="world-toolbar">
        <div class="world-search-box">
          <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="world-search-input" class="world-search-input" placeholder="Buscar lugar por nombre, tipo, descripción o etiqueta..." value="${escapeHtml(this.searchQuery)}" />
          ${this.searchQuery ? `<button id="btn-clear-search" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; line-height:1;">&times;</button>` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          ${availableSubtypes.length > 0 ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.8125rem; color: var(--text-secondary);">Subtipo:</span>
              <select id="world-subtype-select" class="form-input" style="padding: 4px 8px; font-size: 0.8125rem; width: auto;">
                <option value="all">Todos los subtipos</option>
                ${availableSubtypes.map(st => `
                  <option value="${escapeHtml(st.id)}" ${this.selectedSubtype === st.id ? 'selected' : ''}>${escapeHtml(st.label)}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          ${this.selectedTag !== 'all' ? `
            <span class="place-tag" style="background: var(--accent-subtle); color: var(--accent-text); display: inline-flex; align-items: center; gap: 4px;">
              Etiqueta: <strong>${escapeHtml(this.selectedTag)}</strong>
              <button id="btn-clear-tag" style="background:none; border:none; cursor:pointer; color:inherit; font-size:0.9rem; line-height:1;">&times;</button>
            </span>
          ` : ''}

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.8125rem; color: var(--text-secondary);">Ordenar:</span>
            <select id="world-sort-select" class="form-input" style="padding: 4px 8px; font-size: 0.8125rem; width: auto;">
              <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Alfabético (A-Z)</option>
              <option value="type" ${this.sortBy === 'type' ? 'selected' : ''}>Tipo de Lugar</option>
              <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>Modificación reciente</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Contenido del Explorador -->
      ${filtered.length === 0 ? `
        <div class="card empty-state" style="text-align: center; padding: var(--space-2xl);">
          <div class="empty-state-icon" style="margin-bottom: var(--space-md); color: var(--text-muted);">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <h3 style="font-family: var(--font-serif); margin-bottom: 6px;">No se encontraron lugares</h3>
          <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto var(--space-lg) auto; font-size: 0.875rem;">
            ${this.searchQuery ? 'No hay ningún enclave que coincida con los términos de búsqueda o filtros.' : 'Comienza construyendo el mapa y los territorios de tu historia.'}
          </p>
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-primary" id="btn-empty-new-place">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Crear primer lugar</span>
            </button>
            ${(!this.searchQuery && project.id === 'proj-susurro-sombras') ? `
              <button class="btn btn-secondary" id="btn-restore-sample-world">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                <span>Recuperar lugares de ejemplo</span>
              </button>
            ` : ''}
          </div>
        </div>
      ` : isGroupedView ? `
        <!-- Vista Agrupada por Categorías con Secciones Plegables -->
        <div class="world-category-groups">
          ${Object.keys(PLACE_CATEGORIES).map(catKey => {
            const catMeta = PLACE_CATEGORIES[catKey];
            const catPlaces = filtered.filter(p => p.category === catKey);
            if (catPlaces.length === 0) return '';
            const isCollapsed = this.collapsedCategories.has(catKey);

            return `
              <div class="world-category-section" data-cat-key="${escapeHtml(catKey)}">
                <div class="world-category-section-header">
                  <button type="button" class="world-category-toggle-btn ${isCollapsed ? 'is-collapsed' : ''}" data-cat-toggle="${escapeHtml(catKey)}">
                    <svg class="icon icon-xs world-cat-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span class="world-cat-section-icon" style="color: ${escapeHtml(catMeta.color)};">
                      ${getPlaceCategoryIcon(catKey, 'icon icon-sm')}
                    </span>
                    <span class="world-cat-section-title">${escapeHtml(catMeta.label)}</span>
                    <span class="world-cat-section-badge">${catPlaces.length}</span>
                  </button>
                  <button class="btn btn-subtle btn-sm btn-add-in-cat" data-category="${escapeHtml(catKey)}" style="font-size:0.75rem;">
                    + Añadir en ${escapeHtml(catMeta.label.split(' ')[0])}
                  </button>
                </div>

                <div class="world-category-section-body ${isCollapsed ? 'is-collapsed' : ''}" id="cat-body-${escapeHtml(catKey)}">
                  <div class="world-grid">
                    ${catPlaces.map(place => this.renderPlaceCard(place, project)).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- Vista Plana con Filtros Activos -->
        <div class="world-grid">
          ${filtered.map(place => this.renderPlaceCard(place, project)).join('')}
        </div>
      `}
    `;
  }

  renderPlaceCard(place, project) {
    const catMeta = PLACE_CATEGORIES[place.category] || PLACE_CATEGORIES.geografia;
    const breadcrumbs = store.getPlaceBreadcrumbs(place.id, project.id);
    const parentPath = breadcrumbs.slice(0, -1).map(p => p.name).join(' > ');
    const typeLabel = this.formatTypeLabel(place.category, place.type);
    const children = store.getPlaces(project.id).filter(p => p.parentId === place.id);

    // Autoridades asignadas
    const authorities = (place.authorities || []).map(a => {
      const char = store.getCharacter(a.characterId, project.id);
      return char ? `${char.name}${a.title ? ` (${a.title})` : ''}` : null;
    }).filter(Boolean);

    // Datos contextuales destacados para escaneo visual
    let highlightSnippet = '';
    if (place.category === 'infraestructura' && (place.specificData?.originPlaceId || place.specificData?.destinationPlaceId)) {
      const orig = place.specificData.originPlaceId ? store.getPlace(place.specificData.originPlaceId, project.id) : null;
      const dest = place.specificData.destinationPlaceId ? store.getPlace(place.specificData.destinationPlaceId, project.id) : null;
      if (orig || dest) {
        highlightSnippet = `
          <div class="place-card-route-preview">
            <span>${orig ? escapeHtml(orig.name) : 'Inicio'}</span>
            <span style="color:var(--text-muted);">&rarr;</span>
            <span>${dest ? escapeHtml(dest.name) : 'Término'}</span>
            ${place.specificData.distance ? `<span class="place-card-dist">(${escapeHtml(place.specificData.distance)})</span>` : ''}
          </div>
        `;
      }
    } else if (place.category === 'geografia' && place.specificData?.capital) {
      highlightSnippet = `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px;"><strong>Capital:</strong> ${escapeHtml(place.specificData.capital)}</div>`;
    }

    return `
      <div class="card card-clickable place-card" data-place-id="${escapeHtml(place.id)}" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div class="place-card-accent-bar" style="background-color: ${escapeHtml(place.color || catMeta.color)};"></div>
        
        <div>
          <div class="place-card-top">
            <div class="place-card-identity">
              <div class="place-avatar-icon" style="background-color: ${escapeHtml(place.color || catMeta.color)}20; color: ${escapeHtml(place.color || catMeta.color)};">
                ${getPlaceCategoryIcon(place.category, 'icon icon-sm')}
              </div>
              <div class="place-card-title-group">
                <div class="place-card-name">${escapeHtml(place.name)}</div>
                <div class="place-card-subtitle">
                  <span class="place-badge place-cat-${escapeHtml(place.category)}">${escapeHtml(typeLabel)}</span>
                  <span class="place-status-badge status-${escapeHtml(place.status)}">${escapeHtml(this.formatStatus(place.status))}</span>
                </div>
              </div>
            </div>
          </div>

          ${parentPath ? `
            <div style="margin-top: 10px;">
              <span class="place-card-breadcrumb" title="${escapeHtml(parentPath)}">
                <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
                ${escapeHtml(parentPath)}
              </span>
            </div>
          ` : ''}

          ${highlightSnippet}

          <p class="place-card-desc" style="margin-top: 10px;">
            ${escapeHtml(place.description || 'Sin descripción general registrada.')}
          </p>

          ${authorities.length > 0 ? `
            <div class="place-card-authorities" style="margin-top: 8px;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Autoridad:</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 4px;">${escapeHtml(authorities[0])}${authorities.length > 1 ? ` (+${authorities.length - 1})` : ''}</span>
            </div>
          ` : ''}

          ${(place.tags && place.tags.length > 0) ? `
            <div class="place-card-tags" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px;">
              ${place.tags.map(tag => `<span class="place-tag tag-filterable" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="place-card-footer" style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${children.length > 0 ? `<span>${children.length} sub-lugares</span>` : '<span>Nivel hoja</span>'}
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-subtle btn-sm btn-view-place" data-place-id="${escapeHtml(place.id)}" title="Ver Ficha Detallada">
              <span>Ficha</span>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm btn-edit-place" data-place-id="${escapeHtml(place.id)}" title="Editar lugar">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm btn-delete-place" data-place-id="${escapeHtml(place.id)}" title="Eliminar lugar" style="color: var(--danger);">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     MODO 2: ÁRBOL JERÁRQUICO INTERACTIVO & SIN CLASIFICAR
     ========================================================================== */
  renderTreeView(project) {
    const allPlaces = store.getPlaces(project.id);
    const roots = store.getPlaceHierarchy(project.id);

    // Separar raíces estructuradas (que tienen descendientes o son continentes/mundos) de elementos huérfanos sin clasificar
    const structuredRoots = [];
    const unclassifiedPlaces = [];

    roots.forEach(root => {
      const hasChildren = root.children && root.children.length > 0;
      // Si tiene hijos o es categoría geográfica de primer nivel (mundo, continente), es una raíz estructurada
      if (hasChildren || root.category === 'geografia' || root.type === 'continente' || root.type === 'mundo') {
        structuredRoots.push(root);
      } else {
        unclassifiedPlaces.push(root);
      }
    });

    return `
      <div class="world-tree-container">
        <!-- Barra Superior de Acciones de Jerarquía -->
        <div class="world-tree-actions">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-tree-expand-all">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              <span>Expandir todo</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-tree-collapse-all">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
              <span>Colapsar todo</span>
            </button>
          </div>
          <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-left: auto;">
            <strong>${structuredRoots.length}</strong> territorios raíz estructurados
            ${unclassifiedPlaces.length > 0 ? `• <span style="color:var(--accent); font-weight:600;">${unclassifiedPlaces.length} sin clasificar</span>` : ''}
          </div>
        </div>

        ${allPlaces.length === 0 ? `
          <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
            No hay lugares registrados en este proyecto.
          </div>
        ` : `
          <!-- Árbol Estructurado -->
          <ul class="tree-list">
            ${structuredRoots.map(rootNode => this.renderTreeNode(rootNode, project)).join('')}
          </ul>

          <!-- Sección Especial: Sin clasificar en la jerarquía -->
          <div class="world-tree-unclassified-box">
            <div class="world-tree-unclassified-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span style="font-weight:700; font-size:0.875rem;">Sin clasificar en la jerarquía (${unclassifiedPlaces.length})</span>
              </div>
              <span style="font-size:0.75rem; color:var(--text-muted);">Lugares sin contenedor asignado ni sub-lugares</span>
            </div>
            
            ${unclassifiedPlaces.length === 0 ? `
              <div style="font-size:0.8125rem; color:var(--text-muted); font-style:italic; padding:6px 0;">
                No hay enclaves huérfanos. Todos los lugares registrados forman parte de la estructura territorial.
              </div>
            ` : `
              <div class="world-tree-unclassified-grid">
                ${unclassifiedPlaces.map(p => {
                  const catMeta = PLACE_CATEGORIES[p.category] || PLACE_CATEGORIES.geografia;
                  const typeLabel = this.formatTypeLabel(p.category, p.type);
                  return `
                    <div class="world-tree-unclassified-item">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="tree-node-icon" style="background-color: ${escapeHtml(p.color || catMeta.color)}25; color: ${escapeHtml(p.color || catMeta.color)};">
                          ${getPlaceCategoryIcon(p.category, 'icon icon-xs')}
                        </span>
                        <div>
                          <span class="btn-view-place" data-place-id="${escapeHtml(p.id)}" style="font-weight:600; font-size:0.8125rem; cursor:pointer; color:var(--text-primary);">
                            ${escapeHtml(p.name)}
                          </span>
                          <span class="place-badge place-cat-${escapeHtml(p.category)}" style="font-size:0.625rem; margin-left:4px;">${escapeHtml(typeLabel)}</span>
                        </div>
                      </div>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm btn-edit-place" data-place-id="${escapeHtml(p.id)}" style="padding:2px 8px; font-size:0.75rem;" title="Asignar lugar contenedor">
                          Asignar padre
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        `}
      </div>
    `;
  }

  renderTreeNode(node, project) {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = this.collapsedTreeNodes.has(node.id);
    const catMeta = PLACE_CATEGORIES[node.category] || PLACE_CATEGORIES.geografia;
    const typeLabel = this.formatTypeLabel(node.category, node.type);

    return `
      <li class="tree-item" data-node-id="${escapeHtml(node.id)}">
        <div class="tree-node-row">
          <div class="tree-node-left">
            ${hasChildren ? `
              <button class="tree-toggle-btn ${isCollapsed ? 'is-collapsed' : ''}" data-toggle-id="${escapeHtml(node.id)}" title="${isCollapsed ? 'Expandir rama' : 'Colapsar rama'}">
                <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            ` : `<span style="width: 20px; display:inline-block;"></span>`}

            <div class="tree-node-icon" style="background-color: ${escapeHtml(node.color || catMeta.color)}25; color: ${escapeHtml(node.color || catMeta.color)};">
              ${getPlaceCategoryIcon(node.category, 'icon icon-xs')}
            </div>

            <span class="tree-node-name btn-view-place" data-place-id="${escapeHtml(node.id)}" title="Clic para abrir ficha completa" style="cursor:pointer;">${escapeHtml(node.name)}</span>
            <span class="place-badge place-cat-${escapeHtml(node.category)}" style="font-size: 0.625rem;">${escapeHtml(typeLabel)}</span>
          </div>

          <div class="tree-node-right">
            ${hasChildren ? `
              <span class="tree-node-child-count">${node.children.length} descendientes</span>
            ` : ''}
            <button class="btn btn-secondary btn-sm btn-add-child-place" data-parent-id="${escapeHtml(node.id)}" title="Añadir lugar contenido dentro de ${escapeHtml(node.name)}" style="padding: 2px 8px; font-size: 0.75rem;">
              <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Sub-lugar</span>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm btn-edit-place" data-place-id="${escapeHtml(node.id)}" title="Editar lugar">
              <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
          </div>
        </div>

        ${hasChildren ? `
          <ul class="tree-children ${isCollapsed ? 'is-collapsed' : ''}" id="children-${escapeHtml(node.id)}">
            ${node.children.map(childNode => this.renderTreeNode(childNode, project)).join('')}
          </ul>
        ` : ''}
      </li>
    `;
  }

  /* ==========================================================================
     EVENT BINDINGS
     ========================================================================== */
  bindEvents(container, project) {
    // Cambio de Modo (Explorador / Jerarquía)
    container.querySelectorAll('.world-subnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode && mode !== this.currentMode) {
          this.currentMode = mode;
          this.render(container);
        }
      });
    });

    // Filtros por Categoría
    container.querySelectorAll('.world-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        if (cat) {
          this.selectedCategory = cat;
          this.selectedSubtype = 'all';
          this.render(container);
        }
      });
    });

    // Filtro por Subtipo
    container.querySelector('#world-subtype-select')?.addEventListener('change', (e) => {
      this.selectedSubtype = e.target.value;
      this.render(container);
    });

    // Plegar / Desplegar secciones de categoría en Explorador
    container.querySelectorAll('.world-category-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catKey = btn.getAttribute('data-cat-toggle');
        const bodyEl = container.querySelector(`#cat-body-${catKey}`);
        if (this.collapsedCategories.has(catKey)) {
          this.collapsedCategories.delete(catKey);
          btn.classList.remove('is-collapsed');
          bodyEl?.classList.remove('is-collapsed');
        } else {
          this.collapsedCategories.add(catKey);
          btn.classList.add('is-collapsed');
          bodyEl?.classList.add('is-collapsed');
        }
      });
    });

    // Botón directo para añadir en una categoría concreta
    container.querySelectorAll('.btn-add-in-cat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = btn.getAttribute('data-category');
        this.openPlaceModal(null, project.id, { category });
      });
    });

    // Búsqueda en tiempo real
    const searchInput = container.querySelector('#world-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render(container);
      const newSearchInput = container.querySelector('#world-search-input');
      newSearchInput?.focus();
      newSearchInput?.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
    });

    container.querySelector('#btn-clear-search')?.addEventListener('click', () => {
      this.searchQuery = '';
      this.render(container);
    });

    // Filtrar por clic en tag
    container.querySelectorAll('.tag-filterable').forEach(tagEl => {
      tagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedTag = tagEl.getAttribute('data-tag');
        this.render(container);
      });
    });

    container.querySelector('#btn-clear-tag')?.addEventListener('click', () => {
      this.selectedTag = 'all';
      this.render(container);
    });

    // Ordenación
    container.querySelector('#world-sort-select')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render(container);
    });

    // Botones de Creación y Restauración
    container.querySelector('#btn-new-place')?.addEventListener('click', () => this.openPlaceModal(null, project.id));
    container.querySelector('#btn-empty-new-place')?.addEventListener('click', () => this.openPlaceModal(null, project.id));
    container.querySelector('#btn-restore-sample-world')?.addEventListener('click', () => {
      store.restoreSampleWorldData(project.id);
      showToast('Lugares de ejemplo recuperados correctamente', 'success');
      this.render(container);
    });

    // Árbol: Añadir hijo
    container.querySelectorAll('.btn-add-child-place').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentId = btn.getAttribute('data-parent-id');
        this.openPlaceModal(null, project.id, { parentId });
      });
    });

    // Árbol: Toggle de nodo
    container.querySelectorAll('.tree-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeId = btn.getAttribute('data-toggle-id');
        const childrenUl = container.querySelector(`#children-${nodeId}`);
        if (this.collapsedTreeNodes.has(nodeId)) {
          this.collapsedTreeNodes.delete(nodeId);
          btn.classList.remove('is-collapsed');
          childrenUl?.classList.remove('is-collapsed');
        } else {
          this.collapsedTreeNodes.add(nodeId);
          btn.classList.add('is-collapsed');
          childrenUl?.classList.add('is-collapsed');
        }
      });
    });

    container.querySelector('#btn-tree-expand-all')?.addEventListener('click', () => {
      this.collapsedTreeNodes.clear();
      this.render(container);
    });

    container.querySelector('#btn-tree-collapse-all')?.addEventListener('click', () => {
      store.getPlaces(project.id).forEach(p => this.collapsedTreeNodes.add(p.id));
      this.render(container);
    });

    // Abrir Ficha de Lugar
    container.querySelectorAll('.btn-view-place').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeId = btn.getAttribute('data-place-id');
        const place = store.getPlace(placeId, project.id);
        if (place) this.openPlaceDetailModal(place, project.id);
      });
    });

    // Clic en la tarjeta de lugar
    container.querySelectorAll('.place-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.tag-filterable')) return;
        const placeId = card.getAttribute('data-place-id');
        const place = store.getPlace(placeId, project.id);
        if (place) this.openPlaceDetailModal(place, project.id);
      });
    });

    // Editar Lugar
    container.querySelectorAll('.btn-edit-place').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeId = btn.getAttribute('data-place-id');
        const place = store.getPlace(placeId, project.id);
        if (place) this.openPlaceModal(place, project.id);
      });
    });

    // Eliminar Lugar
    container.querySelectorAll('.btn-delete-place').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeId = btn.getAttribute('data-place-id');
        const place = store.getPlace(placeId, project.id);
        if (!place) return;

        modal.confirm({
          title: `¿Eliminar "${place.name}"?`,
          message: 'Se eliminará este lugar y sus relaciones asociadas. Los lugares contenidos pasarán a nivel raíz de forma segura sin borrarse.',
          confirmText: 'Eliminar Lugar',
          isDanger: true,
          onConfirm: () => {
            store.deletePlace(placeId);
            showToast(`Lugar "${place.name}" eliminado`, 'info');
            this.render(container);
          }
        });
      });
    });
  }

  /* ==========================================================================
     MODAL DE CREACIÓN Y EDICIÓN DE LUGAR
     ========================================================================== */
  openPlaceModal(place = null, projectId, initialValues = {}) {
    const isEdit = !!place;
    const currentCategory = place?.category || initialValues.category || 'geografia';
    const currentType = place?.type || initialValues.type || 'territorio';
    const currentParentId = place?.parentId || initialValues.parentId || '';

    const allPlaces = store.getPlaces(projectId).filter(p => !isEdit || p.id !== place.id);
    const validParentCandidates = allPlaces.filter(p => {
      if (!isEdit) return true;
      return !store.isPlaceAncestor(place.id, p.id, projectId);
    });

    const characters = store.getCharacters(projectId);
    let authoritiesList = place?.authorities ? JSON.parse(JSON.stringify(place.authorities)) : [];
    let selectedCat = currentCategory;
    let capturedSpecificData = place?.specificData ? { ...place.specificData } : {};

    const getTypesOptions = (category, activeType) => {
      const types = PLACE_TYPES_BY_CATEGORY[category] || PLACE_TYPES_BY_CATEGORY.geografia;
      return types.map(t => `
        <option value="${escapeHtml(t.id)}" ${t.id === activeType ? 'selected' : ''}>
          ${escapeHtml(t.label)}
        </option>
      `).join('');
    };

    const getContextualFieldsHtml = (category, data = {}) => {
      if (category === 'geografia') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Capital / Sede Territorial</label>
              <input type="text" id="field-capital" class="form-input" placeholder="Ej: Puerto Gris" value="${escapeHtml(data.capital || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Población Estimada</label>
              <input type="text" id="field-population" class="form-input" placeholder="Ej: 850.000 habitantes" value="${escapeHtml(data.population || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Sistema de Gobierno / Régimen Político</label>
            <input type="text" id="field-governmentSystem" class="form-input" placeholder="Ej: Regencia del Concilio y Tribunal" value="${escapeHtml(data.governmentSystem || '')}" />
          </div>
        `;
      } else if (category === 'asentamientos') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Población / Habitantes</label>
              <input type="text" id="field-population" class="form-input" placeholder="Ej: 12.000 habitantes" value="${escapeHtml(data.population || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Función Principal o Vocación</label>
              <input type="text" id="field-function" class="form-input" placeholder="Ej: Puerto comercial y custodia de archivos" value="${escapeHtml(data.function || '')}" />
            </div>
          </div>
        `;
      } else if (category === 'naturaleza') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Altitud / Cota o Profundidad</label>
              <input type="text" id="field-altitude" class="form-input" placeholder="Ej: 3.420 m s.n.m." value="${escapeHtml(data.altitude || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Peligros Ambientales o Fauna</label>
              <input type="text" id="field-hazards" class="form-input" placeholder="Ej: Desprendimientos y niebla tóxica" value="${escapeHtml(data.hazards || '')}" />
            </div>
          </div>
        `;
      } else if (category === 'infraestructura') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Lugar de Origen</label>
              <select id="field-originPlaceId" class="form-input">
                <option value="">-- Sin origen especificado --</option>
                ${allPlaces.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === data.originPlaceId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Lugar de Destino</label>
              <select id="field-destinationPlaceId" class="form-input">
                <option value="">-- Sin destino especificado --</option>
                ${allPlaces.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === data.destinationPlaceId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Puntos Intermedios o Paradas</label>
            <input type="text" id="field-intermediatePoints" class="form-input" placeholder="Ej: Posada del Cruce, Vado de Piedra" value="${escapeHtml(data.intermediatePoints || '')}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Distancia</label>
              <input type="text" id="field-distance" class="form-input" placeholder="Ej: 4.5 km o 12 leguas" value="${escapeHtml(data.distance || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Duración Estimada de Tránsito</label>
              <input type="text" id="field-duration" class="form-input" placeholder="Ej: 2 jornadas a pie / 1 a caballo" value="${escapeHtml(data.duration || '')}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Estado de la Vía</label>
              <input type="text" id="field-transitStatus" class="form-input" placeholder="Ej: Vigilada y empedrada / Bloqueada por nieve" value="${escapeHtml(data.transitStatus || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Control o Guarnición a Cargo</label>
              <input type="text" id="field-controlGroupOrEntity" class="form-input" placeholder="Ej: Orden del Velo" value="${escapeHtml(data.controlGroupOrEntity || '')}" />
            </div>
          </div>
        `;
      } else if (category === 'especiales') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nivel de Peligro / Secreto</label>
              <input type="text" id="field-dangerLevel" class="form-input" placeholder="Ej: Extremo o Clasificado" value="${escapeHtml(data.dangerLevel || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Requisitos de Acceso / Apertura</label>
              <input type="text" id="field-accessRequirements" class="form-input" placeholder="Ej: Medallón de Elena o Llave de los Siete" value="${escapeHtml(data.accessRequirements || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Efectos Sobrenaturales / Narrativos</label>
            <input type="text" id="field-supernaturalEffects" class="form-input" placeholder="Ej: Distorsión temporal y resonancia acústica" value="${escapeHtml(data.supernaturalEffects || '')}" />
          </div>
        `;
      }
      return '';
    };

    const renderAuthoritiesRows = () => {
      if (authoritiesList.length === 0) {
        return `
          <tr id="empty-auth-row">
            <td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 10px;">
              No hay autoridades asignadas. Pulsa en "+ Añadir Autoridad" para vincular gobernantes o responsables.
            </td>
          </tr>
        `;
      }
      return authoritiesList.map((auth, idx) => `
        <tr data-auth-idx="${idx}">
          <td style="padding: 4px 6px;">
            <select class="form-input auth-char-select" style="width:100%; font-size: 0.8125rem;">
              <option value="">-- Seleccionar Personaje --</option>
              ${characters.map(c => `
                <option value="${escapeHtml(c.id)}" ${c.id === auth.characterId ? 'selected' : ''}>
                  ${escapeHtml(c.name)}
                </option>
              `).join('')}
            </select>
          </td>
          <td style="padding: 4px 6px;">
            <input type="text" class="form-input auth-title-input" placeholder="Ej: Corregidor o Baronesa" value="${escapeHtml(auth.title || '')}" style="width:100%; font-size: 0.8125rem;" />
          </td>
          <td style="padding: 4px 6px;">
            <select class="form-input auth-resp-select" style="width:100%; font-size: 0.8125rem;">
              <option value="civil" ${auth.responsibilityType === 'civil' ? 'selected' : ''}>Civil / Gobierno</option>
              <option value="militar" ${auth.responsibilityType === 'militar' ? 'selected' : ''}>Militar / Defensa</option>
              <option value="religiosa" ${auth.responsibilityType === 'religiosa' ? 'selected' : ''}>Religiosa / Ritual</option>
              <option value="propietaria" ${auth.responsibilityType === 'propietaria' ? 'selected' : ''}>Propiedad / Feudo</option>
              <option value="honorifica" ${auth.responsibilityType === 'honorifica' ? 'selected' : ''}>Honorífica</option>
              <option value="otra" ${auth.responsibilityType === 'otra' ? 'selected' : ''}>Otra</option>
            </select>
          </td>
          <td style="padding: 4px; text-align: center;">
            <button type="button" class="btn btn-subtle btn-icon btn-sm btn-remove-auth" title="Quitar autoridad" style="color: var(--danger);">
              &times;
            </button>
          </td>
        </tr>
      `).join('');
    };

    const contentHtml = `
      <form id="form-place" style="display:flex; flex-direction:column; gap:var(--space-md); max-height:78vh; overflow-y:auto; padding-right:4px;">
        
        <!-- Nombre y Estado -->
        <div class="form-row">
          <div class="form-group" style="flex: 2;">
            <label class="form-label" for="place-name">Nombre del Lugar *</label>
            <input type="text" id="place-name" class="form-input" placeholder="Ej: Puerto Gris o Archivo Central" value="${escapeHtml(place?.name || '')}" required />
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label" for="place-status">Estado Narrativo</label>
            <select id="place-status" class="form-input">
              <option value="activo" ${(!place || place.status === 'activo') ? 'selected' : ''}>Activo / Habitado</option>
              <option value="abandonado" ${place?.status === 'abandonado' ? 'selected' : ''}>Abandonado / Desierto</option>
              <option value="destruido" ${place?.status === 'destruido' ? 'selected' : ''}>Destruido / En ruinas</option>
              <option value="en_construccion" ${place?.status === 'en_construccion' ? 'selected' : ''}>En construcción</option>
              <option value="inaccesible" ${place?.status === 'inaccesible' ? 'selected' : ''}>Inaccesible / Prohibido</option>
              <option value="secreto" ${place?.status === 'secreto' ? 'selected' : ''}>Secreto / Oculto</option>
              <option value="desaparecido" ${place?.status === 'desaparecido' ? 'selected' : ''}>Desaparecido / Mítico</option>
              <option value="otro" ${place?.status === 'otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
        </div>

        <!-- Categoría y Tipo Específico -->
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label class="form-label" for="place-category">Categoría Espacial *</label>
            <select id="place-category" class="form-input">
              <option value="geografia" ${currentCategory === 'geografia' ? 'selected' : ''}>Geografía Mayor (Territorial)</option>
              <option value="asentamientos" ${currentCategory === 'asentamientos' ? 'selected' : ''}>Asentamientos y Edificios</option>
              <option value="naturaleza" ${currentCategory === 'naturaleza' ? 'selected' : ''}>Geografía Física y Natural</option>
              <option value="infraestructura" ${currentCategory === 'infraestructura' ? 'selected' : ''}>Infraestructura y Vías</option>
              <option value="especiales" ${currentCategory === 'especiales' ? 'selected' : ''}>Lugares Especiales</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label" for="place-type">Tipo de Lugar *</label>
            <select id="place-type" class="form-input">
              ${getTypesOptions(currentCategory, currentType)}
            </select>
          </div>
        </div>

        <!-- Jerarquía y Contenedor Padre -->
        <div class="form-group">
          <label class="form-label" for="place-parent">Lugar Contenedor / Padre (Opcional)</label>
          <select id="place-parent" class="form-input">
            <option value="">-- Nivel Raíz (Sin lugar contenedor) --</option>
            ${validParentCandidates.map(p => `
              <option value="${escapeHtml(p.id)}" ${p.id === currentParentId ? 'selected' : ''}>
                ${escapeHtml(p.name)} (${escapeHtml(this.formatTypeLabel(p.category, p.type))})
              </option>
            `).join('')}
          </select>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            Permite anidar territorios (ej: Continente > Reino > Ciudad > Barrio > Edificio).
          </span>
        </div>

        <!-- Campos Dinámicos según Categoría -->
        <div id="dynamic-contextual-fields" class="form-contextual-box">
          ${getContextualFieldsHtml(currentCategory, capturedSpecificData)}
        </div>

        <!-- Autoridades y Gobernantes -->
        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label class="form-label" style="margin-bottom:0;">Autoridades y Responsables</label>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-auth-row">
              + Añadir Autoridad
            </button>
          </div>
          <table class="authorities-table" style="margin-top:6px; width:100%;">
            <thead>
              <tr>
                <th style="width:36%;">Personaje</th>
                <th style="width:34%;">Cargo / Título</th>
                <th style="width:22%;">Tipo</th>
                <th style="width:8%;"></th>
              </tr>
            </thead>
            <tbody id="authorities-table-body">
              ${renderAuthoritiesRows()}
            </tbody>
          </table>
        </div>

        <!-- Descripción General -->
        <div class="form-group">
          <label class="form-label">Descripción Sensorial y Atmosférica</label>
          <textarea id="place-description" class="form-input" rows="3" placeholder="Aspecto, sonidos, olores y sensaciones que evoca este lugar...">${escapeHtml(place?.description || '')}</textarea>
        </div>

        <!-- Historia y Fechas -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fecha / Era de Fundación u Origen</label>
            <input type="text" id="field-foundationDate" class="form-input" placeholder="Ej: Año 730 o Era de los Reyes" value="${escapeHtml(place?.historicalDates?.foundationDate || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Periodo / Era Histórica</label>
            <input type="text" id="field-period" class="form-input" placeholder="Ej: Tercera Edad" value="${escapeHtml(place?.historicalDates?.period || '')}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Historia y Trasfondo</label>
          <textarea id="place-history" class="form-input" rows="2" placeholder="Hechos históricos, batallas, pactos o leyendas asociadas a este enclave...">${escapeHtml(place?.history || '')}</textarea>
        </div>

        <!-- Etiquetas y Notas Internas -->
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Etiquetas (separadas por coma)</label>
            <input type="text" id="place-tags" class="form-input" placeholder="capital, puerto, niebla, acantilados" value="${escapeHtml((place?.tags || []).join(', '))}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Notas Creativas Internas</label>
            <input type="text" id="place-notes" class="form-input" placeholder="Pistas para el narrador, recordatorios..." value="${escapeHtml(place?.notes || '')}" />
          </div>
        </div>

      </form>
    `;

    modal.open({
      title: isEdit ? `Editar Lugar: ${place.name}` : 'Crear Nuevo Lugar',
      contentHtml: contentHtml,
      confirmText: isEdit ? 'Guardar Cambios' : 'Crear Lugar',
      cancelText: 'Cancelar',
      onOpen: (modalEl) => {
        const tableBody = modalEl.querySelector('#authorities-table-body');

        const syncAuthoritiesFromDOM = () => {
          authoritiesList = [];
          tableBody.querySelectorAll('tr[data-auth-idx]').forEach(row => {
            authoritiesList.push({
              characterId: row.querySelector('.auth-char-select')?.value || '',
              title: row.querySelector('.auth-title-input')?.value.trim() || '',
              responsibilityType: row.querySelector('.auth-resp-select')?.value || 'civil'
            });
          });
        };

        const bindAuthRowEvents = () => {
          tableBody.querySelectorAll('.btn-remove-auth').forEach(btn => {
            btn.addEventListener('click', (e) => {
              syncAuthoritiesFromDOM();
              const row = e.target.closest('tr');
              const idx = Number(row.getAttribute('data-auth-idx'));
              authoritiesList.splice(idx, 1);
              tableBody.innerHTML = renderAuthoritiesRows();
              bindAuthRowEvents();
            });
          });
        };

        modalEl.querySelector('#btn-add-auth-row')?.addEventListener('click', () => {
          syncAuthoritiesFromDOM();
          authoritiesList.push({ characterId: '', title: '', responsibilityType: 'civil' });
          tableBody.innerHTML = renderAuthoritiesRows();
          bindAuthRowEvents();
        });

        bindAuthRowEvents();

        // Sincronizar campos específicos al cambiar de categoría
        const captureCurrentSpecificFields = () => {
          const cat = modalEl.querySelector('#place-category')?.value;
          if (cat === 'geografia') {
            capturedSpecificData.capital = modalEl.querySelector('#field-capital')?.value.trim() || '';
            capturedSpecificData.population = modalEl.querySelector('#field-population')?.value.trim() || '';
            capturedSpecificData.governmentSystem = modalEl.querySelector('#field-governmentSystem')?.value.trim() || '';
          } else if (cat === 'asentamientos') {
            capturedSpecificData.population = modalEl.querySelector('#field-population')?.value.trim() || '';
            capturedSpecificData.function = modalEl.querySelector('#field-function')?.value.trim() || '';
          } else if (cat === 'naturaleza') {
            capturedSpecificData.altitude = modalEl.querySelector('#field-altitude')?.value.trim() || '';
            capturedSpecificData.hazards = modalEl.querySelector('#field-hazards')?.value.trim() || '';
          } else if (cat === 'infraestructura') {
            capturedSpecificData.originPlaceId = modalEl.querySelector('#field-originPlaceId')?.value || null;
            capturedSpecificData.destinationPlaceId = modalEl.querySelector('#field-destinationPlaceId')?.value || null;
            capturedSpecificData.intermediatePoints = modalEl.querySelector('#field-intermediatePoints')?.value.trim() || '';
            capturedSpecificData.distance = modalEl.querySelector('#field-distance')?.value.trim() || '';
            capturedSpecificData.duration = modalEl.querySelector('#field-duration')?.value.trim() || '';
            capturedSpecificData.transitStatus = modalEl.querySelector('#field-transitStatus')?.value.trim() || '';
            capturedSpecificData.controlGroupOrEntity = modalEl.querySelector('#field-controlGroupOrEntity')?.value.trim() || '';
          } else if (cat === 'especiales') {
            capturedSpecificData.dangerLevel = modalEl.querySelector('#field-dangerLevel')?.value.trim() || '';
            capturedSpecificData.accessRequirements = modalEl.querySelector('#field-accessRequirements')?.value.trim() || '';
            capturedSpecificData.supernaturalEffects = modalEl.querySelector('#field-supernaturalEffects')?.value.trim() || '';
          }
        };

        const catSelect = modalEl.querySelector('#place-category');
        catSelect?.addEventListener('change', (e) => {
          captureCurrentSpecificFields();
          const newCat = e.target.value;
          selectedCat = newCat;

          const typeSelect = modalEl.querySelector('#place-type');
          if (typeSelect) {
            typeSelect.innerHTML = getTypesOptions(newCat, '');
          }
          const dynContainer = modalEl.querySelector('#dynamic-contextual-fields');
          if (dynContainer) {
            dynContainer.innerHTML = getContextualFieldsHtml(newCat, capturedSpecificData);
          }
        });
      },
      onConfirm: (modalEl) => {
        const name = modalEl.querySelector('#place-name').value.trim();
        if (!name) {
          showToast('El nombre del lugar es obligatorio', 'error');
          return false;
        }

        const category = modalEl.querySelector('#place-category').value;
        const type = modalEl.querySelector('#place-type').value;
        const parentId = modalEl.querySelector('#place-parent').value || null;
        const status = modalEl.querySelector('#place-status').value;
        const description = modalEl.querySelector('#place-description').value.trim();
        const history = modalEl.querySelector('#place-history').value.trim();
        const tags = modalEl.querySelector('#place-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const notes = modalEl.querySelector('#place-notes').value.trim();

        const historicalDates = {
          foundationDate: modalEl.querySelector('#field-foundationDate')?.value.trim() || '',
          period: modalEl.querySelector('#field-period')?.value.trim() || ''
        };

        const specificData = { ...capturedSpecificData };
        if (category === 'geografia') {
          specificData.capital = modalEl.querySelector('#field-capital')?.value.trim() || '';
          specificData.population = modalEl.querySelector('#field-population')?.value.trim() || '';
          specificData.governmentSystem = modalEl.querySelector('#field-governmentSystem')?.value.trim() || '';
        } else if (category === 'asentamientos') {
          specificData.population = modalEl.querySelector('#field-population')?.value.trim() || '';
          specificData.function = modalEl.querySelector('#field-function')?.value.trim() || '';
        } else if (category === 'naturaleza') {
          specificData.altitude = modalEl.querySelector('#field-altitude')?.value.trim() || '';
          specificData.hazards = modalEl.querySelector('#field-hazards')?.value.trim() || '';
        } else if (category === 'infraestructura') {
          specificData.originPlaceId = modalEl.querySelector('#field-originPlaceId')?.value || null;
          specificData.destinationPlaceId = modalEl.querySelector('#field-destinationPlaceId')?.value || null;
          specificData.intermediatePoints = modalEl.querySelector('#field-intermediatePoints')?.value.trim() || '';
          specificData.distance = modalEl.querySelector('#field-distance')?.value.trim() || '';
          specificData.duration = modalEl.querySelector('#field-duration')?.value.trim() || '';
          specificData.transitStatus = modalEl.querySelector('#field-transitStatus')?.value.trim() || '';
          specificData.controlGroupOrEntity = modalEl.querySelector('#field-controlGroupOrEntity')?.value.trim() || '';
        } else if (category === 'especiales') {
          specificData.dangerLevel = modalEl.querySelector('#field-dangerLevel')?.value.trim() || '';
          specificData.accessRequirements = modalEl.querySelector('#field-accessRequirements')?.value.trim() || '';
          specificData.supernaturalEffects = modalEl.querySelector('#field-supernaturalEffects')?.value.trim() || '';
        }

        const authorities = [];
        modalEl.querySelectorAll('#authorities-table-body tr').forEach(row => {
          const charId = row.querySelector('.auth-char-select')?.value;
          const title = row.querySelector('.auth-title-input')?.value.trim();
          const resp = row.querySelector('.auth-resp-select')?.value;
          if (charId) {
            authorities.push({
              characterId: charId,
              title: title || '',
              responsibilityType: resp || 'civil'
            });
          }
        });

        const params = {
          name,
          category,
          type,
          parentId,
          status,
          description,
          history,
          historicalDates,
          authorities,
          specificData,
          tags,
          notes
        };

        if (isEdit) {
          const updated = store.updatePlace(place.id, params);
          if (updated) {
            showToast(`Lugar "${updated.name}" actualizado`, 'success');
            this.render(document.getElementById('app-main'));
            return true;
          } else {
            showToast('No se pudo actualizar el lugar (comprueba bucles o compatibilidad)', 'error');
            return false;
          }
        } else {
          const created = store.createPlace(params);
          if (created) {
            showToast(`Lugar "${created.name}" creado`, 'success');
            this.render(document.getElementById('app-main'));
            return true;
          } else {
            showToast('No se pudo crear el lugar', 'error');
            return false;
          }
        }
      }
    });
  }

  /* ==========================================================================
     MODAL DE FICHA DETALLADA (CENTRO ENCICLOPÉDICO NARRATIVO)
     ========================================================================== */
  openPlaceDetailModal(place, projectId) {
    const catMeta = PLACE_CATEGORIES[place.category] || PLACE_CATEGORIES.geografia;
    const typeLabel = this.formatTypeLabel(place.category, place.type);
    const breadcrumbs = store.getPlaceBreadcrumbs(place.id, projectId);
    const parentPath = breadcrumbs.slice(0, -1);
    const children = store.getPlaces(projectId).filter(p => p.parentId === place.id);
    const allRelationships = store.getPlaceRelationships(place.id, projectId);
    const linkedNotes = store.getNotesByPlace(place.id, projectId);

    // Clasificar relaciones para vista wiki ordenada
    const spatialRels = allRelationships.filter(r => r.otherEntity.type === 'place');
    const characterRels = allRelationships.filter(r => r.otherEntity.type === 'character');
    const groupRels = allRelationships.filter(r => r.otherEntity.type === 'group');

    // Identificar vías de infraestructura que parten o llegan a este lugar
    const connectedInfrastructures = store.getPlaces(projectId).filter(p =>
      p.category === 'infraestructura' &&
      p.id !== place.id &&
      (p.specificData?.originPlaceId === place.id || p.specificData?.destinationPlaceId === place.id)
    );

    const contentHtml = `
      <div class="place-detail-modal-body">
        
        <!-- Tarjeta Superior de Identidad -->
        <div class="place-detail-header-card">
          <div class="place-detail-icon-box" style="background-color: ${escapeHtml(place.color || catMeta.color)}20; color: ${escapeHtml(place.color || catMeta.color)};">
            ${getPlaceCategoryIcon(place.category, 'icon icon-lg')}
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="place-badge place-cat-${escapeHtml(place.category)}">${escapeHtml(typeLabel)}</span>
              <span class="place-status-badge status-${escapeHtml(place.status)}">${escapeHtml(this.formatStatus(place.status))}</span>
            </div>
            <h2 style="font-family: var(--font-serif); font-size: 1.6rem; margin: 0; color: var(--text-primary);">${escapeHtml(place.name)}</h2>
            ${place.description ? `
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; margin-top: 4px;">
                ${escapeHtml(place.description)}
              </p>
            ` : ''}
          </div>
        </div>

        <!-- Barra de Pestañas Ligeras de la Ficha -->
        <div class="place-detail-tabs">
          <button type="button" class="place-detail-tab-btn is-active" data-detail-tab="general">
            Visión General
          </button>
          <button type="button" class="place-detail-tab-btn" data-detail-tab="location">
            Ubicación & Vías (${spatialRels.length + children.length + connectedInfrastructures.length})
          </button>
          <button type="button" class="place-detail-tab-btn" data-detail-tab="entities">
            Personajes & Casas (${(place.authorities || []).length + characterRels.length + groupRels.length})
          </button>
          <button type="button" class="place-detail-tab-btn" data-detail-tab="notes">
            Notas (${linkedNotes.length})
          </button>
        </div>

        <!-- PESTAÑA 1: VISIÓN GENERAL -->
        <div class="place-detail-pane is-active" id="pane-general">
          <!-- Propiedades Específicas Contextuales -->
          ${this.renderDetailSpecificProperties(place, projectId)}

          <!-- Historia y Cronología -->
          ${(place.history || place.historicalDates?.foundationDate || place.historicalDates?.period) ? `
            <div class="place-detail-section">
              <div class="place-detail-section-title">
                <span>Historia y Cronología</span>
              </div>
              ${place.historicalDates?.foundationDate ? `
                <div style="font-size:0.8125rem; margin-bottom:4px;">
                  <strong>Origen / Fundación:</strong> ${escapeHtml(place.historicalDates.foundationDate)}
                  ${place.historicalDates.period ? `(${escapeHtml(place.historicalDates.period)})` : ''}
                </div>
              ` : ''}
              ${place.history ? `
                <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.5; margin:0;">
                  ${escapeHtml(place.history)}
                </p>
              ` : ''}
            </div>
          ` : ''}

          <!-- Etiquetas y Notas Internas -->
          ${(place.tags && place.tags.length > 0) || place.notes ? `
            <div class="place-detail-section">
              <div class="place-detail-section-title">
                <span>Etiquetas y Notas del Creador</span>
              </div>
              ${(place.tags && place.tags.length > 0) ? `
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                  ${place.tags.map(tag => `<span class="place-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
              ` : ''}
              ${place.notes ? `
                <p style="font-size:0.8125rem; color:var(--text-muted); font-style:italic; margin:0;">
                  ${escapeHtml(place.notes)}
                </p>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- PESTAÑA 2: UBICACIÓN & VÍAS -->
        <div class="place-detail-pane" id="pane-location">
          <!-- Ruta Jerárquica Navegable -->
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Ruta de Contención Territorial</span>
            </div>
            ${parentPath.length > 0 ? `
              <div class="wiki-breadcrumbs">
                ${parentPath.map((p, idx) => `
                  <button type="button" class="wiki-breadcrumb-item btn-jump-to-place" data-place-id="${escapeHtml(p.id)}">
                    ${escapeHtml(p.name)}
                  </button>
                  <span class="wiki-breadcrumb-sep">&gt;</span>
                `).join('')}
                <span class="wiki-breadcrumb-current">${escapeHtml(place.name)}</span>
              </div>
            ` : `
              <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">
                Este lugar se encuentra en el nivel superior (territorio raíz sin contenedor padre).
              </span>
            `}

            ${children.length > 0 ? `
              <div style="margin-top:10px; border-top:1px dashed var(--border-subtle); padding-top:8px;">
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
                  Lugares contenidos en este territorio (${children.length}):
                </span>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                  ${children.map(ch => `
                    <button type="button" class="btn btn-secondary btn-sm btn-jump-to-place" data-place-id="${escapeHtml(ch.id)}" style="padding:3px 8px; font-size:0.75rem;">
                      ${escapeHtml(ch.name)}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Relaciones Espaciales Lugar ↔ Lugar -->
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Relaciones Espaciales y Fronteras (${spatialRels.length})</span>
              <button type="button" class="btn btn-secondary btn-sm place-detail-action-btn" id="btn-add-place-rel">
                + Vincular Relación
              </button>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${spatialRels.length === 0 ? `
                <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">
                  Sin relaciones espaciales directas (limita con, conecta con, próximo a...).
                </span>
              ` : spatialRels.map(relItem => `
                <div class="place-relation-item">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:600; color:var(--accent); font-size:0.75rem;">${escapeHtml(relItem.myRole)}</span>
                    <span style="color:var(--text-muted);">&rarr;</span>
                    <button type="button" class="wiki-link btn-jump-to-place" data-place-id="${escapeHtml(relItem.otherEntity.id)}">
                      ${escapeHtml(relItem.otherEntity.name)}
                    </button>
                  </div>
                  ${relItem.relationship.description ? `
                    <span style="font-size:0.75rem; color:var(--text-muted);" title="${escapeHtml(relItem.relationship.description)}">
                      ${escapeHtml(relItem.relationship.description)}
                    </span>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Vías e Infraestructuras Conectadas -->
          ${(place.category === 'infraestructura' || connectedInfrastructures.length > 0) ? `
            <div class="place-detail-section">
              <div class="place-detail-section-title">
                <span>Vías, Rutas y Carreteras Conectadas</span>
              </div>
              
              ${place.category === 'infraestructura' ? `
                <div class="wiki-infra-card">
                  <div style="font-weight:600; font-size:0.875rem; color:var(--text-primary); margin-bottom:6px;">Eje de esta vía:</div>
                  <div style="display:flex; align-items:center; gap:8px; font-size:0.8125rem; flex-wrap:wrap;">
                    ${place.specificData?.originPlaceId ? `
                      <button type="button" class="btn btn-secondary btn-sm btn-jump-to-place" data-place-id="${escapeHtml(place.specificData.originPlaceId)}">
                        Origen: ${escapeHtml(store.getPlace(place.specificData.originPlaceId, projectId)?.name || 'Origen')}
                      </button>
                    ` : '<span style="color:var(--text-muted);">Origen no fijado</span>'}
                    
                    <span style="color:var(--text-muted);">&rarr;</span>

                    ${place.specificData?.destinationPlaceId ? `
                      <button type="button" class="btn btn-secondary btn-sm btn-jump-to-place" data-place-id="${escapeHtml(place.specificData.destinationPlaceId)}">
                        Destino: ${escapeHtml(store.getPlace(place.specificData.destinationPlaceId, projectId)?.name || 'Destino')}
                      </button>
                    ` : '<span style="color:var(--text-muted);">Destino no fijado</span>'}
                  </div>

                  ${place.specificData?.intermediatePoints ? `
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px;">
                      <strong>Paradas intermedias:</strong> ${escapeHtml(place.specificData.intermediatePoints)}
                    </div>
                  ` : ''}

                  ${place.specificData?.distance || place.specificData?.duration ? `
                    <div style="display:flex; gap:12px; font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
                      ${place.specificData.distance ? `<span><strong>Distancia:</strong> ${escapeHtml(place.specificData.distance)}</span>` : ''}
                      ${place.specificData.duration ? `<span><strong>Duración:</strong> ${escapeHtml(place.specificData.duration)}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${connectedInfrastructures.length > 0 ? `
                <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
                  <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Vías que comunican con este lugar:</span>
                  ${connectedInfrastructures.map(infra => `
                    <div class="place-relation-item">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="place-badge place-cat-infraestructura" style="font-size:0.625rem;">Vía</span>
                        <button type="button" class="wiki-link btn-jump-to-place" data-place-id="${escapeHtml(infra.id)}">
                          ${escapeHtml(infra.name)}
                        </button>
                      </div>
                      <span style="font-size:0.75rem; color:var(--text-muted);">
                        ${infra.specificData?.distance ? escapeHtml(infra.specificData.distance) : ''}
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- PESTAÑA 3: PERSONAJES & ORGANIZACIONES -->
        <div class="place-detail-pane" id="pane-entities">
          <!-- Autoridades y Gobernantes Oficiales -->
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Autoridades y Responsables (${(place.authorities || []).length})</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${(!place.authorities || place.authorities.length === 0) ? `
                <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">No hay autoridades asignadas oficialmente a este lugar.</span>
              ` : place.authorities.map(auth => {
                const char = store.getCharacter(auth.characterId, projectId);
                if (!char) return '';
                return `
                  <div class="place-authority-item btn-jump-to-char" data-char-id="${escapeHtml(char.id)}" title="Ver ficha del personaje ${escapeHtml(char.name)}">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="width:26px; height:26px; border-radius:var(--radius-full); background:${escapeHtml(char.avatarColor || '#B45309')}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:700;">
                        ${escapeHtml(char.name.charAt(0))}
                      </span>
                      <div>
                        <div style="font-weight:600; font-size:0.875rem; color:var(--text-primary);">${escapeHtml(char.name)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(auth.title || 'Autoridad')} • Responsabilidad ${escapeHtml(auth.responsibilityType)}</div>
                      </div>
                    </div>
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:600;">Ver personaje &rarr;</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Personajes Vinculados por Relaciones (Residencia, Oficio, Vínculo) -->
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Personajes Vinculados (${characterRels.length})</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${characterRels.length === 0 ? `
                <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">Sin personajes vinculados mediante relaciones narrativas registradas.</span>
              ` : characterRels.map(relItem => {
                const char = relItem.otherEntity;
                return `
                  <div class="place-authority-item btn-jump-to-char" data-char-id="${escapeHtml(char.id)}" title="Ver ficha de ${escapeHtml(char.name)}">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="width:24px; height:24px; border-radius:var(--radius-full); background:${escapeHtml(char.color || '#B45309')}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:700;">
                        ${escapeHtml(char.name.charAt(0))}
                      </span>
                      <div>
                        <div style="font-weight:600; font-size:0.875rem;">${escapeHtml(char.name)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(relItem.myRole)} ${relItem.relationship.description ? `• ${escapeHtml(relItem.relationship.description)}` : ''}</div>
                      </div>
                    </div>
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:500;">Ficha &rarr;</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Casas, Facciones y Organizaciones -->
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Casas y Organizaciones (${groupRels.length})</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${groupRels.length === 0 ? `
                <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">Sin organizaciones o linajes formalmente vinculados a este enclave.</span>
              ` : groupRels.map(relItem => {
                const grp = relItem.otherEntity;
                return `
                  <div class="place-authority-item btn-jump-to-group" data-group-id="${escapeHtml(grp.id)}" title="Ver organización ${escapeHtml(grp.name)}">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="width:24px; height:24px; border-radius:var(--radius-sm); background:${escapeHtml(grp.color || '#4F46E5')}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:700;">
                        ${escapeHtml(grp.name.charAt(0))}
                      </span>
                      <div>
                        <div style="font-weight:600; font-size:0.875rem;">${escapeHtml(grp.name)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(relItem.myRole)} ${relItem.relationship.description ? `• ${escapeHtml(relItem.relationship.description)}` : ''}</div>
                      </div>
                    </div>
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:500;">Ver casa &rarr;</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- PESTAÑA 4: NOTAS CREATIVAS -->
        <div class="place-detail-pane" id="pane-notes">
          <div class="place-detail-section">
            <div class="place-detail-section-title">
              <span>Notas Creativas de este Lugar (${linkedNotes.length})</span>
              <button type="button" class="btn btn-secondary btn-sm place-detail-action-btn" id="btn-add-place-note">
                + Nueva Nota
              </button>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${linkedNotes.length === 0 ? `
                <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">No hay notas vinculadas específicamente a este lugar.</span>
              ` : linkedNotes.map(n => `
                <div class="place-note-item btn-jump-to-notes" data-note-id="${escapeHtml(n.id)}" style="cursor:pointer;">
                  <div style="font-weight:600; font-size:0.875rem; color:var(--text-primary);">${escapeHtml(n.title)}</div>
                  <div style="font-size:0.75rem; color:var(--text-secondary); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;">
                    ${escapeHtml(n.content)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;

    modal.open({
      title: `Ficha: ${place.name}`,
      contentHtml: contentHtml,
      confirmText: 'Editar Lugar',
      cancelText: 'Cerrar',
      onOpen: (modalEl) => {
        // Manejador de Pestañas
        modalEl.querySelectorAll('.place-detail-tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-detail-tab');
            modalEl.querySelectorAll('.place-detail-tab-btn').forEach(b => b.classList.remove('is-active'));
            modalEl.querySelectorAll('.place-detail-pane').forEach(p => p.classList.remove('is-active'));

            btn.classList.add('is-active');
            modalEl.querySelector(`#pane-${targetTab}`)?.classList.add('is-active');
          });
        });

        // Enlaces de navegación interactiva Wiki
        modalEl.querySelectorAll('.btn-jump-to-place').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-place-id');
            const targetPlace = store.getPlace(targetId, projectId);
            if (targetPlace) {
              modal.close();
              setTimeout(() => this.openPlaceDetailModal(targetPlace, projectId), 80);
            }
          });
        });

        modalEl.querySelectorAll('.btn-jump-to-char').forEach(btn => {
          btn.addEventListener('click', () => {
            const charId = btn.getAttribute('data-char-id');
            modal.close();
            this.app.navigate('characters', projectId, { characterId: charId });
          });
        });

        modalEl.querySelectorAll('.btn-jump-to-group').forEach(btn => {
          btn.addEventListener('click', () => {
            const groupId = btn.getAttribute('data-group-id');
            modal.close();
            this.app.navigate('relationships', projectId);
            setTimeout(() => {
              const grp = store.getGroup(groupId, projectId);
              if (grp) this.app.views.relationships?.openGroupModal(grp, projectId);
            }, 100);
          });
        });

        modalEl.querySelectorAll('.btn-jump-to-notes').forEach(btn => {
          btn.addEventListener('click', () => {
            modal.close();
            this.app.navigate('notes', projectId);
          });
        });

        modalEl.querySelector('#btn-add-place-note')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          modal.close();
          this.app.navigate('notes', projectId);
          setTimeout(() => {
            this.app.views.notes?.openNoteModal(null, projectId, { placeId: place.id });
          }, 120);
        });

        modalEl.querySelector('#btn-add-place-rel')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          modal.close();
          this.app.navigate('relationships', projectId);
          setTimeout(() => {
            this.app.views.relationships?.openRelationshipModal(null, projectId, {
              sourceId: place.id,
              category: 'espacial',
              type: 'limita_con'
            });
          }, 120);
        });
      },
      onConfirm: () => {
        setTimeout(() => this.openPlaceModal(place, projectId), 50);
        return true;
      }
    });
  }

  renderDetailSpecificProperties(place, projectId) {
    const data = place.specificData || {};
    const hasData = Object.values(data).some(v => v !== null && v !== '');
    if (!hasData) return '';

    let items = [];

    if (place.category === 'geografia') {
      if (data.capital) items.push(`<div><strong>Capital:</strong> ${escapeHtml(data.capital)}</div>`);
      if (data.population) items.push(`<div><strong>Población estimada:</strong> ${escapeHtml(data.population)}</div>`);
      if (data.governmentSystem) items.push(`<div><strong>Régimen de gobierno:</strong> ${escapeHtml(data.governmentSystem)}</div>`);
    } else if (place.category === 'asentamientos') {
      if (data.population) items.push(`<div><strong>Habitantes:</strong> ${escapeHtml(data.population)}</div>`);
      if (data.function) items.push(`<div><strong>Vocación / Función:</strong> ${escapeHtml(data.function)}</div>`);
    } else if (place.category === 'naturaleza') {
      if (data.altitude) items.push(`<div><strong>Altitud / Cota:</strong> ${escapeHtml(data.altitude)}</div>`);
      if (data.hazards) items.push(`<div><strong>Peligros ambientales:</strong> ${escapeHtml(data.hazards)}</div>`);
    } else if (place.category === 'infraestructura') {
      if (data.distance) items.push(`<div><strong>Longitud / Distancia:</strong> ${escapeHtml(data.distance)}</div>`);
      if (data.duration) items.push(`<div><strong>Tiempo estimado:</strong> ${escapeHtml(data.duration)}</div>`);
      if (data.transitStatus) items.push(`<div><strong>Estado de vía:</strong> ${escapeHtml(data.transitStatus)}</div>`);
      if (data.controlGroupOrEntity) items.push(`<div><strong>Guarnición de control:</strong> ${escapeHtml(data.controlGroupOrEntity)}</div>`);
    } else if (place.category === 'especiales') {
      if (data.dangerLevel) items.push(`<div><strong>Nivel de peligro:</strong> ${escapeHtml(data.dangerLevel)}</div>`);
      if (data.accessRequirements) items.push(`<div><strong>Requisitos de acceso:</strong> ${escapeHtml(data.accessRequirements)}</div>`);
      if (data.supernaturalEffects) items.push(`<div><strong>Efectos sobrenaturales:</strong> ${escapeHtml(data.supernaturalEffects)}</div>`);
    }

    if (items.length === 0) return '';

    return `
      <div class="place-detail-section">
        <div class="place-detail-section-title">
          <span>Rasgos Específicos del Territorio</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.8125rem;">
          ${items.join('')}
        </div>
      </div>
    `;
  }

  formatTypeLabel(category, typeId) {
    const list = PLACE_TYPES_BY_CATEGORY[category] || [];
    const found = list.find(t => t.id === typeId);
    if (found) return found.label;
    if (!typeId) return 'Territorio';
    return typeId.charAt(0).toUpperCase() + typeId.slice(1).replace(/_/g, ' ');
  }

  formatStatus(status) {
    const map = {
      activo: 'Activo',
      abandonado: 'Abandonado',
      destruido: 'Destruido',
      en_construccion: 'En construcción',
      inaccesible: 'Inaccesible',
      secreto: 'Secreto',
      desaparecido: 'Desaparecido',
      otro: 'Otro'
    };
    return map[status] || status || 'Activo';
  }
}
