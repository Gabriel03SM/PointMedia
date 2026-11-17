import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { extname, posix } from 'node:path';
import { inflateRawSync } from 'node:zlib';

export const MAX_RESUME_SIZE = 5 * 1024 * 1024;
export interface UploadedResume {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const invalid = () =>
  new BadRequestException(
    'Envie um currículo PDF ou DOCX válido, sem macros ou arquivos incorporados.',
  );
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const value of data) crc = (crcTable[(crc ^ value) & 255] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP clássico limitado, conforme APPNOTE 4.3.12/4.3.16. Não extrai caminhos do arquivo.
function validateDocx(buffer: Buffer) {
  let end = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65557); index--) {
    if (
      buffer.readUInt32LE(index) === 0x06054b50 &&
      index + 22 + buffer.readUInt16LE(index + 20) === buffer.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) throw invalid();
  const count = buffer.readUInt16LE(end + 10);
  const centralSize = buffer.readUInt32LE(end + 12);
  const centralOffset = buffer.readUInt32LE(end + 16);
  if (
    !count ||
    count > 200 ||
    buffer.readUInt16LE(end + 8) !== count ||
    centralOffset + centralSize !== end
  )
    throw invalid();
  let offset = centralOffset;
  let expanded = 0;
  const names = new Set<string>();
  const xml = new Map<string, string>();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw invalid();
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressed = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end || buffer.readUInt16LE(offset + 34) || flags & 1 || ![0, 8].includes(method))
      throw invalid();
    const nameBytes = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString('utf8');
    if (
      !name ||
      name.includes('\0') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      name.split('/').some((part) => part === '..' || part === '.') ||
      names.has(name)
    )
      throw invalid();
    if (
      ((buffer.readUInt32LE(offset + 38) >>> 16) & 0xf000) === 0xa000 ||
      /vbaProject|\/embeddings\/|\/activeX\/|\.(exe|dll|js|bat|cmd|ps1)$/i.test(name)
    )
      throw invalid();
    names.add(name);
    expanded += size;
    if (
      expanded > 20 * 1024 * 1024 ||
      size > compressed * 100 + 1024 ||
      local + 30 > centralOffset ||
      buffer.readUInt32LE(local) !== 0x04034b50
    )
      throw invalid();
    const localNameLength = buffer.readUInt16LE(local + 26);
    const start = local + 30 + localNameLength + buffer.readUInt16LE(local + 28);
    if (
      start + compressed > centralOffset ||
      buffer.readUInt16LE(local + 6) !== flags ||
      buffer.readUInt16LE(local + 8) !== method ||
      !buffer.subarray(local + 30, local + 30 + localNameLength).equals(nameBytes)
    )
      throw invalid();
    const raw = buffer.subarray(start, start + compressed);
    const data = method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: Math.max(1, size) });
    if (data.length !== size || crc32(data) !== crc) throw invalid();
    if (name.endsWith('.xml') || name.endsWith('.rels')) {
      const content = data.toString('utf8');
      if (/<!DOCTYPE|<!ENTITY/i.test(content)) throw invalid();
      // Nomes de tecnologias no texto do currículo não são macros. Checar tipos/relacionamentos.
      if (name === '[Content_Types].xml' || name.endsWith('.rels')) {
        const metadata = content.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_match, digits: string) => {
          const point =
            digits[0]?.toLowerCase() === 'x' ? parseInt(digits.slice(1), 16) : parseInt(digits, 10);
          return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '\ufffd';
        });
        if (/macroEnabled|vbaProject|oleObject|activeX|relationships\/package/i.test(metadata))
          throw invalid();
      }
      if (['[Content_Types].xml', '_rels/.rels', 'word/document.xml'].includes(name))
        xml.set(name, content);
    }
    offset = next;
  }
  if (
    offset !== centralOffset + centralSize ||
    !xml
      .get('[Content_Types].xml')
      ?.includes(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
      ) ||
    !xml.get('_rels/.rels')?.includes('officeDocument') ||
    !/<(?:\w+:)?document\b/.test(xml.get('word/document.xml') ?? '') ||
    !/wordprocessingml\/(2006\/)?main/.test(xml.get('word/document.xml') ?? '')
  )
    throw invalid();
}

export function validateResume(file: UploadedResume | undefined) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.size || file.size !== file.buffer.length)
    throw invalid();
  if (file.size > MAX_RESUME_SIZE)
    throw new PayloadTooLargeException('O currículo deve ter até 5 MiB.');
  const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
  const filename =
    !decoded.includes('\ufffd') &&
    Buffer.from(decoded, 'utf8').toString('latin1') === file.originalname
      ? decoded
      : file.originalname;
  const originalName = posix
    .basename(filename.replaceAll('\\', '/'))
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '_');
  if (!originalName || originalName.length > 180) throw invalid();
  const extension = extname(originalName).toLowerCase();
  if (extension === '.pdf' && file.mimetype === PDF) {
    if (
      !/^%PDF-1\.[0-7]|^%PDF-2\.0/.test(file.buffer.subarray(0, 8).toString('ascii')) ||
      !/%%EOF\s*$/.test(file.buffer.subarray(-1024).toString('ascii'))
    )
      throw invalid();
  } else if (extension === '.docx' && file.mimetype === DOCX) {
    try {
      validateDocx(file.buffer);
    } catch {
      throw invalid();
    }
  } else throw invalid();
  return { originalName, mimeType: file.mimetype, size: file.size };
}
