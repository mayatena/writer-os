# Writer OS ✒️

> **Espacio de trabajo creativo e integral para escritores.**
> Diseñado para escribir obras conectando capítulos, personajes, notas y elementos de historia en una interfaz literaria, limpia y profesional.

---

## 🌟 Características de la Primera Versión

- **Totalmente en español**: Toda la terminología, menús, botones, mensajes y diálogos diseñados en español con tono cuidado y profesional.
- **Biblioteca de Proyectos**:
  - Creación de proyectos independientes (Novela, Relato, Guion, etc.).
  - Portadas con métricas en tiempo real (palabras totales, capítulos, fecha de modificación).
  - Opciones de edición de metadatos, copia de seguridad y borrado seguro.
  - Precargado con el proyecto de muestra literario: *"El Susurro de las Sombras"*.
- **Resumen de la Obra (Overview)**:
  - Cuadro de mando literario con progreso de palabras frente al objetivo.
  - Botón de acceso directo **"Continuar escribiendo"** que abre el último capítulo editado.
  - Estadísticas clave y vistas previas de capítulos, personajes y notas.
- **Santuario de Escritura (Editor)**:
  - Lista lateral de capítulos reordenables (subir/bajar), con recuento de palabras independiente.
  - Editor rico y limpio con tipografía cuidada (selector Serif literaria vs Sans moderna).
  - Herramientas esenciales: negrita, cursiva, encabezados H2/H3, citas en bloque, listas y separador de escena (`* * *`).
  - Modo concentración (Zen) sin distracciones.
  - Autoguardado silencioso e instantáneo con indicador de estado en tiempo real.
  - Contador de palabras, caracteres y tiempo estimado de lectura.
- **Panel Contextual de Escritura (Inspector lateral)**:
  - Permite al escritor consultar información de la obra sin salir del editor.
  - Sinopsis y notas de escena del capítulo activo.
  - Personajes presentes en la escena: vincular/desvincular con un clic y consultar la ficha completa sin perder el hilo de escritura.
  - Consulta rápida de notas creativas del proyecto.
- **Directorio de Personajes**:
  - Fichas completas: Nombre, Alias, Rol narrativo (Protagonista, Antagonista, Secundario, Otro), color distintivo, descripción física/psicológica, secretos/trasfondo y etiquetas.
  - Filtro por roles y buscador en tiempo real.
  - Indicador de presencia ("Presente en X capítulos").
- **Cuaderno de Notas e Ideas**:
  - Organización por etiquetas dinámicas (#mundo, #magia, #trama, #misterio, #investigación).
  - Buscador en tiempo real por título o texto.
- **Búsqueda Global y Paleta de Comandos (`Ctrl + K`)**:
  - Acceso instantáneo con el teclado mediante `Ctrl + K`.
  - Navegación rápida y ejecución de comandos directos (crear capítulo, personaje, nota, saltar entre secciones, cambiar tema).
- **Diseño Editorial y Temas**:
  - **Modo Claro (Papel Crema)**: Inspirado en páginas editoriales cálidas.
  - **Modo Oscuro (Tinta Nocturna)**: Diseñado para sesiones de escritura nocturnas sin fatiga visual.
- **Persistencia Real y Portabilidad**:
  - Todos los datos se conservan automáticamente en el almacenamiento local (`localStorage`).
  - Exportación e importación de copias de seguridad en formato JSON.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Con el lanzador automático (Recomendado)
Haz doble clic en el archivo:
```bat
iniciar.bat
```
Esto iniciará un servidor local HTTP ligero en PowerShell (sin requerir Node.js ni Python) y abrirá Writer OS en tu navegador en `http://localhost:5173`.

### Opción 2: Desde PowerShell
Ejecuta en la terminal de PowerShell dentro de esta carpeta:
```powershell
powershell -ExecutionPolicy Bypass -File .\servidor.ps1
```

---

## 📂 Estructura del Código

```
writer-os/
├── index.html                   # Documento principal y shell de la aplicación
├── iniciar.bat                  # Lanzador rápido para Windows
├── servidor.ps1                 # Servidor HTTP ligero nativo de PowerShell
├── README.md                    # Documentación del proyecto
├── css/
│   ├── variables.css            # Tokens de diseño, temas claro y oscuro
│   ├── base.css                 # Tipografía, resets y scrollbar
│   ├── layout.css               # Cabecera, navegación y pestañas
│   ├── editor.css               # Espacio de escritura, herramientas e inspector
│   └── components.css           # Botones, formularios, modales, tarjetas y toasts
└── js/
    ├── app.js                   # Enrutador y controlador de la aplicación
    ├── models/
    │   ├── types.js             # Definiciones de entidades y funciones de utilidad
    │   ├── store.js             # Almacén central reactivo y persistencia local
    │   └── sampleData.js        # Datos del proyecto literario de muestra
    ├── views/
    │   ├── projectsView.js      # Vista de proyectos y biblioteca
    │   ├── overviewView.js      # Vista de resumen y métricas de la obra
    │   ├── editorView.js        # Editor de capítulos y panel contextual
    │   ├── charactersView.js    # Directorio y fichas de personajes
    │   └── notesView.js         # Cuaderno de notas creativas
    └── components/
        ├── commandPalette.js    # Paleta de comandos interactiva (Ctrl + K)
        ├── modal.js             # Controlador accesible de modales
        └── toast.js             # Notificaciones en pantalla
```

---

## 🧭 Preparación para Próximas Versiones

La arquitectura de Writer OS está preparada para crecer modularmente sin tener que rehacer la base:
- **Mundo y Lugares**: Entidades geográficas asociables a capítulos y escenas.
- **Líneas Temporales y Cronología**: Orden cronológico de acontecimientos frente al orden de los capítulos.
- **Relaciones y Genealogías**: Matriz de vínculos afectivos, familiares y de lealtad entre personajes.
- **Control de Continuidad**: Detección de pistas, secretos conocidos por cada personaje y objetos clave.
