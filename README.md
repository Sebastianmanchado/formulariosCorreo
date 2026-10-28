# ad-oo-0136-formulario

Aplicación de gestión de formularios con generación de PDFs avanzada.

## Versión
v1.01.3
# Archivos Autogenerados
## package.json
"name": "ad-oo-0136-formulario" - Nombre del proyecto. Identificador único usado por npm.
"private": true - No se puede publicar a npm registry (`npm publish` falla a propósito).
`npm run build` → compila TypeScript y genera bundle optimizado en carpeta `dist/`.
`npm run preview` → sirve localmente el `dist/` compilado. Para testear producción.
`npm run typecheck` → verifica tipos sin compilar. Rápido.
El proyecto usa React, que se renderiza React a HTML real en el navegador.
Usamos "react-hook-form": "^7.53.0" para el manejo de formularios. Lo integro con Zod 
"jspdf": "^2.5.1" Genera PDFs, crea el documento base.
"html2canvas": "^1.4.1" se usa de fallback, si falla jsPdf, hace HTML -> Canvas -> PNG -> Usa png para generar pdf 
"pdf-lib": "^1.17.1", se usa para appendPdfPages, para agregar los anexos al final, para incrustar las imagenes en caso de que haya en los adjuntos y para dibujar la pagina separadora con el nombre de los anexos. 
Vite de boundler
"tailwindcss": "^3.4.13" - Framework CSS 


## package-lock.json
Autogenerado por npm, para fijar versiones exactas de las dependencias. 

## index.html
carga main.tsx como punto de entrada

## postcss.config.js
genera clases de Tailwind

## tailwind.config.ts 
Busca clases tailwind en
./index.html → el archivo raíz
./src/**/*.{ts,tsx} → todos los archivos .ts y .tsx dentro de src/, en cualquier subcarpeta

## tsconfig.json
Solo tipea los archivos dentro de src/. Los archivos de configuración raíz los maneja tsconfig.node.json.

## tsconfig.node.json
Configuración separada solo para vite.config.ts

# Carpeta src 
    app.tsx - Nucleo de la app 
    main.tsx - Punto de entrada 
    index.css - Estilos globales + Tailwind
## components 
    /forms 
    CaratulaForm 
    DetalleMensualForm
    AnexosActivosForm
    
    Son cada una de las secciones del formulario 

    /ui contiene componenetes reutilizables de UI 
    /hooks contiene logica reutilizable
    /schemas/proyecto.ts - Validación con Zod
    utils/
        formatters.ts -> Formateo de monedas
        pdfGenerator -> Captura las secciones del DOM con  hrml2canvas, genera pdf con jsPdf y fusiona adjuntos con pdf-lib 
    pdfPreview -> Componente que se rendirza fuera de pantalla durante la generacion del pdf, estrucutura el doc. En paginas, agrega algunas secciones al imprimible.
    
