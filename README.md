# ad-oo-0136-formulario

Aplicación de gestión de formularios con generación de PDFs avanzada.

## package.json

```json
{
  "name": "ad-oo-0136-formulario",
```
Nombre del proyecto. Identificador único usado por npm.

```json
  "private": true,
```
No se puede publicar a npm registry (`npm publish` falla a propósito).

```json
  "version": "0.1.0",
```
Versión semántica. Formato: `MAJOR.MINOR.PATCH`. Actualmente en desarrollo inicial.

```json
  "type": "module",
```
Usa módulos ESM (`import/export`). Requerido por Vite.

```json
  "scripts": {
    "dev": "vite",
```
`npm run dev` → inicia servidor local con hot-reload en http://localhost:5173.

```json
    "build": "tsc -b && vite build",
```
`npm run build` → compila TypeScript y genera bundle optimizado en carpeta `dist/`.

```json
    "preview": "vite preview",
```
`npm run preview` → sirve localmente el `dist/` compilado. Para testear producción.

```json
    "typecheck": "tsc --noEmit"
```
`npm run typecheck` → verifica tipos sin compilar. Rápido.

```json
  "dependencies": {
    "react": "^18.3.1",
```
Librería core. Componentes, hooks, estado.

```json
    "react-dom": "^18.3.1",
```
Renderiza React a HTML real en el navegador.

```json
    "react-hook-form": "^7.53.0",
```
Gestión eficiente de formularios. Valida, maneja estado.

```json
    "@hookform/resolvers": "^3.9.0",
```
Integra Zod con react-hook-form.

```json
    "zod": "^3.23.8",
```
Validación de esquemas (tipos, estructura de datos).

```json
    "jspdf": "^2.5.1",
```
Generador de PDFs. Crea documento base.

```json
    "html2canvas": "^1.4.1",
```
Captura HTML → imagen canvas. Fallback para PDFs complejos.

```json
    "pdf-lib": "^1.17.1",
```
Manipulación avanzada de PDFs. Fusiona, inserta imágenes, maneja encriptación.

```json
  "devDependencies": {
    "typescript": "^5.6.2",
```
Compilador de TypeScript. Solo se usa en desarrollo.

```json
    "vite": "^5.4.8",
```
Bundler y servidor de desarrollo. Compila, optimiza, hot-reload.

```json
    "@vitejs/plugin-react": "^4.3.2",
```
Plugin de Vite para React/JSX. Interpreta `.tsx`.

```json
    "tailwindcss": "^3.4.13",
```
Framework CSS utility-first. Genera clases (`px-4`, `rounded-sm`, etc.).

```json
    "postcss": "^8.4.47",
```
Procesador de CSS. Aplica plugins (Tailwind, autoprefixer).

```json
    "autoprefixer": "^10.4.20",
```
Añade prefijos de navegador al CSS (`-webkit-`, `-moz-`, etc.).

```json
    "@types/react": "^18.3.11",
```
Tipos TypeScript para React. Necesario para que TS entienda React.

```json
    "@types/react-dom": "^18.3.0",
```
Tipos TypeScript para react-dom.

```json
    "@types/node": "^25.6.0"
```
Tipos TypeScript para APIs de Node.js (usado por build tools).

**`devDependencies` son solo para desarrollo — no se incluyen en el bundle final de producción.**
