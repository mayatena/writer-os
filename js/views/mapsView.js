/* Writer OS — Vista de Mapas y Editor Cartográfico Interactivo */

import { store } from '../models/store.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import {
  escapeHtml,
  createMap,
  createMapElement,
  MAP_PRESETS,
  MAP_DEFAULT_LAYERS,
  PLACE_CATEGORIES,
  getPlaceCategoryIcon
} from '../models/types.js';

export class MapsView {
  constructor(app) {
    this.app = app;
    this.currentMapId = null;

    // Estado del Lienzo y Cámara
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.minZoom = 0.2;
    this.maxZoom = 4.0;

    // Herramienta activa
    this.activeTool = 'select'; // 'select' | 'hand' | 'erase' | herramientas de terreno/agua/infra/anotaciones
    this.selectedElementIds = new Set();
    this.selectedVertexIndex = null;

    // Estado de interacción en Canvas
    this.isPanning = false;
    this.isSpacePressed = false;
    this.isDraggingElement = false;
    this.isDraggingVertex = false;
    this.isBoxSelecting = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.boxStartX = 0;
    this.boxStartY = 0;
    this.mouseWorldX = 0;
    this.mouseWorldY = 0;

    // Puntos en proceso de dibujo para Líneas y Áreas
    this.drawingPoints = [];

    // Pila de Deshacer / Rehacer
    this.historyStack = [];
    this.historyIndex = -1;
    this.maxHistory = 30;

    // Estado de interfaz del editor
    this.leftTab = 'tools'; // 'tools' | 'places'
    this.placesSearchQuery = '';
    this.collapsedToolGroups = new Set();
    this.showLayersPopover = false;

    // Imagen de referencia en memoria
    this.referenceImageObj = null;
    this.lastRefImageUrl = null;
  }

  /* ==========================================================================
     MÉTODO PRINCIPAL DE RENDERIZADO
     ========================================================================== */
  render(container, params = {}) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    this.container = container;
    const mapIdFromParams = params.mapId || null;

    if (mapIdFromParams && store.getMap(mapIdFromParams, project.id)) {
      this.currentMapId = mapIdFromParams;
      this.renderEditor(container, project, this.currentMapId);
    } else {
      this.currentMapId = null;
      this.renderLibrary(container, project);
    }
  }

  /* ==========================================================================
     1. BIBLIOTECA DE MAPAS (GALERÍA DEL PROYECTO)
     ========================================================================== */
  renderLibrary(container, project) {
    const maps = store.getMaps(project.id);

    container.innerHTML = `
      <div class="maps-library-container">
        <div class="maps-library-header">
          <div class="maps-library-title">
            <h1>Mapas y Cartografía</h1>
            <p>Representación visual, territorial y topográfica del universo de <strong>${escapeHtml(project.title)}</strong>.</p>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-create-map">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nuevo Mapa</span>
            </button>
          </div>
        </div>

        ${maps.length === 0 ? `
          <div class="empty-state" style="padding: var(--space-3xl) var(--space-lg); text-align: center; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
            <div style="margin-bottom: var(--space-md); color: var(--accent); opacity: 0.85; display: flex; justify-content: center;">
              <svg class="icon" style="width: 48px; height: 48px;" viewBox="0 0 24 24">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                <line x1="9" y1="3" x2="9" y2="18"></line>
                <line x1="15" y1="6" x2="15" y2="21"></line>
              </svg>
            </div>
            <h3 style="font-family: var(--font-serif); font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Aún no hay mapas en este proyecto</h3>
            <p style="font-size: 0.875rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto var(--space-lg) auto;">
              Crea tu primer mapa para plasmar continentes, trazar ríos y calzadas, y posicionar los lugares creados en Mundo.
            </p>
            <button class="btn btn-primary" id="btn-create-map-empty">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Crear Mapa Inicial</span>
            </button>
          </div>
        ` : `
          <div class="maps-grid">
            ${maps.map(m => this.renderMapCard(m, project)).join('')}
          </div>
        `}
      </div>
    `;

    // Eventos de la biblioteca
    container.querySelector('#btn-create-map')?.addEventListener('click', () => this.openMapModal(null, project.id));
    container.querySelector('#btn-create-map-empty')?.addEventListener('click', () => this.openMapModal(null, project.id));

    container.querySelectorAll('.btn-open-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-map-id');
        this.openMap(id, project.id);
      });
    });

    container.querySelectorAll('.btn-edit-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-map-id');
        const m = store.getMap(id, project.id);
        if (m) this.openMapModal(m, project.id);
      });
    });

    container.querySelectorAll('.btn-duplicate-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-map-id');
        const cloned = store.duplicateMap(id);
        if (cloned) {
          showToast(`Mapa "${cloned.name}" duplicado correctamente.`);
          this.renderLibrary(container, project);
        }
      });
    });

    container.querySelectorAll('.btn-delete-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-map-id');
        const m = store.getMap(id, project.id);
        if (!m) return;
        if (confirm(`¿Eliminar el mapa "${m.name}"? Los lugares en Mundo permanecerán intactos.`)) {
          store.deleteMap(id);
          showToast('Mapa eliminado.');
          this.renderLibrary(container, project);
        }
      });
    });
  }

  renderMapCard(map, project) {
    const preset = MAP_PRESETS[map.preset] || MAP_PRESETS.editorial;
    const elemCount = Array.isArray(map.elements) ? map.elements.length : 0;
    const dateStr = new Date(map.updatedAt || map.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <div class="map-card" data-map-id="${escapeHtml(map.id)}">
        <div class="map-card-preview btn-open-map" data-map-id="${escapeHtml(map.id)}" style="background-color: ${preset.bg}; border-bottom-color: ${preset.stroke}33;">
          <div class="map-card-preview-pattern"></div>
          <span class="map-card-preset-badge" style="color:${preset.stroke}; border-color:${preset.stroke}44;">${escapeHtml(preset.name.split(' ')[0])}</span>
          <svg class="icon icon-xl" viewBox="0 0 24 24" style="color: ${preset.accent}; opacity: 0.85; width: 44px; height: 44px;">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
        </div>

        <div class="map-card-body">
          <div class="map-card-name btn-open-map" data-map-id="${escapeHtml(map.id)}">${escapeHtml(map.name)}</div>
          <div class="map-card-desc">${escapeHtml(map.description || 'Sin descripción.')}</div>
          <div class="map-card-meta">
            <span>${elemCount === 1 ? '1 elemento' : `${elemCount} elementos`}</span>
            <span>•</span>
            <span>${escapeHtml(dateStr)}</span>
          </div>
        </div>

        <div class="map-card-footer">
          <button class="btn btn-secondary btn-sm btn-open-map" data-map-id="${escapeHtml(map.id)}">
            <span>Abrir Editor</span>
          </button>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-subtle btn-icon btn-sm btn-edit-map" data-map-id="${escapeHtml(map.id)}" title="Editar propiedades del mapa">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm btn-duplicate-map" data-map-id="${escapeHtml(map.id)}" title="Duplicar mapa">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm btn-delete-map" data-map-id="${escapeHtml(map.id)}" title="Eliminar mapa" style="color: var(--danger);">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  openMap(mapId, projectId) {
    this.app.navigate('maps', projectId, { mapId });
  }

  /* ==========================================================================
     2. EDITOR CARTOGRÁFICO INTERACTIVO (3 ZONAS + CANVAS 2D)
     ========================================================================== */
  renderEditor(container, project, mapId) {
    this.container = container;
    this.currentMapId = mapId;
    const map = store.getMap(mapId, project.id);
    if (!map) {
      this.renderLibrary(container, project);
      return;
    }

    // Inicializar historial
    this.historyStack = [JSON.stringify(map.elements || [])];
    this.historyIndex = 0;
    this.selectedElementIds.clear();
    this.drawingPoints = [];

    container.innerHTML = `
      <div class="map-editor-container" id="map-editor-root">
        <!-- BARRA SUPERIOR DEL EDITOR -->
        <div class="map-editor-toolbar">
          <div class="map-toolbar-group">
            <button class="btn btn-secondary btn-sm" id="btn-back-library" title="Volver a la biblioteca de mapas">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Mapas</span>
            </button>
            <span class="map-toolbar-sep"></span>
            <span class="map-title-badge" id="map-header-title" title="${escapeHtml(map.name)}">${escapeHtml(map.name)}</span>
            <select class="btn btn-subtle btn-sm" id="select-map-preset" style="padding: 2px 6px; font-size: 0.75rem;" title="Cambiar preset de estilo visual">
              ${Object.values(MAP_PRESETS).map(pr => `
                <option value="${pr.id}" ${pr.id === map.preset ? 'selected' : ''}>${escapeHtml(pr.name)}</option>
              `).join('')}
            </select>
          </div>

          <!-- CONTROLES CENTRALES DE ZOOM Y NAVEGACIÓN -->
          <div class="map-toolbar-group">
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-zoom-out" title="Alejar (Rueda hacia abajo)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <button class="btn btn-subtle btn-sm" id="btn-zoom-reset" style="font-size: 0.75rem; min-width: 48px;" title="Restablecer zoom al 100%">
              <span id="zoom-percentage-text">100%</span>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-zoom-in" title="Acercar (Rueda hacia arriba)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <span class="map-toolbar-sep"></span>
            <button class="btn btn-subtle btn-sm" id="btn-fit-screen" title="Ajustar todo el contenido a la pantalla">
              <span>Ajustar</span>
            </button>
            <button class="btn btn-subtle btn-sm" id="btn-center-content" title="Centrar cámara en el mapa">
              <span>Centrar</span>
            </button>
            <span class="map-toolbar-sep"></span>
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-undo" title="Deshacer (Ctrl + Z)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            </button>
            <button class="btn btn-subtle btn-icon btn-sm" id="btn-redo" title="Rehacer (Ctrl + Shift + Z)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </button>
          </div>

          <!-- ACCIONES ESPECIALES (GENERADOR, CAPAS, IMAGEN DE REFERENCIA) -->
          <div class="map-toolbar-group">
            <button class="btn btn-secondary btn-sm" id="btn-open-generator" title="Generar geografía y mundo proceduralmente">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Generar mundo</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-reorganize-places" title="Reorganizar distribución de lugares de Mundo">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
              <span>Reorganizar</span>
            </button>
            <button class="btn btn-subtle btn-sm" id="btn-clear-map" title="Vaciar todos los elementos del mapa actual">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Vaciar</span>
            </button>
            <span class="map-toolbar-sep"></span>
            <button class="btn btn-subtle btn-sm" id="btn-toggle-layers" title="Gestionar capas cartográficas">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>Capas</span>
            </button>
            <button class="btn btn-subtle btn-sm" id="btn-ref-image" title="Imagen de referencia de fondo">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>Referencia</span>
            </button>
          </div>
        </div>

        <!-- ESPACIO DE TRABAJO (3 COLUMNAS) -->
        <div class="map-editor-workspace">
          
          <!-- ZONA IZQUIERDA: HERRAMIENTAS & DRAWER DE LUGARES -->
          <aside class="map-sidebar-left" id="map-sidebar-left">
            <div class="map-sidebar-tabs">
              <button class="map-sidebar-tab-btn is-active" id="tab-btn-tools" data-tab="tools">
                <svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>Herramientas</span>
              </button>
              <button class="map-sidebar-tab-btn" id="tab-btn-places" data-tab="places">
                <svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span>Lugares Mundo</span>
              </button>
            </div>

            <div class="map-sidebar-content" id="map-sidebar-content">
              <!-- El contenido se inyecta dinámicamente con renderLeftTabContent() -->
            </div>
          </aside>

          <!-- ZONA CENTRAL: LIENZO CARTOGRÁFICO (CANVAS 2D) -->
          <div class="map-canvas-wrapper" id="map-canvas-wrapper">
            <canvas class="map-canvas" id="carto-canvas"></canvas>
            
            <div class="map-viewport-info">
              <span id="coord-display">X: 0, Y: 0</span>
              <span>•</span>
              <span id="elements-count-display">${(map.elements || []).length} elementos</span>
            </div>

            <div class="map-zoom-badge" id="zoom-badge-bottom">100%</div>

            <!-- Popover de Capas Flotante -->
            <div class="map-layers-popover" id="map-layers-popover" style="display: none;">
              <!-- Inyectado por renderLayersPopover -->
            </div>
          </div>

          <!-- ZONA DERECHA: INSPECTOR CONTEXTUAL -->
          <aside class="map-sidebar-right" id="map-sidebar-right">
            <!-- El inspector contextual se inyecta por renderInspector() -->
          </aside>

        </div>
      </div>
    `;

    // Cachear elementos del DOM
    this.canvas = container.querySelector('#carto-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWrapper = container.querySelector('#map-canvas-wrapper');
    this.sidebarContent = container.querySelector('#map-sidebar-content');
    this.inspectorEl = container.querySelector('#map-sidebar-right');
    this.layersPopover = container.querySelector('#map-layers-popover');

    // Montar vistas iniciales
    this.renderLeftTabContent(project, map);
    this.renderInspector(map, project);

    // Ajustar resolución del Canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Cargar imagen de referencia si existe
    this.loadReferenceImage(map.referenceImage);

    // Ajustar cámara inicial al contenido o al centro
    this.fitToContent(map);

    // Enlazar eventos de toolbar, canvas e inspector
    this.bindEditorEvents(project, map);

    // Dibujar frame inicial
    this.requestDraw(map);
  }

  /* ==========================================================================
     3. PESTAÑA IZQUIERDA: HERRAMIENTAS GEOGRÁFICAS & LUGARES
     ========================================================================== */
  renderLeftTabContent(project, map) {
    if (this.leftTab === 'tools') {
      this.renderToolsPanel();
    } else {
      this.renderPlacesPanel(project, map);
    }
  }

  renderToolsPanel() {
    const isCollapsed = (grp) => this.collapsedToolGroups.has(grp);

    this.sidebarContent.innerHTML = `
      <!-- NAVEGACIÓN Y EDICIÓN -->
      <div class="map-tool-group">
        <div class="map-tool-group-header" data-group="nav">
          <span>Navegación</span>
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="${isCollapsed('nav') ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
        </div>
        ${!isCollapsed('nav') ? `
          <div class="map-tool-group-body">
            <button class="map-tool-btn ${this.activeTool === 'select' ? 'is-active' : ''}" data-tool="select" title="Seleccionar y mover elementos">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 3l7 18 3-7 7-3L3 3z"></path></svg>
              <span>Seleccionar</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'hand' ? 'is-active' : ''}" data-tool="hand" title="Desplazar mapa (Mano o Barra Espaciadora)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-4 0v4"></path><path d="M14 10V4a2 2 0 0 0-4 0v6"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>
              <span>Mano</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'erase' ? 'is-active' : ''}" data-tool="erase" title="Borrador de elementos">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Borrar</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- TERRENO Y RELIEVE -->
      <div class="map-tool-group">
        <div class="map-tool-group-header" data-group="terrain">
          <span>Terreno y Relieve</span>
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="${isCollapsed('terrain') ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
        </div>
        ${!isCollapsed('terrain') ? `
          <div class="map-tool-group-body">
            <button class="map-tool-btn ${this.activeTool === 'montana' ? 'is-active' : ''}" data-tool="montana" title="Montaña (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"></path></svg>
              <span>Montaña</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'colina' ? 'is-active' : ''}" data-tool="colina" title="Colina (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 20c4-6 8-6 12 0"></path><path d="M10 20c3-4 7-4 12 0"></path></svg>
              <span>Colina</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'volcan' ? 'is-active' : ''}" data-tool="volcan" title="Volcán (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 21 9 7h6l6 14H3z"></path><path d="M12 3v4"></path></svg>
              <span>Volcán</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'bosque' ? 'is-active' : ''}" data-tool="bosque" title="Bosque (Dibujar Área)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 2 7 10h3l-3 7h10l-3-7h3L12 2z"></path><path d="M12 17v5"></path></svg>
              <span>Bosque</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'desierto' ? 'is-active' : ''}" data-tool="desierto" title="Desierto (Dibujar Área)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 18c4-4 8-4 12 0"></path><circle cx="18" cy="6" r="3"></circle></svg>
              <span>Desierto</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'cueva' ? 'is-active' : ''}" data-tool="cueva" title="Cueva (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 21h18c0-8-4-14-9-14S3 13 3 21z"></path></svg>
              <span>Cueva</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- AGUA Y COSTAS -->
      <div class="map-tool-group">
        <div class="map-tool-group-header" data-group="water">
          <span>Agua y Costas</span>
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="${isCollapsed('water') ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
        </div>
        ${!isCollapsed('water') ? `
          <div class="map-tool-group-body">
            <button class="map-tool-btn ${this.activeTool === 'rio' ? 'is-active' : ''}" data-tool="rio" title="Río (Dibujar Línea)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M4 4c4 4 8 0 12 4s-4 8 0 12"></path></svg>
              <span>Río</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'mar' ? 'is-active' : ''}" data-tool="mar" title="Mar u Océano (Dibujar Área)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 12c3-2 6-2 9 0s6 2 9 0"></path><path d="M2 16c3-2 6-2 9 0s6 2 9 0"></path></svg>
              <span>Mar / Costa</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'lago' ? 'is-active' : ''}" data-tool="lago" title="Lago (Dibujar Área)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="6"></ellipse></svg>
              <span>Lago</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- VÍAS E INFRAESTRUCTURA -->
      <div class="map-tool-group">
        <div class="map-tool-group-header" data-group="infra">
          <span>Vías e Infraestructura</span>
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="${isCollapsed('infra') ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
        </div>
        ${!isCollapsed('infra') ? `
          <div class="map-tool-group-body">
            <button class="map-tool-btn ${this.activeTool === 'carretera' ? 'is-active' : ''}" data-tool="carretera" title="Calzada o Carretera (Dibujar Línea)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="4" y1="21" x2="8" y2="3"></line><line x1="20" y1="21" x2="16" y2="3"></line><line x1="12" y1="7" x2="12" y2="9"></line><line x1="12" y1="15" x2="12" y2="17"></line></svg>
              <span>Carretera</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'camino' ? 'is-active' : ''}" data-tool="camino" title="Sendero o Camino (Dibujar Línea punteada)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M4 20c6-3 6-13 16-16"></path></svg>
              <span>Camino</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'puente' ? 'is-active' : ''}" data-tool="puente" title="Puente (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 17h18"></path><path d="M6 17v-4a6 6 0 0 1 12 0v4"></path></svg>
              <span>Puente</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'muralla' ? 'is-active' : ''}" data-tool="muralla" title="Muralla defensiva (Dibujar Línea)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="10"></rect><polyline points="3 10 3 6 7 6 7 10 11 10 11 6 15 6 15 10 19 10 19 6 21 6 21 10"></polyline></svg>
              <span>Muralla</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'frontera' ? 'is-active' : ''}" data-tool="frontera" title="Línea Fronteriza (Dibujar Línea)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="4 4"></line></svg>
              <span>Frontera</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- ANOTACIONES LIBRES -->
      <div class="map-tool-group">
        <div class="map-tool-group-header" data-group="annotations">
          <span>Anotaciones y Rótulos</span>
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="${isCollapsed('annotations') ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
        </div>
        ${!isCollapsed('annotations') ? `
          <div class="map-tool-group-body">
            <button class="map-tool-btn ${this.activeTool === 'marcador' ? 'is-active' : ''}" data-tool="marcador" title="Marcador o Pin (Punto)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>Marcador</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'flecha' ? 'is-active' : ''}" data-tool="flecha" title="Flecha de movimiento (Dibujar Línea)">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              <span>Flecha</span>
            </button>
            <button class="map-tool-btn ${this.activeTool === 'texto' ? 'is-active' : ''}" data-tool="texto" title="Rótulo de texto libre">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              <span>Texto libre</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Enlazar clics de herramientas
    this.sidebarContent.querySelectorAll('.map-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        this.selectTool(tool);
      });
    });

    // Enlazar colapso de acordeones
    this.sidebarContent.querySelectorAll('.map-tool-group-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const grp = hdr.getAttribute('data-group');
        if (this.collapsedToolGroups.has(grp)) {
          this.collapsedToolGroups.delete(grp);
        } else {
          this.collapsedToolGroups.add(grp);
        }
        this.renderToolsPanel();
      });
    });
  }

  renderPlacesPanel(project, map) {
    const allPlaces = store.getPlaces(project.id);
    const placedPlaceIds = new Set((map.elements || []).map(el => el.placeId).filter(Boolean));

    const filteredPlaces = allPlaces.filter(p => {
      const q = this.placesSearchQuery.toLowerCase().trim();
      return !q || p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
    });

    this.sidebarContent.innerHTML = `
      <div class="map-places-search-box">
        <input type="text" id="map-places-search-input" placeholder="Buscar lugar en Mundo..." value="${escapeHtml(this.placesSearchQuery)}" />
      </div>

      <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">
        Arrastra un lugar al lienzo para colocarlo en este mapa:
      </div>

      <div style="display:flex; flex-direction:column; gap:4px;">
        ${filteredPlaces.length === 0 ? `
          <div style="font-size:0.8125rem; color:var(--text-muted); font-style:italic; padding:12px 0; text-align:center;">
            No se encontraron lugares en Mundo.
          </div>
        ` : filteredPlaces.map(p => {
          const isPlaced = placedPlaceIds.has(p.id);
          const catMeta = PLACE_CATEGORIES[p.category] || PLACE_CATEGORIES.geografia;
          return `
            <div class="map-place-draggable ${isPlaced ? 'is-placed' : ''}" draggable="true" data-place-id="${escapeHtml(p.id)}" title="${isPlaced ? 'Este lugar ya está presente en el mapa (puedes arrastrarlo de nuevo si deseas otra representación)' : 'Arrastra este lugar al lienzo'}">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="tree-node-icon" style="background-color: ${escapeHtml(p.color || catMeta.color)}22; color: ${escapeHtml(p.color || catMeta.color)}; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px;">
                  ${getPlaceCategoryIcon(p.category, 'icon icon-xs')}
                </span>
                <div>
                  <div style="font-weight:600; font-size:0.8125rem; color:var(--text-primary); line-height:1.2;">${escapeHtml(p.name)}</div>
                  <div style="font-size:0.6875rem; color:var(--text-muted);">${escapeHtml(p.type)}</div>
                </div>
              </div>
              <div>
                ${isPlaced ? `<span class="placed-indicator">En mapa</span>` : `<span style="font-size:0.6875rem; color:var(--accent); font-weight:600;">+ Añadir</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Buscador
    const searchInput = this.sidebarContent.querySelector('#map-places-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.placesSearchQuery = e.target.value;
      this.renderPlacesPanel(project, map);
      this.sidebarContent.querySelector('#map-places-search-input')?.focus();
    });

    // Configurar Drag & Drop
    this.sidebarContent.querySelectorAll('.map-place-draggable').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        const placeId = el.getAttribute('data-place-id');
        e.dataTransfer.setData('text/plain', placeId);
        e.dataTransfer.effectAllowed = 'copy';
      });

      // También soporte de clic directo para accesibilidad
      el.addEventListener('click', () => {
        const placeId = el.getAttribute('data-place-id');
        const place = store.getPlace(placeId, project.id);
        if (place) {
          // Colocar en el centro visible del viewport
          const centerWorld = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
          this.placeWorldEntityOnMap(map, place, centerWorld.x, centerWorld.y);
        }
      });
    });
  }

  selectTool(tool) {
    this.activeTool = tool;
    this.drawingPoints = [];

    // Actualizar botones de UI
    this.sidebarContent.querySelectorAll('.map-tool-btn').forEach(btn => {
      if (btn.getAttribute('data-tool') === tool) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    // Actualizar cursor del canvas
    if (tool === 'hand') {
      this.canvas.className = 'map-canvas cursor-grab';
    } else if (tool === 'select') {
      this.canvas.className = 'map-canvas';
    } else {
      this.canvas.className = 'map-canvas cursor-crosshair';
    }

    const map = store.getMap(this.currentMapId);
    if (map) this.requestDraw(map);
  }

  /* ==========================================================================
     4. GESTIÓN DEL LIENZO (TRANSFORMACIONES, EVENTOS, DIBUJADO)
     ========================================================================== */
  resizeCanvas() {
    if (!this.canvas || !this.canvasWrapper) return;
    const rect = this.canvasWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    const map = store.getMap(this.currentMapId);
    if (map) this.requestDraw(map);
  }

  screenToWorld(screenX, screenY) {
    const dpr = window.devicePixelRatio || 1;
    const canvasX = screenX * dpr;
    const canvasY = screenY * dpr;
    return {
      x: (canvasX - this.panX) / this.zoom,
      y: (canvasY - this.panY) / this.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (worldX * this.zoom + this.panX) / dpr,
      y: (worldY * this.zoom + this.panY) / dpr
    };
  }

  fitToContent(map) {
    if (!this.canvasWrapper) return;
    const rect = this.canvasWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasW = rect.width * dpr;
    const canvasH = rect.height * dpr;

    if (!map.elements || map.elements.length === 0) {
      // Centrar mapa vacío
      this.zoom = Math.min(canvasW / (map.width * 1.1), canvasH / (map.height * 1.1), 1.0);
      this.panX = (canvasW - map.width * this.zoom) / 2;
      this.panY = (canvasH - map.height * this.zoom) / 2;
      this.updateZoomDisplay();
      return;
    }

    // Calcular límites de los elementos
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    map.elements.forEach(el => {
      if (el.type === 'point' || el.type === 'annotation') {
        minX = Math.min(minX, el.x - el.size);
        minY = Math.min(minY, el.y - el.size);
        maxX = Math.max(maxX, el.x + el.size);
        maxY = Math.max(maxY, el.y + el.size);
      } else if (el.points && el.points.length > 0) {
        el.points.forEach(pt => {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        });
      }
    });

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = map.width; maxY = map.height;
    }

    const padding = 120 * dpr;
    const contentW = Math.max(200, maxX - minX);
    const contentH = Math.max(200, maxY - minY);

    const scaleX = (canvasW - padding * 2) / contentW;
    const scaleY = (canvasH - padding * 2) / contentH;
    this.zoom = Math.max(this.minZoom, Math.min(Math.min(scaleX, scaleY), 1.5));

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    this.panX = canvasW / 2 - contentCenterX * this.zoom;
    this.panY = canvasH / 2 - contentCenterY * this.zoom;

    this.updateZoomDisplay();
  }

  centerContent(map) {
    if (!this.canvasWrapper) return;
    const rect = this.canvasWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasW = rect.width * dpr;
    const canvasH = rect.height * dpr;

    this.panX = canvasW / 2 - (map.width / 2) * this.zoom;
    this.panY = canvasH / 2 - (map.height / 2) * this.zoom;
    this.requestDraw(map);
  }

  updateZoomDisplay() {
    const text = `${Math.round(this.zoom * 100)}%`;
    const el1 = this.container?.querySelector('#zoom-percentage-text');
    const el2 = this.container?.querySelector('#zoom-badge-bottom');
    if (el1) el1.textContent = text;
    if (el2) el2.textContent = text;
  }

  /* ==========================================================================
     DIBUJADO PRINCIPAL DEL CANVAS (Vectorial & Presets)
     ========================================================================== */
  requestDraw(map) {
    if (!this.ctx || !this.canvas) return;
    requestAnimationFrame(() => this.draw(map));
  }

  draw(map) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const preset = MAP_PRESETS[map.preset] || MAP_PRESETS.editorial;

    // 1. Limpiar lienzo con el fondo del preset
    ctx.save();
    ctx.fillStyle = preset.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Aplicar transformación de Cámara (Pan y Zoom)
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 3. Dibujar marco delimitador del mapa
    ctx.save();
    ctx.strokeStyle = preset.stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, map.width, map.height);

    // Cuadrícula sutil
    ctx.strokeStyle = preset.gridColor;
    ctx.lineWidth = 1;
    const gridSize = 150;
    ctx.beginPath();
    for (let gx = 0; gx <= map.width; gx += gridSize) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, map.height);
    }
    for (let gy = 0; gy <= map.height; gy += gridSize) {
      ctx.moveTo(0, gy);
      ctx.lineTo(map.width, gy);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Imagen de referencia si existe y está visible
    if (map.referenceImage && map.referenceImage.visible && this.referenceImageObj && this.referenceImageObj.complete) {
      ctx.save();
      ctx.globalAlpha = map.referenceImage.opacity !== undefined ? map.referenceImage.opacity : 0.5;
      ctx.drawImage(this.referenceImageObj, 0, 0, map.width, map.height);
      ctx.restore();
    }

    // 5. Agrupar capas activas por orden de zIndex y visibilidad
    const layers = [...(map.layers || MAP_DEFAULT_LAYERS)].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const visibleLayerIds = new Set(layers.filter(l => l.visible !== false).map(l => l.id));

    // Filtrar elementos visibles
    const allVisible = (map.elements || []).filter(el => el.isVisible !== false && visibleLayerIds.has(el.layerId || 'layer-lugares'));

    // 6. DIBUJADO CARTOGRÁFICO JERÁRQUICO NATURAL (Ilustración editorial)
    // Paso 1: Masas de agua poligonales (océanos, mares, lagos)
    allVisible.filter(el => el.type === 'area' && (el.icon === 'mar' || el.icon === 'lago' || el.layerId === 'layer-agua')).forEach(el => {
      this.drawAreaElement(ctx, el, preset);
    });

    // Paso 2: Terrenos y regiones continentales (bosques, desiertos, valles)
    allVisible.filter(el => el.type === 'area' && el.icon !== 'mar' && el.icon !== 'lago' && el.layerId !== 'layer-agua').forEach(el => {
      this.drawAreaElement(ctx, el, preset);
    });

    // Paso 3: Cursos de agua serpenteantes (ríos, afluentes)
    allVisible.filter(el => el.type === 'line' && el.icon === 'rio').forEach(el => {
      this.drawLineElement(ctx, el, preset);
    });

    // Paso 4: Vías e infraestructura (carreteras, caminos, murallas, fronteras)
    allVisible.filter(el => el.type === 'line' && el.icon !== 'rio').forEach(el => {
      this.drawLineElement(ctx, el, preset);
    });

    // Paso 5: Accidentes geográficos de relieve (montañas, colinas, volcanes, cuevas)
    allVisible.filter(el => el.type === 'point' && ['montana', 'colina', 'volcan', 'cueva'].includes(el.icon)).forEach(el => {
      this.drawPointElement(ctx, el, preset);
    });

    // Paso 6: Lugares y asentamientos (ciudades, castillos, torres, puertos, portales, marcadores)
    allVisible.filter(el => el.type === 'point' && !['montana', 'colina', 'volcan', 'cueva', 'texto'].includes(el.icon)).forEach(el => {
      this.drawPointElement(ctx, el, preset);
    });

    // Paso 7: Anotaciones libres
    allVisible.filter(el => el.type === 'annotation' || el.icon === 'texto').forEach(el => {
      this.drawPointElement(ctx, el, preset);
    });

    // Paso 8: Rótulos / Etiquetas tipográficas sobre el mapa (evita que queden cubiertos)
    allVisible.filter(el => el.showLabel && el.label).forEach(el => {
      this.drawElementLabel(ctx, el, preset);
    });

    // 7. Dibujar selección y vértices editables
    this.drawSelectionHighlights(ctx, map);

    // 8. Dibujar línea/área en proceso de dibujo
    if (this.drawingPoints.length > 0) {
      this.drawInProgressShape(ctx, preset);
    }

    // 9. Dibujar caja de selección múltiple (si está activa)
    if (this.isBoxSelecting) {
      ctx.save();
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
      const bx = Math.min(this.boxStartX, this.mouseWorldX);
      const by = Math.min(this.boxStartY, this.mouseWorldY);
      const bw = Math.abs(this.mouseWorldX - this.boxStartX);
      const bh = Math.abs(this.mouseWorldY - this.boxStartY);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }

    ctx.restore(); // Restaurar Pan y Zoom
  }

  /* ==========================================================================
     DIBUJADORES ESPECÍFICOS DE ELEMENTOS (LENGUAJE DE MAPA ILUSTRADO)
     ========================================================================== */
  createSmoothPath(ctx, points, closed = false) {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      ctx.moveTo(points[0].x, points[0].y);
      return;
    }
    if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }

    if (closed) {
      const len = points.length;
      const mid0 = {
        x: (points[len - 1].x + points[0].x) / 2,
        y: (points[len - 1].y + points[0].y) / 2
      };
      ctx.moveTo(mid0.x, mid0.y);
      for (let i = 0; i < len; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % len];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const pCurrent = points[i];
        const pNext = points[i + 1];
        const midX = (pCurrent.x + pNext.x) / 2;
        const midY = (pCurrent.y + pNext.y) / 2;
        ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, midX, midY);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
  }

  drawAreaElement(ctx, el, preset) {
    if (!el.points || el.points.length < 3) return;
    ctx.save();

    const isWater = el.icon === 'mar' || el.icon === 'lago' || el.layerId === 'layer-agua';
    const isForest = el.icon === 'bosque' || el.icon === 'arbol';
    const isDesert = el.icon === 'desierto';

    // 1. Trazado suave y relleno principal
    ctx.beginPath();
    this.createSmoothPath(ctx, el.points, true);

    ctx.fillStyle = el.fillColor || preset.accent;
    ctx.globalAlpha = el.fillOpacity !== undefined ? el.fillOpacity : 0.40;
    ctx.fill();

    // 2. Textura procedural ilustrada interior
    if (isForest) {
      this.drawForestCanopyTexture(ctx, el, preset);
    } else if (isDesert) {
      this.drawDesertDuneTexture(ctx, el, preset);
    }

    // 3. Contorno exterior con estilo orgánico
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = el.strokeColor || el.fillColor || preset.stroke;
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (el.lineDash === 'dashed') ctx.setLineDash([8, 6]);
    else if (el.lineDash === 'dotted') ctx.setLineDash([3, 4]);
    else ctx.setLineDash([]);

    ctx.beginPath();
    this.createSmoothPath(ctx, el.points, true);
    ctx.stroke();

    // 4. Ondas concéntricas litorales (waterlines) para mares y lagos
    if (isWater) {
      this.drawCoastlineWaterlines(ctx, el, preset);
    }

    ctx.restore();
  }

  drawCoastlineWaterlines(ctx, el, preset) {
    ctx.save();
    ctx.beginPath();
    this.createSmoothPath(ctx, el.points, true);

    // Rompiente sutil exterior
    ctx.strokeStyle = el.strokeColor || preset.waterStroke || '#0284C7';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.stroke();

    // Estela de marea exterior suave
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.15;
    ctx.stroke();

    ctx.lineWidth = 12;
    ctx.globalAlpha = 0.06;
    ctx.setLineDash([14, 12]);
    ctx.stroke();

    ctx.restore();
  }

  drawForestCanopyTexture(ctx, el, preset) {
    ctx.save();
    ctx.beginPath();
    this.createSmoothPath(ctx, el.points, true);
    ctx.clip(); // Limita los símbolos al perímetro orgánico del bosque

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    let seed = 1234567;
    const idStr = String(el.id || 'forest');
    for (let i = 0; i < idStr.length; i++) seed = (seed * 31 + idStr.charCodeAt(i)) & 0xffffffff;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 4294967296;
    };

    const step = 42;
    const treeStroke = el.strokeColor || '#064E3B';
    const treeFill = 'rgba(5, 150, 105, 0.45)';

    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let gy = minY + 15; gy < maxY; gy += step) {
      const rowOffset = (Math.floor(gy / step) % 2) * (step / 2);
      for (let gx = minX + 15 + rowOffset; gx < maxX; gx += step) {
        const jx = gx + (rnd() - 0.5) * 16;
        const jy = gy + (rnd() - 0.5) * 16;
        const r = 9 + rnd() * 4;

        // Símbolo vegetal ilustrado (racimo de 3 arcos de copa)
        ctx.beginPath();
        ctx.arc(jx, jy - r * 0.35, r * 0.55, Math.PI * 0.8, Math.PI * 0.2);
        ctx.arc(jx + r * 0.35, jy, r * 0.42, Math.PI * 1.3, Math.PI * 0.4);
        ctx.arc(jx - r * 0.35, jy, r * 0.42, Math.PI * 0.6, Math.PI * 1.7);
        ctx.closePath();

        ctx.fillStyle = treeFill;
        ctx.globalAlpha = 0.35;
        ctx.fill();

        ctx.strokeStyle = treeStroke;
        ctx.globalAlpha = 0.60;
        ctx.stroke();

        // Tronco sutil
        ctx.beginPath();
        ctx.moveTo(jx, jy + r * 0.35);
        ctx.lineTo(jx, jy + r * 0.65);
        ctx.strokeStyle = '#78350F';
        ctx.globalAlpha = 0.55;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawDesertDuneTexture(ctx, el, preset) {
    ctx.save();
    ctx.beginPath();
    this.createSmoothPath(ctx, el.points, true);
    ctx.clip();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const step = 48;
    ctx.strokeStyle = el.strokeColor || '#D97706';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.28;

    for (let gy = minY + 20; gy < maxY; gy += step) {
      const rowOffset = (Math.floor(gy / step) % 2) * 24;
      for (let gx = minX + 20 + rowOffset; gx < maxX; gx += step * 1.1) {
        const len = 18;
        ctx.beginPath();
        ctx.moveTo(gx - len, gy);
        ctx.quadraticCurveTo(gx - len * 0.2, gy - 3.5, gx, gy);
        ctx.quadraticCurveTo(gx + len * 0.4, gy + 3, gx + len, gy);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawLineElement(ctx, el, preset) {
    if (!el.points || el.points.length < 2) return;
    ctx.save();

    const isRiver = el.icon === 'rio';
    const isRoad = el.icon === 'carretera' || el.icon === 'camino';
    const isBorder = el.icon === 'frontera';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isRiver) {
      // RÍO SERPENTEANTE ILUSTRADO:
      // Resplandor / ribera suave exterior
      ctx.lineWidth = (el.strokeWidth || 4.5) + 3;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();

      // Cauce de agua fluido principal
      ctx.strokeStyle = el.strokeColor || '#0284C7';
      ctx.lineWidth = el.strokeWidth || 4.5;
      ctx.globalAlpha = 0.90;
      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();
    } else if (isRoad) {
      // VÍAS Y CALZADAS (con fondo de halo para legibilidad sobre terrenos)
      ctx.strokeStyle = preset.bg;
      ctx.lineWidth = (el.strokeWidth || 3) + 2.5;
      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();

      ctx.strokeStyle = el.strokeColor || '#78716C';
      ctx.lineWidth = el.strokeWidth || 3;
      if (el.lineDash === 'dashed') ctx.setLineDash([8, 6]);
      else if (el.lineDash === 'dotted') ctx.setLineDash([3, 4]);

      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();
    } else if (isBorder) {
      // FRONTERA NATURAL ILUSTRADA (trazado continuo dash-dot)
      ctx.strokeStyle = el.strokeColor || '#DC2626';
      ctx.lineWidth = el.strokeWidth || 2.5;
      ctx.setLineDash([12, 5, 3, 5]);
      ctx.globalAlpha = 0.85;

      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();
    } else {
      // Líneas generales (murallas, flechas, rutas)
      ctx.strokeStyle = el.strokeColor || preset.stroke;
      ctx.lineWidth = el.strokeWidth || 3;
      if (el.lineDash === 'dashed') ctx.setLineDash([10, 7]);
      else if (el.lineDash === 'dotted') ctx.setLineDash([4, 4]);

      ctx.beginPath();
      this.createSmoothPath(ctx, el.points, false);
      ctx.stroke();

      if (el.icon === 'flecha' && el.points.length >= 2) {
        const pLast = el.points[el.points.length - 1];
        const pPrev = el.points[el.points.length - 2];
        const angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(pLast.x, pLast.y);
        ctx.lineTo(pLast.x - headLen * Math.cos(angle - Math.PI / 6), pLast.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pLast.x, pLast.y);
        ctx.lineTo(pLast.x - headLen * Math.cos(angle + Math.PI / 6), pLast.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawPointElement(ctx, el, preset) {
    const x = el.x;
    const y = el.y;
    const size = el.size || 28;
    const color = el.color || preset.accent;

    ctx.save();
    ctx.translate(x, y);

    // Dibujado de símbolos con estética de grabado/ilustración editorial
    switch (el.icon) {
      case 'montana': {
        const h = size * 0.55;
        const w = size * 0.52;
        // Pico y laderas asimétricas naturales
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(-w * 0.5, 0, -w, h * 0.7);
        ctx.quadraticCurveTo(0, h * 0.55, w * 1.05, h * 0.75);
        ctx.quadraticCurveTo(w * 0.5, 0, 0, -h);
        ctx.closePath();
        ctx.fillStyle = preset.bg;
        ctx.fill();

        // Sombra lateral derecha
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(w * 0.05, h * 0.1, -w * 0.05, h * 0.65);
        ctx.quadraticCurveTo(w * 0.5, h * 0.7, w * 1.05, h * 0.75);
        ctx.quadraticCurveTo(w * 0.5, 0, 0, -h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(40, 30, 20, 0.12)';
        ctx.fill();

        // Trazos de sombreado (hatchings de grabado)
        ctx.strokeStyle = el.strokeColor || '#524636';
        ctx.lineWidth = 1.2;
        for (let i = 1; i <= 3; i++) {
          const hy = -h * 0.3 + (i * h * 0.25);
          ctx.beginPath();
          ctx.moveTo(w * 0.08, hy);
          ctx.lineTo(w * (0.3 + i * 0.15), hy + h * 0.1);
          ctx.stroke();
        }

        // Cima nevada ilustrada
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w * 0.22, -h * 0.35);
        ctx.lineTo(w * 0.05, -h * 0.42);
        ctx.lineTo(-w * 0.1, -h * 0.38);
        ctx.lineTo(-w * 0.2, -h * 0.45);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = el.strokeColor || '#524636';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Contorno principal
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(-w * 0.5, 0, -w, h * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(w * 0.5, 0, w * 1.05, h * 0.75);
        ctx.stroke();
        // Cresta divisoria
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(w * 0.05, h * 0.1, -w * 0.05, h * 0.65);
        ctx.stroke();
        break;
      }

      case 'colina': {
        const r = size * 0.48;
        // Colina trasera
        ctx.beginPath();
        ctx.arc(r * 0.35, r * 0.15, r * 0.75, Math.PI * 1.05, Math.PI * 1.95);
        ctx.fillStyle = preset.bg;
        ctx.fill();
        ctx.strokeStyle = el.strokeColor || '#059669';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Colina delantera
        ctx.beginPath();
        ctx.arc(-r * 0.25, r * 0.3, r * 0.85, Math.PI, 0);
        ctx.fillStyle = preset.bg;
        ctx.fill();
        ctx.strokeStyle = el.strokeColor || '#059669';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        break;
      }

      case 'volcan': {
        const h = size * 0.55;
        const w = size * 0.55;
        ctx.beginPath();
        ctx.moveTo(-w * 0.22, -h * 0.5);
        ctx.quadraticCurveTo(-w * 0.5, 0, -w, h * 0.65);
        ctx.lineTo(w, h * 0.65);
        ctx.quadraticCurveTo(w * 0.5, 0, w * 0.22, -h * 0.5);
        ctx.closePath();
        ctx.fillStyle = preset.bg;
        ctx.fill();
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Cráter y lava
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.5, w * 0.22, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
        ctx.strokeStyle = '#B91C1C';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Humo / ceniza
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.55);
        ctx.quadraticCurveTo(w * 0.15, -h * 0.8, w * 0.35, -h * 0.95);
        ctx.quadraticCurveTo(w * 0.5, -h * 1.1, w * 0.4, -h * 1.25);
        ctx.strokeStyle = 'rgba(120, 113, 108, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        break;
      }

      case 'arbol':
      case 'bosque': {
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 3, 0);
        ctx.lineTo(size / 6, 0);
        ctx.lineTo(size / 2.5, size / 3);
        ctx.lineTo(-size / 2.5, size / 3);
        ctx.lineTo(-size / 6, 0);
        ctx.lineTo(-size / 3, 0);
        ctx.closePath();
        ctx.fillStyle = '#059669';
        ctx.fill();
        ctx.strokeStyle = '#064E3B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-size / 12, size / 3, size / 6, size / 5);
        break;
      }

      case 'ciudad': {
        const s = size * 0.48;
        // Muralla y caserío
        ctx.fillStyle = el.fillColor || '#EEF2FF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-s, -s * 0.3, s * 2, s * 1.1);
        ctx.fillRect(-s, -s * 0.3, s * 2, s * 1.1);

        // Torreón central alto
        ctx.strokeRect(-s * 0.35, -s * 0.85, s * 0.7, s * 0.6);
        ctx.fillRect(-s * 0.35, -s * 0.85, s * 0.7, s * 0.6);
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, -s * 0.85);
        ctx.lineTo(0, -s * 1.35);
        ctx.lineTo(s * 0.45, -s * 0.85);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();

        // Banderín en la torre
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.35);
        ctx.lineTo(0, -s * 1.6);
        ctx.lineTo(s * 0.35, -s * 1.48);
        ctx.lineTo(0, -s * 1.38);
        ctx.fillStyle = color;
        ctx.fill();

        // Portal arqueado
        ctx.beginPath();
        ctx.arc(0, s * 0.8, s * 0.25, Math.PI, 0);
        ctx.fillStyle = color;
        ctx.fill();
        break;
      }

      case 'castillo': {
        const s = size * 0.48;
        ctx.fillStyle = el.fillColor || '#F5F5F4';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Torre izquierda
        ctx.strokeRect(-s, -s * 0.9, s * 0.55, s * 1.7);
        ctx.fillRect(-s, -s * 0.9, s * 0.55, s * 1.7);
        // Torre derecha
        ctx.strokeRect(s * 0.45, -s * 0.9, s * 0.55, s * 1.7);
        ctx.fillRect(s * 0.45, -s * 0.9, s * 0.55, s * 1.7);

        // Almenas
        ctx.fillStyle = color;
        ctx.fillRect(-s * 0.95, -s * 1.05, s * 0.45, s * 0.2);
        ctx.fillRect(s * 0.5, -s * 1.05, s * 0.45, s * 0.2);

        // Muralla cortina y puerta levadiza
        ctx.strokeRect(-s * 0.45, -s * 0.2, s * 0.9, s);
        ctx.fillRect(-s * 0.45, -s * 0.2, s * 0.9, s);
        ctx.beginPath();
        ctx.arc(0, s * 0.8, s * 0.28, Math.PI, 0);
        ctx.fillStyle = '#292524';
        ctx.fill();
        break;
      }

      case 'puerto': {
        const s = size * 0.45;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-s, s * 0.6);
        ctx.lineTo(s * 0.8, s * 0.6);
        ctx.stroke();

        ctx.fillStyle = '#F5F5F4';
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, s * 0.6);
        ctx.lineTo(-s * 0.2, -s * 0.8);
        ctx.lineTo(0, -s * 0.8);
        ctx.lineTo(s * 0.2, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Linterna
        ctx.beginPath();
        ctx.arc(-s * 0.1, -s * 0.85, s * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'torre': {
        const s = size * 0.48;
        ctx.fillStyle = el.fillColor || '#F5F5F4';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.strokeRect(-s * 0.35, -s * 0.8, s * 0.7, s * 1.6);
        ctx.fillRect(-s * 0.35, -s * 0.8, s * 0.7, s * 1.6);

        ctx.strokeRect(-s * 0.45, -s * 1.1, s * 0.9, s * 0.35);
        ctx.fillRect(-s * 0.45, -s * 1.1, s * 0.9, s * 0.35);

        ctx.beginPath();
        ctx.arc(0, -s * 1.25, s * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        break;
      }

      case 'portal': {
        const s = size * 0.45;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.strokeStyle = '#7C3AED';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(167, 139, 250, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'cueva': {
        const s = size * 0.48;
        ctx.beginPath();
        ctx.arc(0, s * 0.3, s * 0.85, Math.PI, 0);
        ctx.fillStyle = preset.bg;
        ctx.fill();
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, s * 0.3, s * 0.45, Math.PI, 0);
        ctx.fillStyle = '#1C1917';
        ctx.fill();
        break;
      }

      case 'marcador':
      default: {
        ctx.beginPath();
        ctx.arc(0, -size / 4, size / 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size / 4, -size / 6);
        ctx.lineTo(0, size / 3);
        ctx.lineTo(size / 4, -size / 6);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  drawElementLabel(ctx, el, preset) {
    if (!el.showLabel || !el.label) return;

    let x = 0, y = 0;
    const isOrphan = !!el.placeId && !store.getPlace(el.placeId);
    const labelText = isOrphan ? `${el.label} (Eliminado)` : el.label;

    const isMajorWater = el.icon === 'mar' || el.icon === 'lago' || el.layerId === 'layer-agua';
    const isMajorForest = el.icon === 'bosque';
    const isEditorialSerif = isMajorWater || isMajorForest || el.category === 'geografia';

    if (el.type === 'area' && el.points && el.points.length >= 3) {
      let cx = 0, cy = 0;
      el.points.forEach(pt => { cx += pt.x; cy += pt.y; });
      x = cx / el.points.length;
      y = cy / el.points.length;
    } else if (el.type === 'line' && el.points && el.points.length >= 2) {
      const midIdx = Math.floor(el.points.length / 2);
      const midPt = el.points[midIdx];
      x = midPt.x;
      y = midPt.y - 12;
    } else {
      x = el.x;
      const size = el.size || 28;
      y = el.y + size / 2 + (el.labelSize || 13) + 2;
    }

    const textColor = isOrphan ? '#DC2626' : (isMajorWater ? (preset.waterStroke || preset.textColor) : preset.textColor);
    const haloColor = isOrphan ? 'rgba(254, 226, 226, 0.95)' : preset.haloColor;
    const labelSize = el.labelSize || (isMajorWater ? 16 : 13);

    this.drawTextWithHalo(ctx, labelText, x, y, labelSize, textColor, haloColor, 'center', isEditorialSerif);
  }

  drawTextWithHalo(ctx, text, x, y, size, textColor, haloColor, align = 'center', isEditorial = false) {
    ctx.save();
    if (isEditorial) {
      ctx.font = `italic 600 ${size}px "Lora", Georgia, serif`;
    } else {
      ctx.font = `600 ${size}px "Plus Jakarta Sans", sans-serif`;
    }
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    // Halo para contraste óptimo sobre cualquier textura/color
    ctx.strokeStyle = haloColor || 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = textColor || '#1F2937';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawSelectionHighlights(ctx, map) {
    if (this.selectedElementIds.size === 0) return;

    (map.elements || []).forEach(el => {
      if (!this.selectedElementIds.has(el.id)) return;

      ctx.save();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      if (el.type === 'point' || el.type === 'annotation') {
        const rad = (el.size || 28) / 2 + 6;
        ctx.strokeRect(el.x - rad, el.y - rad, rad * 2, rad * 2);
      } else if (el.points && el.points.length > 0) {
        // Resaltar cada vértice para edición interactiva
        el.points.forEach((pt, idx) => {
          ctx.save();
          ctx.setLineDash([]);
          ctx.fillStyle = (this.selectedVertexIndex === idx) ? '#DC2626' : '#FFFFFF';
          ctx.strokeStyle = '#4F46E5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }
      ctx.restore();
    });
  }

  drawInProgressShape(ctx, preset) {
    if (this.drawingPoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
    for (let i = 1; i < this.drawingPoints.length; i++) {
      ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
    }
    // Línea hacia el cursor actual
    ctx.lineTo(this.mouseWorldX, this.mouseWorldY);
    ctx.stroke();

    // Vértices marcados
    this.drawingPoints.forEach(pt => {
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  /* ==========================================================================
     5. INSPECTOR DERECHO CONTEXTUAL
     ========================================================================== */
  renderInspector(map, project) {
    if (!this.inspectorEl) return;

    // Caso A: Elemento seleccionado (o primer elemento si hay varios seleccionados)
    if (this.selectedElementIds.size > 0) {
      const firstId = Array.from(this.selectedElementIds)[0];
      const elem = (map.elements || []).find(e => e.id === firstId);
      if (elem) {
        this.renderElementInspector(elem, map, project);
        return;
      }
    }

    // Caso B: Sin selección -> Propiedades globales del mapa
    this.renderMapGlobalInspector(map, project);
  }

  renderMapGlobalInspector(map, project) {
    const layers = map.layers || MAP_DEFAULT_LAYERS;
    const elemCount = (map.elements || []).length;

    this.inspectorEl.innerHTML = `
      <div class="map-inspector-header">
        <span class="map-inspector-title">Propiedades del Mapa</span>
      </div>

      <div class="map-inspector-section">
        <div class="map-inspector-label">Título del Mapa</div>
        <input type="text" class="input" id="inp-map-name" value="${escapeHtml(map.name)}" />
      </div>

      <div class="map-inspector-section">
        <div class="map-inspector-label">Descripción</div>
        <textarea class="textarea" id="inp-map-desc" rows="2" style="font-size:0.8125rem;">${escapeHtml(map.description || '')}</textarea>
      </div>

      <div class="map-inspector-section">
        <div class="map-inspector-label">Dimensiones del Lienzo</div>
        <div class="map-inspector-input-row">
          <input type="number" id="inp-map-width" value="${map.width}" min="800" max="10000" step="100" />
          <span style="font-size:0.75rem; color:var(--text-muted);">×</span>
          <input type="number" id="inp-map-height" value="${map.height}" min="600" max="10000" step="100" />
        </div>
      </div>

      <div class="map-inspector-section">
        <div class="map-inspector-label">Resumen de Elementos</div>
        <div style="font-size:0.8125rem; color:var(--text-secondary);">
          <strong>${elemCount}</strong> elementos en <strong>${layers.length}</strong> capas.
        </div>
      </div>

      <div class="map-inspector-section" style="margin-top:auto; border-bottom:none; display:flex; flex-direction:column; gap:8px;">
        <button class="btn btn-secondary btn-sm" id="btn-export-map-png" style="width:100%;">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Exportar Imagen PNG</span>
        </button>
        <button class="btn btn-subtle btn-sm" id="btn-inspector-clear-map" style="color:var(--danger); width:100%;">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Vaciar Elementos del Mapa</span>
        </button>
      </div>
    `;

    // Listeners del inspector global
    this.inspectorEl.querySelector('#inp-map-name')?.addEventListener('change', (e) => {
      store.updateMap(map.id, { name: e.target.value });
      this.container.querySelector('#map-header-title').textContent = e.target.value;
    });

    this.inspectorEl.querySelector('#inp-map-desc')?.addEventListener('change', (e) => {
      store.updateMap(map.id, { description: e.target.value });
    });

    this.inspectorEl.querySelector('#inp-map-width')?.addEventListener('change', (e) => {
      const w = parseInt(e.target.value, 10);
      if (w >= 800) {
        store.updateMap(map.id, { width: w });
        this.requestDraw(store.getMap(map.id));
      }
    });

    this.inspectorEl.querySelector('#inp-map-height')?.addEventListener('change', (e) => {
      const h = parseInt(e.target.value, 10);
      if (h >= 600) {
        store.updateMap(map.id, { height: h });
        this.requestDraw(store.getMap(map.id));
      }
    });

    this.inspectorEl.querySelector('#btn-export-map-png')?.addEventListener('click', () => {
      this.exportMapAsPng(map);
    });

    this.inspectorEl.querySelector('#btn-inspector-clear-map')?.addEventListener('click', () => {
      this.promptClearMap(map, project);
    });
  }

  renderElementInspector(elem, map, project) {
    const linkedPlace = elem.placeId ? store.getPlace(elem.placeId, project.id) : null;
    const isOrphan = !!elem.placeId && !linkedPlace;
    const layers = map.layers || MAP_DEFAULT_LAYERS;

    this.inspectorEl.innerHTML = `
      <div class="map-inspector-header">
        <span class="map-inspector-title">Elemento Seleccionado</span>
        <button class="btn btn-subtle btn-icon btn-sm" id="btn-close-elem-inspector" title="Deseleccionar">
          <svg class="icon icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- VÍNCULO CON ENTIDAD DE MUNDO O AVISO DE HUÉRFANO -->
      ${linkedPlace ? `
        <div class="map-world-entity-box">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="map-world-entity-name">${escapeHtml(linkedPlace.name)}</div>
              <div class="map-world-entity-badge">${escapeHtml(linkedPlace.category)} • ${escapeHtml(linkedPlace.type)}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-jump-world-place" style="width:100%; font-size:0.75rem;">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span>Ver Ficha en Mundo</span>
          </button>
        </div>
      ` : (isOrphan ? `
        <div class="map-world-entity-box is-orphan" style="border-color:#EF4444; background:rgba(239, 68, 68, 0.08);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="map-world-entity-name" style="color:#EF4444; display:flex; align-items:center; gap:6px;">
                <svg class="icon icon-xs" viewBox="0 0 24 24" style="color:#EF4444;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Lugar eliminado</span>
              </div>
              <div class="map-world-entity-badge" style="color:var(--text-secondary);">Esta entidad ya no existe en Mundo y Lugares.</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-orphan-unlink" style="flex:1; font-size:0.75rem;" title="Conservar como hito cartográfico independiente sin vínculo">
              <span>Desvincular</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-orphan-delete" style="flex:1; font-size:0.75rem; color:#EF4444;" title="Eliminar esta representación del mapa">
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      ` : '')}

      <!-- PROPIEDADES VISUALES -->
      <div class="map-inspector-section">
        <div class="map-inspector-label">Etiqueta / Nombre</div>
        <input type="text" id="inp-elem-label" value="${escapeHtml(elem.label || '')}" placeholder="Nombre visible en el mapa" />
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <input type="checkbox" id="chk-elem-show-label" ${elem.showLabel ? 'checked' : ''} />
          <label for="chk-elem-show-label" style="font-size:0.75rem; color:var(--text-secondary); cursor:pointer;">Mostrar rótulo en mapa</label>
        </div>
      </div>

      <div class="map-inspector-section">
        <div class="map-inspector-label">Capa Cartográfica</div>
        <select id="select-elem-layer">
          ${layers.map(l => `
            <option value="${l.id}" ${l.id === elem.layerId ? 'selected' : ''}>${escapeHtml(l.name)}</option>
          `).join('')}
        </select>
      </div>

      ${elem.type === 'point' || elem.type === 'annotation' ? `
        <div class="map-inspector-section">
          <div class="map-inspector-label">Posición (X, Y)</div>
          <div class="map-inspector-input-row">
            <input type="number" id="inp-elem-x" value="${Math.round(elem.x)}" />
            <input type="number" id="inp-elem-y" value="${Math.round(elem.y)}" />
          </div>
        </div>

        <div class="map-inspector-section">
          <div class="map-inspector-label" id="lbl-elem-size">Tamaño del Símbolo (${elem.size || 28}px)</div>
          <input type="range" id="rng-elem-size" min="16" max="64" value="${elem.size || 28}" />
        </div>
      ` : ''}

      ${elem.type === 'line' ? `
        <div class="map-inspector-section">
          <div class="map-inspector-label" id="lbl-elem-stroke">Grosor de Línea (${elem.strokeWidth || 3}px)</div>
          <input type="range" id="rng-elem-stroke-width" min="1" max="16" value="${elem.strokeWidth || 3}" />
        </div>
        <div class="map-inspector-section">
          <div class="map-inspector-label">Estilo de Trazo</div>
          <select id="select-elem-line-dash">
            <option value="solid" ${elem.lineDash === 'solid' ? 'selected' : ''}>Línea Continua</option>
            <option value="dashed" ${elem.lineDash === 'dashed' ? 'selected' : ''}>Línea Discontinua</option>
            <option value="dotted" ${elem.lineDash === 'dotted' ? 'selected' : ''}>Punteada</option>
          </select>
        </div>
      ` : ''}

      ${elem.type === 'area' ? `
        <div class="map-inspector-section">
          <div class="map-inspector-label" id="lbl-elem-opacity">Opacidad de Relleno (${Math.round((elem.fillOpacity !== undefined ? elem.fillOpacity : 0.40) * 100)}%)</div>
          <input type="range" id="rng-elem-opacity" min="0.05" max="0.9" step="0.05" value="${elem.fillOpacity !== undefined ? elem.fillOpacity : 0.40}" />
        </div>
      ` : ''}

      <div class="map-inspector-section" style="margin-top:auto; border-bottom:none;">
        <button class="btn btn-secondary btn-sm" id="btn-delete-elem" style="color:var(--danger); width:100%;">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Eliminar del Mapa</span>
        </button>
      </div>
    `;

    // Listeners del inspector de elemento
    this.inspectorEl.querySelector('#btn-close-elem-inspector')?.addEventListener('click', () => {
      this.selectedElementIds.clear();
      this.renderInspector(map, project);
      this.requestDraw(map);
    });

    this.inspectorEl.querySelector('#btn-jump-world-place')?.addEventListener('click', () => {
      if (linkedPlace) {
        this.app.navigate('world', project.id);
        setTimeout(() => {
          const worldV = this.app.views.world;
          if (worldV) worldV.openPlaceDetailModal(linkedPlace, project.id);
        }, 100);
      }
    });

    this.inspectorEl.querySelector('#btn-orphan-unlink')?.addEventListener('click', () => {
      store.updateMapElement(map.id, elem.id, { placeId: null });
      this.pushHistoryState(store.getMap(map.id));
      this.renderInspector(store.getMap(map.id), project);
      this.requestDraw(store.getMap(map.id));
      showToast('Elemento desvinculado de Mundo.');
    });

    this.inspectorEl.querySelector('#btn-orphan-delete')?.addEventListener('click', () => {
      store.removeMapElement(map.id, elem.id);
      this.selectedElementIds.delete(elem.id);
      this.pushHistoryState(store.getMap(map.id));
      this.renderInspector(store.getMap(map.id), project);
      this.requestDraw(store.getMap(map.id));
      showToast('Representación eliminada del mapa.');
    });

    this.inspectorEl.querySelector('#inp-elem-label')?.addEventListener('input', (e) => {
      store.updateMapElement(map.id, elem.id, { label: e.target.value });
      this.requestDraw(store.getMap(map.id));
    });
    this.inspectorEl.querySelector('#inp-elem-label')?.addEventListener('change', () => {
      this.pushHistoryState(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#chk-elem-show-label')?.addEventListener('change', (e) => {
      store.updateMapElement(map.id, elem.id, { showLabel: e.target.checked });
      this.pushHistoryState(store.getMap(map.id));
      this.requestDraw(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#select-elem-layer')?.addEventListener('change', (e) => {
      store.updateMapElement(map.id, elem.id, { layerId: e.target.value });
      this.pushHistoryState(store.getMap(map.id));
      this.requestDraw(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#inp-elem-x')?.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        store.updateMapElement(map.id, elem.id, { x: Math.round(val) });
        this.pushHistoryState(store.getMap(map.id));
        this.requestDraw(store.getMap(map.id));
      }
    });

    this.inspectorEl.querySelector('#inp-elem-y')?.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        store.updateMapElement(map.id, elem.id, { y: Math.round(val) });
        this.pushHistoryState(store.getMap(map.id));
        this.requestDraw(store.getMap(map.id));
      }
    });

    this.inspectorEl.querySelector('#rng-elem-size')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      store.updateMapElement(map.id, elem.id, { size: val });
      const lbl = this.inspectorEl.querySelector('#lbl-elem-size');
      if (lbl) lbl.textContent = `Tamaño del Símbolo (${val}px)`;
      this.requestDraw(store.getMap(map.id));
    });
    this.inspectorEl.querySelector('#rng-elem-size')?.addEventListener('change', () => {
      this.pushHistoryState(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#rng-elem-stroke-width')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      store.updateMapElement(map.id, elem.id, { strokeWidth: val });
      const lbl = this.inspectorEl.querySelector('#lbl-elem-stroke');
      if (lbl) lbl.textContent = `Grosor de Línea (${val}px)`;
      this.requestDraw(store.getMap(map.id));
    });
    this.inspectorEl.querySelector('#rng-elem-stroke-width')?.addEventListener('change', () => {
      this.pushHistoryState(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#select-elem-line-dash')?.addEventListener('change', (e) => {
      store.updateMapElement(map.id, elem.id, { lineDash: e.target.value });
      this.pushHistoryState(store.getMap(map.id));
      this.requestDraw(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#rng-elem-opacity')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      store.updateMapElement(map.id, elem.id, { fillOpacity: val });
      const lbl = this.inspectorEl.querySelector('#lbl-elem-opacity');
      if (lbl) lbl.textContent = `Opacidad de Relleno (${Math.round(val * 100)}%)`;
      this.requestDraw(store.getMap(map.id));
    });
    this.inspectorEl.querySelector('#rng-elem-opacity')?.addEventListener('change', () => {
      this.pushHistoryState(store.getMap(map.id));
    });

    this.inspectorEl.querySelector('#btn-delete-elem')?.addEventListener('click', () => {
      store.removeMapElement(map.id, elem.id);
      this.selectedElementIds.delete(elem.id);
      this.pushHistoryState(store.getMap(map.id));
      this.renderInspector(store.getMap(map.id), project);
      this.requestDraw(store.getMap(map.id));
      showToast('Elemento eliminado del mapa.');
    });
  }

  /* ==========================================================================
     6. ENLACE DE EVENTOS DEL EDITOR (RATÓN, TECLADO, ATAJOS)
     ========================================================================== */
  bindEditorEvents(project, map) {
    // Pestañas del sidebar izquierdo
    this.container.querySelector('#tab-btn-tools')?.addEventListener('click', () => {
      this.leftTab = 'tools';
      this.container.querySelector('#tab-btn-tools').classList.add('is-active');
      this.container.querySelector('#tab-btn-places').classList.remove('is-active');
      this.renderLeftTabContent(project, map);
    });

    this.container.querySelector('#tab-btn-places')?.addEventListener('click', () => {
      this.leftTab = 'places';
      this.container.querySelector('#tab-btn-places').classList.add('is-active');
      this.container.querySelector('#tab-btn-tools').classList.remove('is-active');
      this.renderLeftTabContent(project, map);
    });

    // Volver a biblioteca
    this.container.querySelector('#btn-back-library')?.addEventListener('click', () => {
      this.app.navigate('maps', project.id);
    });

    // Cambio de Preset
    this.container.querySelector('#select-map-preset')?.addEventListener('change', (e) => {
      const presetId = e.target.value;
      store.updateMap(map.id, { preset: presetId });
      this.requestDraw(store.getMap(map.id));
    });

    // Zoom y centrado
    this.container.querySelector('#btn-zoom-in')?.addEventListener('click', () => this.applyZoom(1.2));
    this.container.querySelector('#btn-zoom-out')?.addEventListener('click', () => this.applyZoom(0.83));
    this.container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      this.zoom = 1.0;
      this.updateZoomDisplay();
      this.requestDraw(store.getMap(map.id));
    });
    this.container.querySelector('#btn-fit-screen')?.addEventListener('click', () => this.fitToContent(store.getMap(map.id)));
    this.container.querySelector('#btn-center-content')?.addEventListener('click', () => this.centerContent(store.getMap(map.id)));

    // Deshacer / Rehacer
    this.container.querySelector('#btn-undo')?.addEventListener('click', () => this.undo(map, project));
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => this.redo(map, project));

    // Botones de acción modal
    this.container.querySelector('#btn-open-generator')?.addEventListener('click', () => this.openWorldGeneratorModal(map, project));
    this.container.querySelector('#btn-reorganize-places')?.addEventListener('click', () => this.openReorganizeModal(map, project));
    this.container.querySelector('#btn-clear-map')?.addEventListener('click', () => this.promptClearMap(map, project));
    this.container.querySelector('#btn-ref-image')?.addEventListener('click', () => this.openReferenceImageModal(map));
    this.container.querySelector('#btn-toggle-layers')?.addEventListener('click', () => this.toggleLayersPopover(map));

    // EVENTOS DEL CANVAS: Ratón y Puntero
    const canvas = this.canvas;

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));

      const dpr = window.devicePixelRatio || 1;
      const canvasX = mouseX * dpr;
      const canvasY = mouseY * dpr;

      // Mantener posición del ratón en coordenadas del mundo
      this.panX = canvasX - (canvasX - this.panX) * (newZoom / this.zoom);
      this.panY = canvasY - (canvasY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this.updateZoomDisplay();
      this.requestDraw(store.getMap(map.id));
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, map, project));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e, map));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e, map, project));

    // Doble clic para finalizar polígono o abrir ficha
    canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e, map, project));

    // Soporte para Drag & Drop de Lugares de Mundo hacia el Canvas
    const canvasWrapper = this.canvasWrapper;
    canvasWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvasWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      const placeId = e.dataTransfer.getData('text/plain');
      if (!placeId) return;
      const place = store.getPlace(placeId, project.id);
      if (!place) return;

      const rect = canvas.getBoundingClientRect();
      const worldPos = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      this.placeWorldEntityOnMap(map, place, worldPos.x, worldPos.y);
    });

    // ATAJOS DE TECLADO
    this.keyHandler = (e) => {
      // Ignorar si el foco está en un input o textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space' && !this.isSpacePressed) {
        this.isSpacePressed = true;
        canvas.className = 'map-canvas cursor-grab';
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo(map, project);
        else this.undo(map, project);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo(map, project);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedElementIds.size > 0) {
          e.preventDefault();
          this.selectedElementIds.forEach(id => store.removeMapElement(map.id, id));
          this.pushHistoryState(store.getMap(map.id));
          this.selectedElementIds.clear();
          this.renderLeftTabContent(project, store.getMap(map.id));
          this.renderInspector(store.getMap(map.id), project);
          this.requestDraw(store.getMap(map.id));
          showToast('Elemento(s) eliminado(s).');
        }
      }

      if (e.key === 'Escape') {
        if (this.drawingPoints.length > 0) {
          this.drawingPoints = [];
          this.requestDraw(store.getMap(map.id));
        } else if (this.selectedElementIds.size > 0) {
          this.selectedElementIds.clear();
          this.renderInspector(store.getMap(map.id), project);
          this.requestDraw(store.getMap(map.id));
        } else if (this.activeTool !== 'select') {
          this.selectTool('select');
        }
      }

      if (e.key === 'Enter' && this.drawingPoints.length >= 2) {
        this.finishDrawingShape(map, project);
      }
    };

    this.keyUpHandler = (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        canvas.className = this.activeTool === 'hand' ? 'map-canvas cursor-grab' : 'map-canvas';
      }
    };

    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  handleMouseDown(e, map, project) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;
    const world = this.screenToWorld(mouseScreenX, mouseScreenY);
    this.mouseWorldX = world.x;
    this.mouseWorldY = world.y;

    // A. Desplazamiento de cámara (Pan con botón central, espacio o herramienta Mano)
    if (e.button === 1 || this.isSpacePressed || this.activeTool === 'hand') {
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.canvas.className = 'map-canvas cursor-grabbing';
      return;
    }

    if (e.button !== 0) return; // Solo clic izquierdo para acciones

    // B. Herramienta Borrador (clic directo sobre elemento para borrar)
    if (this.activeTool === 'erase') {
      const hit = this.hitTestElement(world.x, world.y, map);
      if (hit) {
        store.removeMapElement(map.id, hit.id);
        this.pushHistoryState(store.getMap(map.id));
        this.selectedElementIds.delete(hit.id);
        this.renderLeftTabContent(project, store.getMap(map.id));
        this.renderInspector(store.getMap(map.id), project);
        this.requestDraw(store.getMap(map.id));
        showToast('Elemento borrado.');
      }
      return;
    }

    // C. Herramientas de Dibujo de Líneas y Áreas
    const isLineTool = ['rio', 'carretera', 'camino', 'muralla', 'frontera', 'flecha'].includes(this.activeTool);
    const isAreaTool = ['mar', 'lago', 'bosque', 'desierto'].includes(this.activeTool);

    if (isLineTool || isAreaTool) {
      this.drawingPoints.push({ x: Math.round(world.x), y: Math.round(world.y) });
      this.requestDraw(store.getMap(map.id));
      return;
    }

    // D. Herramientas de Puntos y Marcadores
    const isPointTool = ['montana', 'colina', 'volcan', 'cueva', 'puente', 'marcador', 'texto'].includes(this.activeTool);
    if (isPointTool) {
      this.createPointElementFromTool(map, this.activeTool, world.x, world.y);
      return;
    }

    // E. Herramienta Selección
    if (this.activeTool === 'select') {
      // 1. Probar si se hizo clic en un vértice de un elemento ya seleccionado
      if (this.selectedElementIds.size === 1) {
        const selElem = (map.elements || []).find(el => this.selectedElementIds.has(el.id));
        if (selElem && selElem.points && selElem.points.length > 0) {
          const vIdx = this.hitTestVertex(world.x, world.y, selElem.points);
          if (vIdx !== null) {
            this.isDraggingVertex = true;
            this.selectedVertexIndex = vIdx;
            return;
          }
        }
      }

      // 2. Probar si se hizo clic en un elemento existente
      const hit = this.hitTestElement(world.x, world.y, map);
      if (hit) {
        if (!e.shiftKey) {
          if (!this.selectedElementIds.has(hit.id)) {
            this.selectedElementIds.clear();
            this.selectedElementIds.add(hit.id);
          }
        } else {
          if (this.selectedElementIds.has(hit.id)) {
            this.selectedElementIds.delete(hit.id);
          } else {
            this.selectedElementIds.add(hit.id);
          }
        }

        this.isDraggingElement = true;
        this.dragStartX = world.x;
        this.dragStartY = world.y;
        this.selectedVertexIndex = null;
        this.renderInspector(map, project);
        this.requestDraw(map);
      } else {
        // Clic en vacío -> Selección por recuadro
        if (!e.shiftKey) this.selectedElementIds.clear();
        this.isBoxSelecting = true;
        this.boxStartX = world.x;
        this.boxStartY = world.y;
        this.selectedVertexIndex = null;
        this.renderInspector(map, project);
        this.requestDraw(map);
      }
    }
  }

  handleMouseMove(e, map) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;
    const world = this.screenToWorld(mouseScreenX, mouseScreenY);
    this.mouseWorldX = world.x;
    this.mouseWorldY = world.y;

    // Actualizar coordenadas en status bar
    const coordEl = this.container?.querySelector('#coord-display');
    if (coordEl) coordEl.textContent = `X: ${Math.round(world.x)}, Y: ${Math.round(world.y)}`;

    // A. Panning activo
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this.requestDraw(map);
      return;
    }

    // B. Arrastrando vértice de línea o polígono
    if (this.isDraggingVertex && this.selectedVertexIndex !== null) {
      const firstId = Array.from(this.selectedElementIds)[0];
      const elem = (map.elements || []).find(el => el.id === firstId);
      if (elem && elem.points && elem.points[this.selectedVertexIndex]) {
        elem.points[this.selectedVertexIndex].x = Math.round(world.x);
        elem.points[this.selectedVertexIndex].y = Math.round(world.y);
        store.updateMapElement(map.id, elem.id, { points: elem.points });
        this.requestDraw(map);
      }
      return;
    }

    // C. Arrastrando elementos seleccionados
    if (this.isDraggingElement) {
      const dx = Math.round(world.x - this.dragStartX);
      const dy = Math.round(world.y - this.dragStartY);
      if (dx !== 0 || dy !== 0) {
        (map.elements || []).forEach(el => {
          if (this.selectedElementIds.has(el.id)) {
            if (el.type === 'point' || el.type === 'annotation') {
              el.x += dx;
              el.y += dy;
            } else if (el.points) {
              el.points.forEach(pt => { pt.x += dx; pt.y += dy; });
            }
          }
        });
        this.dragStartX = world.x;
        this.dragStartY = world.y;
        this.requestDraw(map);
      }
      return;
    }

    // D. Caja de selección o trazado en proceso
    if (this.isBoxSelecting || this.drawingPoints.length > 0) {
      this.requestDraw(map);
    }
  }

  handleMouseUp(e, map, project) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.className = (this.activeTool === 'hand' || this.isSpacePressed) ? 'map-canvas cursor-grab' : 'map-canvas';
    }

    if (this.isDraggingVertex) {
      this.isDraggingVertex = false;
      if (this.selectedElementIds.size === 1) {
        const selElem = (map.elements || []).find(el => this.selectedElementIds.has(el.id));
        if (selElem && selElem.points) {
          store.updateMapElement(map.id, selElem.id, { points: selElem.points });
          this.pushHistoryState(store.getMap(map.id));
        }
      }
    }

    if (this.isDraggingElement) {
      this.isDraggingElement = false;
      let anyMoved = false;
      // Persistir nuevas coordenadas de los elementos movidos
      (map.elements || []).forEach(el => {
        if (this.selectedElementIds.has(el.id)) {
          anyMoved = true;
          if (el.type === 'point' || el.type === 'annotation') {
            store.updateMapElement(map.id, el.id, { x: el.x, y: el.y });
          } else if (el.points) {
            store.updateMapElement(map.id, el.id, { points: el.points });
          }
        }
      });
      if (anyMoved) {
        this.pushHistoryState(store.getMap(map.id));
      }
      this.renderInspector(map, project);
    }

    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      const minX = Math.min(this.boxStartX, this.mouseWorldX);
      const minY = Math.min(this.boxStartY, this.mouseWorldY);
      const maxX = Math.max(this.boxStartX, this.mouseWorldX);
      const maxY = Math.max(this.boxStartY, this.mouseWorldY);

      // Si la caja fue muy pequeña, considerarlo clic simple
      if (maxX - minX > 5 || maxY - minY > 5) {
        (map.elements || []).forEach(el => {
          if (el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY) {
            this.selectedElementIds.add(el.id);
          }
        });
      }
      this.renderInspector(map, project);
      this.requestDraw(map);
    }
  }

  handleDoubleClick(e, map, project) {
    // Si se estaba dibujando línea o área, finalizarla con el doble clic
    if (this.drawingPoints.length >= 2) {
      this.finishDrawingShape(map, project);
      return;
    }

    // Si se hace doble clic sobre un elemento vinculado a Mundo, abrir su ficha directamente
    const rect = this.canvas.getBoundingClientRect();
    const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = this.hitTestElement(world.x, world.y, map);
    if (hit && hit.placeId) {
      const place = store.getPlace(hit.placeId, project.id);
      if (place) {
        this.app.navigate('world', project.id);
        setTimeout(() => {
          this.app.views.world?.openPlaceDetailModal(place, project.id);
        }, 100);
      }
    }
  }

  /* ==========================================================================
     HIT TESTING (Detección de clics en elementos y vértices)
     ========================================================================== */
  hitTestElement(worldX, worldY, map) {
    const elements = map.elements || [];
    // Iterar en reversa para favorecer elementos dibujados arriba
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.isVisible === false) continue;

      if (el.type === 'point' || el.type === 'annotation') {
        const rad = (el.size || 28) / 1.5;
        const distSq = (worldX - el.x) ** 2 + (worldY - el.y) ** 2;
        if (distSq <= rad ** 2) return el;
      } else if (el.type === 'line' && el.points && el.points.length >= 2) {
        const threshold = Math.max(10, (el.strokeWidth || 3) * 2);
        for (let j = 0; j < el.points.length - 1; j++) {
          const d = this.distToSegment({ x: worldX, y: worldY }, el.points[j], el.points[j + 1]);
          if (d <= threshold) return el;
        }
      } else if (el.type === 'area' && el.points && el.points.length >= 3) {
        if (this.pointInPolygon({ x: worldX, y: worldY }, el.points)) {
          return el;
        }
      }
    }
    return null;
  }

  hitTestVertex(worldX, worldY, points) {
    const thresholdSq = 12 ** 2;
    for (let i = 0; i < points.length; i++) {
      const distSq = (worldX - points[i].x) ** 2 + (worldY - points[i].y) ** 2;
      if (distSq <= thresholdSq) return i;
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
  }

  pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /* ==========================================================================
     CREACIÓN DE ELEMENTOS DESDE HERRAMIENTAS Y DRAG & DROP
     ========================================================================== */
  finishDrawingShape(map, project) {
    if (this.drawingPoints.length < 2) {
      this.drawingPoints = [];
      return;
    }

    const isArea = ['mar', 'lago', 'bosque', 'desierto'].includes(this.activeTool);
    const tool = this.activeTool;

    let layerId = 'layer-terreno';
    let strokeColor = '#524636';
    let fillColor = '#D4E6EB';
    let fillOpacity = 0.40;
    let strokeWidth = 3;
    let lineDash = 'solid';
    let label = '';

    if (tool === 'rio') {
      layerId = 'layer-agua';
      strokeColor = '#0284C7';
      strokeWidth = 5;
      label = 'Río';
    } else if (tool === 'mar') {
      layerId = 'layer-agua';
      fillColor = '#38BDF8';
      strokeColor = '#0284C7';
      fillOpacity = 0.45;
      label = 'Mar';
    } else if (tool === 'lago') {
      layerId = 'layer-agua';
      fillColor = '#7DD3FC';
      strokeColor = '#0284C7';
      fillOpacity = 0.48;
      label = 'Lago';
    } else if (tool === 'bosque') {
      layerId = 'layer-terreno';
      fillColor = '#10B981';
      strokeColor = '#059669';
      fillOpacity = 0.40;
      label = 'Bosque';
    } else if (tool === 'desierto') {
      layerId = 'layer-terreno';
      fillColor = '#FBBF24';
      strokeColor = '#D97706';
      fillOpacity = 0.38;
      label = 'Desierto';
    } else if (tool === 'carretera') {
      layerId = 'layer-infra';
      strokeColor = '#0891B2';
      strokeWidth = 4;
      lineDash = 'dashed';
      label = 'Calzada';
    } else if (tool === 'camino') {
      layerId = 'layer-infra';
      strokeColor = '#78716C';
      strokeWidth = 2.5;
      lineDash = 'dotted';
      label = 'Camino';
    } else if (tool === 'muralla') {
      layerId = 'layer-infra';
      strokeColor = '#374151';
      strokeWidth = 5;
      label = 'Muralla';
    } else if (tool === 'frontera') {
      layerId = 'layer-infra';
      strokeColor = '#DC2626';
      strokeWidth = 2;
      lineDash = 'dashed';
      label = 'Frontera';
    } else if (tool === 'flecha') {
      layerId = 'layer-anotaciones';
      strokeColor = '#B45309';
      strokeWidth = 3;
      label = 'Ruta';
    }

    const newElem = store.addMapElement(map.id, {
      type: isArea ? 'area' : 'line',
      layerId,
      points: [...this.drawingPoints],
      icon: tool,
      label,
      showLabel: !!label,
      strokeColor,
      strokeWidth,
      fillColor,
      fillOpacity,
      lineDash
    });

    this.drawingPoints = [];
    this.selectedElementIds.clear();
    if (newElem) {
      this.selectedElementIds.add(newElem.id);
      this.pushHistoryState(store.getMap(map.id));
    }

    this.renderInspector(store.getMap(map.id), project);
    this.requestDraw(store.getMap(map.id));
    showToast(`Elemento "${label}" añadido.`);
  }

  createPointElementFromTool(map, tool, x, y) {
    let layerId = 'layer-terreno';
    let icon = tool;
    let label = '';
    let color = '#78716C';
    let size = 32;

    if (tool === 'montana') {
      label = 'Pico';
      color = '#78716C';
      size = 36;
    } else if (tool === 'colina') {
      label = 'Colina';
      color = '#059669';
      size = 28;
    } else if (tool === 'volcan') {
      label = 'Volcán';
      color = '#DC2626';
      size = 36;
    } else if (tool === 'cueva') {
      label = 'Cueva';
      color = '#1C1917';
      size = 26;
    } else if (tool === 'puente') {
      layerId = 'layer-infra';
      label = 'Puente';
      color = '#0891B2';
      size = 28;
    } else if (tool === 'marcador') {
      layerId = 'layer-anotaciones';
      label = 'Punto de Interés';
      color = '#B45309';
      size = 26;
    } else if (tool === 'texto') {
      layerId = 'layer-anotaciones';
      label = 'Rótulo de Texto';
      color = '#23211F';
      size = 18;
    }

    const elem = store.addMapElement(map.id, {
      type: tool === 'texto' ? 'annotation' : 'point',
      layerId,
      x: Math.round(x),
      y: Math.round(y),
      icon,
      label,
      showLabel: true,
      color,
      size
    });

    this.selectedElementIds.clear();
    if (elem) {
      this.selectedElementIds.add(elem.id);
      this.pushHistoryState(store.getMap(map.id));
    }
    const proj = store.getActiveProject();
    this.renderInspector(store.getMap(map.id), proj);
    this.requestDraw(store.getMap(map.id));
  }

  placeWorldEntityOnMap(map, place, x, y) {
    // Deducir icono e inferencia espacial basada en categoría de Mundo
    let icon = 'ciudad';
    let layerId = 'layer-lugares';
    let size = 34;

    if (place.category === 'geografia') {
      layerId = 'layer-terreno';
      icon = 'marcador';
      size = 38;
    } else if (place.category === 'asentamientos') {
      layerId = 'layer-lugares';
      if (place.type === 'puerto') icon = 'ciudad';
      else if (place.type === 'castillo' || place.type === 'fortaleza') icon = 'castillo';
      else if (place.type === 'torre' || place.type === 'faro') icon = 'torre';
      else icon = 'ciudad';
    } else if (place.category === 'naturaleza') {
      layerId = 'layer-terreno';
      if (place.type === 'bosque') icon = 'arbol';
      else if (place.type === 'montana') icon = 'montana';
      else if (place.type === 'cueva') icon = 'cueva';
      else if (place.type === 'rio' || place.type === 'mar') {
        layerId = 'layer-agua';
        icon = place.type;
      }
    } else if (place.category === 'infraestructura') {
      layerId = 'layer-infra';
      icon = 'carretera';
    } else if (place.category === 'especiales') {
      icon = 'portal';
      size = 34;
    }

    const elem = store.addMapElement(map.id, {
      placeId: place.id,
      type: 'point',
      layerId,
      x: Math.round(x),
      y: Math.round(y),
      icon,
      label: place.name,
      showLabel: true,
      color: place.color || '#4F46E5',
      size
    });

    this.selectedElementIds.clear();
    if (elem) {
      this.selectedElementIds.add(elem.id);
      this.pushHistoryState(store.getMap(map.id));
    }

    const project = store.getActiveProject();
    this.renderLeftTabContent(project, store.getMap(map.id));
    this.renderInspector(store.getMap(map.id), project);
    this.requestDraw(store.getMap(map.id));
    showToast(`Lugar "${place.name}" situado en el mapa.`);
  }

  /* ==========================================================================
     7. HISTORIAL (DESHACER / REHACER) & VACIADO DE MAPA
     ========================================================================== */
  pushHistoryState(map) {
    if (!map) return;
    const currentState = JSON.stringify(map.elements || []);
    // Evitar duplicar el mismo estado consecutivo
    if (this.historyStack[this.historyIndex] === currentState) return;

    // Cortar cualquier estado futuro
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(currentState);
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }
  }

  recordHistory(map) {
    this.pushHistoryState(map);
  }

  undo(map, project) {
    if (this.historyIndex <= 0) {
      showToast('No hay más acciones para deshacer.');
      return;
    }
    this.historyIndex--;
    const state = JSON.parse(this.historyStack[this.historyIndex]);
    store.updateMap(map.id, { elements: state });
    this.selectedElementIds.clear();
    this.renderLeftTabContent(project, store.getMap(map.id));
    this.renderInspector(store.getMap(map.id), project);
    this.requestDraw(store.getMap(map.id));
    showToast('Acción deshecha.');
  }

  redo(map, project) {
    if (this.historyIndex >= this.historyStack.length - 1) {
      showToast('No hay más acciones para rehacer.');
      return;
    }
    this.historyIndex++;
    const state = JSON.parse(this.historyStack[this.historyIndex]);
    store.updateMap(map.id, { elements: state });
    this.selectedElementIds.clear();
    this.renderLeftTabContent(project, store.getMap(map.id));
    this.renderInspector(store.getMap(map.id), project);
    this.requestDraw(store.getMap(map.id));
    showToast('Acción rehecha.');
  }

  promptClearMap(map, project) {
    const currentElements = map.elements || [];
    if (currentElements.length === 0) {
      showToast('El mapa ya está vacío.');
      return;
    }

    modal.open({
      title: '¿Vaciar todos los elementos del mapa?',
      contentHtml: `
        <div style="display:flex; flex-direction:column; gap:var(--space-md);">
          <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">
            Se eliminarán todos los accidentes geográficos, vías y puntos de este mapa (<strong>${currentElements.length}</strong> elementos).
          </p>
          <div style="background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); font-size:0.8125rem; color:var(--text-secondary);">
            <strong>Tus datos narrativos están seguros:</strong> los lugares creados en Mundo, personajes, grupos, capítulos y notas <strong>NO</strong> se eliminarán.
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">
            Podrás deshacer este vaciado en cualquier momento pulsando <code>Ctrl + Z</code>.
          </p>
        </div>
      `,
      confirmText: 'Vaciar Mapa',
      cancelText: 'Cancelar',
      onConfirm: () => {
        store.updateMap(map.id, { elements: [] });
        this.pushHistoryState(store.getMap(map.id));
        this.selectedElementIds.clear();
        this.renderLeftTabContent(project, store.getMap(map.id));
        this.renderInspector(store.getMap(map.id), project);
        this.requestDraw(store.getMap(map.id));
        showToast('Mapa vaciado. Puedes deshacer con Ctrl + Z.');
        return true;
      }
    });
  }

  applyZoom(factor) {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    if (this.canvas) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.panX = centerX - (centerX - this.panX) * (newZoom / this.zoom);
      this.panY = centerY - (centerY - this.panY) * (newZoom / this.zoom);
    }
    this.zoom = newZoom;
    this.updateZoomDisplay();
    const map = store.getMap(this.currentMapId);
    if (map) this.requestDraw(map);
  }

  /* ==========================================================================
     8. GESTIÓN DE CAPAS Y POPOVER
     ========================================================================== */
  toggleLayersPopover(map) {
    if (!this.layersPopover) return;
    const isVisible = this.layersPopover.style.display !== 'none';
    if (isVisible) {
      this.layersPopover.style.display = 'none';
    } else {
      this.renderLayersPopover(map);
      this.layersPopover.style.display = 'flex';
    }
  }

  renderLayersPopover(map) {
    const layers = map.layers || MAP_DEFAULT_LAYERS;
    this.layersPopover.innerHTML = `
      <div style="font-weight:700; font-size:0.8125rem; color:var(--text-primary); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
        <span>Capas del Mapa</span>
        <span style="font-size:0.6875rem; color:var(--text-muted); font-weight:normal;">Visibilidad y Bloqueo</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        ${layers.map(l => `
          <div class="map-layer-item">
            <span>${escapeHtml(l.name)}</span>
            <div class="map-layer-controls">
              <button class="btn btn-subtle btn-icon btn-sm btn-toggle-layer-vis" data-layer-id="${l.id}" title="${l.visible !== false ? 'Ocultar capa' : 'Mostrar capa'}">
                <svg class="icon icon-xs" viewBox="0 0 24 24" style="color: ${l.visible !== false ? 'var(--accent)' : 'var(--text-muted)'};">
                  ${l.visible !== false ? `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                  ` : `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>
                  `}
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.layersPopover.querySelectorAll('.btn-toggle-layer-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const lid = btn.getAttribute('data-layer-id');
        const target = layers.find(l => l.id === lid);
        if (target) {
          target.visible = target.visible === false ? true : false;
          store.updateMap(map.id, { layers });
          this.renderLayersPopover(store.getMap(map.id));
          this.requestDraw(store.getMap(map.id));
        }
      });
    });
  }

  /* ==========================================================================
     9. MODAL DE CREACIÓN / EDICIÓN DE MAPA
     ========================================================================== */
  openMapModal(map = null, projectId) {
    const isEdit = !!map;
    const currentPreset = map ? map.preset : 'editorial';

    const contentHtml = `
      <form id="form-map-meta" style="display:flex; flex-direction:column; gap:var(--space-md);">
        <div class="form-group">
          <label class="form-label" for="meta-map-name">Nombre del Mapa *</label>
          <input type="text" class="input" id="meta-map-name" required value="${escapeHtml(map?.name || '')}" placeholder="Ej: Carta Náutica de Oakhaven" />
        </div>

        <div class="form-group">
          <label class="form-label" for="meta-map-desc">Descripción o Finalidad</label>
          <textarea class="textarea" id="meta-map-desc" rows="3" placeholder="Contexto geográfico, facciones que dominan la zona o escala del mapa...">${escapeHtml(map?.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="meta-map-preset">Preset Visual Inicial</label>
          <select class="input" id="meta-map-preset">
            ${Object.values(MAP_PRESETS).map(pr => `
              <option value="${pr.id}" ${pr.id === currentPreset ? 'selected' : ''}>${escapeHtml(pr.name)}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
          <div class="form-group">
            <label class="form-label" for="meta-map-w">Ancho Virtual (px)</label>
            <input type="number" class="input" id="meta-map-w" value="${map?.width || 3200}" min="800" max="10000" step="100" />
          </div>
          <div class="form-group">
            <label class="form-label" for="meta-map-h">Alto Virtual (px)</label>
            <input type="number" class="input" id="meta-map-h" value="${map?.height || 2200}" min="600" max="10000" step="100" />
          </div>
        </div>
      </form>
    `;

    modal.open({
      title: isEdit ? 'Editar Propiedades del Mapa' : 'Crear Nuevo Mapa',
      contentHtml,
      confirmText: isEdit ? 'Guardar Cambios' : 'Crear Mapa',
      cancelText: 'Cancelar',
      onConfirm: (modalEl) => {
        const name = modalEl.querySelector('#meta-map-name').value.trim();
        const desc = modalEl.querySelector('#meta-map-desc').value.trim();
        const preset = modalEl.querySelector('#meta-map-preset').value;
        const width = parseInt(modalEl.querySelector('#meta-map-w').value, 10) || 3200;
        const height = parseInt(modalEl.querySelector('#meta-map-h').value, 10) || 2200;

        if (!name) {
          showToast('El mapa requiere un nombre.');
          return false;
        }

        if (isEdit) {
          store.updateMap(map.id, { name, description: desc, preset, width, height });
          showToast('Propiedades del mapa actualizadas.');
          if (this.currentMapId === map.id) {
            this.container.querySelector('#map-header-title').textContent = name;
            this.renderInspector(store.getMap(map.id), store.getActiveProject());
            this.requestDraw(store.getMap(map.id));
          } else {
            this.renderLibrary(this.container, store.getActiveProject());
          }
        } else {
          const newMap = store.createMap({ projectId, name, description: desc, preset, width, height });
          showToast(`Mapa "${newMap.name}" creado.`);
          this.openMap(newMap.id, projectId);
        }
        return true;
      }
    });
  }

  /* ==========================================================================
     10. GENERADOR PROCEDURAL («GENERAR MUNDO» ILUSTRADO Y NATURAL)
     ========================================================================== */
  openWorldGeneratorModal(map, project) {
    let proposalElements = null;
    let currentModalEl = null;

    const generateProposal = (modalEl) => {
      const density = modalEl.querySelector('#gen-density')?.value || 'medium';
      const hasMountains = modalEl.querySelector('#gen-mountains')?.checked ?? true;
      const hasWater = modalEl.querySelector('#gen-water')?.checked ?? true;
      const hasSettlements = modalEl.querySelector('#gen-settlements')?.checked ?? true;
      const includeWorldPlaces = modalEl.querySelector('#gen-world-places')?.checked ?? true;
      const seedStr = modalEl.querySelector('#gen-seed')?.value || Date.now().toString();

      // PRNG determinista
      let seedVal = 0;
      for (let i = 0; i < seedStr.length; i++) seedVal = (seedVal * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
      const random = () => {
        seedVal = (seedVal * 1664525 + 1013904223) & 0xffffffff;
        return (seedVal >>> 0) / 4294967296;
      };

      const elements = [];
      const w = map.width;
      const h = map.height;
      let mountainCount = 0;
      let waterCount = 0;
      let forestCount = 0;
      let settlementCount = 0;
      let worldPlaceCount = 0;

      let coastBayX = Math.round(w * 0.28);
      let coastBayY = Math.round(h * 0.52);

      // 1. Costa Orgánica Natural y Masas de Agua
      if (hasWater) {
        const numCoastPts = 32;
        const coastPts = [{ x: 0, y: 0 }];

        for (let i = 0; i < numCoastPts; i++) {
          const t = i / (numCoastPts - 1);
          const baseY = t * h;
          // Curvatura continental amplia con golfo/bahía en el centro
          const mainCurvature = Math.sin(t * Math.PI) * (w * 0.08);
          const bayIndentation = Math.sin(t * Math.PI * 2 + 0.6) * (w * 0.07);
          const coastalJitter = (Math.sin(t * 14) * 14 + Math.cos(t * 26) * 8 + (random() - 0.5) * 18);
          const coastX = Math.round(w * 0.25 + mainCurvature + bayIndentation + coastalJitter);

          if (i === Math.floor(numCoastPts * 0.52)) {
            coastBayX = coastX;
            coastBayY = Math.round(baseY);
          }
          coastPts.push({ x: coastX, y: Math.round(baseY) });
        }

        coastPts.push({ x: 0, y: h });

        elements.push({
          id: 'gen-ocean',
          type: 'area',
          layerId: 'layer-agua',
          points: coastPts,
          icon: 'mar',
          label: 'Mar Occidental',
          showLabel: true,
          labelSize: 20,
          strokeColor: '#0284C7',
          strokeWidth: 3,
          fillColor: '#38BDF8',
          fillOpacity: 0.45
        });
        waterCount++;

        // Pequeño archipiélago costero natural (2 islas orgánicas mar adentro)
        const numIslands = density === 'low' ? 1 : 2;
        for (let isl = 0; isl < numIslands; isl++) {
          const islCx = Math.round(coastBayX - 170 - (isl * 70));
          const islCy = Math.round(coastBayY - 50 + (isl * 160));
          const islRad = 35 + random() * 20;
          const islPts = [];
          const islVertexCount = 10;
          for (let vi = 0; vi < islVertexCount; vi++) {
            const ang = (vi / islVertexCount) * Math.PI * 2;
            const r = islRad * (0.8 + 0.3 * Math.sin(ang * 3) + (random() - 0.5) * 0.25);
            islPts.push({ x: Math.round(islCx + Math.cos(ang) * r), y: Math.round(islCy + Math.sin(ang) * r) });
          }
          elements.push({
            id: `gen-island-${isl}`,
            type: 'area',
            layerId: 'layer-terreno',
            points: islPts,
            icon: 'bosque',
            label: isl === 0 ? 'Isla de la Bruma' : 'Cayo Vigía',
            showLabel: true,
            labelSize: 12,
            strokeColor: '#059669',
            strokeWidth: 2,
            fillColor: '#10B981',
            fillOpacity: 0.40
          });
        }
      }

      // 2. Cadenas Montañosas Orgánicas (con estribaciones y puertos de montaña)
      const mountainPeaks = [];
      let passMountain = null;

      if (hasMountains) {
        const spineCount = density === 'low' ? 9 : density === 'high' ? 20 : 14;
        const startX = w * (0.55 + random() * 0.08);
        const startY = h * 0.12;
        const endX = w * (0.78 + random() * 0.10);
        const endY = h * 0.88;

        for (let i = 0; i < spineCount; i++) {
          const t = i / (spineCount - 1);
          // Curva sinusoidal orgánica de la dorsal montañosa
          const spineCurve = Math.sin(t * Math.PI) * (w * 0.10 * (random() > 0.5 ? 1 : -1));
          const mx = startX + t * (endX - startX) + spineCurve + (random() - 0.5) * 45;
          const my = startY + t * (endY - startY) + (random() - 0.5) * 45;

          // Dejar paso natural en 55% de la cordillera para el paso de montaña
          const isPass = (i === Math.floor(spineCount * 0.55));
          if (isPass) {
            passMountain = { x: Math.round(mx), y: Math.round(my) };
            continue; // Brecha de relieve natural
          }

          const isVolcano = (i === Math.floor(spineCount * 0.25));
          const peakSize = Math.round(30 + random() * 18);

          const peak = {
            id: `gen-mnt-${i}`,
            type: 'point',
            layerId: 'layer-terreno',
            x: Math.round(mx),
            y: Math.round(my),
            icon: isVolcano ? 'volcan' : 'montana',
            size: peakSize,
            label: i === 0 ? 'Picos del Alba' : (i === spineCount - 1 ? 'Espolón Boreal' : (isVolcano ? 'Pico Ígneo' : '')),
            showLabel: i === 0 || i === spineCount - 1 || isVolcano,
            color: '#78716C'
          };
          elements.push(peak);
          mountainPeaks.push(peak);
          mountainCount++;

          // Añadir estribaciones / colinas en los flancos de la cordillera
          if (i % 3 === 0 && random() > 0.3) {
            const hillOffset = (random() > 0.5 ? 1 : -1) * (50 + random() * 40);
            elements.push({
              id: `gen-hill-${i}`,
              type: 'point',
              layerId: 'layer-terreno',
              x: Math.round(mx + hillOffset),
              y: Math.round(my + (random() - 0.5) * 30),
              icon: 'colina',
              size: Math.round(24 + random() * 10),
              label: '',
              showLabel: false,
              color: '#059669'
            });
            mountainCount++;
          }
        }
      }

      // 3. Río Principal y Afluente Natural Serpenteante
      let riverConfluence = { x: Math.round(w * 0.44), y: Math.round(h * 0.48) };

      if (hasWater && mountainPeaks.length > 0) {
        // El río nace en el macizo montañoso central
        const originMnt = mountainPeaks[Math.floor(mountainPeaks.length * 0.4)] || mountainPeaks[0];
        const riverPts = [{ x: originMnt.x - 10, y: originMnt.y }];

        const numRiverSegments = 24;
        const targetX = coastBayX + 15;
        const targetY = coastBayY;

        for (let r = 1; r < numRiverSegments; r++) {
          const t = r / (numRiverSegments - 1);
          const lx = originMnt.x + t * (targetX - originMnt.x);
          const ly = originMnt.y + t * (targetY - originMnt.y);
          // Serpenteo fluido perpendicular
          const meander = Math.sin(t * Math.PI * 4.5) * 36 + (Math.sin(t * Math.PI * 9) * 14) + (random() - 0.5) * 12;
          const rx = Math.round(lx);
          const ry = Math.round(ly + meander);

          if (r === Math.floor(numRiverSegments * 0.55)) {
            riverConfluence = { x: rx, y: ry };
          }
          riverPts.push({ x: rx, y: ry });
        }

        elements.push({
          id: 'gen-river-main',
          type: 'line',
          layerId: 'layer-agua',
          points: riverPts,
          icon: 'rio',
          label: 'Río Dorado',
          showLabel: true,
          labelSize: 13,
          strokeColor: '#0284C7',
          strokeWidth: 4.5
        });
        waterCount++;

        // Afluente secundario que nace en otra ladera y desemboca en la confluencia
        const tribOrigin = mountainPeaks[0] || originMnt;
        const tribPts = [{ x: tribOrigin.x - 15, y: tribOrigin.y + 20 }];
        const numTribPts = 12;

        for (let tr = 1; tr < numTribPts; tr++) {
          const t = tr / (numTribPts - 1);
          const tx = tribOrigin.x + t * (riverConfluence.x - tribOrigin.x);
          const ty = (tribOrigin.y + 20) + t * (riverConfluence.y - (tribOrigin.y + 20));
          const tMeander = Math.sin(t * Math.PI * 3) * 22 + (random() - 0.5) * 10;
          tribPts.push({ x: Math.round(tx), y: Math.round(ty + tMeander) });
        }

        elements.push({
          id: 'gen-river-trib',
          type: 'line',
          layerId: 'layer-agua',
          points: tribPts,
          icon: 'rio',
          label: 'Ribera de Plata',
          showLabel: false,
          strokeColor: '#0284C7',
          strokeWidth: 3
        });
        waterCount++;
      }

      // 4. Masas Forestales Orgánicas con Lóbulos Naturales
      const numForests = density === 'low' ? 1 : density === 'high' ? 3 : 2;
      for (let f = 0; f < numForests; f++) {
        const fcX = f === 0 ? w * 0.44 : w * 0.65;
        const fcY = f === 0 ? h * 0.32 : h * 0.68;
        const baseRad = 150 + random() * 70;
        const pts = [];
        const numPts = 18;

        for (let p = 0; p < numPts; p++) {
          const ang = (p / numPts) * Math.PI * 2;
          // Contorno multilobular orgánico
          const r = baseRad * (0.82 + 0.28 * Math.sin(ang * 3 + f) + 0.14 * Math.cos(ang * 5) + (random() - 0.5) * 0.2);
          pts.push({ x: Math.round(fcX + Math.cos(ang) * r), y: Math.round(fcY + Math.sin(ang) * r) });
        }

        elements.push({
          id: `gen-forest-${f}`,
          type: 'area',
          layerId: 'layer-terreno',
          points: pts,
          icon: 'bosque',
          label: f === 0 ? 'Gran Bosque de los Susurros' : 'Selva Esmeralda',
          showLabel: true,
          labelSize: 14,
          fillColor: '#10B981',
          strokeColor: '#059669',
          fillOpacity: 0.38
        });
        forestCount++;
      }

      // 5. Asentamientos Estratégicos y Red de Calzadas
      let capitalPos = { x: Math.round(riverConfluence.x + 40), y: Math.round(riverConfluence.y - 30) };
      let portPos = { x: Math.round(coastBayX + 35), y: Math.round(coastBayY - 20) };

      if (hasSettlements) {
        // Ciudad Capital en el valle fértil
        elements.push({
          id: 'gen-city-capital',
          type: 'point',
          layerId: 'layer-lugares',
          x: capitalPos.x,
          y: capitalPos.y,
          icon: 'ciudad',
          size: 42,
          label: 'Ciudad Capital de Oakhaven',
          showLabel: true,
          color: '#4F46E5'
        });
        settlementCount++;

        // Puerto en la bahía marítima
        elements.push({
          id: 'gen-city-port',
          type: 'point',
          layerId: 'layer-lugares',
          x: portPos.x,
          y: portPos.y,
          icon: 'puerto',
          size: 36,
          label: 'Puerto de la Marea',
          showLabel: true,
          color: '#0891B2'
        });
        settlementCount++;

        // Bastión o Castillo en el paso de montaña
        if (passMountain) {
          elements.push({
            id: 'gen-castle-pass',
            type: 'point',
            layerId: 'layer-lugares',
            x: passMountain.x,
            y: passMountain.y,
            icon: 'castillo',
            size: 38,
            label: 'Bastión del Paso Alto',
            showLabel: true,
            color: '#B45309'
          });
          settlementCount++;
        }

        // Torre vigía costera
        elements.push({
          id: 'gen-tower-coast',
          type: 'point',
          layerId: 'layer-lugares',
          x: Math.round(coastBayX - 25),
          y: Math.round(coastBayY + 180),
          icon: 'torre',
          size: 32,
          label: 'Atalaya Austral',
          showLabel: true,
          color: '#D97706'
        });
        settlementCount++;

        // Calzada Real conectando la Capital con el Puerto
        elements.push({
          id: 'gen-road-king',
          type: 'line',
          layerId: 'layer-infra',
          points: [
            { x: capitalPos.x, y: capitalPos.y },
            { x: Math.round((capitalPos.x + portPos.x) / 2), y: Math.round((capitalPos.y + portPos.y) / 2 + 25) },
            { x: portPos.x, y: portPos.y }
          ],
          icon: 'carretera',
          label: 'Camino Real',
          showLabel: false,
          strokeColor: '#78716C',
          strokeWidth: 3.5,
          lineDash: 'dashed'
        });
      }

      // 6. Colocar lugares existentes de Mundo si se solicitó
      if (includeWorldPlaces) {
        const unplaced = store.getPlaces(project.id).filter(p => !(map.elements || []).some(el => el.placeId === p.id));
        unplaced.forEach((p, idx) => {
          const px = Math.round(w * (0.38 + ((idx * 0.17) % 0.42)));
          const py = Math.round(h * (0.28 + ((idx * 0.21) % 0.48)));

          let icon = 'marcador';
          if (p.category === 'asentamientos') icon = p.type === 'castillo' ? 'castillo' : (p.type === 'puerto' ? 'puerto' : 'ciudad');
          else if (p.category === 'naturaleza') icon = p.type === 'montana' ? 'montana' : (p.type === 'bosque' ? 'arbol' : 'cueva');
          else if (p.category === 'especiales') icon = 'portal';

          elements.push({
            id: `gen-world-${p.id}`,
            placeId: p.id,
            type: 'point',
            layerId: 'layer-lugares',
            x: px,
            y: py,
            icon,
            size: 36,
            label: p.name,
            showLabel: true,
            color: p.color || '#4F46E5'
          });
          worldPlaceCount++;
        });
      }

      proposalElements = elements;
      const prevEl = modalEl.querySelector('#gen-summary-text');
      if (prevEl) {
        prevEl.innerHTML = `
          <strong>Propuesta generada:</strong> ${elements.length} elementos cartográficos calculados (${mountainCount} accidentes de relieve, ${waterCount} masas y ríos, ${forestCount} bosques ilustrados, ${settlementCount} asentamientos${worldPlaceCount > 0 ? `, ${worldPlaceCount} lugares de Mundo` : ''}).<br>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:3px; display:inline-block;">El mapa permanecerá intacto hasta que pulses «Aplicar al Mapa».</span>
        `;
      }
    };

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:var(--space-md);">
        <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">
          Genera una cartografía ilustrada con costas orgánicas, ríos serpenteantes, cordilleras asimétricas y masas forestales con textura vegetal.
        </p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
          <div class="form-group">
            <label class="form-label" for="gen-density">Densidad de Elementos</label>
            <select class="input" id="gen-density">
              <option value="low">Baja (Espaciada)</option>
              <option value="medium" selected>Media (Equilibrada)</option>
              <option value="high">Alta (Densa)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="gen-seed">Semilla Aleatoria</label>
            <div style="display:flex; gap:6px;">
              <input type="text" class="input" id="gen-seed" value="${Math.floor(Math.random() * 999999)}" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-reroll-seed" title="Nueva semilla">
                <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                <span>Aleatorio</span>
              </button>
            </div>
          </div>
        </div>

        <div class="map-modal-card">
          <div class="map-modal-check-row">
            <input type="checkbox" id="gen-mountains" checked />
            <label for="gen-mountains" class="map-modal-check-label">Cordilleras y relieve ilustrado con sombreado</label>
          </div>
          <div class="map-modal-check-row">
            <input type="checkbox" id="gen-water" checked />
            <label for="gen-water" class="map-modal-check-label">Costas orgánicas, waterlines y ríos serpenteantes</label>
          </div>
          <div class="map-modal-check-row">
            <input type="checkbox" id="gen-settlements" checked />
            <label for="gen-settlements" class="map-modal-check-label">Ciudades, puertos, bastiones y calzadas reales</label>
          </div>
          <div class="map-modal-check-row">
            <input type="checkbox" id="gen-world-places" checked />
            <label for="gen-world-places" class="map-modal-check-label">Situar lugares existentes de Mundo que falten</label>
          </div>
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label">Modo de Aplicación</label>
          <div style="display:flex; gap:16px; font-size:0.8125rem;">
            <label class="map-modal-check-row">
              <input type="radio" name="gen-mode" value="append" checked />
              <span class="map-modal-check-label">Añadir a los elementos existentes</span>
            </label>
            <label class="map-modal-check-row">
              <input type="radio" name="gen-mode" value="replace" />
              <span class="map-modal-check-label">Reemplazar mapa actual</span>
            </label>
          </div>
        </div>

        <div id="gen-summary-text" class="map-modal-summary">
          Calculando propuesta ilustrada...
        </div>

        <button type="button" class="btn btn-secondary btn-sm" id="btn-regen-proposal" style="width:100%;">
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Regenerar Propuesta</span>
        </button>
      </div>
    `;

    modal.open({
      title: 'Generador Procedural de Mundo',
      contentHtml,
      confirmText: 'Aplicar al Mapa',
      cancelText: 'Cancelar',
      onOpen: (modalEl) => {
        currentModalEl = modalEl;

        const triggerRegen = () => generateProposal(modalEl);

        modalEl.querySelector('#btn-reroll-seed')?.addEventListener('click', () => {
          modalEl.querySelector('#gen-seed').value = Math.floor(Math.random() * 999999);
          triggerRegen();
        });

        modalEl.querySelector('#btn-regen-proposal')?.addEventListener('click', triggerRegen);
        modalEl.querySelector('#gen-density')?.addEventListener('change', triggerRegen);
        modalEl.querySelector('#gen-seed')?.addEventListener('input', triggerRegen);
        modalEl.querySelector('#gen-mountains')?.addEventListener('change', triggerRegen);
        modalEl.querySelector('#gen-water')?.addEventListener('change', triggerRegen);
        modalEl.querySelector('#gen-settlements')?.addEventListener('change', triggerRegen);
        modalEl.querySelector('#gen-world-places')?.addEventListener('change', triggerRegen);

        generateProposal(modalEl);
      },
      onConfirm: () => {
        if (!proposalElements || proposalElements.length === 0) {
          showToast('Genera una propuesta antes de aplicar.');
          return false;
        }

        const mode = currentModalEl?.querySelector('input[name="gen-mode"]:checked')?.value || 'append';
        const currentElems = map.elements || [];
        const combined = mode === 'replace' ? proposalElements : [...currentElems, ...proposalElements];

        store.updateMap(map.id, { elements: combined });
        this.pushHistoryState(store.getMap(map.id));
        this.renderLeftTabContent(project, store.getMap(map.id));
        this.renderInspector(store.getMap(map.id), project);
        this.requestDraw(store.getMap(map.id));
        showToast(mode === 'replace' ? 'Mapa reemplazado con la propuesta procedural.' : `Se han añadido ${proposalElements.length} elementos procedurales al mapa.`);
        return true;
      }
    });
  }

  /* ==========================================================================
     11. REORGANIZADOR DE LUGARES DE MUNDO
     ========================================================================== */
  openReorganizeModal(map, project) {
    const placeElems = (map.elements || []).filter(el => el.placeId);
    if (placeElems.length === 0) {
      showToast('No hay lugares de Mundo colocados en este mapa para reorganizar.');
      return;
    }

    let proposedPositions = new Map();

    const calculateProposal = (modalEl) => {
      const pattern = modalEl.querySelector('#reorg-pattern')?.value || 'equilibrado';
      const seedStr = modalEl.querySelector('#reorg-seed')?.value || Date.now().toString();

      let seedVal = 0;
      for (let i = 0; i < seedStr.length; i++) seedVal = (seedVal * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
      const random = () => {
        seedVal = (seedVal * 1664525 + 1013904223) & 0xffffffff;
        return (seedVal >>> 0) / 4294967296;
      };

      const w = map.width;
      const h = map.height;
      const count = placeElems.length;
      proposedPositions = new Map();

      if (pattern === 'radial') {
        placeElems.forEach((el, idx) => {
          const angle = (idx / count) * Math.PI * 2 + (random() - 0.5) * 0.3;
          const radius = Math.min(w, h) * (0.24 + (idx % 3) * 0.08);
          proposedPositions.set(el.id, {
            x: Math.round(w / 2 + Math.cos(angle) * radius),
            y: Math.round(h / 2 + Math.sin(angle) * radius)
          });
        });
      } else if (pattern === 'costera') {
        placeElems.forEach((el, idx) => {
          const isCoast = (idx % 2 === 0);
          const px = isCoast ? w * (0.28 + random() * 0.12) : w * (0.50 + random() * 0.35);
          const py = h * (0.20 + (idx / count) * 0.60 + (random() - 0.5) * 0.08);
          proposedPositions.set(el.id, {
            x: Math.round(Math.max(100, Math.min(w - 100, px))),
            y: Math.round(Math.max(100, Math.min(h - 100, py)))
          });
        });
      } else {
        // Equilibrado por cuadrantes
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const cellW = (w * 0.7) / cols;
        const cellH = (h * 0.7) / rows;
        const startX = w * 0.15;
        const startY = h * 0.15;

        placeElems.forEach((el, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const jitterX = (random() - 0.5) * cellW * 0.6;
          const jitterY = (random() - 0.5) * cellH * 0.6;
          proposedPositions.set(el.id, {
            x: Math.round(startX + col * cellW + cellW / 2 + jitterX),
            y: Math.round(startY + row * cellH + cellH / 2 + jitterY)
          });
        });
      }

      const patternLabels = {
        equilibrado: 'Equilibrado por Cuadrantes',
        radial: 'Radial Concéntrico',
        costera: 'Litoral e Interior'
      };

      const summaryEl = modalEl.querySelector('#reorg-summary-text');
      if (summaryEl) {
        summaryEl.innerHTML = `
          <strong>Propuesta calculada:</strong> ${placeElems.length} lugares reubicados usando distribución <em>${patternLabels[pattern] || pattern}</em>.<br>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:3px; display:inline-block;">Tus lugares en Mundo permanecerán intactos; solo se actualizan sus coordenadas en este mapa.</span>
        `;
      }
    };

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:var(--space-md);">
        <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">
          Reorganiza la disposición visual de los <strong>${placeElems.length}</strong> lugares existentes en este mapa sin alterar sus datos en Mundo.
        </p>

        <div class="form-group">
          <label class="form-label" for="reorg-pattern">Patrón de Distribución</label>
          <select class="input" id="reorg-pattern">
            <option value="equilibrado" selected>Equilibrado por Cuadrantes (Evita solapamientos)</option>
            <option value="radial">Radial Concéntrico (Anillo alrededor del centro)</option>
            <option value="costera">Litoral e Interior (Costa al oeste e interior al este)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="reorg-seed">Semilla de Variación</label>
          <div style="display:flex; gap:6px;">
            <input type="text" class="input" id="reorg-seed" value="${Math.floor(Math.random() * 999999)}" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reorg-reroll" title="Nueva variación">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              <span>Variación</span>
            </button>
          </div>
        </div>

        <div id="reorg-summary-text" class="map-modal-summary">
          Calculando propuesta de reorganización...
        </div>

        <button type="button" class="btn btn-secondary btn-sm" id="btn-regen-reorg" style="width:100%;">
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Regenerar Distribución</span>
        </button>
      </div>
    `;

    modal.open({
      title: 'Reorganizar Lugares en el Mapa',
      contentHtml,
      confirmText: 'Aplicar Reorganización',
      cancelText: 'Cancelar',
      onOpen: (modalEl) => {
        const triggerReorg = () => calculateProposal(modalEl);

        modalEl.querySelector('#btn-reorg-reroll')?.addEventListener('click', () => {
          modalEl.querySelector('#reorg-seed').value = Math.floor(Math.random() * 999999);
          triggerReorg();
        });

        modalEl.querySelector('#btn-regen-reorg')?.addEventListener('click', triggerReorg);
        modalEl.querySelector('#reorg-pattern')?.addEventListener('change', triggerReorg);
        modalEl.querySelector('#reorg-seed')?.addEventListener('input', triggerReorg);

        calculateProposal(modalEl);
      },
      onConfirm: () => {
        if (!proposedPositions || proposedPositions.size === 0) {
          showToast('Genera una propuesta antes de aplicar.');
          return false;
        }

        (map.elements || []).forEach(el => {
          if (proposedPositions.has(el.id)) {
            const pos = proposedPositions.get(el.id);
            el.x = pos.x;
            el.y = pos.y;
            store.updateMapElement(map.id, el.id, { x: pos.x, y: pos.y });
          }
        });

        this.pushHistoryState(store.getMap(map.id));
        this.renderInspector(store.getMap(map.id), project);
        this.requestDraw(store.getMap(map.id));
        showToast(`Se han reorganizado ${proposedPositions.size} lugares estéticamente.`);
        return true;
      }
    });
  }

  /* ==========================================================================
     12. IMAGEN DE REFERENCIA DE FONDO
     ========================================================================== */
  openReferenceImageModal(map) {
    const ref = map.referenceImage || { url: '', opacity: 0.5, visible: false };

    const contentHtml = `
      <form id="form-ref-image" style="display:flex; flex-direction:column; gap:var(--space-md);">
        <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">
          Coloca un boceto a mano, mapa escaneado o imagen guía de fondo con transparencia ajustable para calcar tu cartografía.
        </p>

        <div class="form-group">
          <label class="form-label" for="ref-img-url">URL de Imagen o Carga Local</label>
          <input type="text" class="input" id="ref-img-url" value="${escapeHtml(ref.url || '')}" placeholder="https://... o pega datos de imagen" />
        </div>

        <div class="form-group">
          <label class="form-label">Cargar archivo de imagen local:</label>
          <input type="file" id="ref-file-input" accept="image/*" class="input" style="padding:4px;" />
        </div>

        <div class="form-group">
          <label class="form-label" for="ref-opacity">Opacidad (${Math.round((ref.opacity || 0.5) * 100)}%)</label>
          <input type="range" id="ref-opacity" min="0.1" max="1" step="0.05" value="${ref.opacity || 0.5}" />
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="ref-visible" ${ref.visible ? 'checked' : ''} />
          <label for="ref-visible" style="font-size:0.8125rem; font-weight:600; cursor:pointer;">Mostrar imagen de referencia en lienzo</label>
        </div>
      </form>
    `;

    modal.open({
      title: 'Imagen de Referencia de Fondo',
      contentHtml,
      confirmText: 'Guardar Referencia',
      cancelText: 'Cerrar',
      onOpen: (modalEl) => {
        modalEl.querySelector('#ref-file-input')?.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              modalEl.querySelector('#ref-img-url').value = evt.target.result;
            };
            reader.readAsDataURL(file);
          }
        });
      },
      onConfirm: (modalEl) => {
        const url = modalEl.querySelector('#ref-img-url').value.trim();
        const opacity = parseFloat(modalEl.querySelector('#ref-opacity').value) || 0.5;
        const visible = modalEl.querySelector('#ref-visible').checked;

        const newRef = url ? { url, opacity, visible, locked: true } : null;
        store.updateMap(map.id, { referenceImage: newRef });
        this.loadReferenceImage(newRef);
        this.requestDraw(store.getMap(map.id));
        showToast(url ? 'Imagen de referencia actualizada.' : 'Imagen de referencia descartada.');
        return true;
      }
    });
  }

  loadReferenceImage(ref) {
    if (!ref || !ref.url) {
      this.referenceImageObj = null;
      return;
    }
    if (this.lastRefImageUrl === ref.url && this.referenceImageObj) return;

    this.lastRefImageUrl = ref.url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.referenceImageObj = img;
      const map = store.getMap(this.currentMapId);
      if (map) this.requestDraw(map);
    };
    img.src = ref.url;
  }

  /* ==========================================================================
     13. EXPORTACIÓN DE IMAGEN
     ========================================================================== */
  exportMapAsPng(map) {
    // Crear un canvas fuera de pantalla con las dimensiones originales del mapa
    const offCanvas = document.createElement('canvas');
    offCanvas.width = map.width;
    offCanvas.height = map.height;
    const offCtx = offCanvas.getContext('2d');
    const preset = MAP_PRESETS[map.preset] || MAP_PRESETS.editorial;

    // Fondo
    offCtx.fillStyle = preset.bg;
    offCtx.fillRect(0, 0, map.width, map.height);

    // Si hay imagen de referencia
    if (map.referenceImage && map.referenceImage.visible && this.referenceImageObj) {
      offCtx.save();
      offCtx.globalAlpha = map.referenceImage.opacity || 0.5;
      offCtx.drawImage(this.referenceImageObj, 0, 0, map.width, map.height);
      offCtx.restore();
    }

    // Capas
    const layers = [...(map.layers || MAP_DEFAULT_LAYERS)].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    layers.forEach(layer => {
      if (layer.visible === false) return;
      const elems = (map.elements || []).filter(el => (el.layerId || 'layer-lugares') === layer.id && el.isVisible !== false);
      elems.filter(el => el.type === 'area').forEach(el => this.drawAreaElement(offCtx, el, preset));
      elems.filter(el => el.type === 'line').forEach(el => this.drawLineElement(offCtx, el, preset));
      elems.filter(el => el.type === 'point' || el.type === 'annotation').forEach(el => this.drawPointElement(offCtx, el, preset));
    });

    try {
      const dataUrl = offCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_map.png`;
      a.click();
      showToast('Imagen PNG del mapa exportada.');
    } catch (err) {
      console.error('Error al exportar PNG:', err);
      showToast('No se pudo exportar la imagen.');
    }
  }

  destroy() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
  }
}
