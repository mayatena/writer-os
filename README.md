# Writer OS ✒️

> **Espacio de trabajo creativo e integral para escritores.**
> Diseñado para escribir obras conectando capítulos, personajes, relaciones, linajes, casas nobiliarias, notas y elementos de historia en una interfaz literaria, limpia y profesional.

---

## 🌟 Características Actuales

- **Totalmente en español**: Toda la terminología, menús, botones, mensajes, ayudas y diálogos diseñados en español con tono cuidado y profesional.
- **Biblioteca de Proyectos**:
  - Creación y gestión de obras independientes (Novela, Relato, Guion, Antología, etc.).
  - Portadas con métricas en tiempo real (palabras totales, capítulos, fecha de modificación).
  - Edición de metadatos, borrado seguro con confirmación.
  - Copias de seguridad: exportación e importación completa en formato JSON.
  - Precargado con el proyecto literario de muestra: *"El Susurro de las Sombras"*.
- **Resumen de la Obra (Overview)**:
  - Cuadro de mando literario con barra de progreso de palabras frente al objetivo.
  - Botón de acceso directo **"Continuar escribiendo"** que abre el último capítulo editado.
  - Estadísticas clave: recuento de palabras, capítulos, personajes, casas/organizaciones, relaciones y notas.
  - Vistas previas y accesos rápidos a capítulos, personajes clave, casas y notas recientes.
- **Santuario de Escritura (Editor)**:
  - Lista lateral de capítulos reordenables secuencialmente (subir/bajar), con recuento de palabras independiente.
  - Editor rico y limpio con tipografía cuidada (selector Serif literaria vs Sans moderna).
  - Herramientas esenciales: negrita (`Ctrl+B`), cursiva (`Ctrl+I`), encabezados H2/H3, citas en bloque, listas y separador de escena (`* * *`).
  - Modo concentración (Zen) sin distracciones.
  - Autoguardado silencioso e instantáneo con indicador de estado en tiempo real.
  - Contador en vivo de palabras, caracteres y tiempo estimado de lectura.
- **Panel Contextual de Escritura (Inspector lateral)**:
  - Permite al escritor consultar información del universo narrativo sin salir del editor.
  - Sinopsis y notas de escena del capítulo activo.
  - Personajes presentes en la escena: vincular/desvincular con un clic y consultar la ficha completa sin perder el hilo de escritura.
  - Consulta rápida del cuaderno de notas creativas del proyecto.
- **Directorio de Personajes**:
  - Fichas completas: Nombre, Alias, Rol narrativo (Protagonista, Antagonista, Secundario, Otro), color distintivo, descripción física/psicológica, secretos/trasfondo y etiquetas.
  - Bloque integrado de **"Vínculos, Familia y Casas"** con roles recíprocos precisos y salto directo a las entidades conectadas.
  - Filtro por roles y buscador en tiempo real.
  - Indicador de presencia ("Presente en X capítulos").
- **Sistema de Relaciones, Familias, Linajes y Casas Nobiliarias**:
  - **Tres modos de visualización integrados**:
    - **Estructurada**: Directorio relacional con filtros por categoría (*Familia*, *Afectivas*, *Sociales*, *Políticas*, *Pertenencias* y *Casas y Grupos*), búsqueda en tiempo real, distinción de simetría (`↔` frente a `➔`), roles específicos en origen/destino, fechas de inicio y fin, estados y notas de contexto.
    - **Red de Conexiones**: Visualizador interactivo de grafo en Canvas HTML5 con nodos arrastrables, distinción por figuras y colores, flechas direccionales, panel lateral de detalles y controles de centrado y filtro.
    - **Linaje y Familia**: Árbol genealógico generacional multinivel (ancestros y abuelos, progenitores y tutores, generación central con hermanos y cónyuges/parejas, e hijos y nietos) con recentrado instantáneo al hacer clic en cualquier miembro familiar.
  - **Casas y Organizaciones Narrativas**: Creación de casas nobles, dinastías, facciones, gremios, clanes y cultos, con lema heráldico, líder, fundador, miembros con cargo fechado y tratados políticos inter-grupo.
- **Cuaderno de Notas e Ideas**:
  - Repositorio de ideas de trama, ambientación, investigación y misterios.
  - Organización por etiquetas dinámicas (#mundo, #magia, #trama, #misterio, #investigación).
  - Buscador en tiempo real por título o contenido.
- **Búsqueda Global y Paleta de Comandos (`Ctrl + K`)**:
  - Acceso instantáneo con el teclado mediante `Ctrl + K`.
  - Búsqueda en vivo en capítulos, personajes, casas, organizaciones, relaciones, notas y proyectos.
  - Navegación rápida y ejecución de comandos directos (crear capítulo, personaje, relación, casa u organización, saltar entre secciones, alternar tema).
- **Diseño Editorial y Temas**:
  - **Modo Claro (Papel Crema)**: Calidez editorial y legibilidad inspirada en libros impresos.
  - **Modo Oscuro (Tinta Nocturna)**: Fondo carbón profundo con acentos ámbar, reduciendo la fatiga visual nocturna.
- **Persistencia Real y Portabilidad**:
  - Todos los datos se conservan automáticamente en el almacenamiento local (`localStorage`).
  - Exportación e importación de copias de seguridad completas en formato JSON sin pérdida de relaciones ni jerarquías.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Con el lanzador automático (Recomendado)
Haz doble clic en el archivo:
```bat
iniciar.bat
```
Esto iniciará un servidor local HTTP ligero en PowerShell (sin requerir Node.js ni Python) y abrirá Writer OS automáticamente en tu navegador Google Chrome en `http://localhost:5173` (con selección automática de puerto libre entre 5173 y 5185 si fuera necesario).

### Opción 2: Desde PowerShell
Ejecuta en la terminal de PowerShell dentro de esta carpeta:
```powershell
powershell -ExecutionPolicy Bypass -File .\servidor.ps1
```

---

## 📂 Estructura Real del Código

```
writer-os/
├── index.html                   # Documento principal y shell de la aplicación SPA
├── iniciar.bat                  # Lanzador rápido para Windows
├── servidor.ps1                 # Servidor HTTP ligero nativo de PowerShell (ASCII / UTF-8)
├── README.md                    # Documentación técnica y funcional del proyecto
├── css/
│   ├── variables.css            # Tokens de diseño, temas claro y oscuro
│   ├── base.css                 # Tipografía, resets y scrollbar editorial
│   ├── layout.css               # Cabecera, navegación superior, migas de pan y pestañas
│   ├── editor.css               # Espacio de escritura, barra de herramientas e inspector lateral
│   ├── components.css           # Botones, formularios, modales, tarjetas, badges y toasts
│   └── relationships.css        # Estilos para tarjetas de relación, grafo de red y árbol de linaje
└── js/
    ├── app.js                   # Enrutador hash y controlador de ciclo de vida de la aplicación
    ├── models/
    │   ├── types.js             # Fábricas de entidades, generador de IDs y utilidades (escapeHtml)
    │   ├── store.js             # Almacén reactivo, consultas relacionales y persistencia local
    │   └── sampleData.js        # Datos de demostración literarios ("El Susurro de las Sombras")
    ├── views/
    │   ├── projectsView.js      # Biblioteca de proyectos, creación y gestión de backups
    │   ├── overviewView.js      # Resumen general de la obra, métricas y accesos rápidos
    │   ├── editorView.js        # Editor de escritura y panel contextual de escena
    │   ├── charactersView.js    # Directorio de personajes y fichas con bloque relacional
    │   ├── relationshipsView.js # Vista de relaciones (estructurada, red en canvas y linaje)
    │   └── notesView.js         # Cuaderno de notas creativas y etiquetas
    └── components/
        ├── commandPalette.js    # Paleta de comandos universal y buscador global (Ctrl + K)
        ├── modal.js             # Controlador accesible de ventanas modales y confirmaciones
        └── toast.js             # Notificaciones flotantes en pantalla
```

---

## 🧭 Próximas Versiones y Hoja de Ruta

La arquitectura modular de Writer OS está concebida para continuar expandiéndose progresivamente hacia las siguientes capas narrativas:

- **Mundo y Lugares**: Atlas de localizaciones, ciudades, edificios, regiones y mapas interactivos conectables con escenas y personajes.
- **Líneas Temporales y Cronología**: Gestión del tiempo del relato frente al tiempo de la historia, eras, calendarios ficticios y fechas de acontecimientos.
- **Control de Continuidad**: Motor de coherencia narrativa para rastrear qué sabe cada personaje en cada capítulo, secretos y estado de pistas.
- **Objetos y Artefactos Clave**: Reliquias, documentos, armas, cartas náuticas e inventario de elementos cruciales para la trama.
- **Sistemas Políticos y Culturas**: Leyes, tradiciones, religiones, lenguas, monedas y estructuras de poder profundas.
- **Conocimiento Conectado**: Grafo narrativo global navegable entre todos los componentes de la obra.
- **Asistencia Creativa Contextual**: Herramientas de apoyo al escritor respetuosas con su voz y centradas en la coherencia de su universo.
