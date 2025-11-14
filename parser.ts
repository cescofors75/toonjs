/**
 * Parser para el formato TOON
 */

import { ToonDataset, ToonSchema } from './types';

export class ToonParser {
  /**
   * Parsea una cadena en formato Toon y devuelve un ToonDataset
   */
  static parse(toonString: string): ToonDataset {
    const lines = toonString.trim().split('\n');
    const datasets: Record<string, ToonDataset> = {};

    let currentDataset: string | null = null;
    let currentSchema: ToonSchema = {};
    let currentRows: Record<string, unknown>[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//')) continue;

      if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.includes(':')) {
        // Guardar dataset anterior
        if (currentDataset && currentRows.length > 0) {
          datasets[currentDataset] = {
            name: currentDataset,
            schema: currentSchema,
            rows: currentRows,
          };
        }

        const match = trimmed.match(/(\w+)\[\d+\]\{(.*?)\}:/);
        if (match) {
          currentDataset = match[1];
          const fields = match[2].split(',').map(f => f.trim());
          currentSchema = fields.reduce(
            (acc, field) => {
              acc[field] = 'string';
              return acc;
            },
            {} as ToonSchema
          );
          currentRows = [];
        }
      } else if ((line.startsWith(' ') || line.startsWith('\t')) && currentDataset) {
        const values = trimmed.split(',').map(v => v.trim());
        const fieldNames = Object.keys(currentSchema);

        const row: Record<string, unknown> = {};
        fieldNames.forEach((field, index) => {
          const value = values[index];
          row[field] = this.parseValue(value, currentSchema[field]);
        });

        currentRows.push(row);
      }
    }

    if (currentDataset && currentRows.length > 0) {
      datasets[currentDataset] = {
        name: currentDataset,
        schema: currentSchema,
        rows: currentRows,
      };
    }

    const datasetKeys = Object.keys(datasets);
    if (datasetKeys.length === 1) {
      return datasets[datasetKeys[0]];
    }

    if (datasetKeys.length === 0) {
      throw new Error('No valid Toon dataset found in the provided string');
    }

    throw new Error('Multiple datasets found. Use parseMultiple() instead.');
  }

  /**
   * Parsea múltiples datasets de una cadena Toon
   */
  static parseMultiple(toonString: string): Record<string, ToonDataset> {
    const lines = toonString.trim().split('\n');
    const datasets: Record<string, ToonDataset> = {};

    let currentDataset: string | null = null;
    let currentSchema: ToonSchema = {};
    let currentRows: Record<string, unknown>[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//')) continue;

      if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.includes(':')) {
        if (currentDataset && currentRows.length > 0) {
          datasets[currentDataset] = {
            name: currentDataset,
            schema: currentSchema,
            rows: currentRows,
          };
        }

        const match = trimmed.match(/(\w+)\[\d+\]\{(.*?)\}:/);
        if (match) {
          currentDataset = match[1];
          const fields = match[2].split(',').map(f => f.trim());
          currentSchema = fields.reduce(
            (acc, field) => {
              acc[field] = 'string';
              return acc;
            },
            {} as ToonSchema
          );
          currentRows = [];
        }
      } else if ((line.startsWith(' ') || line.startsWith('\t')) && currentDataset) {
        const values = trimmed.split(',').map(v => v.trim());
        const fieldNames = Object.keys(currentSchema);

        const row: Record<string, unknown> = {};
        fieldNames.forEach((field, index) => {
          const value = values[index];
          row[field] = this.parseValue(value, currentSchema[field]);
        });

        currentRows.push(row);
      }
    }

    if (currentDataset && currentRows.length > 0) {
      datasets[currentDataset] = {
        name: currentDataset,
        schema: currentSchema,
        rows: currentRows,
      };
    }

    return datasets;
  }

  /**
   * Convierte valores string a su tipo correspondiente
   */
  private static parseValue(value: string, type: string): unknown {
    if (value === 'null' || value === '') return null;
    if (type === 'number' || !isNaN(Number(value))) return Number(value);
    if (type === 'boolean') return value.toLowerCase() === 'true';
    return value;
  }
}
