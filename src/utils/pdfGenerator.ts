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
 *   • imágenes PNG/JPG/WebP/HEIC/AVIF → rasterizadas a PNG y embebidas, una
 *     por página, centradas. Si `embedJpg`/`embedPng` directo falla
 *     (JPEG progresivo/CMYK, PNG interlazado), caemos a canvas → PNG.
 *   • PDFs → se copian todas sus páginas al final. PDFs encriptados con
 *     owner-password se aceptan vía `ignoreEncryption: true`.
 *   • página separadora con la lista de nombres antes de los adjuntos.
 *     Sanitizamos los nombres a Win-Ansi para no fallar con caracteres
 *     unicode (em-dash, smart quotes, emojis, etc.).
 *
 * Robustez:
 *   • Cada adjunto individual está envuelto en try/catch — un archivo
 *     problemático no rompe el resto.
 *   • El separator page también está envuelto — un nombre raro no rompe
 *     la entrega del PDF base.
 *   • Si el merge entero con pdf-lib falla (caso muy excepcional), el
 *     PDF base se descarga igual y se notifica al usuario.
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
  // Si el merge falla globalmente (ej: pdf-lib explota), guardamos el PDF
  // base y avisamos al usuario que los adjuntos no se incluyeron.
  let mergedOk = false;
  const skipped: string[] = [];

  try {
    const baseBytes = pdf.output('arraybuffer');
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const finalDoc = await PDFDocument.load(baseBytes);
    const helv = await finalDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);

    // Separator page — wrapped: si falla por algún nombre raro no contemplado,
    // omitimos el separator pero seguimos con los adjuntos.
    try {
      await drawSeparatorPage(finalDoc, groups, helv, helvBold, rgb);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('No se pudo dibujar la página de separador de anexos:', err);
    }

    for (const group of groups) {
      for (const item of group.items) {
        if (!item.blob) continue; // archivo perdido tras recarga
        try {
          await appendAttachment(finalDoc, item.blob, item.meta.name, helv, rgb);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('No se pudo incluir el adjunto:', item.meta.name, err);
          skipped.push(item.meta.name);
        }
      }
    }

    const finalBytes = await finalDoc.save();
    const blob = new Blob([new Uint8Array(finalBytes).buffer], {
      type: 'application/pdf',
    });
    downloadBlob(blob, fileName);
    mergedOk = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('El merge con pdf-lib falló por completo:', err);
  }

  // Fallback: si el merge falló entero, entregamos el PDF base sin adjuntos.
  if (!mergedOk) {
    pdf.save(fileName);
    if (typeof window !== 'undefined') {
      window.alert(
        'Se generó el PDF del formulario, pero los archivos adjuntos no pudieron ' +
          'incluirse. Probá quitando los adjuntos y descargándolos por separado.'
      );
    }
    return;
  }

  if (skipped.length > 0 && typeof window !== 'undefined') {
    window.alert(
      `El PDF se generó, pero los siguientes adjuntos no pudieron incluirse:\n\n` +
        skipped.map((n) => `• ${n}`).join('\n') +
        `\n\nProbá descargarlos en formato PDF estándar o como JPG/PNG.`
    );
  }
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

    page.drawText(toAnsi(group.label), {
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
      page.drawText(toAnsi(text), {
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

/**
 * Anexa un blob al documento final detectando si es PDF o imagen tanto por
 * MIME como por extensión. PDFs encriptados con owner-password (sin user
 * password) se aceptan via `ignoreEncryption: true`. Imágenes que fallen el
 * embed directo caen al fallback canvas → PNG.
 */
async function appendAttachment(
  doc: PDFDocumentT,
  blob: File,
  filename: string,
  font: PDFFontT,
  rgb: RgbFn
): Promise<void> {
  const type = (blob.type || '').toLowerCase();
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(filename);
  if (isPdf) {
    await appendPdfPages(doc, blob);
    return;
  }
  const looksLikeImage =
    type.startsWith('image/') ||
    /\.(png|jpe?g|webp|heic|heif|avif|gif|bmp|tiff?)$/i.test(filename);
  if (looksLikeImage) {
    await appendImagePage(doc, blob, filename, font, rgb);
    return;
  }
  throw new Error(`Tipo de archivo no soportado: "${type || filename}".`);
}

async function appendPdfPages(doc: PDFDocumentT, blob: File): Promise<void> {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = await blob.arrayBuffer();
  // ignoreEncryption:true permite mergear PDFs con owner-password (banco/AFIP/
  // gobierno) que de otro modo tirarían `EncryptedPDFError`. PDFs con
  // user-password real siguen fallando — esos no se pueden leer sin la pw.
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
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
  const type = (blob.type || '').toLowerCase();
  const isJpegByName = /\.jpe?g$/i.test(filename);
  const isPngByName = /\.png$/i.test(filename);
  const imgBytes = await blob.arrayBuffer();
  let embed: Awaited<ReturnType<PDFDocumentT['embedPng']>> | null = null;

  // Intento 1: embed directo según el tipo declarado.
  try {
    if (type === 'image/png' || (!type && isPngByName)) {
      embed = await doc.embedPng(imgBytes);
    } else if (
      type === 'image/jpeg' ||
      type === 'image/jpg' ||
      (!type && isJpegByName)
    ) {
      embed = await doc.embedJpg(imgBytes);
    }
  } catch {
    // pdf-lib no soporta JPEG progresivo, CMYK, PNG interlazado, etc. —
    // caemos al fallback de rasterizar via canvas.
    embed = null;
  }

  // Intento 2 (fallback general): rasterizar via canvas a PNG. Esto cubre
  // WebP, HEIC, AVIF, JPEG progresivo, PNG interlazado, etc. Cualquier cosa
  // que el browser pueda dibujar.
  if (!embed) {
    const pngBytes = await rasterizeToPng(blob);
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
  page.drawText(toAnsi(filename), {
    x: MARGIN_PT,
    y: MARGIN_PT,
    size: 8,
    font,
    color: rgb(0.42, 0.38, 0.35),
  });
}

/**
 * Sanitiza un string para que se pueda imprimir con Helvetica (Win-Ansi /
 * CP1252). Reemplaza los caracteres unicode más comunes por equivalentes
 * ASCII para no tirar `WinAnsi cannot encode` errors al hacer drawText.
 *   • Smart quotes → '
 *   • em-dash / en-dash → -
 *   • elipsis … → ...
 *   • bullet • / arrow → mantenidos (existen en Win-Ansi)
 *   • Caracteres fuera del rango → ?
 */
function toAnsi(s: string): string {
  if (!s) return s;
  const replacements: Record<string, string> = {
    '\u2018': "'", // ‘
    '\u2019': "'", // ’
    '\u201A': "'",
    '\u201B': "'",
    '\u201C': '"', // “
    '\u201D': '"', // ”
    '\u201E': '"',
    '\u2013': '-', // –
    '\u2014': '-', // —
    '\u2212': '-', // −
    '\u2026': '...', // …
    '\u00A0': ' ', // nbsp → espacio normal
    '\u200B': '', // zero-width space
    '\u200C': '',
    '\u200D': '',
    '\uFEFF': '',
  };
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (replacements[ch] !== undefined) {
      out += replacements[ch];
    } else if (code <= 0xff) {
      // Win-Ansi cubre U+0000..U+00FF (con algunos huecos). Lo dejamos pasar;
      // si pdf-lib igual lo rechaza, lo agarra el catch del separator.
      out += ch;
    } else {
      // Fuera de Win-Ansi: lo reemplazamos por '?' para no romper el render.
      out += '?';
    }
  }
  return out;
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
