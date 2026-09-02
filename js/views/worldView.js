/* Writer OS — Vista de Mundo y Lugares (Worldbuilding) */

import { store } from '../models/store.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { PLACE_CATEGORIES, PLACE_TYPES_BY_CATEGORY, getPlaceCategoryIcon, escapeHtml } from '../models/types.js';

export class WorldView {
  constructor(app) {
    this.app = app;
    this.currentMode = 'categories'; // 'categories' | 'tree' | 'network'
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'name'; // 'name' | 'type' | 'recent'
    this.selectedPlaceId = null;
    this.collapsedTreeNodes = new Set();
    this.networkNodes = [];
    this.networkEdges = [];
    this.selectedNetworkNode = null;
    this.isDragging = false;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
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
                Geografía, reinos, asentamientos, vías y espacios sagrados de <em>${escapeHtml(project.title)}</em>
              </p>
            </div>
            <div class="world-header-actions">
              <!-- Selector de Modos de Visualización -->
              <div class="world-subnav-modes">
                <button class="world-subnav-btn ${this.currentMode === 'categories' ? 'is-active' : ''}" data-mode="categories" title="Explorador por Categorías">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Explorador</span>
                </button>
                <button class="world-subnav-btn ${this.currentMode === 'tree' ? 'is-active' : ''}" data-mode="tree" title="Árbol Jerárquico">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
                  <span>Jerarquía</span>
                </button>
                <button class="world-subnav-btn ${this.currentMode === 'network' ? 'is-active' : ''}" data-mode="network" title="Red Conceptual de Conexiones">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  <span>Red Conceptual</span>
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

    if (this.currentMode === 'network') {
      this.initNetworkCanvas(project);
    }
  }

  renderModeContent(project, allPlaces, categoryCounts) {
    if (this.currentMode === 'tree') {
      return this.renderTreeView(project);
    } else if (this.currentMode === 'network') {
      return this.renderNetworkView(project);
    }
    return this.renderCategoriesView(project, allPlaces, categoryCounts);
  }

  /* ==========================================================================
     MODO 1: EXPLORADOR POR CATEGORÍAS
     ========================================================================== */
  renderCategoriesView(project, allPlaces, categoryCounts) {
    // 1. Filtrar por categoría
    let filtered = allPlaces;
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // 2. Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 3. Ordenar
    if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (this.sortBy === 'type') {
      filtered.sort((a, b) => a.type.localeCompare(b.type, 'es'));
    } else if (this.sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return `
      <!-- Filtros por Categoría Espacial con Iconografía SVG Editorial -->
      <div class="world-category-pills">
        <button class="world-cat-pill ${this.selectedCategory === 'all' ? 'is-active' : ''}" data-category="all">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
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

      <!-- Barra de Herramientas -->
      <div class="world-toolbar">
        <div class="world-search-box">
          <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="world-search-input" class="world-search-input" placeholder="Buscar lugar por nombre, tipo, descripción o etiqueta..." value="${escapeHtml(this.searchQuery)}" />
          ${this.searchQuery ? `<button id="btn-clear-search" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">&times;</button>` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.8125rem; color: var(--text-secondary);">Ordenar por:</span>
          <select id="world-sort-select" class="form-input" style="padding: 4px 8px; font-size: 0.8125rem; width: auto;">
            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Alfabético (A-Z)</option>
            <option value="type" ${this.sortBy === 'type' ? 'selected' : ''}>Tipo de Lugar</option>
            <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>Modificación reciente</option>
          </select>
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas -->
      ${filtered.length === 0 ? `
        <div class="card empty-state" style="text-align: center; padding: var(--space-2xl);">
          <div class="empty-state-icon" style="margin-bottom: var(--space-md); color: var(--text-muted);">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <h3 style="font-family: var(--font-serif); margin-bottom: 6px;">No se encontraron lugares</h3>
          <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto var(--space-lg) auto; font-size: 0.875rem;">
            ${this.searchQuery ? 'No hay ningún lugar que coincida con los términos de búsqueda.' : 'Comienza construyendo el mapa y los territorios de tu historia.'}
          </p>
          <button class="btn btn-primary" id="btn-empty-new-place">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Crear primer lugar</span>
          </button>
        </div>
      ` : `
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

          <p class="place-card-desc" style="margin-top: 10px;">
            ${escapeHtml(place.description || 'Sin descripción general registrada.')}
          </p>
        </div>

        <div class="place-card-meta">
          ${authorities.length > 0 ? `
            <div class="place-card-authorities" title="Autoridades: ${escapeHtml(authorities.join(', '))}">
              <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 13px; height: 13px; color: var(--accent); flex-shrink: 0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              <span><strong>Autoridad:</strong> ${escapeHtml(authorities.slice(0, 2).join(', '))}${authorities.length > 2 ? ` (+${authorities.length - 2})` : ''}</span>
            </div>
          ` : ''}

          ${place.tags && place.tags.length > 0 ? `
            <div class="place-card-tags">
              ${place.tags.map(t => `<span class="place-tag">#${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}

          <!-- Acciones de Tarjeta coherentes con Personajes -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-xs); border-top: 1px solid var(--border-subtle); font-size: 0.75rem; color: var(--text-muted); margin-top: var(--space-xs);">
            <span>
              ${children.length > 0 ? `${children.length} sub-lugares` : ''}
            </span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn btn-subtle btn-sm btn-view-place" data-place-id="${escapeHtml(place.id)}">Ficha</button>
              <button class="btn btn-subtle btn-icon btn-sm btn-delete-place" data-place-id="${escapeHtml(place.id)}" title="Eliminar lugar">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     MODO 2: ÁRBOL JERÁRQUICO INTERACTIVO
     ========================================================================== */
  renderTreeView(project) {
    const roots = store.getPlaceHierarchy(project.id);

    return `
      <div class="world-tree-container">
        <div class="world-tree-actions">
          <button class="btn btn-secondary btn-sm" id="btn-tree-expand-all">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <span>Expandir todo</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-tree-collapse-all">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
            <span>Colapsar todo</span>
          </button>
          <span style="font-size: 0.8125rem; color: var(--text-muted); margin-left: auto;">
            Muestra la contención territorial de continentes, reinos, regiones, ciudades y edificios.
          </span>
        </div>

        ${roots.length === 0 ? `
          <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
            No hay lugares creados en este proyecto.
          </div>
        ` : `
          <ul class="tree-list">
            ${roots.map(rootNode => this.renderTreeNode(rootNode, project)).join('')}
          </ul>
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
              <button class="tree-toggle-btn ${isCollapsed ? 'is-collapsed' : ''}" data-toggle-id="${escapeHtml(node.id)}" title="${isCollapsed ? 'Expandir' : 'Colapsar'}">
                <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            ` : `<span style="width: 20px;"></span>`}

            <div class="tree-node-icon" style="background-color: ${escapeHtml(node.color || catMeta.color)}25; color: ${escapeHtml(node.color || catMeta.color)};">
              ${getPlaceCategoryIcon(node.category, 'icon icon-xs')}
            </div>

            <span class="tree-node-name btn-view-place" data-place-id="${escapeHtml(node.id)}" title="Clic para ver ficha" style="cursor:pointer;">${escapeHtml(node.name)}</span>
            <span class="place-badge place-cat-${escapeHtml(node.category)}" style="font-size: 0.625rem;">${escapeHtml(typeLabel)}</span>
          </div>

          <div class="tree-node-right">
            ${hasChildren ? `
              <span class="tree-node-child-count">${node.children.length} sub-lugares</span>
            ` : ''}
            <button class="btn btn-ghost btn-sm btn-add-child-place" data-parent-id="${escapeHtml(node.id)}" title="Añadir lugar contenido dentro de ${escapeHtml(node.name)}">
              <svg class="icon icon-xs" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-edit-place" data-place-id="${escapeHtml(node.id)}" title="Editar lugar">
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
     MODO 3: RED CONCEPTUAL DE CONEXIONES (CANVAS 2D)
     ========================================================================== */
  renderNetworkView(project) {
    return `
      <div class="world-network-wrapper">
        <div class="world-network-overlay">
          <span style="font-size: 0.8125rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            Red de Conexiones Espaciales
          </span>
          <select id="canvas-category-filter" class="form-input" style="padding: 2px 8px; font-size: 0.75rem; width: auto;">
            <option value="all">Todas las conexiones</option>
            <option value="geografia">Geografía Mayor</option>
            <option value="asentamientos">Asentamientos</option>
            <option value="naturaleza">Naturaleza</option>
            <option value="infraestructura">Infraestructuras</option>
            <option value="especiales">Lugares Especiales</option>
            <option value="entidades">Personajes y Casas vinculadas</option>
          </select>
        </div>

        <canvas id="world-network-canvas"></canvas>

        <!-- Panel Lateral Inspector al Seleccionar Nodo -->
        <div class="world-network-inspector is-hidden" id="world-inspector-panel">
          <!-- Contenido inyectado dinámicamente al hacer clic en un nodo -->
        </div>
      </div>
    `;
  }

  initNetworkCanvas(project) {
    const canvas = document.getElementById('world-network-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wrapper = canvas.parentElement;
    const width = wrapper.clientWidth || 800;
    const height = wrapper.clientHeight || 650;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const places = store.getPlaces(project.id);
    const relationships = store.getRelationships(project.id);
    const placeIdSet = new Set(places.map(p => p.id));

    // Identificar personajes y grupos vinculados con lugares (vía relaciones o autoridades)
    const connectedCharIds = new Set();
    const connectedGroupIds = new Set();

    places.forEach(p => {
      (p.authorities || []).forEach(a => {
        if (a.characterId) connectedCharIds.add(a.characterId);
      });
    });

    relationships.forEach(r => {
      const isSrcPlace = placeIdSet.has(r.sourceId);
      const isTgtPlace = placeIdSet.has(r.targetId);

      if (isSrcPlace && !isTgtPlace) {
        if (r.targetType === 'character' || store.getCharacter(r.targetId, project.id)) connectedCharIds.add(r.targetId);
        if (r.targetType === 'group' || store.getGroup(r.targetId, project.id)) connectedGroupIds.add(r.targetId);
      } else if (isTgtPlace && !isSrcPlace) {
        if (r.sourceType === 'character' || store.getCharacter(r.sourceId, project.id)) connectedCharIds.add(r.sourceId);
        if (r.sourceType === 'group' || store.getGroup(r.sourceId, project.id)) connectedGroupIds.add(r.sourceId);
      }
    });

    // 1. Preparar Nodos Heterogéneos (Lugares + Personajes vinculados + Grupos vinculados)
    this.networkNodes = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const placeRadius = Math.min(width, height) * 0.38;

    // Nodos de Lugares (círculo exterior)
    places.forEach((p, idx) => {
      const angle = (idx / (places.length || 1)) * Math.PI * 2;
      const catMeta = PLACE_CATEGORIES[p.category] || PLACE_CATEGORIES.geografia;
      this.networkNodes.push({
        id: p.id,
        entityType: 'place',
        name: p.name,
        type: p.type,
        category: p.category,
        color: p.color || catMeta.color,
        radius: 20,
        x: centerX + Math.cos(angle) * placeRadius,
        y: centerY + Math.sin(angle) * placeRadius,
        original: p
      });
    });

    // Nodos de Entidades Conectadas (anillo interior concéntrico)
    const allEntities = [
      ...Array.from(connectedCharIds).map(id => ({ id, type: 'character', data: store.getCharacter(id, project.id) })).filter(e => e.data),
      ...Array.from(connectedGroupIds).map(id => ({ id, type: 'group', data: store.getGroup(id, project.id) })).filter(e => e.data)
    ];

    const entityRadius = Math.min(width, height) * 0.18;
    allEntities.forEach((ent, idx) => {
      const angle = (idx / (allEntities.length || 1)) * Math.PI * 2 + 0.3;
      const isChar = ent.type === 'character';
      this.networkNodes.push({
        id: ent.id,
        entityType: ent.type,
        name: ent.data.name,
        type: isChar ? ent.data.role : ent.data.type,
        category: 'entidades',
        color: isChar ? (ent.data.avatarColor || '#B45309') : (ent.data.color || '#4F46E5'),
        radius: 17,
        x: centerX + Math.cos(angle) * entityRadius,
        y: centerY + Math.sin(angle) * entityRadius,
        original: ent.data
      });
    });

    // 2. Preparar Aristas: Jerarquía + Relaciones Espaciales + Autoridades
    this.networkEdges = [];

    // Aristas de jerarquía (padre-hijo entre lugares)
    places.forEach(p => {
      if (p.parentId && placeIdSet.has(p.parentId)) {
        this.networkEdges.push({
          sourceId: p.parentId,
          targetId: p.id,
          label: 'contiene',
          category: 'jerarquia',
          isHierarchy: true,
          isSymmetric: false
        });
      }
    });

    // Aristas de relaciones generales
    relationships.forEach(r => {
      const hasSrc = this.networkNodes.some(n => n.id === r.sourceId);
      const hasTgt = this.networkNodes.some(n => n.id === r.targetId);
      if (hasSrc && hasTgt) {
        this.networkEdges.push({
          sourceId: r.sourceId,
          targetId: r.targetId,
          label: r.roleSource || r.type,
          category: r.category,
          isHierarchy: false,
          isSymmetric: !!r.isSymmetric,
          relationship: r
        });
      }
    });

    // Aristas de autoridad asignada (Personaje ➔ Lugar)
    places.forEach(p => {
      (p.authorities || []).forEach(auth => {
        if (auth.characterId && connectedCharIds.has(auth.characterId)) {
          // Si no existe ya una arista directa explícita entre ellos
          const exists = this.networkEdges.some(e =>
            (e.sourceId === auth.characterId && e.targetId === p.id) ||
            (e.sourceId === p.id && e.targetId === auth.characterId)
          );
          if (!exists) {
            this.networkEdges.push({
              sourceId: auth.characterId,
              targetId: p.id,
              label: auth.title || 'Autoridad',
              category: 'autoridad',
              isHierarchy: false,
              isAuthority: true,
              isSymmetric: false
            });
          }
        }
      });
    });

    let activeCatFilter = 'all';
    document.getElementById('canvas-category-filter')?.addEventListener('change', (e) => {
      activeCatFilter = e.target.value;
      draw();
    });

    // Función de visibilidad de nodos según filtro
    const isNodeVisible = (node) => {
      if (activeCatFilter === 'all') return true;
      if (activeCatFilter === 'entidades') {
        return node.entityType === 'character' || node.entityType === 'group';
      }
      return node.category === activeCatFilter;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = store.getTheme() === 'dark';

      // 1. Dibujar Aristas (Regla de oro: SOLO si AMBOS extremos son visibles)
      this.networkEdges.forEach(edge => {
        const srcNode = this.networkNodes.find(n => n.id === edge.sourceId);
        const tgtNode = this.networkNodes.find(n => n.id === edge.targetId);
        if (!srcNode || !tgtNode) return;

        // FILTRADO ESTRICTO DE ARISTAS:
        if (!isNodeVisible(srcNode) || !isNodeVisible(tgtNode)) {
          return;
        }

        const isHighlighted = this.selectedNetworkNode &&
          (this.selectedNetworkNode.id === srcNode.id || this.selectedNetworkNode.id === tgtNode.id);

        ctx.beginPath();
        ctx.moveTo(srcNode.x, srcNode.y);
        ctx.lineTo(tgtNode.x, tgtNode.y);

        if (edge.isHierarchy) {
          ctx.strokeStyle = isDark ? '#64748B' : '#94A3B8';
          ctx.setLineDash([4, 4]);
        } else if (edge.isAuthority) {
          ctx.strokeStyle = isDark ? '#F59E0B' : '#B45309';
          ctx.setLineDash([2, 3]);
        } else {
          ctx.strokeStyle = '#0D9488';
          ctx.setLineDash([]);
        }

        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.globalAlpha = this.selectedNetworkNode ? (isHighlighted ? 1 : 0.15) : 0.55;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Dibujar flecha indicadora si no es simétrica
        if (!edge.isSymmetric) {
          const dx = tgtNode.x - srcNode.x;
          const dy = tgtNode.y - srcNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const arrowDist = tgtNode.radius + 6;
            const arrowX = tgtNode.x - (dx / dist) * arrowDist;
            const arrowY = tgtNode.y - (dy / dist) * arrowDist;
            const angle = Math.atan2(dy, dx);
            const headLen = isHighlighted ? 8 : 6;

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - headLen * Math.cos(angle - Math.PI / 6),
              arrowY - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              arrowX - headLen * Math.cos(angle + Math.PI / 6),
              arrowY - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
          }
        }
      });

      // 2. Dibujar Nodos
      this.networkNodes.forEach(node => {
        if (!isNodeVisible(node)) return;

        const isSelected = this.selectedNetworkNode && this.selectedNetworkNode.id === node.id;
        const r = node.radius;

        // Dibujo de Geometría según Tipo de Entidad (Sin emojis, diseño editorial puro)
        ctx.beginPath();
        if (node.entityType === 'group') {
          // Rectángulo redondeado para Casas / Organizaciones
          if (ctx.roundRect) {
            ctx.roundRect(node.x - r, node.y - r, r * 2, r * 2, 5);
          } else {
            ctx.rect(node.x - r, node.y - r, r * 2, r * 2);
          }
        } else {
          // Círculo para Lugares y Personajes
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        }
        ctx.fillStyle = node.color;
        ctx.fill();

        // Borde exterior
        if (isSelected) {
          ctx.strokeStyle = isDark ? '#FFFFFF' : '#111215';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (node.entityType === 'place') {
          // Anillo territorial sutil para lugares
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Inicial en el centro del nodo (tipografía limpia)
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);

        // Nombre de la entidad debajo del nodo (colores compatibles con modo oscuro)
        ctx.font = isSelected ? 'bold 12px serif' : '11px sans-serif';
        ctx.fillStyle = isSelected
          ? (isDark ? '#F59E0B' : '#B45309')
          : (isDark ? '#EDEBE6' : '#23211F');
        ctx.fillText(node.name, node.x, node.y + r + 14);
      });
    };

    draw();

    // Eventos de interacción Canvas: Selección y Arrastre fluido
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hit = this.networkNodes.find(n => {
        if (!isNodeVisible(n)) return false;
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= (n.radius + 4);
      });

      if (hit) {
        this.selectedNetworkNode = hit;
        this.isDragging = true;
        this.draggedNode = hit;
        this.dragOffset = { x: hit.x - mouseX, y: hit.y - mouseY };
        this.updateInspectorPanel(hit, project);
      } else {
        this.selectedNetworkNode = null;
        document.getElementById('world-inspector-panel')?.classList.add('is-hidden');
      }
      draw();
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.draggedNode) {
        const rect = canvas.getBoundingClientRect();
        this.draggedNode.x = e.clientX - rect.left + this.dragOffset.x;
        this.draggedNode.y = e.clientY - rect.top + this.dragOffset.y;
        draw();
      }
    });

    const stopDragging = () => {
      this.isDragging = false;
      this.draggedNode = null;
    };
    window.addEventListener('mouseup', stopDragging);
    canvas.addEventListener('mouseleave', stopDragging);
  }

  updateInspectorPanel(node, project) {
    const panel = document.getElementById('world-inspector-panel');
    if (!panel) return;

    if (node.entityType === 'character') {
      const char = node.original;
      const rels = store.getCharacterRelationships(char.id, project.id);
      const placesConnected = rels.filter(r => r.otherEntity.type === 'place');

      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${escapeHtml(char.avatarColor || '#B45309')}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ${escapeHtml(char.name.charAt(0))}
            </div>
            <div>
              <span class="badge" style="font-size: 0.625rem;">Personaje</span>
              <h3 style="font-family: var(--font-serif); margin: 2px 0 0 0; font-size: 1.15rem;">${escapeHtml(char.name)}</h3>
            </div>
          </div>
          <button id="btn-close-inspector" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size: 1.25rem;">&times;</button>
        </div>

        <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; margin: 8px 0;">
          ${escapeHtml(char.description || 'Sin descripción.')}
        </p>

        <div style="font-size: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
          <strong>Lugares conectados (${placesConnected.length}):</strong>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
            ${placesConnected.length === 0 ? `<span style="color: var(--text-muted); font-style: italic;">Sin lugares asociados</span>` : placesConnected.map(r => `
              <div style="padding: 4px 6px; background: var(--bg-subtle); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
                <span>${escapeHtml(r.myRole)} ➔ <strong>${escapeHtml(r.otherEntity.name)}</strong></span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 12px; display: flex; gap: 6px;">
          <button class="btn btn-primary btn-sm btn-inspect-char" style="flex: 1;">
            Ver Ficha de Personaje
          </button>
        </div>
      `;

      panel.querySelector('.btn-inspect-char')?.addEventListener('click', () => {
        panel.classList.add('is-hidden');
        this.app.navigate('characters', project.id, { characterId: char.id });
      });

    } else if (node.entityType === 'group') {
      const group = node.original;
      const rels = store.getGroupRelationships(group.id, project.id);
      const placesConnected = rels.filter(r => r.otherEntity.type === 'place');

      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${escapeHtml(group.color || '#4F46E5')}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ${escapeHtml(group.name.charAt(0))}
            </div>
            <div>
              <span class="badge" style="font-size: 0.625rem;">${escapeHtml(group.type)}</span>
              <h3 style="font-family: var(--font-serif); margin: 2px 0 0 0; font-size: 1.15rem;">${escapeHtml(group.name)}</h3>
            </div>
          </div>
          <button id="btn-close-inspector" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size: 1.25rem;">&times;</button>
        </div>

        ${group.motto ? `<div style="font-style: italic; font-size: 0.8125rem; color: var(--text-muted); margin: 6px 0;">"${escapeHtml(group.motto)}"</div>` : ''}

        <div style="font-size: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 6px;">
          <strong>Sedes y Lugares vinculados (${placesConnected.length}):</strong>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
            ${placesConnected.length === 0 ? `<span style="color: var(--text-muted); font-style: italic;">Sin lugares asociados</span>` : placesConnected.map(r => `
              <div style="padding: 4px 6px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                ${escapeHtml(r.myRole)} ➔ <strong>${escapeHtml(r.otherEntity.name)}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 12px; display: flex; gap: 6px;">
          <button class="btn btn-primary btn-sm btn-inspect-group" style="flex: 1;">
            Ver Casa / Organización
          </button>
        </div>
      `;

      panel.querySelector('.btn-inspect-group')?.addEventListener('click', () => {
        panel.classList.add('is-hidden');
        this.app.navigate('relationships', project.id);
      });

    } else {
      // Lugar
      const place = node.original;
      const catMeta = PLACE_CATEGORIES[place.category] || PLACE_CATEGORIES.geografia;
      const typeLabel = this.formatTypeLabel(place.category, place.type);
      const rels = store.getPlaceRelationships(place.id, project.id);
      const breadcrumbs = store.getPlaceBreadcrumbs(place.id, project.id);
      const parentPath = breadcrumbs.slice(0, -1).map(p => p.name).join(' > ');
      const children = store.getPlaces(project.id).filter(p => p.parentId === place.id);

      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
              <span class="place-badge place-cat-${escapeHtml(place.category)}" style="font-size: 0.625rem;">${escapeHtml(typeLabel)}</span>
              <span class="place-status-badge status-${escapeHtml(place.status)}">${escapeHtml(this.formatStatus(place.status))}</span>
            </div>
            <h3 style="font-family: var(--font-serif); margin: 0; font-size: 1.15rem;">${escapeHtml(place.name)}</h3>
            ${parentPath ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">En: ${escapeHtml(parentPath)}</div>` : ''}
          </div>
          <button id="btn-close-inspector" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size: 1.25rem;">&times;</button>
        </div>

        <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; margin: 8px 0;">
          ${escapeHtml(place.description || 'Sin descripción registrada.')}
        </p>

        ${(place.authorities || []).length > 0 ? `
          <div style="font-size: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
            <strong>Autoridades:</strong>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 4px;">
              ${place.authorities.map(a => {
                const c = store.getCharacter(a.characterId, project.id);
                return c ? `<div>• <strong>${escapeHtml(c.name)}</strong> (${escapeHtml(a.title || 'Autoridad')})</div>` : '';
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div style="font-size: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 4px;">
          <strong>Conexiones activas (${rels.length}):</strong>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px; max-height: 160px; overflow-y: auto;">
            ${rels.length === 0 ? `<span style="color: var(--text-muted); font-style: italic;">Sin relaciones directas</span>` : rels.map(r => `
              <div style="padding: 4px 6px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                ${escapeHtml(r.myRole)} ➔ <strong>${escapeHtml(r.otherEntity.name)}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 12px; display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm btn-edit-inspector-place" style="flex: 1;">Editar</button>
          <button class="btn btn-primary btn-sm btn-view-inspector-place" style="flex: 2;">Abrir Ficha</button>
        </div>
      `;

      panel.querySelector('.btn-view-inspector-place')?.addEventListener('click', () => {
        this.openPlaceDetailModal(place, project.id);
      });

      panel.querySelector('.btn-edit-inspector-place')?.addEventListener('click', () => {
        this.openPlaceModal(place, project.id);
      });
    }

    panel.classList.remove('is-hidden');

    panel.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
      panel.classList.add('is-hidden');
      this.selectedNetworkNode = null;
    });
  }

  /* ==========================================================================
     EVENT BINDINGS
     ========================================================================== */
  bindEvents(container, project) {
    // Cambio de Modo
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
          this.render(container);
        }
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

    // Ordenación
    container.querySelector('#world-sort-select')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render(container);
    });

    // Botones de Creación
    container.querySelector('#btn-new-place')?.addEventListener('click', () => this.openPlaceModal(null, project.id));
    container.querySelector('#btn-empty-new-place')?.addEventListener('click', () => this.openPlaceModal(null, project.id));

    // Añadir hijo desde árbol
    container.querySelectorAll('.btn-add-child-place').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentId = btn.getAttribute('data-parent-id');
        this.openPlaceModal(null, project.id, { parentId });
      });
    });

    // Toggle de árbol jerárquico
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

    // Ficha de Lugar
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
        if (e.target.closest('button')) return;
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
    const currentParentId = place?.parentId !== undefined ? place.parentId : (initialValues.parentId || null);

    // Lugares elegibles para padre: excluir al propio lugar y descendientes para prevenir ciclos
    const allPlaces = store.getPlaces(projectId);
    let descendantsSet = new Set();
    if (isEdit) {
      const descendants = store.getPlaceDescendants(place.id, projectId);
      descendantsSet = new Set([place.id, ...descendants.map(d => d.id)]);
    }
    const eligibleParents = allPlaces.filter(p => !descendantsSet.has(p.id));

    // Personajes para el selector de autoridades
    const characters = store.getCharacters(projectId);

    // Formulario reactivo y persistencia en memoria durante cambios de categoría
    let selectedCat = currentCategory;
    let capturedSpecificData = { ...(place?.specificData || {}) };
    let authoritiesList = place?.authorities ? JSON.parse(JSON.stringify(place.authorities)) : [];

    const getTypesOptions = (category, selectedTypeValue) => {
      const types = PLACE_TYPES_BY_CATEGORY[category] || [];
      return types.map(t => `<option value="${escapeHtml(t.id)}" ${t.id === selectedTypeValue ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
    };

    const getContextualFieldsHtml = (category, data = {}) => {
      if (category === 'geografia') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Capital / Sede Política</label>
              <input type="text" id="field-capital" class="form-input" placeholder="Ej: Puerto Gris" value="${escapeHtml(data.capital || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Población Estimada</label>
              <input type="text" id="field-population" class="form-input" placeholder="Ej: 850.000 habitantes" value="${escapeHtml(data.population || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Sistema de Gobierno / Régimen Político</label>
            <input type="text" id="field-governmentSystem" class="form-input" placeholder="Ej: Monarquía parlamentaria bajo regencia del Concilio" value="${escapeHtml(data.governmentSystem || '')}" />
          </div>
        `;
      } else if (category === 'asentamientos') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Población / Capacidad</label>
              <input type="text" id="field-population" class="form-input" placeholder="Ej: 65.000 habitantes" value="${escapeHtml(data.population || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Función Principal / Uso</label>
              <input type="text" id="field-function" class="form-input" placeholder="Ej: Depósito documental y sede judicial" value="${escapeHtml(data.function || '')}" />
            </div>
          </div>
        `;
      } else if (category === 'naturaleza') {
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Altitud / Longitud / Dimensiones</label>
              <input type="text" id="field-altitude" class="form-input" placeholder="Ej: 3.420 m o 240 km navegables" value="${escapeHtml(data.altitude || data.length || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Peligros Naturales / Clima</label>
              <input type="text" id="field-hazards" class="form-input" placeholder="Ej: Vientos gélidos, desorientación o corrientes" value="${escapeHtml(data.hazards || '')}" />
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
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Distancia / Tiempo de tránsito</label>
              <input type="text" id="field-distance" class="form-input" placeholder="Ej: 4.5 km o 3 jornadas de marcha" value="${escapeHtml(data.distance || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Control / Guarnición a cargo</label>
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
        return `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); font-style:italic; padding:12px;">Sin autoridades asignadas. Haz clic en "+ Añadir Autoridad".</td></tr>`;
      }
      return authoritiesList.map((auth, idx) => `
        <tr data-auth-idx="${idx}">
          <td>
            <select class="form-input auth-char-select" style="width:100%; padding:4px 6px; font-size:0.8125rem;">
              <option value="">-- Seleccionar Personaje --</option>
              ${characters.map(c => `<option value="${escapeHtml(c.id)}" ${c.id === auth.characterId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </td>
          <td>
            <input type="text" class="form-input auth-title-input" placeholder="Ej: Alcalde, Guardián" value="${escapeHtml(auth.title || '')}" style="width:100%; padding:4px 6px; font-size:0.8125rem;" />
          </td>
          <td>
            <select class="form-input auth-resp-select" style="width:100%; padding:4px 6px; font-size:0.8125rem;">
              <option value="civil" ${auth.responsibilityType === 'civil' ? 'selected' : ''}>Civil</option>
              <option value="militar" ${auth.responsibilityType === 'militar' ? 'selected' : ''}>Militar</option>
              <option value="religiosa" ${auth.responsibilityType === 'religiosa' ? 'selected' : ''}>Religiosa</option>
              <option value="propietaria" ${auth.responsibilityType === 'propietaria' ? 'selected' : ''}>Propietaria</option>
              <option value="honorifica" ${auth.responsibilityType === 'honorifica' ? 'selected' : ''}>Honorífica</option>
              <option value="otra" ${auth.responsibilityType === 'otra' ? 'selected' : ''}>Otra</option>
            </select>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-subtle btn-icon btn-sm btn-remove-auth" title="Quitar autoridad">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </td>
        </tr>
      `).join('');
    };

    const contentHtml = `
      <form id="form-place-modal" style="display:flex; flex-direction:column; gap:var(--space-md); max-height:75vh; overflow-y:auto; padding:4px;">
        
        <!-- Nombre y Estado -->
        <div class="form-row">
          <div class="form-group" style="flex: 2;">
            <label class="form-label">Nombre del Lugar *</label>
            <input type="text" id="place-name" class="form-input" required placeholder="Ej: Puerto Gris" value="${escapeHtml(place?.name || initialValues.name || '')}" />
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">Estado</label>
            <select id="place-status" class="form-input">
              <option value="activo" ${place?.status === 'activo' ? 'selected' : ''}>Activo / Habitado</option>
              <option value="abandonado" ${place?.status === 'abandonado' ? 'selected' : ''}>Abandonado</option>
              <option value="destruido" ${place?.status === 'destruido' ? 'selected' : ''}>Destruido / En ruinas</option>
              <option value="en_construccion" ${place?.status === 'en_construccion' ? 'selected' : ''}>En construcción</option>
              <option value="inaccesible" ${place?.status === 'inaccesible' ? 'selected' : ''}>Inaccesible</option>
              <option value="secreto" ${place?.status === 'secreto' ? 'selected' : ''}>Secreto / Oculto</option>
              <option value="desaparecido" ${place?.status === 'desaparecido' ? 'selected' : ''}>Desaparecido</option>
              <option value="otro" ${place?.status === 'otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
        </div>

        <!-- Categoría y Tipo específico (Sin emojis, diseño editorial limpio) -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Categoría Espacial *</label>
            <select id="place-category" class="form-input">
              <option value="geografia" ${selectedCat === 'geografia' ? 'selected' : ''}>Geografía Mayor (Territorial)</option>
              <option value="asentamientos" ${selectedCat === 'asentamientos' ? 'selected' : ''}>Asentamientos y Edificios</option>
              <option value="naturaleza" ${selectedCat === 'naturaleza' ? 'selected' : ''}>Geografía Física y Natural</option>
              <option value="infraestructura" ${selectedCat === 'infraestructura' ? 'selected' : ''}>Infraestructura y Vías</option>
              <option value="especiales" ${selectedCat === 'especiales' ? 'selected' : ''}>Lugares Especiales</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo Específico *</label>
            <select id="place-type" class="form-input">
              ${getTypesOptions(selectedCat, currentType)}
            </select>
          </div>
        </div>

        <!-- Lugar Padre (Jerarquía de Contención) -->
        <div class="form-group">
          <label class="form-label">Lugar Contenedor / Padre (Opcional)</label>
          <select id="place-parent" class="form-input">
            <option value="">-- Sin lugar padre (Nivel raíz) --</option>
            ${eligibleParents.map(p => `
              <option value="${escapeHtml(p.id)}" ${p.id === currentParentId ? 'selected' : ''}>
                ${escapeHtml(p.name)} (${escapeHtml(this.formatTypeLabel(p.category, p.type))})
              </option>
            `).join('')}
          </select>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            Define la pertenencia territorial (ej: un reino dentro de un continente; una ciudad dentro de una región).
          </span>
        </div>

        <!-- Campos Contextuales Reactivos -->
        <div class="form-contextual-box" id="contextual-fields-container">
          <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary); text-transform:uppercase;">
            Propiedades Específicas
          </span>
          <div id="dynamic-contextual-fields">
            ${getContextualFieldsHtml(selectedCat, capturedSpecificData)}
          </div>
        </div>

        <!-- Gestor de Autoridades / Responsables -->
        <div class="form-contextual-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary); text-transform:uppercase;">
              Autoridades y Gobernantes
            </span>
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

        // Sincronizar filas existentes del DOM para no perder entradas al añadir o quitar
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
            capturedSpecificData.distance = modalEl.querySelector('#field-distance')?.value.trim() || '';
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
        const name = modalEl.querySelector('#place-name')?.value.trim();
        if (!name) {
          showToast('El lugar debe tener un nombre', 'warning');
          return false;
        }

        const category = modalEl.querySelector('#place-category')?.value;
        const type = modalEl.querySelector('#place-type')?.value;
        const parentId = modalEl.querySelector('#place-parent')?.value || null;
        const status = modalEl.querySelector('#place-status')?.value;
        const description = modalEl.querySelector('#place-description')?.value.trim();
        const history = modalEl.querySelector('#place-history')?.value.trim();
        const tagsStr = modalEl.querySelector('#place-tags')?.value || '';
        const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
        const notes = modalEl.querySelector('#place-notes')?.value.trim();

        // Extraer fechas históricas
        const historicalDates = {
          foundationDate: modalEl.querySelector('#field-foundationDate')?.value.trim() || '',
          period: modalEl.querySelector('#field-period')?.value.trim() || ''
        };

        // Extraer campos contextuales según categoría
        const specificData = {};
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
          specificData.distance = modalEl.querySelector('#field-distance')?.value.trim() || '';
          specificData.controlGroupOrEntity = modalEl.querySelector('#field-controlGroupOrEntity')?.value.trim() || '';
        } else if (category === 'especiales') {
          specificData.dangerLevel = modalEl.querySelector('#field-dangerLevel')?.value.trim() || '';
          specificData.accessRequirements = modalEl.querySelector('#field-accessRequirements')?.value.trim() || '';
          specificData.supernaturalEffects = modalEl.querySelector('#field-supernaturalEffects')?.value.trim() || '';
        }

        // Extraer autoridades sincronizadas desde el DOM
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
     MODAL DE FICHA DETALLADA DE LUGAR
     ========================================================================== */
  openPlaceDetailModal(place, projectId) {
    const catMeta = PLACE_CATEGORIES[place.category] || PLACE_CATEGORIES.geografia;
    const typeLabel = this.formatTypeLabel(place.category, place.type);
    const breadcrumbs = store.getPlaceBreadcrumbs(place.id, projectId);
    const parentPath = breadcrumbs.slice(0, -1);
    const children = store.getPlaces(projectId).filter(p => p.parentId === place.id);
    const relationships = store.getPlaceRelationships(place.id, projectId);
    const linkedNotes = store.getNotesByPlace(place.id, projectId);

    const contentHtml = `
      <div class="place-detail-modal-body">
        
        <!-- Tarjeta de Identidad -->
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

        <!-- Jerarquía y Contención Territorial -->
        <div class="place-detail-section">
          <div class="place-detail-section-title">
            <span>Jerarquía y Contención Espacial</span>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8125rem;">
            ${parentPath.length > 0 ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:var(--text-muted); font-weight:600;">Ubicado dentro de:</span>
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                  ${parentPath.map((p, idx) => `
                    <span class="place-tag btn-jump-to-place" data-place-id="${escapeHtml(p.id)}" style="cursor:pointer; color:var(--accent); font-weight:600;">
                      ${escapeHtml(p.name)}
                    </span>
                    ${idx < parentPath.length - 1 ? `<span style="color:var(--text-muted);">&gt;</span>` : ''}
                  `).join('')}
                </div>
              </div>
            ` : `<span style="color:var(--text-muted); font-style:italic;">Este lugar está en el nivel superior (sin contenedor padre).</span>`}

            ${children.length > 0 ? `
              <div style="margin-top:6px; border-top:1px dashed var(--border-subtle); padding-top:8px;">
                <span style="color:var(--text-muted); font-weight:600;">Lugares contenidos en este territorio (${children.length}):</span>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                  ${children.map(ch => `
                    <button class="btn btn-secondary btn-sm btn-jump-to-place" data-place-id="${escapeHtml(ch.id)}" style="padding:3px 8px; font-size:0.75rem;">
                      ${escapeHtml(ch.name)}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Propiedades Específicas Contextuales -->
        ${this.renderDetailSpecificProperties(place, projectId)}

        <!-- Autoridades y Responsables -->
        <div class="place-detail-section">
          <div class="place-detail-section-title">
            <span>Autoridades y Responsables (${(place.authorities || []).length})</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${(!place.authorities || place.authorities.length === 0) ? `
              <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">No hay autoridades o gobernantes asignados a este lugar.</span>
            ` : place.authorities.map(auth => {
              const char = store.getCharacter(auth.characterId, projectId);
              if (!char) return '';
              return `
                <div class="place-authority-item btn-jump-to-char" data-char-id="${escapeHtml(char.id)}" title="Ver ficha del personaje ${escapeHtml(char.name)}">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="width:24px; height:24px; border-radius:var(--radius-full); background:${escapeHtml(char.avatarColor || '#B45309')}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:700;">
                      ${escapeHtml(char.name.charAt(0))}
                    </span>
                    <div>
                      <div style="font-weight:600; font-size:0.875rem;">${escapeHtml(char.name)}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(auth.title || 'Autoridad')} • Responsabilidad ${escapeHtml(auth.responsibilityType)}</div>
                    </div>
                  </div>
                  <span style="font-size:0.75rem; color:var(--accent); font-weight:500;">Ver personaje &rarr;</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Relaciones Activas -->
        <div class="place-detail-section">
          <div class="place-detail-section-title">
            <span>Relaciones y Vínculos (${relationships.length})</span>
            <button class="btn btn-ghost btn-sm" id="btn-add-place-rel" style="font-size:0.75rem;">+ Vincular Relación</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${relationships.length === 0 ? `
              <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">Sin relaciones vinculadas a personajes, grupos u otros lugares.</span>
            ` : relationships.map(relItem => `
              <div class="place-relation-item">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-weight:600;">${escapeHtml(relItem.myRole)}</span>
                  <span style="color:var(--text-muted);">&rarr;</span>
                  <span style="color:var(--text-primary); font-weight:600;">${escapeHtml(relItem.otherEntity.name)}</span>
                  <span class="cat-badge cat-${escapeHtml(relItem.relationship.category)}" style="font-size:0.625rem;">${escapeHtml(relItem.relationship.category)}</span>
                </div>
                ${relItem.relationship.description ? `
                  <span style="font-size:0.75rem; color:var(--text-muted); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(relItem.relationship.description)}">
                    ${escapeHtml(relItem.relationship.description)}
                  </span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Notas Asociadas -->
        <div class="place-detail-section">
          <div class="place-detail-section-title">
            <span>Notas Creativas de este Lugar (${linkedNotes.length})</span>
            <button class="btn btn-ghost btn-sm" id="btn-add-place-note" style="font-size:0.75rem;">+ Nueva Nota</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${linkedNotes.length === 0 ? `
              <span style="font-size:0.8125rem; color:var(--text-muted); font-style:italic;">No hay notas vinculadas específicamente a este lugar.</span>
            ` : linkedNotes.map(n => `
              <div class="place-note-item btn-jump-to-notes" data-note-id="${escapeHtml(n.id)}" style="cursor:pointer;">
                <div style="font-weight:600; font-size:0.875rem;">${escapeHtml(n.title)}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">
                  ${escapeHtml(n.content)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

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

      </div>
    `;

    modal.open({
      title: `Ficha del Lugar: ${place.name}`,
      contentHtml: contentHtml,
      confirmText: 'Editar Lugar',
      cancelText: 'Cerrar',
      onOpen: (modalEl) => {
        // Enlaces de navegación internos
        modalEl.querySelectorAll('.btn-jump-to-place').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-place-id');
            const targetPlace = store.getPlace(targetId, projectId);
            if (targetPlace) {
              modal.close();
              setTimeout(() => this.openPlaceDetailModal(targetPlace, projectId), 100);
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

        modalEl.querySelectorAll('.btn-jump-to-notes').forEach(btn => {
          btn.addEventListener('click', () => {
            modal.close();
            this.app.navigate('notes', projectId);
          });
        });

        modalEl.querySelector('#btn-add-place-note')?.addEventListener('click', () => {
          modal.close();
          this.app.navigate('notes', projectId);
        });

        modalEl.querySelector('#btn-add-place-rel')?.addEventListener('click', () => {
          modal.close();
          this.app.navigate('relationships', projectId);
          setTimeout(() => {
            this.app.views.relationships.openRelationshipModal(null, projectId, { sourceId: place.id });
          }, 150);
        });
      },
      onConfirm: () => {
        // Cierra la ficha y abre el modal de edición
        setTimeout(() => this.openPlaceModal(place, projectId), 50);
        return true;
      }
    });
  }

  renderDetailSpecificProperties(place, projectId) {
    const s = place.specificData || {};
    const items = [];

    if (s.capital) items.push({ label: 'Capital / Sede', value: s.capital });
    if (s.population) items.push({ label: 'Población', value: s.population });
    if (s.governmentSystem) items.push({ label: 'Régimen de Gobierno', value: s.governmentSystem });
    if (s.function) items.push({ label: 'Función Principal', value: s.function });
    if (s.altitude) items.push({ label: 'Altitud / Longitud', value: s.altitude });
    if (s.hazards) items.push({ label: 'Peligros / Clima Extremo', value: s.hazards });
    if (s.distance) items.push({ label: 'Longitud / Distancia', value: s.distance });
    if (s.transitStatus) items.push({ label: 'Estado de Tránsito', value: s.transitStatus });
    if (s.controlGroupOrEntity) items.push({ label: 'Control / Guarnición', value: s.controlGroupOrEntity });
    if (s.dangerLevel) items.push({ label: 'Nivel de Peligro', value: s.dangerLevel });
    if (s.accessRequirements) items.push({ label: 'Acceso Requerido', value: s.accessRequirements });
    if (s.supernaturalEffects) items.push({ label: 'Efectos Sobrenaturales', value: s.supernaturalEffects });

    if (items.length === 0) return '';

    return `
      <div class="place-detail-section">
        <div class="place-detail-section-title">
          <span>Características Territoriales</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
          ${items.map(it => `
            <div style="background:var(--bg-subtle); padding:6px 10px; border-radius:var(--radius-sm); font-size:0.8125rem;">
              <span style="font-size:0.6875rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">${escapeHtml(it.label)}</span>
              <span style="font-weight:500; color:var(--text-primary);">${escapeHtml(it.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     UTILIDADES DE FORMATEO
     ========================================================================== */
  formatTypeLabel(category, typeId) {
    const list = PLACE_TYPES_BY_CATEGORY[category] || [];
    const found = list.find(t => t.id === typeId);
    return found ? found.label : (typeId || 'Lugar');
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
    return map[status] || status;
  }
}
