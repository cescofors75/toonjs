/**
 * Factory para crear instancias de Toon
 */

import { Toon } from './toon';
import { ToonParser } from './parser';
import { ToonSchema, ToonDataset } from './types';

export class ToonFactory {
  /**
   * Crea una instancia de Toon desde una cadena Toon
   */
  static from(toonString: string): Toon {
    const dataset = ToonParser.parse(toonString);
    return new Toon(dataset);
  }

  /**
   * Crea una instancia de Toon desde un dataset
   */
  static fromDataset(dataset: ToonDataset): Toon {
    return new Toon(dataset);
  }

  /**
   * Crea una instancia de Toon programáticamente
   */
  static create(
    name: string,
    schema: ToonSchema,
    rows: Record<string, unknown>[]
  ): Toon {
    return new Toon({ name, schema, rows });
  }

  /**
   * Parsea múltiples datasets de una cadena Toon
   */
  static parseMultiple(toonString: string): Record<string, ToonDataset> {
    return ToonParser.parseMultiple(toonString);
  }
}
