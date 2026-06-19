/**
 * Parser para el formato TOON
 */

import { ToonDataset, ToonSchema } from './types';

/** Representación intermedia: filas aún sin tipar (valores string crudos). */
interface RawDataset {
  name: string;
  fields: string[];
  rawRows: string[][];
}

export class ToonParser {
  // Entero sin ceros a la izquierda, decimal opcional y notación científica.
  // Rechaza "007" o "00123" (códigos postales, IDs) para no corromperlos a número.
  private static readonly NUMBER_RE = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

  /**
   * Parsea una cadena en formato Toon y devuelve un ToonDataset
   */
  static parse(toonString: string): ToonDataset {
    const datasets = this.parseRaw(toonString);
    const keys = Object.keys(datasets);

    if (keys.length === 1) {
      return this.materialize(datasets[keys[0]]);
    }

    if (keys.length === 0) {
      throw new Error('No valid Toon dataset found in the provided string');
    }

    throw new Error('Multiple datasets found. Use parseMultiple() instead.');
  }

  /**
   * Parsea múltiples datasets de una cadena Toon
   */
  static parseMultiple(toonString: string): Record<string, ToonDataset> {
    const raw = this.parseRaw(toonString);
    const out: Record<string, ToonDataset> = {};
    for (const key of Object.keys(raw)) {
      out[key] = this.materialize(raw[key]);
    }
    return out;
  }

  /**
   * Lectura única de la cadena: extrae cabeceras y filas crudas (sin tipar).
   * Compartido por parse() y parseMultiple() para evitar duplicación.
   */
  private static parseRaw(toonString: string): Record<string, RawDataset> {
    const lines = toonString.trim().split('\n');
    const datasets: Record<string, RawDataset> = {};

    let current: RawDataset | null = null;

    const flush = () => {
      if (current && current.rawRows.length > 0) {
        datasets[current.name] = current;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//')) continue;

      const isHeader =
        !line.startsWith(' ') && !line.startsWith('\t') && trimmed.includes(':');

      if (isHeader) {
        const match = trimmed.match(/(\w+)\[\d+\]\{(.*?)\}:/);
        if (match) {
          flush();
          current = {
            name: match[1],
            fields: match[2].split(',').map(f => f.trim()),
            rawRows: [],
          };
        }
      } else if ((line.startsWith(' ') || line.startsWith('\t')) && current) {
        current.rawRows.push(trimmed.split(',').map(v => v.trim()));
      }
    }

    flush();
    return datasets;
  }

  /**
   * Infiere el esquema por columna y construye filas con tipos reales.
   * Esto permite que el motor columnar Float64Array se active para columnas
   * numéricas (en lugar de tratar todo como string).
   */
  private static materialize(raw: RawDataset): ToonDataset {
    const { name, fields, rawRows } = raw;

    // 1. Inferir tipo de cada campo a partir de todos sus valores.
    const schema: ToonSchema = {};
    for (let c = 0; c < fields.length; c++) {
      const columnValues: string[] = new Array(rawRows.length);
      for (let r = 0; r < rawRows.length; r++) {
        columnValues[r] = rawRows[r][c];
      }
      schema[fields[c]] = this.inferType(columnValues);
    }

    // 2. Construir las filas convirtiendo cada valor a su tipo inferido.
    const rows: Record<string, unknown>[] = new Array(rawRows.length);
    for (let r = 0; r < rawRows.length; r++) {
      const rawRow = rawRows[r];
      const row: Record<string, unknown> = {};
      for (let c = 0; c < fields.length; c++) {
        const field = fields[c];
        row[field] = this.parseValue(rawRow[c], schema[field]);
      }
      rows[r] = row;
    }

    return { name, schema, rows };
  }

  /**
   * Determina el tipo de una columna a partir de todos sus valores.
   * Solo marca 'number'/'boolean' si TODOS los valores presentes encajan,
   * preservando como string cualquier columna ambigua (p.ej. códigos postales).
   */
  private static inferType(values: string[]): string {
    let sawValue = false;
    let allNumbers = true;
    let allBooleans = true;

    for (const value of values) {
      // Los huecos (vacío / null) no condicionan el tipo de la columna.
      if (value === undefined || value === '' || value === 'null') continue;
      sawValue = true;

      if (allNumbers && !this.NUMBER_RE.test(value)) allNumbers = false;

      if (allBooleans) {
        const lower = value.toLowerCase();
        if (lower !== 'true' && lower !== 'false') allBooleans = false;
      }

      if (!allNumbers && !allBooleans) break;
    }

    if (!sawValue) return 'string';
    if (allNumbers) return 'number';
    if (allBooleans) return 'boolean';
    return 'string';
  }

  /**
   * Convierte un valor string a su tipo correspondiente
   */
  private static parseValue(value: string | undefined, type: string): unknown {
    if (value === undefined || value === 'null' || value === '') return null;
    if (type === 'number') return Number(value);
    if (type === 'boolean') return value.toLowerCase() === 'true';
    return value;
  }
}
