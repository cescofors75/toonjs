/**
 * Fachada TypeScript del core columnar Rust→WASM.
 *
 * Toda la data vive en la memoria lineal de WASM; esta clase solo guarda un
 * handle (u32). Las operaciones encadenadas devuelven nuevos `ToonWasm` sin
 * mover los datos de vuelta a JS, que es lo que hace rentable a WASM aquí.
 *
 * Uso:
 *   await initToonWasm();
 *   const t = ToonWasm.from(`d[2]{x}:\n  1\n  2`);
 *   t.stats('x'); // { min, max, sum, avg, count }
 *   t.free();
 */

import { TOON_CORE_WASM_BASE64 } from './toon-core.wasm';

interface CoreExports {
  memory: WebAssembly.Memory;
  tj_alloc(len: number): number;
  tj_free(ptr: number, len: number): void;
  tj_free_f64(ptr: number, len: number): void;
  tj_parse(ptr: number, len: number): number;
  tj_release(handle: number): void;
  tj_count(handle: number): number;
  tj_ncols(handle: number): number;
  tj_col_type(handle: number, col: number): number;
  tj_stat(handle: number, col: number, which: number): number;
  tj_filter_range(handle: number, col: number, min: number, max: number): number;
  tj_multiply_scalar(handle: number, scalar: number): number;
  tj_normalize(handle: number): number;
  tj_to_toon(handle: number): bigint;
  tj_column_f64(handle: number, col: number): bigint;
  tj_field_name(handle: number, col: number): bigint;
}

let core: CoreExports | null = null;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  // Navegador
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Inicializa el core WASM. Debe llamarse (y await) antes de usar `ToonWasm`. */
export async function initToonWasm(): Promise<void> {
  if (core) return;
  const bytes = toBytes(TOON_CORE_WASM_BASE64) as unknown as BufferSource;
  const module = await WebAssembly.compile(bytes);
  const instance = await WebAssembly.instantiate(module, {});
  core = instance.exports as unknown as CoreExports;
}

function ex(): CoreExports {
  if (!core) {
    throw new Error('ToonWasm no inicializado: llama a "await initToonWasm()" primero.');
  }
  return core;
}

// La memoria puede crecer (y desreferenciar el ArrayBuffer): releer siempre.
function u8(): Uint8Array {
  return new Uint8Array(ex().memory.buffer);
}

function unpack(packed: bigint): { ptr: number; len: number } {
  return { ptr: Number(packed >> 32n), len: Number(packed & 0xffffffffn) };
}

function readString(packed: bigint): string {
  const { ptr, len } = unpack(packed);
  if (len === 0) return '';
  const bytes = u8().subarray(ptr, ptr + len);
  const s = decoder.decode(bytes);
  ex().tj_free(ptr, len);
  return s;
}

const STAT = { min: 0, max: 1, sum: 2, avg: 3, count: 4 } as const;

export interface ToonStats {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

export class ToonWasm {
  private handle: number;
  private released = false;
  private _fields: string[] | null = null;

  private constructor(handle: number) {
    this.handle = handle;
  }

  /** Parsea texto TOON dentro de WASM y devuelve un dataset columnar. */
  static from(toon: string): ToonWasm {
    const e = ex();
    const bytes = encoder.encode(toon);
    const ptr = e.tj_alloc(bytes.length);
    u8().set(bytes, ptr);
    const handle = e.tj_parse(ptr, bytes.length);
    e.tj_free(ptr, bytes.length);
    if (handle === 0) {
      throw new Error('No valid Toon dataset found in the provided string');
    }
    return new ToonWasm(handle);
  }

  private assertLive(): void {
    if (this.released) throw new Error('ToonWasm ya liberado (free).');
  }

  private colIndex(col: number | string): number {
    if (typeof col === 'number') return col;
    const idx = this.fields().indexOf(col);
    if (idx < 0) throw new Error(`Campo desconocido: ${col}`);
    return idx;
  }

  count(): number {
    this.assertLive();
    return ex().tj_count(this.handle);
  }

  ncols(): number {
    this.assertLive();
    return ex().tj_ncols(this.handle);
  }

  fields(): string[] {
    this.assertLive();
    if (this._fields) return this._fields;
    const e = ex();
    const n = e.tj_ncols(this.handle);
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(readString(e.tj_field_name(this.handle, i)));
    this._fields = out;
    return out;
  }

  /** Tipo de una columna: 'number' | 'string' | 'boolean'. */
  colType(col: number | string): 'number' | 'string' | 'boolean' | 'unknown' {
    this.assertLive();
    const code = ex().tj_col_type(this.handle, this.colIndex(col));
    return code === 0 ? 'number' : code === 1 ? 'string' : code === 2 ? 'boolean' : 'unknown';
  }

  stats(col: number | string): ToonStats {
    this.assertLive();
    const e = ex();
    const c = this.colIndex(col);
    return {
      min: e.tj_stat(this.handle, c, STAT.min),
      max: e.tj_stat(this.handle, c, STAT.max),
      avg: e.tj_stat(this.handle, c, STAT.avg),
      sum: e.tj_stat(this.handle, c, STAT.sum),
      count: e.tj_stat(this.handle, c, STAT.count),
    };
  }

  filterRange(col: number | string, min: number, max: number): ToonWasm {
    this.assertLive();
    const h = ex().tj_filter_range(this.handle, this.colIndex(col), min, max);
    return new ToonWasm(h);
  }

  multiplyScalar(scalar: number): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_multiply_scalar(this.handle, scalar));
  }

  normalize(): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_normalize(this.handle));
  }

  /** Copia una columna numérica a un Float64Array de JS. */
  columnF64(col: number | string): Float64Array {
    this.assertLive();
    const e = ex();
    const { ptr, len } = unpack(e.tj_column_f64(this.handle, this.colIndex(col)));
    if (len === 0) return new Float64Array(0);
    const view = new Float64Array(e.memory.buffer, ptr, len);
    const copy = view.slice();
    e.tj_free_f64(ptr, len);
    return copy;
  }

  toToon(): string {
    this.assertLive();
    return readString(ex().tj_to_toon(this.handle));
  }

  /** Libera la memoria del dataset en WASM. Obligatorio para evitar fugas. */
  free(): void {
    if (this.released) return;
    ex().tj_release(this.handle);
    this.released = true;
  }
}
