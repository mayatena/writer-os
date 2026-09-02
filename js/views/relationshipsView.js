/* Writer OS — Vista de Relaciones, Familias y Casas Nobiliarias */

import { store } from '../models/store.js';
import { escapeHtml } from '../models/types.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export class RelationshipsView {
  constructor(app) {
    this.app = app;
    this.currentMode = 'structured'; // 'structured' | 'network' | 'lineage'
    this.currentCategoryFilter = 'all'; // 'all' | 'familiar' | 'afectiva' | 'social' | 'politica' | 'pertenencia' | 'groups'
    this.searchQuery = '';
    this.selectedLineageCharId = null;

    // Estado del canvas interactivo
    this.networkNodes = [];
    this.networkEdges = [];
    this.draggedNode = null;
    this.selectedNode = null;
    this.canvasOffset = { x: 0, y: 0 };
    this._onWindowMouseMove = null;
    this._onWindowMouseUp = null;
  }

  render(container, params = {}) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    if (params.mode) {
      const modeMap = {
        estructurada: 'structured',
        structured: 'structured',
        red: 'network',
        network: 'network',
        linaje: 'lineage',
        lineage: 'lineage'
      };
      this.currentMode = modeMap[params.mode.toLowerCase()] || this.currentMode;
    }

    const charFocusId = params.charId || params.characterId;
    if (charFocusId && store.getCharacter(charFocusId, project.id)) {
      this.selectedLineageCharId = charFocusId;
    }

    const allRelationships = store.getRelationships(project.id);
    const allGroups = store.getGroups(project.id);
    const allCharacters = store.getCharacters(project.id);

    if (!this.selectedLineageCharId && allCharacters.length > 0) {
      this.selectedLineageCharId = allCharacters[0].id;
    }

    // Desvincular eventos globales de canvas previos si existieran
    this.teardownCanvasListeners();

    container.innerHTML = `
      <div class="view-container">
        <!-- Cabecera de la Sección -->
        <div class="section-header">
          <div>
            <h1 class="section-header-title">Relaciones y Estructuras</h1>
            <p class="section-header-subtitle">Familias, linajes, casas nobiliarias, alianzas y vínculos sociales de tu universo.</p>
          </div>
          <div style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="btn-new-group">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Nueva Casa / Grupo</span>
            </button>
            <button class="btn btn-primary" id="btn-new-relationship">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nueva Relación</span>
            </button>
          </div>
        </div>

        <!-- Selector de Modos de Visualización -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-lg);">
          <div class="subnav-modes">
            <button class="subnav-btn ${this.currentMode === 'structured' ? 'is-active' : ''}" data-mode="structured">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <span>Estructurada</span>
            </button>
            <button class="subnav-btn ${this.currentMode === 'network' ? 'is-active' : ''}" data-mode="network">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              <span>Red de Conexiones</span>
            </button>
            <button class="subnav-btn ${this.currentMode === 'lineage' ? 'is-active' : ''}" data-mode="lineage">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>Linaje y Familia</span>
            </button>
          </div>

          <!-- Métricas de síntesis -->
          <div style="font-size: 0.8125rem; color: var(--text-muted); display: flex; gap: var(--space-md);">
            <span><strong>${allRelationships.length}</strong> relaciones</span>
            <span>•</span>
            <span><strong>${allGroups.length}</strong> casas y grupos</span>
          </div>
        </div>

        <!-- Contenido según el Modo Activo -->
        <div id="relationships-mode-content">
          ${this.renderModeContent(project)}
        </div>
      </div>
    `;

    this.bindEvents(container, project);

    if (this.currentMode === 'network') {
      this.initNetworkCanvas(project);
    }
  }

  teardownCanvasListeners() {
    if (this._onWindowMouseMove) {
      window.removeEventListener('mousemove', this._onWindowMouseMove);
      this._onWindowMouseMove = null;
    }
    if (this._onWindowMouseUp) {
      window.removeEventListener('mouseup', this._onWindowMouseUp);
      this._onWindowMouseUp = null;
    }
  }

  renderModeContent(project) {
    if (this.currentMode === 'network') {
      return this.renderNetworkMode(project);
    } else if (this.currentMode === 'lineage') {
      return this.renderLineageMode(project);
    }
    return this.renderStructuredMode(project);
  }

  /* ==========================================================================
     MODO 1: VISTA ESTRUCTURADA
     ========================================================================== */
  renderStructuredMode(project) {
    const allRelationships = store.getRelationships(project.id);
    const allGroups = store.getGroups(project.id);

    // Contadores por categoría
    const countFam = allRelationships.filter(r => r.category === 'familiar').length;
    const countLove = allRelationships.filter(r => r.category === 'afectiva').length;
    const countSocial = allRelationships.filter(r => r.category === 'social').length;
    const countPol = allRelationships.filter(r => r.category === 'politica').length;
    const countMemb = allRelationships.filter(r => r.category === 'pertenencia').length;

    return `
      <div>
        <!-- Barra de Filtros y Búsqueda -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm ${this.currentCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="all">Todas (${allRelationships.length})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'familiar' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="familiar">Familia (${countFam})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'afectiva' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="afectiva">Afectivas (${countLove})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'social' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="social">Sociales (${countSocial})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'politica' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="politica">Políticas (${countPol})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'pertenencia' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="pertenencia">Pertenencias (${countMemb})</button>
            <button class="btn btn-sm ${this.currentCategoryFilter === 'groups' ? 'btn-primary' : 'btn-secondary'} btn-cat-filter" data-cat="groups">🏛️ Casas y Grupos (${allGroups.length})</button>
          </div>

          <div style="min-width: 240px;">
            <input
              type="text"
              class="form-input"
              id="rel-search-input"
              placeholder="Buscar por personaje, casa, rol o motivo..."
              value="${escapeHtml(this.searchQuery)}"
              style="padding: 7px 12px; font-size: 0.875rem;"
            />
          </div>
        </div>

        ${this.currentCategoryFilter === 'groups'
          ? this.renderGroupsList(project)
          : this.renderRelationshipsList(project)}
      </div>
    `;
  }

  renderRelationshipsList(project) {
    const allRels = store.getRelationships(project.id);
    const q = this.searchQuery.toLowerCase().trim();

    const filtered = allRels.filter(r => {
      const matchCat = this.currentCategoryFilter === 'all' || r.category === this.currentCategoryFilter;
      const source = store.getEntity(r.sourceId, project.id);
      const target = store.getEntity(r.targetId, project.id);

      const matchQuery = !q ||
        (source && source.name.toLowerCase().includes(q)) ||
        (target && target.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.roleSource && r.roleSource.toLowerCase().includes(q)) ||
        (r.roleTarget && r.roleTarget.toLowerCase().includes(q)) ||
        r.type.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
          <h2 class="empty-state-title">No hay relaciones que mostrar</h2>
          <p class="empty-state-desc">Conecta personajes y casas para tejer la red de alianzas, rivalidades y linajes de tu historia.</p>
          <button class="btn btn-primary" id="btn-new-rel-empty">Crear primera relación</button>
        </div>
      `;
    }

    const cardsHtml = filtered.map(rel => {
      const source = store.getEntity(rel.sourceId, project.id);
      const target = store.getEntity(rel.targetId, project.id);
      if (!source || !target) return '';

      const connectorIcon = rel.isSymmetric ? '↔' : '➔';

      return `
        <div class="relationship-card" data-rel-id="${escapeHtml(rel.id)}">
          <div>
            <!-- Fila superior: Categoría, Fechas y Estado -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="cat-badge cat-${escapeHtml(rel.category)}">${this.formatCategory(rel.category)}</span>
              <div style="display: flex; gap: 6px; align-items: center;">
                ${rel.startDate || rel.endDate ? `
                  <span class="rel-dates-badge">
                    <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${escapeHtml(rel.startDate)}${rel.endDate ? ` — ${escapeHtml(rel.endDate)}` : ''}
                  </span>
                ` : ''}
                <span class="badge ${rel.status === 'conflictiva' ? 'badge-accent' : ''}">${this.formatStatus(rel.status)}</span>
              </div>
            </div>

            <!-- Entidades conectadas -->
            <div class="relationship-entities">
              <div class="rel-entity" data-entity-id="${escapeHtml(source.id)}" data-entity-type="${escapeHtml(source.type)}">
                <div class="rel-entity-avatar ${source.type === 'group' ? 'is-group' : ''}" style="background-color: ${escapeHtml(source.color)};">
                  ${escapeHtml(source.name.charAt(0).toUpperCase())}
                </div>
                <div class="rel-entity-info">
                  <div class="rel-entity-name" title="${escapeHtml(source.name)}">${escapeHtml(source.name)}</div>
                  <div class="rel-entity-role">${escapeHtml(rel.roleSource || source.subtitle)}</div>
                </div>
              </div>

              <div class="rel-connector">
                <span class="rel-connector-icon">${connectorIcon}</span>
                <span style="font-size: 0.6875rem; color: var(--text-muted);">${this.formatType(rel.type)}</span>
              </div>

              <div class="rel-entity" data-entity-id="${escapeHtml(target.id)}" data-entity-type="${escapeHtml(target.type)}" style="justify-content: flex-end; text-align: right;">
                <div class="rel-entity-info">
                  <div class="rel-entity-name" title="${escapeHtml(target.name)}">${escapeHtml(target.name)}</div>
                  <div class="rel-entity-role">${escapeHtml(rel.roleTarget || target.subtitle)}</div>
                </div>
                <div class="rel-entity-avatar ${target.type === 'group' ? 'is-group' : ''}" style="background-color: ${escapeHtml(target.color)};">
                  ${escapeHtml(target.name.charAt(0).toUpperCase())}
                </div>
              </div>
            </div>

            <!-- Descripción y contexto -->
            ${rel.description ? `
              <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin-top: 8px; padding: 6px 10px; background-color: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 2px solid var(--border-strong);">
                ${escapeHtml(rel.description)}
              </p>
            ` : ''}
          </div>

          <!-- Pie de tarjeta: acciones -->
          <div style="display: flex; justify-content: flex-end; gap: 4px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
            <button class="btn btn-subtle btn-sm btn-edit-rel" data-rel-id="${escapeHtml(rel.id)}">Editar</button>
            <button class="btn btn-subtle btn-icon btn-sm btn-delete-rel" data-rel-id="${escapeHtml(rel.id)}" title="Eliminar vínculo">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: var(--space-lg);">
        ${cardsHtml}
      </div>
    `;
  }

  renderGroupsList(project) {
    const allGroups = store.getGroups(project.id);
    const q = this.searchQuery.toLowerCase().trim();

    const filtered = allGroups.filter(g =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      (g.motto && g.motto.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q)) ||
      g.type.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
          <h2 class="empty-state-title">No hay casas ni grupos registrados</h2>
          <p class="empty-state-desc">Crea casas nobiliarias, dinastías, facciones, gremios o cultos para organizar las fuerzas vivas de tu historia.</p>
          <button class="btn btn-primary" id="btn-new-group-empty">Crear primera casa o facción</button>
        </div>
      `;
    }

    const cardsHtml = filtered.map(group => {
      const members = store.getGroupMembers(group.id, project.id);
      const leader = group.leaderId ? store.getCharacter(group.leaderId) : null;
      const founder = group.founderId ? store.getCharacter(group.founderId) : null;

      // Buscar tratados o relaciones inter-grupo
      const groupAlliances = store.getRelationships(project.id).filter(r =>
        (r.sourceId === group.id && r.targetType === 'group') ||
        (r.targetId === group.id && r.sourceType === 'group')
      );

      return `
        <div class="group-card" data-group-id="${escapeHtml(group.id)}">
          <div class="group-card-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background-color: ${escapeHtml(group.color || '#4F46E5')}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                  ${escapeHtml(group.name.charAt(0).toUpperCase())}
                </div>
                <div>
                  <span style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--accent); letter-spacing: 0.05em;">${this.formatGroupType(group.type)}</span>
                  <h2 style="font-size: 1.15rem; font-family: var(--font-serif); line-height: 1.2;">${escapeHtml(group.name)}</h2>
                </div>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-subtle btn-sm btn-edit-group" data-group-id="${escapeHtml(group.id)}">Editar</button>
                <button class="btn btn-subtle btn-icon btn-sm btn-delete-group" data-group-id="${escapeHtml(group.id)}" title="Eliminar grupo">
                  <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            ${group.motto ? `<div class="group-card-motto">"${escapeHtml(group.motto)}"</div>` : ''}

            <!-- Líder y Fundador destacados -->
            ${(leader || founder) ? `
              <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap;">
                ${leader ? `<span>👑 <strong>Líder:</strong> ${escapeHtml(leader.name)}</span>` : ''}
                ${founder ? `<span>🏛️ <strong>Fundador:</strong> ${escapeHtml(founder.name)}</span>` : ''}
              </div>
            ` : ''}

            <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(group.description || 'Sin descripción detallada.')}
            </p>
          </div>

          <!-- Relaciones Inter-Grupo / Tratados Políticos -->
          ${groupAlliances.length > 0 ? `
            <div style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-xs); margin-top: var(--space-sm);">
              <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">
                Tratados con otras organizaciones (${groupAlliances.length})
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${groupAlliances.map(ga => {
                  const otherId = ga.sourceId === group.id ? ga.targetId : ga.sourceId;
                  const otherGrp = store.getGroup(otherId);
                  if (!otherGrp) return '';
                  return `
                    <div style="font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 3px 8px; border-radius: var(--radius-sm);">
                      <span>🏛️ <strong>${escapeHtml(otherGrp.name)}</strong> (${this.formatType(ga.type)})</span>
                      <span class="badge" style="font-size: 0.625rem;">${this.formatStatus(ga.status)}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Estructura y Miembros -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-sm); margin-top: var(--space-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">
              <span>Miembros registrados (${members.length})</span>
              <button class="btn btn-subtle btn-sm btn-add-member" data-group-id="${escapeHtml(group.id)}" style="padding: 1px 6px; font-size: 0.6875rem;">+ Asignar miembro</button>
            </div>

            <div class="group-members-preview">
              ${members.length === 0 ? `
                <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No hay miembros asignados a esta organización.</div>
              ` : members.slice(0, 5).map(m => `
                <div class="group-member-row" data-char-id="${escapeHtml(m.character.id)}">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 18px; height: 18px; border-radius: 50%; background-color: ${escapeHtml(m.character.avatarColor || 'var(--accent)')}; color: #FFF; font-size: 0.625rem; display: inline-flex; align-items: center; justify-content: center; font-weight: bold;">
                      ${escapeHtml(m.character.name.charAt(0).toUpperCase())}
                    </span>
                    <span>${escapeHtml(m.character.name)}</span>
                  </div>
                  <span class="badge" style="font-size: 0.625rem; padding: 1px 6px;">
                    ${escapeHtml(m.role)}${m.startDate || m.endDate ? ` (${escapeHtml(m.startDate || '')}${m.endDate ? ` — ${escapeHtml(m.endDate)}` : ''})` : ''}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: var(--space-lg);">
        ${cardsHtml}
      </div>
    `;
  }

  /* ==========================================================================
     MODO 2: RED DE CONEXIONES (CANVAS INTERACTIVO)
     ========================================================================== */
  renderNetworkMode(project) {
    return `
      <div class="network-canvas-wrapper">
        <div class="network-controls">
          <button class="btn btn-secondary btn-sm" id="btn-canvas-reset" title="Restablecer posición de los nodos">Centrar vista</button>
          <select class="form-select" id="canvas-filter-category" style="padding: 4px 8px; font-size: 0.75rem; width: auto;">
            <option value="all">Ver todas las categorías</option>
            <option value="familiar">Solo Familia</option>
            <option value="afectiva">Solo Afectivas</option>
            <option value="social">Solo Sociales</option>
            <option value="politica">Solo Políticas</option>
            <option value="pertenencia">Solo Pertenencias</option>
          </select>
        </div>

        <div class="network-legend">
          <div class="legend-item"><span class="legend-color-dot" style="background-color: #D97706;"></span><span>Familia</span></div>
          <div class="legend-item"><span class="legend-color-dot" style="background-color: #DB2777;"></span><span>Afectiva</span></div>
          <div class="legend-item"><span class="legend-color-dot" style="background-color: #059669;"></span><span>Social</span></div>
          <div class="legend-item"><span class="legend-color-dot" style="background-color: #2563EB;"></span><span>Política</span></div>
          <div class="legend-item"><span class="legend-color-dot" style="background-color: #7C3AED;"></span><span>Pertenencia</span></div>
          <div class="legend-item" style="border-left: 1px solid var(--border-subtle); padding-left: 8px;">
            <span style="font-weight: bold;">➔</span><span>Direccional</span>
          </div>
        </div>

        <canvas id="network-canvas" class="network-canvas"></canvas>

        <!-- Panel lateral emergente de detalles al hacer clic en un nodo -->
        <div class="network-details-panel" id="network-details-panel">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md);">
            <div id="net-detail-header"></div>
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-close-net-detail">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div id="net-detail-content"></div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     MODO 3: LINAJE Y ÁRBOL FAMILIAR MULTIGENERACIONAL
     ========================================================================== */
  renderLineageMode(project) {
    const characters = store.getCharacters(project.id);
    if (characters.length === 0) {
      return `<div class="card" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay personajes creados en este proyecto.</div>`;
    }

    const currentChar = store.getCharacter(this.selectedLineageCharId, project.id) || characters[0];
    const family = store.getCharacterFamily(currentChar.id, project.id);

    return `
      <div>
        <!-- Selector de personaje raíz -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);">
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <label class="form-label" for="select-lineage-char" style="margin: 0;">Foco del Linaje:</label>
            <select class="form-select" id="select-lineage-char" style="width: auto; font-weight: 600;">
              ${characters.map(ch => `
                <option value="${escapeHtml(ch.id)}" ${ch.id === currentChar.id ? 'selected' : ''}>${escapeHtml(ch.name)} ${ch.alias ? `("${escapeHtml(ch.alias)}")` : ''}</option>
              `).join('')}
            </select>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-add-family-link" data-char-id="${escapeHtml(currentChar.id)}">
            + Vincular familiar a ${escapeHtml(currentChar.name)}
          </button>
        </div>

        <!-- Árbol Jerárquico Generacional -->
        <div class="lineage-wrapper">
          
          <!-- NIVEL SUPERIOR: ANCESTROS Y ABUELOS (GENERACIÓN +2 Y SUPERIOR) -->
          ${family.ancestors.length > 0 ? `
            <div class="lineage-level">
              <span class="lineage-level-title">Ancestros y Generaciones Previas (${family.ancestors.length})</span>
              <div class="lineage-nodes-row">
                ${family.ancestors.map(a => `
                  <div class="lineage-node" data-char-id="${escapeHtml(a.character.id)}" title="Haz clic para recentrar en ${escapeHtml(a.character.name)}">
                    <span class="inspector-character-avatar" style="background-color: ${escapeHtml(a.character.avatarColor)};">${escapeHtml(a.character.name.charAt(0))}</span>
                    <div>
                      <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(a.character.name)}</div>
                      <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(a.relationship.roleSource || 'Ancestro/a')}${a.via ? ` (vía ${escapeHtml(a.via.name)})` : ''}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="lineage-branch-connector"></div>
            </div>
          ` : ''}

          <!-- NIVEL INTERMEDIO SUPERIOR: PROGENITORES Y TUTORES (GENERACIÓN +1) -->
          <div class="lineage-level">
            <span class="lineage-level-title">Progenitores y Tutores</span>
            <div class="lineage-nodes-row">
              ${family.parents.length === 0 ? `
                <div style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic; padding: 6px 12px;">No hay progenitores registrados</div>
              ` : family.parents.map(p => `
                <div class="lineage-node" data-char-id="${escapeHtml(p.character.id)}" title="Haz clic para recentrar en ${escapeHtml(p.character.name)}">
                  <span class="inspector-character-avatar" style="background-color: ${escapeHtml(p.character.avatarColor)};">${escapeHtml(p.character.name.charAt(0))}</span>
                  <div>
                    <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(p.character.name)}</div>
                    <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(p.relationship.roleSource || 'Progenitor/a')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="lineage-branch-connector"></div>
          </div>

          <!-- NIVEL CENTRAL: GENERACIÓN CENTRAL (HERMANOS, PERSONAJE FOCO, PAREJAS) -->
          <div class="lineage-level">
            <span class="lineage-level-title">Generación Central</span>
            <div class="lineage-nodes-row" style="align-items: center;">
              
              <!-- Hermanos -->
              ${family.siblings.map(s => `
                <div class="lineage-node" data-char-id="${escapeHtml(s.character.id)}" title="Hermano/a. Haz clic para recentrar">
                  <span class="inspector-character-avatar" style="background-color: ${escapeHtml(s.character.avatarColor)};">${escapeHtml(s.character.name.charAt(0))}</span>
                  <div>
                    <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(s.character.name)}</div>
                    <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(s.relationship.roleSource || 'Hermano/a')}${s.relationship.isInferred ? ' (por progenitor común)' : ''}</div>
                  </div>
                </div>
              `).join('')}

              <!-- Personaje Foco -->
              <div class="lineage-node is-target" data-char-id="${escapeHtml(currentChar.id)}">
                <span class="inspector-character-avatar" style="background-color: ${escapeHtml(currentChar.avatarColor)}; width: 28px; height: 28px; font-size: 0.8125rem;">${escapeHtml(currentChar.name.charAt(0))}</span>
                <div>
                  <div style="font-size: 0.9375rem; font-weight: 700; font-family: var(--font-serif);">${escapeHtml(currentChar.name)}</div>
                  <div style="font-size: 0.6875rem; color: var(--accent); font-weight: 600;">(Personaje Activo)</div>
                </div>
              </div>

              <!-- Parejas / Cónyuges / Exparejas / Divorcios -->
              ${family.spouses.map(sp => {
                let loveIcon = '💍';
                if (sp.relationship.status === 'divorciados' || sp.relationship.type === 'expareja') loveIcon = '💔';
                else if (sp.relationship.status === 'viudedad') loveIcon = '🖤';
                else if (sp.relationship.type === 'pareja' || sp.relationship.type === 'amantes') loveIcon = '💘';
                else if (sp.relationship.status === 'prometidos') loveIcon = '💌';

                return `
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 0.85rem;" title="${escapeHtml(sp.relationship.type)}">${loveIcon}</span>
                    <div class="lineage-node" data-char-id="${escapeHtml(sp.character.id)}" title="Haz clic para recentrar en ${escapeHtml(sp.character.name)}">
                      <span class="inspector-character-avatar" style="background-color: ${escapeHtml(sp.character.avatarColor)};">${escapeHtml(sp.character.name.charAt(0))}</span>
                      <div>
                        <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(sp.character.name)}</div>
                        <div style="font-size: 0.6875rem; color: var(--text-muted);">${this.formatType(sp.relationship.type)} (${this.formatStatus(sp.relationship.status)})</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}

            </div>
            <div class="lineage-branch-connector"></div>
          </div>

          <!-- NIVEL INTERMEDIO INFERIOR: DESCENDIENTES E HIJOS DIRECTOS (GENERACIÓN -1) -->
          <div class="lineage-level">
            <span class="lineage-level-title">Descendientes e Hijos</span>
            <div class="lineage-nodes-row">
              ${family.children.length === 0 ? `
                <div style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic; padding: 6px 12px;">Sin descendientes registrados</div>
              ` : family.children.map(c => `
                <div class="lineage-node" data-char-id="${escapeHtml(c.character.id)}" title="Haz clic para recentrar en ${escapeHtml(c.character.name)}">
                  <span class="inspector-character-avatar" style="background-color: ${escapeHtml(c.character.avatarColor)};">${escapeHtml(c.character.name.charAt(0))}</span>
                  <div>
                    <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(c.character.name)}</div>
                    <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(c.relationship.roleTarget || 'Hijo/a / Descendiente')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- NIVEL INFERIOR: NIETOS Y GENERACIONES POSTERIORES (GENERACIÓN -2) -->
          ${family.descendants.length > 0 ? `
            <div class="lineage-level">
              <div class="lineage-branch-connector"></div>
              <span class="lineage-level-title">Nietos y Generaciones Posteriores (${family.descendants.length})</span>
              <div class="lineage-nodes-row">
                ${family.descendants.map(d => `
                  <div class="lineage-node" data-char-id="${escapeHtml(d.character.id)}" title="Haz clic para recentrar en ${escapeHtml(d.character.name)}">
                    <span class="inspector-character-avatar" style="background-color: ${escapeHtml(d.character.avatarColor)};">${escapeHtml(d.character.name.charAt(0))}</span>
                    <div>
                      <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(d.character.name)}</div>
                      <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(d.relationship.roleTarget || 'Nieto/a')}${d.via ? ` (hijo/a de ${escapeHtml(d.via.name)})` : ''}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  /* ==========================================================================
     Formatos de Etiquetas
     ========================================================================== */
  formatCategory(cat) {
    const map = {
      familiar: 'Familia',
      afectiva: 'Afectiva',
      social: 'Social',
      politica: 'Política',
      pertenencia: 'Pertenencia'
    };
    return map[cat] || cat;
  }

  formatType(type) {
    const map = {
      hermanos: 'Hermanos',
      progenitor_descendiente: 'Progenitor / Descendiente',
      adopcion: 'Adopción',
      abuelo_nieto: 'Abuelo / Nieto',
      pareja: 'Pareja',
      matrimonio: 'Matrimonio',
      prometidos: 'Prometidos',
      expareja: 'Expareja',
      amantes: 'Amantes',
      amistad: 'Amistad',
      rivalidad: 'Rivalidad',
      enemistad: 'Enemistad',
      mentor_aprendiz: 'Mentor / Aprendiz',
      alianza: 'Alianza',
      vasallaje: 'Vasallaje',
      superior_subordinado: 'Mando / Subordinado',
      tregua: 'Tregua',
      pertenencia: 'Membresía / Cargo'
    };
    return map[type] || type;
  }

  formatStatus(status) {
    const map = {
      activa: 'Activa',
      pasada: 'Pasada',
      conflictiva: 'Conflictiva',
      secreta: 'Secreta',
      prometidos: 'Comprometidos',
      divorciados: 'Divorciados',
      viudedad: 'Viudez',
      disidente: 'Disidente'
    };
    return map[status] || status;
  }

  formatGroupType(type) {
    const map = {
      casa_noble: 'Casa Noble',
      dinastia: 'Dinastía',
      clan: 'Clan',
      faccion: 'Facción',
      gremio: 'Gremio',
      culto: 'Culto / Orden',
      ejercito: 'Fuerza armada',
      otro: 'Organización'
    };
    return map[type] || 'Organización';
  }

  /* ==========================================================================
     Eventos e Interacciones
     ========================================================================== */
  bindEvents(container, project) {
    // Cambiar modo de visualización
    container.querySelectorAll('.subnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentMode = btn.getAttribute('data-mode');
        this.render(container);
      });
    });

    // Filtro de categorías en modo estructurado
    container.querySelectorAll('.btn-cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategoryFilter = btn.getAttribute('data-cat');
        this.render(container);
      });
    });

    // Búsqueda en vivo
    const searchInput = container.querySelector('#rel-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      const contentEl = container.querySelector('#relationships-mode-content');
      if (contentEl) {
        contentEl.innerHTML = this.renderStructuredMode(project);
        this.bindCardEvents(container, project);
      }
    });

    // Selector de personaje para linaje
    const lineageSelect = container.querySelector('#select-lineage-char');
    lineageSelect?.addEventListener('change', (e) => {
      this.selectedLineageCharId = e.target.value;
      this.render(container);
    });

    // Clic en nodo de linaje para recentrar el árbol en ese personaje
    container.querySelectorAll('.lineage-node').forEach(node => {
      node.addEventListener('click', () => {
        const charId = node.getAttribute('data-char-id');
        if (charId && charId !== this.selectedLineageCharId) {
          this.selectedLineageCharId = charId;
          this.render(container);
        }
      });
    });

    // Botones de creación rápida
    container.querySelector('#btn-new-relationship')?.addEventListener('click', () => this.openRelationshipModal(null, project.id));
    container.querySelector('#btn-new-rel-empty')?.addEventListener('click', () => this.openRelationshipModal(null, project.id));
    container.querySelector('#btn-new-group')?.addEventListener('click', () => this.openGroupModal(null, project.id));
    container.querySelector('#btn-new-group-empty')?.addEventListener('click', () => this.openGroupModal(null, project.id));

    // Vincular familiar directo desde vista de linaje
    container.querySelector('#btn-add-family-link')?.addEventListener('click', (e) => {
      const charId = e.currentTarget.getAttribute('data-char-id');
      this.openRelationshipModal(null, project.id, { sourceId: charId, category: 'familiar' });
    });

    this.bindCardEvents(container, project);
  }

  bindCardEvents(container, project) {
    // Clic en entidad para abrir ficha
    container.querySelectorAll('.rel-entity').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-entity-id');
        const type = el.getAttribute('data-entity-type');
        if (type === 'character') {
          this.app.navigate('characters', project.id, { characterId: id });
        } else if (type === 'group') {
          const grp = store.getGroup(id);
          if (grp) this.openGroupModal(grp, project.id);
        }
      });
    });

    // Clic en fila de miembro de grupo
    container.querySelectorAll('.group-member-row').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const charId = row.getAttribute('data-char-id');
        if (charId) {
          this.app.navigate('characters', project.id, { characterId: charId });
        }
      });
    });

    // Editar relación
    container.querySelectorAll('.btn-edit-rel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const relId = btn.getAttribute('data-rel-id');
        const rel = store.getRelationship(relId);
        if (rel) this.openRelationshipModal(rel, project.id);
      });
    });

    // Eliminar relación
    container.querySelectorAll('.btn-delete-rel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const relId = btn.getAttribute('data-rel-id');
        const rel = store.getRelationship(relId);
        if (!rel) return;

        modal.confirm({
          title: '¿Eliminar relación?',
          message: 'Se eliminará el vínculo entre ambas entidades. Los personajes y grupos implicados permanecerán intactos.',
          confirmText: 'Eliminar relación',
          isDanger: true,
          onConfirm: () => {
            store.deleteRelationship(relId);
            showToast('Relación eliminada', 'info');
            this.render(container);
          }
        });
      });
    });

    // Editar grupo
    container.querySelectorAll('.btn-edit-group').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.getAttribute('data-group-id');
        const group = store.getGroup(groupId);
        if (group) this.openGroupModal(group, project.id);
      });
    });

    // Eliminar grupo
    container.querySelectorAll('.btn-delete-group').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.getAttribute('data-group-id');
        const group = store.getGroup(groupId);
        if (!group) return;

        modal.confirm({
          title: `¿Eliminar "${group.name}"?`,
          message: 'Se eliminará la organización y sus membresías. Los personajes miembros no serán eliminados.',
          confirmText: 'Eliminar grupo',
          isDanger: true,
          onConfirm: () => {
            store.deleteGroup(groupId);
            showToast('Organización eliminada', 'info');
            this.render(container);
          }
        });
      });
    });

    // Asignar miembro a grupo
    container.querySelectorAll('.btn-add-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.getAttribute('data-group-id');
        this.openRelationshipModal(null, project.id, {
          targetId: groupId,
          targetType: 'group',
          category: 'pertenencia',
          type: 'pertenencia'
        });
      });
    });
  }

  /* ==========================================================================
     CANVAS INTERACTIVO (RED DE CONEXIONES)
     ========================================================================== */
  initNetworkCanvas(project) {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const wrapper = canvas.parentElement;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const characters = store.getCharacters(project.id);
    const groups = store.getGroups(project.id);
    const relationships = store.getRelationships(project.id);

    // Preparar Nodos
    this.networkNodes = [];
    const totalEntities = characters.length + groups.length;
    const radius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;

    let index = 0;
    characters.forEach(ch => {
      const angle = (index / (totalEntities || 1)) * Math.PI * 2;
      this.networkNodes.push({
        id: ch.id,
        name: ch.name,
        subtitle: ch.alias || ch.role,
        color: ch.avatarColor || '#B45309',
        type: 'character',
        radius: 20,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        original: ch
      });
      index++;
    });

    groups.forEach(g => {
      const angle = (index / (totalEntities || 1)) * Math.PI * 2;
      this.networkNodes.push({
        id: g.id,
        name: g.name,
        subtitle: g.type,
        color: g.color || '#4F46E5',
        type: 'group',
        radius: 24,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        original: g
      });
      index++;
    });

    // Preparar Aristas
    this.networkEdges = relationships.map(r => ({
      relationship: r,
      sourceId: r.sourceId,
      targetId: r.targetId,
      category: r.category
    }));

    // Bucle de dibujo
    const categoryColors = {
      familiar: '#D97706',
      afectiva: '#DB2777',
      social: '#059669',
      politica: '#2563EB',
      pertenencia: '#7C3AED'
    };

    let activeFilter = 'all';
    const filterSelect = document.getElementById('canvas-filter-category');
    filterSelect?.addEventListener('change', (e) => {
      activeFilter = e.target.value;
      draw();
    });

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Dibujar conexiones (aristas)
      this.networkEdges.forEach(edge => {
        if (activeFilter !== 'all' && edge.category !== activeFilter) return;

        const srcNode = this.networkNodes.find(n => n.id === edge.sourceId);
        const tgtNode = this.networkNodes.find(n => n.id === edge.targetId);
        if (!srcNode || !tgtNode) return;

        const isHighlighted = this.selectedNode &&
          (this.selectedNode.id === srcNode.id || this.selectedNode.id === tgtNode.id);

        const edgeColor = categoryColors[edge.category] || '#9CA3AF';

        // Trazado de la línea
        ctx.beginPath();
        ctx.moveTo(srcNode.x, srcNode.y);
        ctx.lineTo(tgtNode.x, tgtNode.y);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = isHighlighted ? 3.5 : 1.5;
        ctx.globalAlpha = this.selectedNode ? (isHighlighted ? 1 : 0.2) : 0.65;
        ctx.stroke();

        // Si la relación es dirigida, dibujar punta de flecha en dirección al destino
        if (!edge.relationship.isSymmetric) {
          const dx = tgtNode.x - srcNode.x;
          const dy = tgtNode.y - srcNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const arrowDist = tgtNode.radius + 12;
            const arrowX = tgtNode.x - (dx / dist) * arrowDist;
            const arrowY = tgtNode.y - (dy / dist) * arrowDist;
            const angle = Math.atan2(dy, dx);
            const headLen = isHighlighted ? 11 : 8;

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
            ctx.fillStyle = edgeColor;
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
      });

      // 2. Dibujar nodos
      this.networkNodes.forEach(node => {
        const isSelected = this.selectedNode && this.selectedNode.id === node.id;

        // Círculo / Cuadrado del nodo
        ctx.beginPath();
        if (node.type === 'group') {
          const r = node.radius;
          ctx.roundRect ? ctx.roundRect(node.x - r, node.y - r, r * 2, r * 2, 6) : ctx.rect(node.x - r, node.y - r, r * 2, r * 2);
        } else {
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = node.color;
        ctx.fill();

        if (isSelected) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }

        // Inicial en el centro
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);

        // Etiqueta de texto debajo
        ctx.fillStyle = store.getTheme() === 'dark' ? '#E5E7EB' : '#1F2937';
        ctx.font = isSelected ? 'bold 11px Plus Jakarta Sans, sans-serif' : '10px Plus Jakarta Sans, sans-serif';
        ctx.fillText(node.name, node.x, node.y + node.radius + 12);
      });
    };

    draw();

    // Eventos de arrastre e interactividad con el ratón
    let isDragging = false;
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.draggedNode = this.networkNodes.find(n => {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
      });

      if (this.draggedNode) {
        isDragging = true;
        this.selectedNode = this.draggedNode;
        this.showNetworkNodeDetails(this.selectedNode, project);
        draw();
      } else {
        this.selectedNode = null;
        this.hideNetworkNodeDetails();
        draw();
      }
    });

    this._onWindowMouseMove = (e) => {
      if (!isDragging || !this.draggedNode) return;
      const rect = canvas.getBoundingClientRect();
      this.draggedNode.x = Math.max(30, Math.min(width - 30, e.clientX - rect.left));
      this.draggedNode.y = Math.max(30, Math.min(height - 30, e.clientY - rect.top));
      draw();
    };
    window.addEventListener('mousemove', this._onWindowMouseMove);

    this._onWindowMouseUp = () => {
      isDragging = false;
      this.draggedNode = null;
    };
    window.addEventListener('mouseup', this._onWindowMouseUp);

    // Botón centrar
    document.getElementById('btn-canvas-reset')?.addEventListener('click', () => {
      let idx = 0;
      this.networkNodes.forEach(n => {
        const angle = (idx / (totalEntities || 1)) * Math.PI * 2;
        n.x = centerX + Math.cos(angle) * radius;
        n.y = centerY + Math.sin(angle) * radius;
        idx++;
      });
      draw();
    });

    // Cerrar panel de detalles
    document.getElementById('btn-close-net-detail')?.addEventListener('click', () => {
      this.hideNetworkNodeDetails();
      this.selectedNode = null;
      draw();
    });
  }

  showNetworkNodeDetails(node, project) {
    const panel = document.getElementById('network-details-panel');
    const header = document.getElementById('net-detail-header');
    const content = document.getElementById('net-detail-content');
    if (!panel || !header || !content) return;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 28px; height: 28px; border-radius: ${node.type === 'group' ? '4px' : '50%'}; background-color: ${escapeHtml(node.color)}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8125rem;">
          ${escapeHtml(node.name.charAt(0))}
        </div>
        <div>
          <h3 style="font-size: 1rem; font-family: var(--font-serif);">${escapeHtml(node.name)}</h3>
          <span style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(node.subtitle)}</span>
        </div>
      </div>
    `;

    // Obtener relaciones directas de este nodo
    const rels = store.getRelationships(project.id).filter(r => r.sourceId === node.id || r.targetId === node.id);

    content.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
        Conexiones directas (${rels.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${rels.length === 0 ? `
          <div style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic;">Sin conexiones registradas todavía.</div>
        ` : rels.map(r => {
          const isSource = r.sourceId === node.id;
          const otherId = isSource ? r.targetId : r.sourceId;
          const other = store.getEntity(otherId, project.id);
          if (!other) return '';

          const roleDisplay = isSource
            ? (r.roleTarget || r.roleSource || r.type)
            : (r.roleSource || r.type);

          const arrowSymbol = r.isSymmetric ? '↔' : (isSource ? '➔' : '⬅');

          return `
            <div class="card" style="padding: 6px 8px; font-size: 0.8125rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="margin-right: 4px; color: var(--text-muted); font-size: 0.75rem;">${arrowSymbol}</span>
                <strong>${escapeHtml(other.name)}</strong>
                <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(roleDisplay)} (${this.formatCategory(r.category)})</div>
              </div>
              <span class="badge" style="font-size: 0.625rem;">${this.formatStatus(r.status)}</span>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top: var(--space-lg); border-top: 1px solid var(--border-subtle); padding-top: var(--space-md);">
        ${node.type === 'character' ? `
          <button class="btn btn-secondary btn-sm" id="btn-net-open-char" style="width: 100%;">Abrir Ficha de Personaje</button>
        ` : `
          <button class="btn btn-secondary btn-sm" id="btn-net-open-group" style="width: 100%;">Editar Organización</button>
        `}
      </div>
    `;

    panel.classList.add('is-open');

    content.querySelector('#btn-net-open-char')?.addEventListener('click', () => {
      this.app.navigate('characters', project.id, { characterId: node.id });
    });
    content.querySelector('#btn-net-open-group')?.addEventListener('click', () => {
      const grp = store.getGroup(node.id);
      if (grp) this.openGroupModal(grp, project.id);
    });
  }

  hideNetworkNodeDetails() {
    const panel = document.getElementById('network-details-panel');
    panel?.classList.remove('is-open');
  }

  /* ==========================================================================
     MODAL: CREAR / EDITAR RELACIÓN
     ========================================================================== */
  openRelationshipModal(relationship = null, projectId, defaultValues = {}) {
    const isEditing = !!relationship;
    const characters = store.getCharacters(projectId);
    const groups = store.getGroups(projectId);

    const initialSourceId = relationship ? relationship.sourceId : (defaultValues.sourceId || (characters[0] ? characters[0].id : ''));
    const initialTargetId = relationship ? relationship.targetId : (defaultValues.targetId || (characters[1] ? characters[1].id : (groups[0] ? groups[0].id : '')));
    const initialCategory = relationship ? relationship.category : (defaultValues.category || 'familiar');

    modal.open({
      title: isEditing ? 'Editar Relación' : 'Crear Nueva Relación',
      contentHtml: `
        <form id="form-relationship">
          
          <!-- Entidades de Origen y Destino -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="rel-source">Entidad de Origen *</label>
              <select id="rel-source" class="form-select" required>
                <optgroup label="Personajes">
                  ${characters.map(c => `<option value="char:${escapeHtml(c.id)}" ${initialSourceId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </optgroup>
                ${groups.length > 0 ? `
                  <optgroup label="Casas y Organizaciones">
                    ${groups.map(g => `<option value="group:${escapeHtml(g.id)}" ${initialSourceId === g.id ? 'selected' : ''}>🏛️ ${escapeHtml(g.name)}</option>`).join('')}
                  </optgroup>
                ` : ''}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="rel-target">Entidad de Destino *</label>
              <select id="rel-target" class="form-select" required>
                <optgroup label="Personajes">
                  ${characters.map(c => `<option value="char:${escapeHtml(c.id)}" ${initialTargetId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </optgroup>
                ${groups.length > 0 ? `
                  <optgroup label="Casas y Organizaciones">
                    ${groups.map(g => `<option value="group:${escapeHtml(g.id)}" ${initialTargetId === g.id ? 'selected' : ''}>🏛️ ${escapeHtml(g.name)}</option>`).join('')}
                  </optgroup>
                ` : ''}
              </select>
            </div>
          </div>

          <!-- Categoría y Tipo Específico -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="rel-category">Categoría de Vínculo</label>
              <select id="rel-category" class="form-select">
                <option value="familiar" ${initialCategory === 'familiar' ? 'selected' : ''}>Familiar (Parentesco y Linaje)</option>
                <option value="afectiva" ${initialCategory === 'afectiva' ? 'selected' : ''}>Afectiva (Pareja, Romance, Matrimonio)</option>
                <option value="social" ${initialCategory === 'social' ? 'selected' : ''}>Social (Amistad, Mentor, Rivalidad)</option>
                <option value="politica" ${initialCategory === 'politica' ? 'selected' : ''}>Política (Alianza, Vasallaje, Mando)</option>
                <option value="pertenencia" ${initialCategory === 'pertenencia' ? 'selected' : ''}>Pertenencia a Grupo / Casa</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="rel-type">Tipo Específico</label>
              <select id="rel-type" class="form-select">
                <!-- Se llena dinámicamente según la categoría -->
              </select>
            </div>
          </div>

          <!-- Roles específicos en cada extremo -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="rel-role-source">Rol del Origen</label>
              <input type="text" id="rel-role-source" class="form-input" value="${relationship ? escapeHtml(relationship.roleSource) : ''}" placeholder="Ej: Madre, Mentor, Soberano" />
            </div>
            <div class="form-group">
              <label class="form-label" for="rel-role-target">Rol del Destino</label>
              <input type="text" id="rel-role-target" class="form-input" value="${relationship ? escapeHtml(relationship.roleTarget) : ''}" placeholder="Ej: Hija, Aprendiz, Vasallo" />
            </div>
          </div>

          <!-- Reciprocidad y Estado -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="rel-status">Estado del Vínculo</label>
              <select id="rel-status" class="form-select">
                <option value="activa" ${(!relationship || relationship.status === 'activa') ? 'selected' : ''}>Activa / Vigente</option>
                <option value="pasada" ${relationship && relationship.status === 'pasada' ? 'selected' : ''}>Pasada / Terminada</option>
                <option value="conflictiva" ${relationship && relationship.status === 'conflictiva' ? 'selected' : ''}>Conflictiva / En disputa</option>
                <option value="secreta" ${relationship && relationship.status === 'secreta' ? 'selected' : ''}>Secreta / En las sombras</option>
                <option value="prometidos" ${relationship && relationship.status === 'prometidos' ? 'selected' : ''}>Comprometidos</option>
                <option value="divorciados" ${relationship && relationship.status === 'divorciados' ? 'selected' : ''}>Divorciados / Separados</option>
                <option value="viudedad" ${relationship && relationship.status === 'viudedad' ? 'selected' : ''}>Viudedad</option>
                <option value="disidente" ${relationship && relationship.status === 'disidente' ? 'selected' : ''}>Disidente</option>
              </select>
            </div>

            <div class="form-group" style="justify-content: center; padding-top: 22px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                <input type="checkbox" id="rel-symmetric" ${(!relationship || relationship.isSymmetric) ? 'checked' : ''} />
                <span>Relación simétrica / recíproca (↔)</span>
              </label>
            </div>
          </div>

          <!-- Temporalidad -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="rel-start-date">Fecha / Época de inicio</label>
              <input type="text" id="rel-start-date" class="form-input" value="${relationship ? escapeHtml(relationship.startDate) : ''}" placeholder="Ej: Año 1042 o Antes del Ocaso" />
            </div>
            <div class="form-group">
              <label class="form-label" for="rel-end-date">Fecha / Época de fin (opcional)</label>
              <input type="text" id="rel-end-date" class="form-input" value="${relationship ? escapeHtml(relationship.endDate) : ''}" placeholder="Ej: Año 1050 (si finalizó)" />
            </div>
          </div>

          <!-- Descripción / Contexto narrativo -->
          <div class="form-group">
            <label class="form-label" for="rel-desc">Contexto, motivos y acuerdos</label>
            <textarea id="rel-desc" class="form-textarea" placeholder="Explica el origen de este lazo, secretos compartidos, motivos de enemistad o consecuencias narrativas...">${relationship ? escapeHtml(relationship.description) : ''}</textarea>
          </div>
        </form>
      `,
      confirmText: isEditing ? 'Guardar cambios' : 'Crear relación',
      onOpen: (modalEl) => {
        const catSelect = modalEl.querySelector('#rel-category');
        const typeSelect = modalEl.querySelector('#rel-type');
        const symCheck = modalEl.querySelector('#rel-symmetric');

        const typesPerCat = {
          familiar: [
            { id: 'progenitor_descendiente', name: 'Padre/Madre e Hijo/a', symmetric: false, src: 'Progenitor/a', tgt: 'Hijo/a' },
            { id: 'hermanos', name: 'Hermanos', symmetric: true, src: 'Hermano/a', tgt: 'Hermano/a' },
            { id: 'adopcion', name: 'Adopción / Tutela', symmetric: false, src: 'Tutor/a', tgt: 'Pupilo/a' },
            { id: 'abuelo_nieto', name: 'Abuelo/a y Nieto/a', symmetric: false, src: 'Abuelo/a', tgt: 'Nieto/a' },
            { id: 'tio_sobrino', name: 'Tío/a y Sobrino/a', symmetric: false, src: 'Tío/a', tgt: 'Sobrino/a' },
            { id: 'familiar_otro', name: 'Otro parentesco', symmetric: true, src: 'Familiar', tgt: 'Familiar' }
          ],
          afectiva: [
            { id: 'pareja', name: 'Pareja / Romance', symmetric: true, src: 'Pareja', tgt: 'Pareja' },
            { id: 'matrimonio', name: 'Matrimonio / Cónyuges', symmetric: true, src: 'Cónyuge', tgt: 'Cónyuge' },
            { id: 'prometidos', name: 'Prometidos', symmetric: true, src: 'Prometido/a', tgt: 'Prometido/a' },
            { id: 'expareja', name: 'Expareja / Divorcio', symmetric: true, src: 'Expareja', tgt: 'Expareja' },
            { id: 'amantes', name: 'Amantes secretos', symmetric: true, src: 'Amante', tgt: 'Amante' }
          ],
          social: [
            { id: 'amistad', name: 'Amistad profunda', symmetric: true, src: 'Amigo/a', tgt: 'Amigo/a' },
            { id: 'rivalidad', name: 'Rivalidad', symmetric: true, src: 'Rival', tgt: 'Rival' },
            { id: 'enemistad', name: 'Enemistad declarada', symmetric: true, src: 'Enemigo/a', tgt: 'Enemigo/a' },
            { id: 'mentor_aprendiz', name: 'Mentor y Aprendiz', symmetric: false, src: 'Mentor/a', tgt: 'Aprendiz' },
            { id: 'camaradas', name: 'Compañeros de armas', symmetric: true, src: 'Camarada', tgt: 'Camarada' }
          ],
          politica: [
            { id: 'alianza', name: 'Alianza política', symmetric: true, src: 'Aliado/a', tgt: 'Aliado/a' },
            { id: 'vasallaje', name: 'Señor y Vasallo', symmetric: false, src: 'Soberano/a', tgt: 'Vasallo/a' },
            { id: 'superior_subordinado', name: 'Mando y Subordinado', symmetric: false, src: 'Superior', tgt: 'Oficial' },
            { id: 'tregua', name: 'Pacto de tregua', symmetric: true, src: 'Parte del pacto', tgt: 'Parte del pacto' }
          ],
          pertenencia: [
            { id: 'pertenencia', name: 'Membresía / Cargo', symmetric: false, src: 'Miembro / Cargo', tgt: 'Organización' }
          ]
        };

        const updateTypes = () => {
          const cat = catSelect.value;
          const options = typesPerCat[cat] || typesPerCat.social;
          const currentType = relationship ? relationship.type : (defaultValues.type || options[0].id);

          typeSelect.innerHTML = options.map(opt => `
            <option value="${escapeHtml(opt.id)}" ${opt.id === currentType ? 'selected' : ''}>${escapeHtml(opt.name)}</option>
          `).join('');

          if (!relationship) {
            const selectedOpt = options.find(o => o.id === typeSelect.value) || options[0];
            symCheck.checked = selectedOpt.symmetric;
            if (!modalEl.querySelector('#rel-role-source').value) modalEl.querySelector('#rel-role-source').value = selectedOpt.src;
            if (!modalEl.querySelector('#rel-role-target').value) modalEl.querySelector('#rel-role-target').value = selectedOpt.tgt;
          }
        };

        catSelect.addEventListener('change', updateTypes);
        typeSelect.addEventListener('change', () => {
          const cat = catSelect.value;
          const options = typesPerCat[cat] || [];
          const selectedOpt = options.find(o => o.id === typeSelect.value);
          if (selectedOpt && !relationship) {
            symCheck.checked = selectedOpt.symmetric;
            modalEl.querySelector('#rel-role-source').value = selectedOpt.src;
            modalEl.querySelector('#rel-role-target').value = selectedOpt.tgt;
          }
        });

        updateTypes();
      },
      onConfirm: (modalEl) => {
        const sourceVal = modalEl.querySelector('#rel-source').value;
        const targetVal = modalEl.querySelector('#rel-target').value;
        const category = modalEl.querySelector('#rel-category').value;
        const type = modalEl.querySelector('#rel-type').value;
        const roleSource = modalEl.querySelector('#rel-role-source').value.trim();
        const roleTarget = modalEl.querySelector('#rel-role-target').value.trim();
        const isSymmetric = modalEl.querySelector('#rel-symmetric').checked;
        const status = modalEl.querySelector('#rel-status').value;
        const startDate = modalEl.querySelector('#rel-start-date').value.trim();
        const endDate = modalEl.querySelector('#rel-end-date').value.trim();
        const description = modalEl.querySelector('#rel-desc').value.trim();

        const [sourceTypePrefix, ...sourceIdParts] = sourceVal.split(':');
        const [targetTypePrefix, ...targetIdParts] = targetVal.split(':');
        const sourceId = sourceIdParts.join(':');
        const targetId = targetIdParts.join(':');

        if (sourceId === targetId) {
          showToast('Una entidad no puede relacionarse consigo misma', 'error');
          return false;
        }

        if (startDate && endDate) {
          const numStart = parseInt(startDate, 10);
          const numEnd = parseInt(endDate, 10);
          if (!isNaN(numStart) && !isNaN(numEnd) && numStart > numEnd) {
            showToast('La fecha de inicio no puede ser posterior a la de fin', 'error');
            return false;
          }
        }

        const data = {
          sourceId,
          sourceType: sourceTypePrefix === 'group' ? 'group' : 'character',
          targetId,
          targetType: targetTypePrefix === 'group' ? 'group' : 'character',
          category,
          type,
          roleSource,
          roleTarget,
          isSymmetric,
          status,
          startDate,
          endDate,
          description
        };

        if (isEditing) {
          const res = store.updateRelationship(relationship.id, data);
          if (!res) {
            showToast('No se pudo actualizar la relación', 'error');
            return false;
          }
          showToast('Relación actualizada con éxito', 'success');
        } else {
          const res = store.createRelationship({ ...data, projectId });
          if (!res) {
            showToast('No se pudo crear la relación', 'error');
            return false;
          }
          showToast('Relación creada con éxito', 'success');
        }

        this.render(document.getElementById('app-main'));
        return true;
      }
    });
  }

  /* ==========================================================================
     MODAL: CREAR / EDITAR CASA / GRUPO
     ========================================================================== */
  openGroupModal(group = null, projectId) {
    const isEditing = !!group;
    const characters = store.getCharacters(projectId);
    const heraldicColors = ['#4F46E5', '#2563EB', '#059669', '#DC2626', '#B45309', '#7C3AED', '#475569', '#0D9488'];

    modal.open({
      title: isEditing ? `Editar ${group.name}` : 'Crear Casa Noble u Organización',
      contentHtml: `
        <form id="form-group">
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="group-name">Nombre de la Casa u Organización *</label>
              <input type="text" id="group-name" class="form-input" value="${group ? escapeHtml(group.name) : ''}" placeholder="Ej: Casa Thorne, Orden del Velo" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="group-type">Tipo de Estructura</label>
              <select id="group-type" class="form-select">
                <option value="casa_noble" ${group && group.type === 'casa_noble' ? 'selected' : ''}>Casa Noble</option>
                <option value="dinastia" ${group && group.type === 'dinastia' ? 'selected' : ''}>Dinastía</option>
                <option value="clan" ${group && group.type === 'clan' ? 'selected' : ''}>Clan / Tribu</option>
                <option value="faccion" ${group && group.type === 'faccion' ? 'selected' : ''}>Facción Política</option>
                <option value="gremio" ${group && group.type === 'gremio' ? 'selected' : ''}>Gremio / Cofradía</option>
                <option value="culto" ${group && group.type === 'culto' ? 'selected' : ''}>Culto / Orden Religiosa</option>
                <option value="ejercito" ${group && group.type === 'ejercito' ? 'selected' : ''}>Fuerza Militar</option>
                <option value="otro" ${group && group.type === 'otro' ? 'selected' : ''}>Otra Organización</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="group-motto">Lema heráldico o divisa</label>
            <input type="text" id="group-motto" class="form-input" value="${group ? escapeHtml(group.motto) : ''}" placeholder="Ej: El orden prevalece en la sombra" />
          </div>

          <!-- Color heráldico distintivo -->
          <div class="form-group">
            <label class="form-label">Color distintivo o estandarte</label>
            <div style="display: flex; gap: 8px; align-items: center; height: 38px;">
              ${heraldicColors.map(c => `
                <label style="cursor: pointer;">
                  <input type="radio" name="group-color" value="${c}" ${(group ? group.color === c : c === '#4F46E5') ? 'checked' : ''} style="display: none;" />
                  <span class="color-dot" style="display: inline-block; width: 24px; height: 24px; border-radius: 4px; background-color: ${c}; border: 2px solid transparent; transition: transform 0.15s ease;"></span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Líder y Fundador opcionales -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="group-leader">Líder / Monarca / Patriarca actual</label>
              <select id="group-leader" class="form-select">
                <option value="">(Sin asignar o líder desconocido)</option>
                ${characters.map(c => `
                  <option value="${escapeHtml(c.id)}" ${group && group.leaderId === c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.alias || c.role)})</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="group-founder">Fundador histórico (opcional)</label>
              <select id="group-founder" class="form-select">
                <option value="">(Fundador ancestral o desconocido)</option>
                ${characters.map(c => `
                  <option value="${escapeHtml(c.id)}" ${group && group.founderId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="group-desc">Historia, influencia territorial y propósito</label>
            <textarea id="group-desc" class="form-textarea" placeholder="¿Cuál es el peso de esta casa o facción en la historia? ¿Qué recursos o títulos ostenta?">${group ? escapeHtml(group.description) : ''}</textarea>
          </div>
        </form>
      `,
      confirmText: isEditing ? 'Guardar cambios' : 'Crear organización',
      onOpen: (modalEl) => {
        const updateBorders = () => {
          modalEl.querySelectorAll('input[name="group-color"]').forEach(input => {
            const span = input.nextElementSibling;
            if (input.checked) {
              span.style.transform = 'scale(1.2)';
              span.style.boxShadow = '0 0 0 2px var(--text-primary)';
            } else {
              span.style.transform = 'scale(1)';
              span.style.boxShadow = 'none';
            }
          });
        };
        updateBorders();
        modalEl.querySelectorAll('input[name="group-color"]').forEach(input => {
          input.addEventListener('change', updateBorders);
        });
      },
      onConfirm: (modalEl) => {
        const name = modalEl.querySelector('#group-name').value.trim();
        const type = modalEl.querySelector('#group-type').value;
        const motto = modalEl.querySelector('#group-motto').value.trim();
        const leaderId = modalEl.querySelector('#group-leader').value || null;
        const founderId = modalEl.querySelector('#group-founder').value || null;
        const description = modalEl.querySelector('#group-desc').value.trim();
        const colorRadio = modalEl.querySelector('input[name="group-color"]:checked');
        const color = colorRadio ? colorRadio.value : '#4F46E5';

        if (!name) {
          showToast('La casa u organización debe tener un nombre', 'error');
          return false;
        }

        const data = {
          name,
          type,
          motto,
          leaderId,
          founderId,
          description,
          color
        };

        if (isEditing) {
          store.updateGroup(group.id, data);
          showToast(`Organización "${name}" actualizada`, 'success');
        } else {
          const newGrp = store.createGroup({ ...data, projectId });
          // Si se seleccionó líder, crear automáticamente relación de pertenencia
          if (leaderId) {
            store.createRelationship({
              projectId,
              sourceId: leaderId,
              sourceType: 'character',
              targetId: newGrp.id,
              targetType: 'group',
              category: 'pertenencia',
              type: 'pertenencia',
              roleSource: 'Líder / Patriarca',
              roleTarget: 'Organización',
              isSymmetric: false,
              status: 'activa'
            });
          }
          showToast(`Casa u organización "${name}" creada`, 'success');
        }

        this.render(document.getElementById('app-main'));
        return true;
      }
    });
  }
}
