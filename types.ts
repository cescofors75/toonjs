/**
 * Tipos para la librería TOON
 */

export interface ToonSchema {
  [key: string]: string;
}

export interface ToonDataset {
  name: string;
  schema: ToonSchema;
  rows: Record<string, unknown>[];
}

export type ToonColumnMap = Map<string, Float64Array | unknown[]>;

export type ToonPredicateFn<T = Record<string, unknown>> = (
  row: T,
  index: number
) => boolean;

export type ToonMapFn<T = Record<string, unknown>, R = unknown> = (
  row: T,
  index: number
) => R;

export type ToonCompareFn<T = Record<string, unknown>> = (
  a: T,
  b: T
) => number;

export type ToonReduceFn<T = Record<string, unknown>, A = unknown> = (
  accumulator: A,
  row: T,
  index: number
) => A;

export interface ToonStatsResult {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

/**
 * Interfaz común a los dos motores (`Toon` en JS y `ToonWasm` en Rust→WASM).
 * Permite intercambiar el motor sin cambiar el código de usuario: los métodos
 * encadenables devuelven `ToonLike`, así un pipeline funciona igual en ambos.
 */
export interface ToonLike {
  count(): number;
  isEmpty(): boolean;
  all(): Record<string, unknown>[];
  first(): Record<string, unknown> | undefined;
  last(): Record<string, unknown> | undefined;
  at(index: number): Record<string, unknown> | undefined;
  pluck(field: string): unknown[];
  distinct(field: string): unknown[];
  countBy(field: string): Record<string, number>;
  stats(field: string): ToonStatsResult;
  schema(): ToonSchema;

  filter(predicate: ToonPredicateFn): ToonLike;
  sortBy(...fields: Array<{ field: string; order?: 'asc' | 'desc' }>): ToonLike;
  select(...fields: string[]): ToonLike;
  filterRange(field: string, min: number, max: number): ToonLike;
  normalize(fields?: string[]): ToonLike;
  standardize(fields?: string[]): ToonLike;
  rank(field: string, method?: 'dense' | 'min' | 'max'): ToonLike;
  percentile(field: string): ToonLike;
  cumsum(field: string): ToonLike;
  diff(field: string, periods?: number): ToonLike;
  pctChange(field: string, periods?: number): ToonLike;
  rolling(field: string, window: number, op?: 'sum' | 'avg' | 'min' | 'max'): ToonLike;
  correlation(field1: string, field2: string): number;
  correlationMatrix(fields?: string[]): Record<string, Record<string, number>>;

  toToon(): string;
  toCSV(): string;
  toJSON(): Record<string, unknown>;
  toTable(): string;
}
