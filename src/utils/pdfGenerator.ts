import { slugify } from './formatters';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface GenerateOptions {
  /** Nombre del proyecto para el archivo. Si está vacío usa "sin-nombre". */
  nombreProyecto?: string | null;
  /** Fecha a incluir en el nombre del archivo. Default: hoy en ISO (YYYY-MM-DD). */
  fecha?: Date;
  /** Escala de render de html2canvas. Más alto = mejor calidad / mayor peso. */
  scale?: number;
}

/**
 * Toma el nodo raíz del PdfPreview (con secciones `[data-pdf-page]` A4) y
 * genera un PDF con una página por cada sección. Cada sección se captura
 * independientemente para no cortar contenido entre páginas.
 *
 * Nombre del archivo: `AD-OO-0136_{slug(nombreProyecto)}_{YYYY-MM-DD}.pdf`.
 * Si `nombreProyecto` está vacío usa `sin-nombre`.
 */
export async function generateProyectoPdf(
  root: HTMLElement,
  options: GenerateOptions = {}
): Promise<void> {
  const pages = Array.from(
    root.querySelectorAll<HTMLElement>('[data-pdf-page]')
  );
  if (pages.length === 0) {
    throw new Error('PdfPreview: no se encontraron páginas para exportar.');
  }

  // Lazy-load de las libs pesadas: solo se bajan cuando el usuario exporta.
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Esperar a que las fuentes estén listas antes de capturar — si no,
  // html2canvas puede usar fallback y el resultado queda inconsistente.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // si fonts.ready falla seguimos igual
    }
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const scale = options.scale ?? 2;

  for (let i = 0; i < pages.length; i++) {
    const node = pages[i];
    const canvas = await html2canvas(node, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  }

  pdf.save(buildFileName(options));
}

function buildFileName(options: GenerateOptions): string {
  const nombreSlug = slugify(options.nombreProyecto ?? '') || 'sin-nombre';
  const fecha = (options.fecha ?? new Date()).toISOString().slice(0, 10);
  return `AD-OO-0136_${nombreSlug}_${fecha}.pdf`;
}
