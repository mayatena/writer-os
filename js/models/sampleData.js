/* Writer OS — Proyecto de Muestra Literario */

export const sampleProjectData = {
  project: {
    id: 'proj-susurro-sombras',
    title: 'El Susurro de las Sombras',
    description: 'En una ciudad costera envuelta en bruma perpetua, una joven archivista descubre una serie de cartas prohibidas que desvelan el verdadero origen de la noche sin fin.',
    type: 'novela',
    targetWordCount: 75000,
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-09-02T18:30:00.000Z'
  },
  chapters: [
    {
      id: 'chap-1',
      projectId: 'proj-susurro-sombras',
      title: 'Capítulo 1: La Marca de Ceniza',
      order: 0,
      summary: 'Elena descubre un manuscrito lacrado en los sótanos del Archivo Central y percibe que alguien la vigila desde las galerías altas.',
      characterIds: ['char-elena', 'char-cassian'],
      content: `<p>El frío del sótano no era el aire natural de la medianoche, sino esa clase de escarcha pétrea que solo se acumula donde la luz del sol ha sido desterrada durante siglos. Elena sostuvo la lámpara de latón con los dedos entumecidos, observando cómo la llama temblaba al compás de su propia respiración.</p>
<p>Bajo la tercera hilera de anaqueles de roble negro, allí donde los inventarios oficiales aseguraban que solo reposaban libros de contabilidad mercantil, un lomo de cuero desgastado desprendía un tenue olor a ceniza húmeda. No figuraba ningún número de serie. Ningún sello del Concilio.</p>
<p>Al pasar la yema del pulgar sobre el broche de cobre, una punzada de calor recorrió su muñeca. Era la misma sensación que su abuela describía en los cuentos de infancia: el tacto de las palabras vivas antes del Gran Ocaso.</p>
<hr>
<p>—Una archivista prudente sabría cuándo devolver un tomo a las tinieblas —dijo una voz grave a sus espaldas, emergiendo de entre las sombras del corredor.</p>
<p>Elena contuvo el aliento sin volverse de golpe. Conocía esa cadencia impecable y desprovista de emoción. Solo un hombre caminaba por los archivos prohibidos sin hacer crujir los tablones carcomidos: Lord Cassian Thorne.</p>`,
      createdAt: '2026-08-16T11:00:00.000Z',
      updatedAt: '2026-09-02T17:15:00.000Z'
    },
    {
      id: 'chap-2',
      projectId: 'proj-susurro-sombras',
      title: 'Capítulo 2: El Faro Apagado',
      order: 1,
      summary: 'Elena acude al muelle viejo en busca de Mateo Soler para descifrar las coordenadas náuticas marcadas en el pergamino.',
      characterIds: ['char-elena', 'char-mateo'],
      content: `<p>La niebla del puerto sabía a salmuera y brea quemada. Entre los mástiles esqueléticos de las goletas amarradas, la silueta del viejo faro se recortaba como un dedo acusador apuntando al firmamento vacío.</p>
<p>Elena se ajustó el cuello del abrigo y descendió los peldaños cubiertos de verdín. En la taberna del timonel tuerto, Mateo ya limpiaba un sextante de latón con aire distraído. Cuando ella dejó caer el fragmento de pergamino sobre la mesa de madera astillada, la mirada del marinero cambió de inmediato.</p>
<p>—Estas corrientes no existen en ninguna carta marina del reino —susurró él, bajando la voz hasta convertirla en un murmullo cómplice—; a menos que pretendas navegar hacia el borde mismo del mundo conocido.</p>`,
      createdAt: '2026-08-20T14:30:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z'
    },
    {
      id: 'chap-3',
      projectId: 'proj-susurro-sombras',
      title: 'Capítulo 3: El Consejo de los Siete',
      order: 2,
      summary: 'Se desata el debate en la corte sobre los rumores de rebelión y la desaparición de registros históricos.',
      characterIds: ['char-cassian'],
      content: `<p>Las altas vidrieras del Palacio de Ópalo reflejaban únicamente la penumbra grisácea del mediodía. En torno a la mesa de obsidiana, los siete miembros del tribunal deliberaban con el ceño fruncido.</p>
<p>Cassian permaneció de pie junto al ventanal, observando el mar invisible. Sabía que el fuego encendido en los sótanos del archivo no tardaría en alcanzar las torres más altas si no actuaban con una determinación implacable.</p>`,
      createdAt: '2026-08-28T09:10:00.000Z',
      updatedAt: '2026-09-02T16:00:00.000Z'
    }
  ],
  characters: [
    {
      id: 'char-elena',
      projectId: 'proj-susurro-sombras',
      name: 'Elena Vane',
      alias: 'La Guardiana del Archivo',
      role: 'protagonista',
      description: 'Joven paleógrafa y restauradora de documentos antiguos en el Archivo Central. Observadora, tenaz e impulsada por una sed insobornable de verdad histórica.',
      notes: 'Heredó de su abuela un medallón con inscripciones en la lengua anterior al Gran Ocaso. Desconfía profundamente de las órdenes oficiales del Concilio.',
      tags: ['erudita', 'custodia', 'resistencia', 'archivo'],
      avatarColor: '#B45309',
      createdAt: '2026-08-15T12:00:00.000Z',
      updatedAt: '2026-09-02T15:00:00.000Z'
    },
    {
      id: 'char-cassian',
      projectId: 'proj-susurro-sombras',
      name: 'Lord Cassian Thorne',
      alias: 'El Silente',
      role: 'antagonista',
      description: 'Canciller de la Orden del Velo y primer consejero del tribunal. Figura enigmática de modales exquisitos y fría eficacia.',
      notes: 'Cree sinceramente que ocultar la verdad sobre el Ocaso es el único medio para preservar la paz civil y evitar la histeria colectiva.',
      tags: ['nobleza', 'canciller', 'orden del velo'],
      avatarColor: '#4F46E5',
      createdAt: '2026-08-15T12:15:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z'
    },
    {
      id: 'char-mateo',
      projectId: 'proj-susurro-sombras',
      name: 'Mateo Soler',
      alias: 'El Cartógrafo Errante',
      role: 'secundario',
      description: 'Navegante veterano y contrabandista de mapas no autorizados. Conoce los arrecifes exteriores mejor que la guardia costera.',
      notes: 'Perdió a su hermano en una expedición hacia las aguas brumosas hace diez años; busca respuestas tanto o más que Elena.',
      tags: ['marino', 'cartografía', 'aliado'],
      avatarColor: '#059669',
      createdAt: '2026-08-16T15:00:00.000Z',
      updatedAt: '2026-08-30T18:00:00.000Z'
    }
  ],
  notes: [
    {
      id: 'note-1',
      projectId: 'proj-susurro-sombras',
      title: 'Naturaleza de la Bruma Perpetua',
      content: 'La niebla no es vapor de agua común: posee densidad variable y amortigua el sonido a partir de los cincuenta metros. Las brújulas pierden precisión en presencia de corrientes frías procedentes del norte.',
      tags: ['mundo', 'investigación', 'magia'],
      createdAt: '2026-08-15T14:00:00.000Z',
      updatedAt: '2026-08-25T11:00:00.000Z'
    },
    {
      id: 'note-2',
      projectId: 'proj-susurro-sombras',
      title: 'Jerarquía del Concilio de las Sombras',
      content: 'El gobierno está dividido en tres ramas: La Orden del Velo (custodia de la ley y censura), El Gremio de Mareantes (rutas y suministros) y Los Siete Sabios (administración judicial). Cassian responde formalmente ante los Sabios, pero su poder práctico supera al de todos ellos.',
      tags: ['política', 'trama', 'organizaciones'],
      createdAt: '2026-08-17T16:30:00.000Z',
      updatedAt: '2026-08-28T09:00:00.000Z'
    },
    {
      id: 'note-3',
      projectId: 'proj-susurro-sombras',
      title: 'Misterio: El diario del astrónomo ciego',
      content: 'Encontrar una pista en el Capítulo 4 que conecte el diario con la torre derruida al sur del cabo. El astrónomo predijo el día exacto en que la luna volverá a ser visible.',
      tags: ['misterio', 'pista', 'trama'],
      createdAt: '2026-08-22T19:00:00.000Z',
      updatedAt: '2026-09-02T14:20:00.000Z'
    }
  ]
};
