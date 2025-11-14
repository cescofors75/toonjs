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
