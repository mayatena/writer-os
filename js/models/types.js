/* Writer OS — Tipos y Fábricas de Datos */

/**
 * Generador de identificadores únicos robustos
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Cuenta palabras en un texto plano o HTML semántico
 */
export function countWords(text) {
  if (!text) return 0;
  // Eliminar etiquetas HTML
  const clean = text.replace(/<[^>]*>/g, ' ');
  // Contar palabras
  const words = clean.trim().match(/\b[\wáéíóúÁÉÍÓÚñÑüÜ'-]+\b/g);
  return words ? words.length : 0;
}

/**
 * Calcula el tiempo estimado de lectura en minutos (promedio 200 palabras/min)
 */
export function estimateReadingTime(words) {
  if (!words || words <= 0) return '< 1 min';
  const minutes = Math.ceil(words / 200);
  return `${minutes} min de lectura`;
}

/**
 * Fábrica de Proyecto
 */
export function createProject({
  title = 'Nueva Obra',
  description = '',
  type = 'novela',
  targetWordCount = 50000
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: title.trim() || 'Sin título',
    description: description.trim(),
    type: type || 'novela',
    targetWordCount: Number(targetWordCount) || 50000,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Fábrica de Capítulo
 */
export function createChapter({
  projectId,
  title = 'Nuevo Capítulo',
  content = '',
  summary = '',
  characterIds = [],
  order = 0
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    title: title.trim() || 'Capítulo sin título',
    content: content || '',
    summary: summary.trim(),
    characterIds: Array.isArray(characterIds) ? characterIds : [],
    order: Number(order) || 0,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Fábrica de Personaje
 */
export function createCharacter({
  projectId,
  name = 'Nuevo Personaje',
  alias = '',
  role = 'secundario',
  description = '',
  notes = '',
  tags = [],
  avatarColor = '#B45309'
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    name: name.trim() || 'Sin nombre',
    alias: alias.trim(),
    role: role || 'secundario', // 'protagonista' | 'antagonista' | 'secundario' | 'otro'
    description: description.trim(),
    notes: notes.trim(),
    tags: Array.isArray(tags) ? tags : [],
    avatarColor: avatarColor || '#B45309',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Fábrica de Grupo / Organización Narrativa / Casa Noble / Dinastía
 */
export function createGroup({
  projectId,
  name = 'Nueva Organización',
  type = 'casa_noble',
  description = '',
  motto = '',
  color = '#4F46E5',
  founderId = null,
  leaderId = null
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    name: name.trim() || 'Sin nombre',
    type: type || 'casa_noble', // 'casa_noble' | 'dinastia' | 'clan' | 'faccion' | 'gremio' | 'culto' | 'ejercito' | 'otro'
    description: description.trim(),
    motto: motto.trim(),
    color: color || '#4F46E5',
    founderId: founderId || null,
    leaderId: leaderId || null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Fábrica de Relación
 */
export function createRelationship({
  projectId,
  sourceId,
  sourceType = 'character',
  targetId,
  targetType = 'character',
  category = 'social',
  type = 'amistad',
  roleSource = '',
  roleTarget = '',
  isSymmetric = true,
  status = 'activa',
  description = '',
  startDate = '',
  endDate = ''
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    sourceId,
    sourceType: sourceType || 'character', // 'character' | 'group'
    targetId,
    targetType: targetType || 'character', // 'character' | 'group'
    category: category || 'social', // 'familiar' | 'afectiva' | 'social' | 'politica' | 'pertenencia'
    type: type || 'amistad',
    roleSource: roleSource.trim(),
    roleTarget: roleTarget.trim(),
    isSymmetric: Boolean(isSymmetric),
    status: status || 'activa', // 'activa' | 'pasada' | 'conflictiva' | 'secreta' | 'prometidos' | 'divorciados' | 'viudedad' | 'disidente'
    description: description.trim(),
    startDate: startDate.trim(),
    endDate: endDate.trim(),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Fábrica de Nota Creativa
 */
export function createNote({
  projectId,
  title = 'Nueva Nota',
  content = '',
  tags = [],
  placeId = null
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    title: title.trim() || 'Nota sin título',
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
    placeId: placeId || null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Categorías y tipos de lugares para Mundo y Worldbuilding
 */
export const PLACE_CATEGORIES = {
  geografia: { id: 'geografia', label: 'Geografía Mayor', color: '#B45309' },
  asentamientos: { id: 'asentamientos', label: 'Asentamientos y Edificios', color: '#4F46E5' },
  naturaleza: { id: 'naturaleza', label: 'Geografía Física y Natural', color: '#059669' },
  infraestructura: { id: 'infraestructura', label: 'Infraestructura y Vías', color: '#0891B2' },
  especiales: { id: 'especiales', label: 'Lugares Especiales', color: '#7C3AED' }
};

/**
 * Generador de iconos SVG consistentes con la identidad visual editorial de Writer OS
 */
export function getPlaceCategoryIcon(category, className = 'icon icon-sm') {
  switch (category) {
    case 'geografia':
      return `<svg class="${className}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    case 'asentamientos':
      return `<svg class="${className}" viewBox="0 0 24 24"><path d="M4 21V9l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2v12H4z"></path><path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"></path></svg>`;
    case 'naturaleza':
      return `<svg class="${className}" viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"></path></svg>`;
    case 'infraestructura':
      return `<svg class="${className}" viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>`;
    case 'especiales':
      return `<svg class="${className}" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    default:
      return `<svg class="${className}" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
  }
}

export const PLACE_TYPES_BY_CATEGORY = {
  geografia: [
    { id: 'mundo', label: 'Mundo / Planeta' },
    { id: 'continente', label: 'Continente' },
    { id: 'pais', label: 'País / Nación' },
    { id: 'reino', label: 'Reino' },
    { id: 'imperio', label: 'Imperio' },
    { id: 'estado', label: 'Estado / República' },
    { id: 'region', label: 'Región' },
    { id: 'provincia', label: 'Provincia / Condado' },
    { id: 'ducado', label: 'Ducado' },
    { id: 'territorio', label: 'Territorio Autónomo' },
    { id: 'archipielago_territorial', label: 'Archipiélago (Territorial)' },
    { id: 'colonia', label: 'Colonia / Protectorado' },
    { id: 'federacion', label: 'Federación' },
    { id: 'territorio_personalizado', label: 'Territorio Personalizado' }
  ],
  asentamientos: [
    { id: 'ciudad', label: 'Ciudad' },
    { id: 'capital', label: 'Capital' },
    { id: 'pueblo', label: 'Pueblo' },
    { id: 'aldea', label: 'Aldea / Caserío' },
    { id: 'barrio', label: 'Barrio / Distrito' },
    { id: 'puerto', label: 'Puerto' },
    { id: 'fortaleza', label: 'Fortaleza / Ciudadela' },
    { id: 'castillo', label: 'Castillo' },
    { id: 'palacio', label: 'Palacio / Residencia Real' },
    { id: 'templo', label: 'Templo / Santuario' },
    { id: 'universidad', label: 'Universidad / Academia' },
    { id: 'taberna', label: 'Taberna / Posada' },
    { id: 'casa', label: 'Casa / Residencia' },
    { id: 'tienda', label: 'Tienda / Taller / Mercado' },
    { id: 'edificio', label: 'Edificio Institucional' },
    { id: 'ruina', label: 'Ruina Urbana' },
    { id: 'prision', label: 'Prisión / Torreón' },
    { id: 'mazmorra', label: 'Mazmorra / Subterráneo' },
    { id: 'sala', label: 'Sala / Recinto Interior' },
    { id: 'asentamiento_personalizado', label: 'Asentamiento Personalizado' }
  ],
  naturaleza: [
    { id: 'montana', label: 'Montaña / Pico' },
    { id: 'cordillera', label: 'Cordillera / Sierra' },
    { id: 'colina', label: 'Colina / Meseta' },
    { id: 'valle', label: 'Valle / Garganta' },
    { id: 'bosque', label: 'Bosque / Arboleda' },
    { id: 'selva', label: 'Selva / Jungla' },
    { id: 'desierto', label: 'Desierto / Dunas' },
    { id: 'pantano', label: 'Pantano / Marisma' },
    { id: 'llanura', label: 'Llanura / Pradera' },
    { id: 'canon', label: 'Cañón / Acantilado' },
    { id: 'cueva', label: 'Cueva / Caverna' },
    { id: 'volcan', label: 'Volcán' },
    { id: 'glaciar', label: 'Glaciar / Tundra' },
    { id: 'rio', label: 'Río' },
    { id: 'lago', label: 'Lago / Laguna' },
    { id: 'cascada', label: 'Cascada / Salto de Agua' },
    { id: 'mar', label: 'Mar / Golfo / Bahía' },
    { id: 'oceano', label: 'Océano' },
    { id: 'isla', label: 'Isla' },
    { id: 'archipielago_natural', label: 'Archipiélago Natural' },
    { id: 'naturaleza_personalizada', label: 'Elemento Natural Personalizado' }
  ],
  infraestructura: [
    { id: 'carretera', label: 'Carretera / Calzada Real' },
    { id: 'camino', label: 'Camino / Vía Comercial' },
    { id: 'sendero', label: 'Sendero / Atajo' },
    { id: 'ruta_comercial', label: 'Ruta Comercial (Caravana)' },
    { id: 'ruta_maritima', label: 'Ruta Marítima / Vía Navegable' },
    { id: 'ferrocarril', label: 'Ferrocarril / Vía Férrea' },
    { id: 'canal', label: 'Canal Acuático' },
    { id: 'puente', label: 'Puente / Viaducto' },
    { id: 'tunel', label: 'Túnel / Paso Subterráneo' },
    { id: 'paso_montana', label: 'Paso de Montaña / Desfiladero' },
    { id: 'frontera', label: 'Línea Fronteriza' },
    { id: 'muralla', label: 'Muralla / Fortificación Perimetral' },
    { id: 'infraestructura_personalizada', label: 'Vía o Infraestructura Personalizada' }
  ],
  especiales: [
    { id: 'sagrado', label: 'Lugar Sagrado / Bendecido' },
    { id: 'maldito', label: 'Lugar Maldito / Encantado' },
    { id: 'prohibido', label: 'Lugar Prohibido / Zona Restringida' },
    { id: 'secreto', label: 'Lugar Secreto / Oculto' },
    { id: 'ruina_misteriosa', label: 'Ruina Misteriosa / Antigua' },
    { id: 'portal', label: 'Portal / Umbral Mágico' },
    { id: 'plano', label: 'Plano / Dimensión Extraña' },
    { id: 'sobrenatural', label: 'Anomalía Sobrenatural' },
    { id: 'narrativo', label: 'Lugar de Interés Narrativo' },
    { id: 'especial_personalizado', label: 'Lugar Especial Personalizado' }
  ]
};

/**
 * Fábrica de Lugar de Worldbuilding
 */
export function createPlace({
  projectId,
  name = 'Nuevo Lugar',
  category = 'geografia',
  type = 'territorio',
  parentId = null,
  description = '',
  tags = [],
  status = 'activo', // 'activo' | 'abandonado' | 'destruido' | 'en_construccion' | 'inaccesible' | 'secreto' | 'desaparecido' | 'otro'
  history = '',
  historicalDates = {}, // { foundationDate, destructionDate, abandonmentDate, period }
  authorities = [], // Array de { id, characterId, title, responsibilityType, description, startDate, endDate }
  specificData = {}, // contextual según categoría
  mapData = {}, // { x, y, coordinates, mapId, icon, color }
  color = '',
  notes = ''
} = {}) {
  const now = new Date().toISOString();
  const defaultColors = {
    geografia: '#B45309',
    asentamientos: '#4F46E5',
    naturaleza: '#059669',
    infraestructura: '#D97706',
    especiales: '#7C3AED'
  };

  return {
    id: generateId(),
    projectId,
    name: name.trim() || 'Lugar sin nombre',
    category: category || 'geografia',
    type: type || 'territorio',
    parentId: parentId || null,
    description: description.trim(),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
    status: status || 'activo',
    history: history.trim(),
    historicalDates: {
      foundationDate: historicalDates?.foundationDate ? String(historicalDates.foundationDate).trim() : '',
      destructionDate: historicalDates?.destructionDate ? String(historicalDates.destructionDate).trim() : '',
      abandonmentDate: historicalDates?.abandonmentDate ? String(historicalDates.abandonmentDate).trim() : '',
      period: historicalDates?.period ? String(historicalDates.period).trim() : ''
    },
    authorities: Array.isArray(authorities) ? authorities.map(a => ({
      id: a.id || generateId(),
      characterId: a.characterId || null,
      title: (a.title || '').trim(),
      responsibilityType: a.responsibilityType || 'civil', // 'civil' | 'militar' | 'religiosa' | 'propietaria' | 'honorifica' | 'otra'
      description: (a.description || '').trim(),
      startDate: (a.startDate || '').trim(),
      endDate: (a.endDate || '').trim()
    })).filter(a => a.characterId) : [],
    specificData: {
      capital: specificData?.capital || '',
      population: specificData?.population || '',
      governmentSystem: specificData?.governmentSystem || '',
      region: specificData?.region || '',
      function: specificData?.function || '',
      altitude: specificData?.altitude || '',
      hazards: specificData?.hazards || '',
      originPlaceId: specificData?.originPlaceId || null,
      destinationPlaceId: specificData?.destinationPlaceId || null,
      distance: specificData?.distance || '',
      transitStatus: specificData?.transitStatus || '',
      controlGroupOrEntity: specificData?.controlGroupOrEntity || '',
      mouthPlaceId: specificData?.mouthPlaceId || null,
      length: specificData?.length || '',
      dangerLevel: specificData?.dangerLevel || '',
      accessRequirements: specificData?.accessRequirements || '',
      supernaturalEffects: specificData?.supernaturalEffects || '',
      customNotes: specificData?.customNotes || ''
    },
    mapData: {
      x: mapData?.x !== undefined ? Number(mapData.x) : null,
      y: mapData?.y !== undefined ? Number(mapData.y) : null,
      coordinates: mapData?.coordinates || '',
      mapId: mapData?.mapId || null,
      icon: mapData?.icon || '',
      color: mapData?.color || ''
    },
    color: color || defaultColors[category] || '#0D9488',
    notes: notes.trim(),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Utilidad para sanear cadenas de texto e impedir inyección de HTML no deseado
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

