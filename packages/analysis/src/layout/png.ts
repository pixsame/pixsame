import { ANALYSIS_VERSION } from '../version';
import { decodeLayout, encodeLayout } from './codec';
import type { Layout } from './types';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Every layout chunk's keyword starts with this; the current one ends with the version. */
const KEYWORD_PREFIX = 'pixsame-layout';
export const LAYOUT_KEYWORD = `${KEYWORD_PREFIX}-v${ANALYSIS_VERSION}`;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

type Chunk = { type: string; data: Uint8Array; start: number; end: number };

/** The chunks of a PNG, or `undefined` when the bytes are not one. */
const chunksOf = (png: Uint8Array): Chunk[] | undefined => {
  if (png.length < 8 || SIGNATURE.some((byte, i) => png[i] !== byte)) return;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Chunk[] = [];
  let at = 8;
  while (at + 12 <= png.length) {
    const length = view.getUint32(at);
    const end = at + 12 + length;
    if (end > png.length) return;
    chunks.push({
      type: String.fromCharCode(...png.subarray(at + 4, at + 8)),
      data: png.subarray(at + 8, at + 8 + length),
      start: at,
      end,
    });
    at = end;
  }
  return chunks;
};

const layoutKeyword = (data: Uint8Array): string => {
  const end = data.indexOf(0);
  return String.fromCharCode(...data.subarray(0, end < 0 ? 0 : end));
};

const isLayoutChunk = (chunk: Chunk) =>
  chunk.type === 'iTXt' && layoutKeyword(chunk.data).startsWith(KEYWORD_PREFIX);

/** An `iTXt` chunk (UTF-8 text, compressed) holding already deflated `payload`. */
const layoutChunk = (payload: Uint8Array): Uint8Array => {
  const keyword = Buffer.from(LAYOUT_KEYWORD, 'latin1');
  // keyword, 0, compression flag 1, method 0 (deflate), no language tag, no translated keyword
  const head = Buffer.concat([keyword, Buffer.from([0, 1, 0, 0, 0])]);
  const body = Buffer.concat([Buffer.from('iTXt'), head, payload]);
  const out = Buffer.alloc(12 + head.length + payload.length);
  out.writeUInt32BE(head.length + payload.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), out.length - 4);
  return out;
};

/**
 * The PNG with the layout stored in a chunk before the image data, named
 * with the analysis version. An earlier layout chunk, of any version, is
 * replaced. Bytes that are not a PNG come back unchanged.
 */
export const writeLayout = (png: Uint8Array, layout: Layout): Uint8Array => {
  const chunks = chunksOf(png);
  const firstData = chunks?.find((chunk) => chunk.type === 'IDAT');
  if (!chunks || !firstData) return png;
  const kept: Uint8Array[] = [png.subarray(0, 8)];
  const add = layoutChunk(encodeLayout(layout));
  for (const chunk of chunks) {
    if (chunk === firstData) kept.push(add);
    if (!isLayoutChunk(chunk)) kept.push(png.subarray(chunk.start, chunk.end));
  }
  return Buffer.concat(kept);
};

/**
 * The layout stored by `writeLayout` of this version. `undefined` for a PNG
 * without one, with one of another analysis version or that does not decode.
 */
export const readLayout = (png: Uint8Array): Layout | undefined => {
  const chunk = chunksOf(png)?.find(
    (c) => c.type === 'iTXt' && layoutKeyword(c.data) === LAYOUT_KEYWORD,
  );
  if (!chunk) return;
  // keyword, 0, flag, method, language tag, 0, translated keyword, 0, then the text
  const flags = LAYOUT_KEYWORD.length + 1;
  if (chunk.data[flags] !== 1 || chunk.data[flags + 1] !== 0) return;
  return decodeLayout(chunk.data.subarray(flags + 4));
};

/** The analysis version of the layout in the PNG, whichever it is; `undefined` without one. For telling "stale" from "never had one". */
export const layoutVersionOf = (png: Uint8Array): number | undefined => {
  const chunk = chunksOf(png)?.find(isLayoutChunk);
  if (!chunk) return;
  const match = /-v(\d+)$/.exec(layoutKeyword(chunk.data));
  return match ? Number(match[1]) : undefined;
};
