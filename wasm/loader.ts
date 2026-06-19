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
import type {
  ToonLike,
  ToonSchema,
  ToonStatsResult,
  ToonPredicateFn,
} from '../types';
import { Toon } from '../toon';
import { ToonFactory } from '../factory';

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
  tj_sort_by(handle: number, col: number, desc: number): number;
  tj_correlation(handle: number, c1: number, c2: number): number;
  tj_correlation_matrix(handle: number): bigint;
  tj_cumsum(handle: number, col: number): number;
  tj_diff(handle: number, col: number, periods: number): number;
  tj_group_agg(handle: number, groupCol: number, valueCol: number, op: number): number;
  tj_standardize(handle: number): number;
  tj_rolling(handle: number, col: number, window: number, op: number): number;
  tj_pct_change(handle: number, col: number, periods: number): number;
  tj_rank(handle: number, col: number, method: number): number;
  tj_percentile(handle: number, col: number): number;
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

function readF64(packed: bigint): Float64Array {
  const { ptr, len } = unpack(packed);
  if (len === 0) return new Float64Array(0);
  const view = new Float64Array(ex().memory.buffer, ptr, len);
  const copy = view.slice();
  ex().tj_free_f64(ptr, len);
  return copy;
}

const STAT = { min: 0, max: 1, sum: 2, avg: 3, count: 4 } as const;

/** Operaciones de agregación soportadas por groupAggregate. */
export type AggOp = 'sum' | 'avg' | 'min' | 'max' | 'count';
const AGG_OP: Record<AggOp, number> = { sum: 0, avg: 1, min: 2, max: 3, count: 4 };

export type ToonStats = ToonStatsResult;

export class ToonWasm implements ToonLike {
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

  stats(col: number | string): ToonStatsResult {
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

  /**
   * Normaliza (min-max) las columnas numéricas. Si se pasan `fields` que no
   * cubren todas las columnas, se delega al motor JS (el core normaliza todas).
   */
  normalize(fields?: string[]): ToonLike {
    this.assertLive();
    if (fields && !this.coversAllNumeric(fields)) return this.toJS().normalize(fields);
    return new ToonWasm(ex().tj_normalize(this.handle));
  }

  /** Z-score de las columnas numéricas. */
  standardize(fields?: string[]): ToonLike {
    this.assertLive();
    if (fields && !this.coversAllNumeric(fields)) return this.toJS().standardize(fields);
    return new ToonWasm(ex().tj_standardize(this.handle));
  }

  /** Multiplica por un escalar las columnas numéricas. */
  multiplyScalar(scalar: number): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_multiply_scalar(this.handle, scalar));
  }

  /** Copia una columna numérica a un Float64Array de JS. */
  columnF64(col: number | string): Float64Array {
    this.assertLive();
    return readF64(ex().tj_column_f64(this.handle, this.colIndex(col)));
  }

  /**
   * Ordena por uno o más campos. Con un único campo se ejecuta en WASM; con
   * varios se delega al motor JS (orden multi-clave).
   */
  sortBy(...fields: Array<{ field: string; order?: 'asc' | 'desc' }>): ToonLike {
    this.assertLive();
    if (fields.length !== 1) return this.toJS().sortBy(...fields);
    const { field, order = 'asc' } = fields[0];
    return new ToonWasm(ex().tj_sort_by(this.handle, this.colIndex(field), order === 'desc' ? 1 : 0));
  }

  /** Correlación de Pearson entre dos columnas. */
  correlation(c1: number | string, c2: number | string): number {
    this.assertLive();
    return ex().tj_correlation(this.handle, this.colIndex(c1), this.colIndex(c2));
  }

  /** Matriz de correlación. Sin `fields`, todas las columnas (en WASM). */
  correlationMatrix(fields?: string[]): Record<string, Record<string, number>> {
    this.assertLive();
    if (fields) return this.toJS().correlationMatrix(fields);
    const all = this.fields();
    const n = all.length;
    const flat = readF64(ex().tj_correlation_matrix(this.handle));
    const out: Record<string, Record<string, number>> = {};
    for (let i = 0; i < n; i++) {
      out[all[i]] = {};
      for (let j = 0; j < n; j++) out[all[i]][all[j]] = flat[i * n + j];
    }
    return out;
  }

  /** Suma acumulada: añade la columna `${field}_cumsum`. */
  cumsum(col: number | string): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_cumsum(this.handle, this.colIndex(col)));
  }

  /** Diferencia con `periods` atrás: añade `${field}_diff_${periods}`. */
  diff(col: number | string, periods = 1): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_diff(this.handle, this.colIndex(col), periods));
  }

  /** Cambio porcentual: añade `${field}_pct_change_${periods}`. */
  pctChange(col: number | string, periods = 1): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_pct_change(this.handle, this.colIndex(col), periods));
  }

  /** Media/agg deslizante: añade `${field}_rolling_${op}`. */
  rolling(col: number | string, window: number, op: 'sum' | 'avg' | 'min' | 'max' = 'avg'): ToonWasm {
    this.assertLive();
    const code = { sum: 0, avg: 1, min: 2, max: 3 }[op];
    return new ToonWasm(ex().tj_rolling(this.handle, this.colIndex(col), window, code));
  }

  /** Ranking descendente: añade `${field}_rank`. */
  rank(col: number | string, method: 'dense' | 'min' | 'max' = 'dense'): ToonWasm {
    this.assertLive();
    const code = { dense: 0, min: 1, max: 2 }[method];
    return new ToonWasm(ex().tj_rank(this.handle, this.colIndex(col), code));
  }

  /** Percentil de cada valor: añade `${field}_percentile`. */
  percentile(col: number | string): ToonWasm {
    this.assertLive();
    return new ToonWasm(ex().tj_percentile(this.handle, this.colIndex(col)));
  }

  /** Agrupa por `groupCol` y agrega `valueCol`. Columnas resultado: [grupo, value]. */
  groupAggregate(groupCol: number | string, valueCol: number | string, op: AggOp): ToonWasm {
    this.assertLive();
    return new ToonWasm(
      ex().tj_group_agg(this.handle, this.colIndex(groupCol), this.colIndex(valueCol), AGG_OP[op])
    );
  }

  toToon(): string {
    this.assertLive();
    return readString(ex().tj_to_toon(this.handle));
  }

  // ----- Esquema / metadatos -----

  /** Esquema { campo: tipo } reconstruido desde el core. */
  schema(): ToonSchema {
    this.assertLive();
    const out: ToonSchema = {};
    const fs = this.fields();
    for (let i = 0; i < fs.length; i++) {
      const t = this.colType(i);
      out[fs[i]] = t === 'unknown' ? 'string' : t;
    }
    return out;
  }

  isEmpty(): boolean {
    return this.count() === 0;
  }

  /** ¿`fields` cubre exactamente todas las columnas numéricas? */
  private coversAllNumeric(fields: string[]): boolean {
    const set = new Set(fields);
    const all = this.fields();
    for (let i = 0; i < all.length; i++) {
      if (this.colType(i) === 'number' && !set.has(all[i])) return false;
    }
    return true;
  }

  // ----- Puente al motor JS (operaciones que no viven en WASM) -----

  /**
   * Materializa el dataset como un `Toon` (motor JS). El round-trip vía TOON es
   * NaN-safe: el core serializa los huecos como vacío y JS los reinfiere.
   */
  toJS(): Toon {
    this.assertLive();
    return ToonFactory.from(this.toToon());
  }

  all(): Record<string, unknown>[] {
    return this.toJS().all();
  }

  toJSON(): Record<string, unknown> {
    return this.toJS().toJSON();
  }

  toCSV(): string {
    return this.toJS().toCSV();
  }

  toTable(): string {
    return this.toJS().toTable();
  }

  first(): Record<string, unknown> | undefined {
    return this.toJS().first();
  }

  last(): Record<string, unknown> | undefined {
    return this.toJS().last();
  }

  at(index: number): Record<string, unknown> | undefined {
    return this.toJS().at(index);
  }

  pluck(field: string): unknown[] {
    return this.toJS().pluck(field);
  }

  distinct(field: string): unknown[] {
    return this.toJS().distinct(field);
  }

  countBy(field: string): Record<string, number> {
    return this.toJS().countBy(field);
  }

  /** Proyección de campos (delegada a JS). */
  select(...fields: string[]): ToonLike {
    return this.toJS().select(...fields);
  }

  /** Filtro con predicado JS (no ejecutable dentro de WASM). */
  filter(predicate: ToonPredicateFn): ToonLike {
    return this.toJS().filter(predicate);
  }

  /** Libera la memoria del dataset en WASM. Obligatorio para evitar fugas. */
  free(): void {
    if (this.released) return;
    ex().tj_release(this.handle);
    this.released = true;
  }
}
