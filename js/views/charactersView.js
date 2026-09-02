/* Writer OS — Vista de Personajes */

import { store } from '../models/store.js';
import { escapeHtml } from '../models/types.js';
import { modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export class CharactersView {
  constructor(app) {
    this.app = app;
    this.currentFilterRole = 'all';
    this.searchQuery = '';
  }

  render(container, params = {}) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    const allCharacters = store.getCharacters(project.id);
    const filteredCharacters = allCharacters.filter(ch => {
      const matchRole = this.currentFilterRole === 'all' || ch.role === this.currentFilterRole;
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        ch.name.toLowerCase().includes(q) ||
        (ch.alias && ch.alias.toLowerCase().includes(q)) ||
        (ch.description && ch.description.toLowerCase().includes(q)) ||
        (ch.tags && ch.tags.some(t => t.toLowerCase().includes(q)));
      return matchRole && matchQuery;
    });

    container.innerHTML = `
      <div class="view-container">
        <!-- Cabecera de sección -->
        <div class="section-header">
          <div>
            <h1 class="section-header-title">Personajes</h1>
            <p class="section-header-subtitle">Dramatis personae: las mentes, voces y voluntades de tu historia.</p>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-new-character">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nuevo Personaje</span>
            </button>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);">
          
          <!-- Filtro por Rol -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm ${this.currentFilterRole === 'all' ? 'btn-primary' : 'btn-secondary'} btn-filter-role" data-role="all">Todos (${allCharacters.length})</button>
            <button class="btn btn-sm ${this.currentFilterRole === 'protagonista' ? 'btn-primary' : 'btn-secondary'} btn-filter-role" data-role="protagonista">Protagonistas</button>
            <button class="btn btn-sm ${this.currentFilterRole === 'antagonista' ? 'btn-primary' : 'btn-secondary'} btn-filter-role" data-role="antagonista">Antagonistas</button>
            <button class="btn btn-sm ${this.currentFilterRole === 'secundario' ? 'btn-primary' : 'btn-secondary'} btn-filter-role" data-role="secundario">Secundarios</button>
            <button class="btn btn-sm ${this.currentFilterRole === 'otro' ? 'btn-primary' : 'btn-secondary'} btn-filter-role" data-role="otro">Otros</button>
          </div>

          <!-- Buscador -->
          <div style="min-width: 240px;">
            <input
              type="text"
              class="form-input"
              id="character-search-input"
              placeholder="Buscar personaje o etiqueta..."
              value="${this.searchQuery}"
              style="padding: 7px 12px; font-size: 0.875rem;"
            />
          </div>
        </div>

        <!-- Cuadrícula de Personajes -->
        ${filteredCharacters.length === 0 ? this.renderEmptyState(allCharacters.length) : this.renderCharactersGrid(filteredCharacters, project.id)}
      </div>
    `;

    this.bindEvents(container, project);

    // Si veníamos con parámetro para abrir ficha directamente
    if (params.characterId) {
      const charToOpen = store.getCharacter(params.characterId);
      if (charToOpen) {
        setTimeout(() => this.openCharacterModal(charToOpen, project.id), 100);
      }
    }
  }

  renderEmptyState(totalCount) {
    if (totalCount === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h2 class="empty-state-title">Aún no hay personajes</h2>
          <p class="empty-state-desc">Define a los protagonistas, aliados y antagonistas que darán vida al conflicto de tu obra.</p>
          <button class="btn btn-primary" id="btn-new-character-empty">Crear primer personaje</button>
        </div>
      `;
    }
    return `
      <div class="card" style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
        No se encontraron personajes que coincidan con los filtros seleccionados.
      </div>
    `;
  }

  renderCharactersGrid(characters, projectId) {
    const chapters = store.getChapters(projectId);

    const cardsHtml = characters.map(ch => {
      // Contar en cuántos capítulos aparece
      const appearances = chapters.filter(c => (c.characterIds || []).includes(ch.id)).length;

      return `
        <div class="card card-clickable character-card" data-char-id="${ch.id}" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <!-- Fila superior con Avatar y Rol -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-sm);">
              <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <div style="width: 42px; height: 42px; border-radius: 50%; background-color: ${ch.avatarColor || '#B45309'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; font-weight: bold; flex-shrink: 0; box-shadow: var(--shadow-sm);">
                  ${ch.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style="font-size: 1.15rem; font-family: var(--font-serif); line-height: 1.2;">${ch.name}</h2>
                  ${ch.alias ? `<div style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic;">"${ch.alias}"</div>` : ''}
                </div>
              </div>
              <span class="badge ${ch.role === 'protagonista' ? 'badge-accent' : ''}">${this.formatRole(ch.role)}</span>
            </div>

            <!-- Descripción -->
            <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: var(--space-sm); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${ch.description || 'Sin descripción detallada aún.'}
            </p>

            <!-- Etiquetas -->
            ${ch.tags && ch.tags.length > 0 ? `
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: var(--space-sm);">
                ${ch.tags.map(t => `<span class="badge" style="font-size: 0.6875rem;">#${t}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Pie de tarjeta: Apariciones y acciones -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle); font-size: 0.75rem; color: var(--text-muted); margin-top: var(--space-sm);">
            <span>
              <svg class="icon icon-sm" style="margin-right: 4px;" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              ${appearances === 1 ? 'Presente en 1 capítulo' : `Presente en ${appearances} capítulos`}
            </span>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-subtle btn-sm btn-edit-char" data-char-id="${ch.id}">Ficha</button>
              <button class="btn btn-subtle btn-icon btn-sm btn-delete-char" data-char-id="${ch.id}" title="Eliminar personaje">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-lg);">
        ${cardsHtml}
      </div>
    `;
  }

  formatRole(role) {
    const map = { protagonista: 'Protagonista', antagonista: 'Antagonista', secundario: 'Secundario', otro: 'Otro' };
    return map[role] || 'Personaje';
  }

  bindEvents(container, project) {
    // Filtro por rol
    container.querySelectorAll('.btn-filter-role').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilterRole = btn.getAttribute('data-role');
        this.render(container);
      });
    });

    // Búsqueda en vivo
    const searchInput = container.querySelector('#character-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      const filtered = store.getCharacters(project.id).filter(ch => {
        const matchRole = this.currentFilterRole === 'all' || ch.role === this.currentFilterRole;
        const q = this.searchQuery.toLowerCase().trim();
        const matchQuery = !q ||
          ch.name.toLowerCase().includes(q) ||
          (ch.alias && ch.alias.toLowerCase().includes(q)) ||
          (ch.description && ch.description.toLowerCase().includes(q)) ||
          (ch.tags && ch.tags.some(t => t.toLowerCase().includes(q)));
        return matchRole && matchQuery;
      });

      const gridArea = container.querySelector('.view-container > div:last-child');
      if (gridArea) {
        gridArea.outerHTML = filtered.length === 0
          ? this.renderEmptyState(1)
          : this.renderCharactersGrid(filtered, project.id);
        this.bindCardEvents(container, project);
      }
    });

    // Nuevo Personaje
    container.querySelector('#btn-new-character')?.addEventListener('click', () => {
      this.openCharacterModal(null, project.id);
    });
    container.querySelector('#btn-new-character-empty')?.addEventListener('click', () => {
      this.openCharacterModal(null, project.id);
    });

    this.bindCardEvents(container, project);
  }

  bindCardEvents(container, project) {
    // Abrir ficha al hacer clic en tarjeta
    container.querySelectorAll('.character-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-char')) return;
        const charId = card.getAttribute('data-char-id');
        const character = store.getCharacter(charId);
        if (character) {
          this.openCharacterModal(character, project.id);
        }
      });
    });

    // Eliminar personaje
    container.querySelectorAll('.btn-delete-char').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const charId = btn.getAttribute('data-char-id');
        const ch = store.getCharacter(charId);
        if (!ch) return;

        modal.confirm({
          title: `¿Eliminar a ${ch.name}?`,
          message: 'Se borrará la ficha del personaje y se desvinculará de todos los capítulos en los que aparece. Esta acción no se puede deshacer.',
          confirmText: 'Eliminar personaje',
          isDanger: true,
          onConfirm: () => {
            store.deleteCharacter(charId);
            showToast(`Personaje "${ch.name}" eliminado`, 'info');
            this.render(container);
          }
        });
      });
    });
  }

  openCharacterModal(character, projectId) {
    const isEditing = !!character;
    const colors = ['#B45309', '#4F46E5', '#059669', '#DC2626', '#7C3AED', '#2563EB', '#475569'];

    modal.open({
      title: isEditing ? `Ficha de ${character.name}` : 'Crear nuevo personaje',
      contentHtml: `
        <form id="form-character">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="char-name">Nombre completo *</label>
              <input type="text" id="char-name" class="form-input" value="${character ? character.name : ''}" placeholder="Ej: Elena Vane" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="char-alias">Sobrenombre o título</label>
              <input type="text" id="char-alias" class="form-input" value="${character ? character.alias : ''}" placeholder="Ej: La Guardiana del Archivo" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="char-role">Rol narrativo</label>
              <select id="char-role" class="form-select">
                <option value="protagonista" ${character && character.role === 'protagonista' ? 'selected' : ''}>Protagonista</option>
                <option value="antagonista" ${character && character.role === 'antagonista' ? 'selected' : ''}>Antagonista</option>
                <option value="secundario" ${(!character || character.role === 'secundario') ? 'selected' : ''}>Secundario</option>
                <option value="otro" ${character && character.role === 'otro' ? 'selected' : ''}>Otro / Figurante</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Color distintivo</label>
              <div style="display: flex; gap: 8px; align-items: center; height: 38px;">
                ${colors.map(c => `
                  <label style="cursor: pointer;">
                    <input type="radio" name="char-color" value="${c}" ${(character ? character.avatarColor === c : c === '#B45309') ? 'checked' : ''} style="display: none;" />
                    <span class="color-dot" style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: ${c}; border: 2px solid transparent; transition: transform 0.15s ease;"></span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-desc">Descripción física y personalidad</label>
            <textarea id="char-desc" class="form-textarea" placeholder="Apariencia, postura, voz, forma de hablar, rasgos distintivos...">${character ? character.description : ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-notes">Trasfondo, secretos y motivaciones</label>
            <textarea id="char-notes" class="form-textarea" placeholder="¿Qué desea más que nada? ¿Qué oculta al resto de personajes? ¿Cuál es su herida del pasado?">${character ? character.notes : ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-tags">Etiquetas (separadas por comas)</label>
            <input type="text" id="char-tags" class="form-input" value="${character && character.tags ? character.tags.join(', ') : ''}" placeholder="Ej: erudita, custodia, resistencia" />
          </div>

          ${isEditing ? this.renderCharacterRelationsBlock(character, projectId) : ''}
        </form>
      `,
      confirmText: isEditing ? 'Guardar cambios' : 'Crear personaje',
      onOpen: (modalEl) => {
        // Estilo activo para el selector de color
        const updateColorBorders = () => {
          modalEl.querySelectorAll('input[name="char-color"]').forEach(input => {
            const span = input.nextElementSibling;
            if (input.checked) {
              span.style.transform = 'scale(1.25)';
              span.style.boxShadow = '0 0 0 2px var(--text-primary)';
            } else {
              span.style.transform = 'scale(1)';
              span.style.boxShadow = 'none';
            }
          });
        };
        updateColorBorders();
        modalEl.querySelectorAll('input[name="char-color"]').forEach(input => {
          input.addEventListener('change', updateColorBorders);
        });

        // Botón añadir relación desde ficha de personaje
        modalEl.querySelector('#btn-char-add-rel')?.addEventListener('click', () => {
          modal.close();
          this.app.navigate('relationships', projectId);
          setTimeout(() => {
            this.app.views.relationships.openRelationshipModal(null, projectId, { sourceId: character.id });
          }, 150);
        });

        // Clic en entidad vinculada
        modalEl.querySelectorAll('.char-modal-rel-item').forEach(item => {
          item.addEventListener('click', () => {
            const entId = item.getAttribute('data-entity-id');
            const entType = item.getAttribute('data-entity-type');
            modal.close();
            if (entType === 'character') {
              const targetChar = store.getCharacter(entId);
              if (targetChar) this.openCharacterModal(targetChar, projectId);
            } else if (entType === 'group') {
              this.app.navigate('relationships', projectId);
              setTimeout(() => {
                const grp = store.getGroup(entId);
                if (grp) this.app.views.relationships.openGroupModal(grp, projectId);
              }, 150);
            } else if (entType === 'place') {
              this.app.navigate('world', projectId);
              setTimeout(() => {
                const pl = store.getPlace(entId, projectId);
                if (pl) this.app.views.world.openPlaceDetailModal(pl, projectId);
              }, 150);
            }
          });
        });
      },
      onConfirm: (modalEl) => {
        const nameInput = modalEl.querySelector('#char-name');
        const aliasInput = modalEl.querySelector('#char-alias');
        const roleInput = modalEl.querySelector('#char-role');
        const descInput = modalEl.querySelector('#char-desc');
        const notesInput = modalEl.querySelector('#char-notes');
        const tagsInput = modalEl.querySelector('#char-tags');
        const colorInput = modalEl.querySelector('input[name="char-color"]:checked');

        const name = nameInput.value.trim();
        if (!name) {
          nameInput.focus();
          showToast('El personaje debe tener un nombre', 'error');
          return false;
        }

        const tags = tagsInput.value
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0);

        const data = {
          name,
          alias: aliasInput.value.trim(),
          role: roleInput.value,
          description: descInput.value.trim(),
          notes: notesInput.value.trim(),
          tags,
          avatarColor: colorInput ? colorInput.value : '#B45309'
        };

        if (isEditing) {
          store.updateCharacter(character.id, data);
          showToast(`Ficha de "${name}" actualizada`, 'success');
        } else {
          store.createCharacter({ ...data, projectId });
          showToast(`Personaje "${name}" creado`, 'success');
        }

        this.app.render();
        return true;
      }
    });
  }

  renderCharacterRelationsBlock(character, projectId) {
    const rels = store.getCharacterRelationships(character.id, projectId);
    const groups = rels.filter(r => r.otherEntity && r.otherEntity.type === 'group');
    const family = rels.filter(r => r.relationship.category === 'familiar');
    const loveAndSocial = rels.filter(r => r.relationship.category === 'afectiva' || r.relationship.category === 'social');
    const politics = rels.filter(r => r.relationship.category === 'politica');

    return `
      <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
            Vínculos, Familia, Casas y Lugares (${rels.length})
          </span>
          <button type="button" class="btn btn-subtle btn-sm" id="btn-char-add-rel" style="padding: 2px 8px; font-size: 0.75rem;">
            + Vincular relación
          </button>
        </div>

        ${rels.length === 0 ? `
          <div style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic;">
            Este personaje aún no tiene vínculos registrados. Pulsa en <strong>+ Vincular relación</strong> para añadir familia, aliados, facciones o lugares.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto;">
            ${rels.map(r => {
              const ent = r.otherEntity;
              if (!ent) return '';
              const isGrp = ent.type === 'group';
              const isPlace = ent.type === 'place';
              const roleLabel = isGrp || isPlace
                ? (r.myRole || r.otherRole || r.relationship.type)
                : (r.otherRole || r.relationship.type);

              return `
                <div class="card card-clickable char-modal-rel-item" data-entity-id="${escapeHtml(ent.id)}" data-entity-type="${escapeHtml(ent.type)}" style="padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 22px; height: 22px; border-radius: ${isPlace ? '6px' : (isGrp ? '4px' : '50%')}; background-color: ${escapeHtml(ent.color)}; color: #FFF; font-size: 0.6875rem; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                      ${escapeHtml(ent.name.charAt(0).toUpperCase())}
                    </div>
                    <div>
                      <strong>${escapeHtml(ent.name)}</strong>
                      <span style="color: var(--text-muted); margin-left: 4px; font-size: 0.75rem;">(${escapeHtml(roleLabel)})</span>
                    </div>
                  </div>
                  <span class="cat-badge cat-${escapeHtml(r.relationship.category)}" style="font-size: 0.625rem;">
                    ${escapeHtml(r.relationship.type)}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }
}

