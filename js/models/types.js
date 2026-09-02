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
  tags = []
} = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    title: title.trim() || 'Nota sin título',
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
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

