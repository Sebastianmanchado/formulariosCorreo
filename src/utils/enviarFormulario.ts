import { DESTINATARIOS_FORMULARIO } from '../data/constants';
import { downloadBlob } from './pdfGenerator';

export interface CorreoFormularioOptions {
  pdf: Blob;
  fileName: string;
  denominacion?: string | null;
}

/**
 * Arma un borrador .eml (X-Unsent) con el PDF adjunto, dirigido a las casillas
 * del formulario. Outlook lo abre listo para enviar desde la cuenta del usuario.
 */
export async function descargarCorreoConPdf(
  options: CorreoFormularioOptions
): Promise<void> {
  const denominacion = (options.denominacion ?? '').replace(/[\r\n]+/g, ' ').trim();
  const subject = denominacion
    ? `Formulario APEM AD-OO-0136 - ${denominacion}`
    : 'Formulario APEM AD-OO-0136';
  const body = [
    'Se adjunta el formulario AD-OO-0136 (Aprobación de Proyecto de Erogaciones Mayores).',
    '',
    `Proyecto: ${denominacion || 'sin denominación'}`,
    '',
  ].join('\r\n');

  const boundary = `----=_APEM_${crypto.randomUUID().replace(/-/g, '')}`;
  const safeFileName = options.fileName.replace(/["\r\n]/g, '') || 'formulario.pdf';
  const pdfBytes = new Uint8Array(await options.pdf.arrayBuffer());

  const eml = [
    `To: ${DESTINATARIOS_FORMULARIO.join(', ')}`,
    `Subject: ${encodeSubject(subject)}`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(uint8ToBase64(new TextEncoder().encode(body))),
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${safeFileName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeFileName}"`,
    '',
    wrap76(uint8ToBase64(pdfBytes)),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const emlName = safeFileName.replace(/\.pdf$/i, '') + '.eml';
  downloadBlob(new Blob([eml], { type: 'message/rfc822' }), emlName);
}

function encodeSubject(value: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^[\t\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${uint8ToBase64(new TextEncoder().encode(clean))}?=`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x2000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function wrap76(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join('\r\n');
}
