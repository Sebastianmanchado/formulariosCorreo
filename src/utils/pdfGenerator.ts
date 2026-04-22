import type { ArchivoMeta } from '../schemas/proyecto';
import { slugify } from './formatters';

const DIM = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
} as const;

type Orientation = 'portrait' | 'landscape';

export type AttachmentItem = {
  meta: ArchivoMeta;
  blob: File | undefined;
};

export type AttachmentGroup = {
  label: string;
  items: AttachmentItem[];
};

export interface GenerateOptions {
  /** Nombre del proyecto para el archivo. Si está vacío usa "sin-nombre". */
  nombreProyecto?: string | null;
  /** Fecha a incluir en el nombre del archivo. Default: hoy en ISO. */
  fecha?: Date;
  /** Escala de render de html2canvas. */
  scale?: number;
  /** Adjuntos agrupados (Descripción / Objetivos). Se apenden al final. */
  attachments?: AttachmentGroup[];
}

/**
 * Captura cada `<section data-pdf-page>`, arma el PDF base con jsPDF y, si hay
 * adjuntos, los fusiona con `pdf-lib`:
 *   • imágenes PNG/JPG/WebP → cada una como página nueva centrada
 *   • PDFs → se copian todas sus páginas al final del documento
 *   • página separadora con la lista de nombres antes de los adjuntos
 *
 * Si un `AttachmentItem.blob` es undefined (el usuario recargó y perdió el
 * archivo), se ignora ese item (queda el nombre en el listado de la
 * separadora con marca "no disponible").
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

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      /* noop */
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

  const fileName = buildFileName(options);
  const groups = options.attachments ?? [];
  const hasAnyAttachment = groups.some((g) => g.items.length > 0);

  if (!hasAnyAttachment) {
    pdf.save(fileName);
    return;
  }

  // ─── Merge con pdf-lib ────────────────────────────────────────────────────
  const baseBytes = pdf.output('arraybuffer');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const finalDoc = await PDFDocument.load(baseBytes);
  const helv = await finalDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);

  await drawSeparatorPage(finalDoc, groups, helv, helvBold, rgb);

  for (const group of groups) {
    for (const item of group.items) {
      if (!item.blob) continue; // archivo perdido tras recarga
      const type = item.blob.type || '';
      try {
        if (type === 'application/pdf' || /\.pdf$/i.test(item.meta.name)) {
          await appendPdfPages(finalDoc, item.blob);
        } else if (type.startsWith('image/')) {
          await appendImagePage(finalDoc, item.blob, item.meta.name, helv, rgb);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('No se pudo incluir el adjunto:', item.meta.name, err);
      }
    }
  }

  const finalBytes = await finalDoc.save();
  // Copia a un Uint8Array plano para que TS acepte el BlobPart bajo lib.dom
  // más estricta (Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer>).
  const blob = new Blob([new Uint8Array(finalBytes).buffer], {
    type: 'application/pdf',
  });
  downloadBlob(blob, fileName);
}

// ─── Helpers pdf-lib ─────────────────────────────────────────────────────────

type PDFDocumentT = Awaited<
  ReturnType<typeof import('pdf-lib').PDFDocument.create>
>;
type PDFFontT = Awaited<ReturnType<PDFDocumentT['embedFont']>>;
type RgbFn = typeof import('pdf-lib').rgb;

const A4_PT = { w: 595.28, h: 841.89 };
const MARGIN_PT = 50;

async function drawSeparatorPage(
  doc: PDFDocumentT,
  groups: AttachmentGroup[],
  font: PDFFontT,
  fontBold: PDFFontT,
  rgb: RgbFn
) {
  const page = doc.addPage([A4_PT.w, A4_PT.h]);
  let y = A4_PT.h - MARGIN_PT;

  page.drawText('ANEXOS ADJUNTOS', {
    x: MARGIN_PT,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.102, 0.227, 0.361),
  });
  y -= 8;
  page.drawLine({
    start: { x: MARGIN_PT, y },
    end: { x: A4_PT.w - MARGIN_PT, y },
    thickness: 1.5,
    color: rgb(0.102, 0.227, 0.361),
  });
  y -= 24;

  for (const group of groups) {
    if (group.items.length === 0) continue;

    page.drawText(group.label, {
      x: MARGIN_PT,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.102, 0.227, 0.361),
    });
    y -= 16;

    for (const item of group.items) {
      const missing = !item.blob;
      const text = `• ${item.meta.name}${missing ? '  (archivo no disponible)' : ''}`;
      page.drawText(text, {
        x: MARGIN_PT + 8,
        y,
        size: 10,
        font,
        color: missing ? rgb(0.545, 0.102, 0.102) : rgb(0.11, 0.094, 0.078),
      });
      y -= 14;
      if (y < MARGIN_PT + 30) break; // fin de página: truncamos el listado
    }
    y -= 8;
  }

  page.drawText(
    'Los archivos siguientes son los adjuntos al formulario AD-OO-0136.',
    {
      x: MARGIN_PT,
      y: MARGIN_PT,
      size: 8,
      font,
      color: rgb(0.42, 0.38, 0.35),
    }
  );
}

async function appendPdfPages(doc: PDFDocumentT, blob: File): Promise<void> {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = await blob.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const pages = await doc.copyPages(src, src.getPageIndices());
  for (const p of pages) doc.addPage(p);
}

async function appendImagePage(
  doc: PDFDocumentT,
  blob: File,
  filename: string,
  font: PDFFontT,
  rgb: RgbFn
): Promise<void> {
  const type = blob.type || '';
  let imgBytes = await blob.arrayBuffer();
  let embed: Awaited<ReturnType<PDFDocumentT['embedPng']>>;

  if (type === 'image/png') {
    embed = await doc.embedPng(imgBytes);
  } else if (type === 'image/jpeg' || type === 'image/jpg') {
    embed = await doc.embedJpg(imgBytes);
  } else {
    // WebP u otros — convertimos a PNG via canvas.
    const pngBytes = await rasterizeToPng(blob);
    imgBytes = pngBytes;
    embed = await doc.embedPng(pngBytes);
  }

  const page = doc.addPage([A4_PT.w, A4_PT.h]);
  const maxW = A4_PT.w - MARGIN_PT * 2;
  const maxH = A4_PT.h - MARGIN_PT * 2 - 14; // reservar espacio para pie
  const { width: iw, height: ih } = embed.size();
  const s = Math.min(maxW / iw, maxH / ih, 1);
  const w = iw * s;
  const h = ih * s;
  const x = (A4_PT.w - w) / 2;
  const yBottom = MARGIN_PT + 14;
  const y = yBottom + (maxH - h) / 2;

  page.drawImage(embed, { x, y, width: w, height: h });
  page.drawText(filename, {
    x: MARGIN_PT,
    y: MARGIN_PT,
    size: 8,
    font,
    color: rgb(0.42, 0.38, 0.35),
  });
}

async function rasterizeToPng(file: File): Promise<ArrayBuffer> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear contexto 2D.');
    ctx.drawImage(img, 0, 0);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob fallido'))), 'image/png')
    );
    return await blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Utilidades genéricas ───────────────────────────────────────────────────

function orientationOf(node: HTMLElement): Orientation {
  return node.dataset.pdfOrientation === 'landscape' ? 'landscape' : 'portrait';
}

function buildFileName(options: GenerateOptions): string {
  const nombreSlug = slugify(options.nombreProyecto ?? '') || 'sin-nombre';
  const fecha = (options.fecha ?? new Date()).toISOString().slice(0, 10);
  return `AD-OO-0136_${nombreSlug}_${fecha}.pdf`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
