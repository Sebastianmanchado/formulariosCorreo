import { slugify } from './formatters';

const DIM = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
} as const;

type Orientation = 'portrait' | 'landscape';

export interface GenerateOptions {
  /** Nombre del proyecto para el archivo. Si está vacío usa "sin-nombre". */
  nombreProyecto?: string | null;
  /** Fecha a incluir en el nombre del archivo. Default: hoy en ISO. */
  fecha?: Date;
  /** Escala de render de html2canvas. Más alto = mejor calidad / mayor peso. */
  scale?: number;
}

/**
 * Captura cada `<section data-pdf-page>` y arma un PDF con una página por sección.
 * La orientación (portrait/landscape) se lee de `data-pdf-orientation` en el nodo.
 * Si falta, asume `portrait`.
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

  // Lazy-load de libs pesadas.
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const scale = options.scale ?? 2;
  const firstOrientation = orientationOf(pages[0]);

  const pdf = new jsPDF({
    orientation: firstOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pages.length; i++) {
    const node = pages[i];
    const orientation = orientationOf(node);
    const { w, h } = DIM[orientation];

    const canvas = await html2canvas(node, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage('a4', orientation);
    pdf.addImage(imgData, 'PNG', 0, 0, w, h, undefined, 'FAST');
  }

  pdf.save(buildFileName(options));
}

function orientationOf(node: HTMLElement): Orientation {
  return node.dataset.pdfOrientation === 'landscape' ? 'landscape' : 'portrait';
}

function buildFileName(options: GenerateOptions): string {
  const nombreSlug = slugify(options.nombreProyecto ?? '') || 'sin-nombre';
  const fecha = (options.fecha ?? new Date()).toISOString().slice(0, 10);
  return `AD-OO-0136_${nombreSlug}_${fecha}.pdf`;
}
