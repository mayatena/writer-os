/* Writer OS — Vista de Resumen del Proyecto */

import { store } from '../models/store.js';
import { countWords, getPlaceCategoryIcon } from '../models/types.js';

export class OverviewView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const project = store.getActiveProject();
    if (!project) {
      this.app.navigate('projects');
      return;
    }

    const stats = store.getProjectStats(project.id);
    const chapters = store.getChapters(project.id);
    const characters = store.getCharacters(project.id);
    const notes = store.getNotes(project.id);
    const groups = store.getGroups(project.id);
    const places = store.getPlaces(project.id);

    // Calcular progreso respecto al objetivo
    const targetWords = project.targetWordCount || 50000;
    const progressPercent = Math.min(100, Math.round((stats.totalWords / targetWords) * 100));

    // Determinar el capítulo para continuar escribiendo (el más recientemente modificado o el primero)
    const latestChapter = chapters.length > 0
      ? [...chapters].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
      : null;

    container.innerHTML = `
      <div class="view-container">
        <!-- Banner del Proyecto -->
        <div class="card" style="margin-bottom: var(--space-xl); background: linear-gradient(to bottom right, var(--bg-surface), var(--bg-subtle));">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-md);">
            <div>
              <span class="badge badge-accent" style="margin-bottom: 8px;">${this.formatType(project.type)}</span>
              <h1 style="font-size: 2.2rem; font-family: var(--font-serif); margin-bottom: 6px;">${project.title}</h1>
              <p style="max-width: 720px; font-size: 1.05rem; line-height: 1.6;">${project.description || 'Sin descripción registrada para este proyecto.'}</p>
            </div>
            <div>
              <button class="btn btn-primary btn-lg" id="btn-continue-writing" style="box-shadow: var(--shadow-md);">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                <span>${latestChapter ? 'Continuar escribiendo' : 'Empezar a escribir'}</span>
              </button>
            </div>
          </div>

          <!-- Barra de Progreso de Palabras -->
          <div style="margin-top: var(--space-lg); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 6px;">
              <span><strong>${stats.totalWords.toLocaleString('es-ES')}</strong> de ${targetWords.toLocaleString('es-ES')} palabras objetivo</span>
              <span><strong>${progressPercent}%</strong> completado</span>
            </div>
            <div style="width: 100%; height: 8px; background-color: var(--border-subtle); border-radius: var(--radius-full); overflow: hidden;">
              <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
            </div>
          </div>
        </div>

        <!-- Fila de Estadísticas Clave -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-xl);">
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Palabras</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalWords.toLocaleString('es-ES')}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Capítulos</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalChapters}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Personajes</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalCharacters}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Lugares</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalPlaces || 0}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Casas / Grupos</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalGroups || 0}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Relaciones</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalRelationships || 0}
            </div>
          </div>
          <div class="card" style="padding: var(--space-md);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Notas</span>
            <div style="font-size: 1.6rem; font-family: var(--font-serif); font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${stats.totalNotes}
            </div>
          </div>
        </div>

        <!-- Contenido Dividido: Capítulos (Izq) y Entidades (Der) -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-xl); align-items: start;" class="overview-grid">
          
          <!-- Columna Izquierda: Capítulos -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
              <h2 style="font-size: 1.35rem; font-family: var(--font-serif);">Capítulos de la obra</h2>
              <button class="btn btn-secondary btn-sm" id="btn-add-chapter-overview">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Nuevo capítulo</span>
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              ${chapters.length === 0 ? `
                <div class="card" style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                  Aún no has creado capítulos. ¡Haz clic en <strong>Nuevo capítulo</strong> para comenzar a escribir!
                </div>
              ` : chapters.map((c, idx) => {
                const words = countWords(c.content);
                const assignedChars = (c.characterIds || []).map(cid => store.getCharacter(cid)).filter(Boolean);
                return `
                  <div class="card card-clickable chapter-row-card" data-chapter-id="${c.id}" style="padding: var(--space-md);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">#${idx + 1}</span>
                          <h3 style="font-size: 1.05rem; font-family: var(--font-serif);">${c.title}</h3>
                        </div>
                        ${c.summary ? `<p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 4px;">${c.summary}</p>` : ''}
                        
                        ${assignedChars.length > 0 ? `
                          <div style="display: flex; gap: 4px; margin-top: 8px; align-items: center;">
                            <span style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Personajes:</span>
                            ${assignedChars.map(ch => `
                              <span class="badge" style="font-size: 0.6875rem; padding: 1px 6px;">${ch.name}</span>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                      <div style="text-align: right; flex-shrink: 0; margin-left: var(--space-md);">
                        <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);">${words.toLocaleString('es-ES')} palabras</span>
                        <div style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px;">
                          ${new Date(c.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Columna Derecha: Personajes y Notas de un vistazo -->
          <div style="display: flex; flex-direction: column; gap: var(--space-xl);">
            
            <!-- Personajes -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                <h2 style="font-size: 1.15rem; font-family: var(--font-serif);">Personajes clave</h2>
                <button class="btn btn-subtle btn-sm" id="btn-view-all-characters">Ver todos</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                ${characters.length === 0 ? `
                  <div class="card" style="padding: var(--space-md); text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    No hay personajes creados.
                  </div>
                ` : characters.slice(0, 4).map(ch => `
                  <div class="card card-clickable char-quick-row" data-char-id="${ch.id}" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${ch.avatarColor || 'var(--accent)'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">
                        ${ch.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-size: 0.875rem; font-weight: 600;">${ch.name}</div>
                        <div style="font-size: 0.6875rem; color: var(--text-muted);">${ch.alias || this.formatRole(ch.role)}</div>
                      </div>
                    </div>
                    <span class="badge">${this.formatRole(ch.role)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Notas de Ideas -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                <h2 style="font-size: 1.15rem; font-family: var(--font-serif);">Notas e investigación</h2>
                <button class="btn btn-subtle btn-sm" id="btn-view-all-notes">Ver todas</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                ${notes.length === 0 ? `
                  <div class="card" style="padding: var(--space-md); text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    No hay notas registradas.
                  </div>
                ` : notes.slice(0, 3).map(n => `
                  <div class="card card-clickable note-quick-row" data-note-id="${n.id}" style="padding: 10px 12px;">
                    <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 2px;">${n.title}</div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      ${n.content}
                    </p>
                    ${n.tags && n.tags.length > 0 ? `
                      <div style="display: flex; gap: 4px; margin-top: 6px;">
                        ${n.tags.map(t => `<span class="badge" style="font-size: 0.625rem;">#${t}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Casas y Facciones Nobiliarias -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                <h2 style="font-size: 1.15rem; font-family: var(--font-serif);">Casas y Organizaciones</h2>
                <button class="btn btn-subtle btn-sm" id="btn-view-all-relationships">Ver relaciones</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                ${groups.length === 0 ? `
                  <div class="card" style="padding: var(--space-md); text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    No hay casas u organizaciones registradas.
                  </div>
                ` : groups.slice(0, 3).map(g => `
                  <div class="card card-clickable group-quick-row" data-group-id="${g.id}" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 26px; height: 26px; border-radius: 4px; background-color: ${g.color || '#4F46E5'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">
                        ${g.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-size: 0.875rem; font-weight: 600;">${g.name}</div>
                        <div style="font-size: 0.6875rem; color: var(--text-muted); font-style: italic;">${g.motto || g.type}</div>
                      </div>
                    </div>
                    <span class="badge" style="font-size: 0.625rem;">${g.type}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Mundo y Lugares -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                <h2 style="font-size: 1.15rem; font-family: var(--font-serif);">Mundo y Lugares</h2>
                <button class="btn btn-subtle btn-sm" id="btn-view-all-world">Explorar mundo</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                ${places.length === 0 ? `
                  <div class="card" style="padding: var(--space-md); text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    No hay lugares registrados.
                  </div>
                ` : places.slice(0, 3).map(pl => `
                  <div class="card card-clickable place-quick-row" data-place-id="${pl.id}" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 26px; height: 26px; border-radius: 6px; background-color: ${pl.color || 'var(--accent)'}20; color: ${pl.color || 'var(--accent)'}; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">
                        ${getPlaceCategoryIcon(pl.category, 'icon icon-xs')}
                      </div>
                      <div>
                        <div style="font-size: 0.875rem; font-weight: 600;">${pl.name}</div>
                        <div style="font-size: 0.6875rem; color: var(--text-muted);">${pl.type}</div>
                      </div>
                    </div>
                    <span class="place-badge place-cat-${pl.category}" style="font-size: 0.625rem;">${pl.category}</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    this.bindEvents(container, project, latestChapter);
  }

  formatType(type) {
    const map = { novela: 'Novela', relato: 'Relato corto', guion: 'Guion', antologia: 'Antología', otro: 'Obra literaria' };
    return map[type] || 'Obra';
  }

  formatRole(role) {
    const map = { protagonista: 'Protagonista', antagonista: 'Antagonista', secundario: 'Secundario', otro: 'Personaje' };
    return map[role] || 'Personaje';
  }

  bindEvents(container, project, latestChapter) {
    // Continuar escribiendo
    container.querySelector('#btn-continue-writing')?.addEventListener('click', () => {
      if (latestChapter) {
        this.app.navigate('editor', project.id, { chapterId: latestChapter.id });
      } else {
        // Crear primer capítulo y abrirlo
        const ch = store.createChapter({
          projectId: project.id,
          title: 'Capítulo 1',
          content: '<p></p>'
        });
        this.app.navigate('editor', project.id, { chapterId: ch.id });
      }
    });

    // Clic en fila de capítulo
    container.querySelectorAll('.chapter-row-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-chapter-id');
        this.app.navigate('editor', project.id, { chapterId: id });
      });
    });

    // Nuevo capítulo desde resumen
    container.querySelector('#btn-add-chapter-overview')?.addEventListener('click', () => {
      const chapters = store.getChapters(project.id);
      const nextNum = chapters.length + 1;
      const ch = store.createChapter({
        projectId: project.id,
        title: `Capítulo ${nextNum}`,
        content: '<p></p>'
      });
      this.app.navigate('editor', project.id, { chapterId: ch.id });
    });

    // Ver todos los personajes
    container.querySelector('#btn-view-all-characters')?.addEventListener('click', () => {
      this.app.navigate('characters', project.id);
    });

    // Clic en personaje rápido
    container.querySelectorAll('.char-quick-row').forEach(row => {
      row.addEventListener('click', () => {
        const charId = row.getAttribute('data-char-id');
        this.app.navigate('characters', project.id, { characterId: charId });
      });
    });

    // Ver todas las notas
    container.querySelector('#btn-view-all-notes')?.addEventListener('click', () => {
      this.app.navigate('notes', project.id);
    });

    // Clic en nota rápida
    container.querySelectorAll('.note-quick-row').forEach(row => {
      row.addEventListener('click', () => {
        const noteId = row.getAttribute('data-note-id');
        this.app.navigate('notes', project.id, { noteId: noteId });
      });
    });

    // Ver todas las relaciones
    container.querySelector('#btn-view-all-relationships')?.addEventListener('click', () => {
      this.app.navigate('relationships', project.id);
    });

    // Clic en grupo rápido
    container.querySelectorAll('.group-quick-row').forEach(row => {
      row.addEventListener('click', () => {
        this.app.navigate('relationships', project.id, { mode: 'structured' });
      });
    });

    // Ver todo el mundo
    container.querySelector('#btn-view-all-world')?.addEventListener('click', () => {
      this.app.navigate('world', project.id);
    });

    // Clic en lugar rápido
    container.querySelectorAll('.place-quick-row').forEach(row => {
      row.addEventListener('click', () => {
        const placeId = row.getAttribute('data-place-id');
        this.app.navigate('world', project.id, { placeId });
      });
    });
  }
}
