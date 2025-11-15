/**
 * Tests para nuevos métodos DataFrame-like de ToonJS
 */

import { Toon } from './toon';

describe('Nivel 1: Métodos Esenciales', () => {
  describe('fillna()', () => {
    it('debe rellenar valores nulos con un valor específico', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number', b: 'string' },
        rows: [
          { a: 1, b: 'hello' },
          { a: null, b: 'world' },
          { a: 3, b: null },
        ],
      });

      const filled = data.fillna(0);
      const rows = filled.all();

      expect(rows[1].a).toBe(0);
      expect(rows[2].b).toBe(0);
    });

    it('debe rellenar solo campos especificados', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number', b: 'string' },
        rows: [{ a: null, b: null }],
      });

      const filled = data.fillna(0, ['a']);
      const row = filled.first();

      expect(row?.a).toBe(0);
      expect(row?.b).toBe(null);
    });
  });

  describe('dropna()', () => {
    it('debe eliminar filas con valores nulos (any)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number', b: 'number' },
        rows: [
          { a: 1, b: 2 },
          { a: null, b: 3 },
          { a: 4, b: null },
          { a: 5, b: 6 },
        ],
      });

      const cleaned = data.dropna();
      expect(cleaned.count()).toBe(2);
    });

    it('debe eliminar filas solo si todos los valores son nulos (all)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number', b: 'number' },
        rows: [
          { a: 1, b: 2 },
          { a: null, b: null },
          { a: 4, b: null },
        ],
      });

      const cleaned = data.dropna(undefined, 'all');
      expect(cleaned.count()).toBe(2);
    });
  });

  describe('describe()', () => {
    it('debe generar estadísticas descriptivas', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }],
      });

      const stats = data.describe(['a']);

      expect(stats.a.count).toBe(5);
      expect(stats.a.mean).toBe(3);
      expect(stats.a.min).toBe(1);
      expect(stats.a.max).toBe(5);
      expect(stats.a['50%']).toBe(3);
    });
  });

  describe('merge()', () => {
    it('debe hacer inner join correctamente', () => {
      const left = new Toon({
        name: 'left',
        schema: { id: 'number', name: 'string' },
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });

      const right = new Toon({
        name: 'right',
        schema: { id: 'number', age: 'number' },
        rows: [
          { id: 1, age: 30 },
          { id: 3, age: 25 },
        ],
      });

      const merged = left.merge(right, { on: 'id', how: 'inner' });
      expect(merged.count()).toBe(1);
      expect(merged.first()?.name).toBe('Alice');
      expect(merged.first()?.age).toBe(30);
    });

    it('debe hacer left join correctamente', () => {
      const left = new Toon({
        name: 'left',
        schema: { id: 'number', name: 'string' },
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });

      const right = new Toon({
        name: 'right',
        schema: { id: 'number', age: 'number' },
        rows: [{ id: 1, age: 30 }],
      });

      const merged = left.merge(right, { on: 'id', how: 'left' });
      expect(merged.count()).toBe(2);
    });

    it('debe hacer cross join correctamente', () => {
      const left = new Toon({
        name: 'left',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }],
      });

      const right = new Toon({
        name: 'right',
        schema: { b: 'number' },
        rows: [{ b: 3 }, { b: 4 }],
      });

      const merged = left.merge(right, { how: 'cross' });
      expect(merged.count()).toBe(4);
    });
  });

  describe('pivot()', () => {
    it('debe crear tabla pivote correctamente', () => {
      const data = new Toon({
        name: 'sales',
        schema: { region: 'string', product: 'string', sales: 'number' },
        rows: [
          { region: 'North', product: 'A', sales: 100 },
          { region: 'North', product: 'B', sales: 150 },
          { region: 'South', product: 'A', sales: 200 },
          { region: 'South', product: 'B', sales: 250 },
        ],
      });

      const pivoted = data.pivot('region', 'product', 'sales', 'sum');
      expect(pivoted.count()).toBe(2);

      const northRow = pivoted.findAll(r => r.region === 'North')[0];
      expect(northRow.A).toBe(100);
      expect(northRow.B).toBe(150);
    });
  });
});

describe('Nivel 2: Métodos Muy Útiles', () => {
  describe('replace()', () => {
    it('debe reemplazar valores simples', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 1 }],
      });

      const replaced = data.replace(1, 99);
      const values = replaced.pluck('a');

      expect(values.filter(v => v === 99).length).toBe(2);
    });

    it('debe reemplazar con mapeo de valores', () => {
      const data = new Toon({
        name: 'test',
        schema: { status: 'string' },
        rows: [{ status: 'A' }, { status: 'B' }, { status: 'A' }],
      });

      const replaced = data.replace({ A: 'Active', B: 'Inactive' });
      const values = replaced.pluck('status');

      expect(values).toContain('Active');
      expect(values).toContain('Inactive');
    });
  });

  describe('sample()', () => {
    it('debe obtener muestra de N elementos', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: Array.from({ length: 100 }, (_, i) => ({ a: i })),
      });

      const sampled = data.sample(10);
      expect(sampled.count()).toBe(10);
    });

    it('debe obtener muestra por fracción', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: Array.from({ length: 100 }, (_, i) => ({ a: i })),
      });

      const sampled = data.sample(undefined, 0.1);
      expect(sampled.count()).toBe(10);
    });
  });

  describe('duplicated()', () => {
    it('debe marcar duplicados (keep first)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }],
      });

      const dups = data.duplicated(['a']);
      expect(dups).toEqual([false, false, true, false]);
    });

    it('debe marcar duplicados (keep last)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 1 }],
      });

      const dups = data.duplicated(['a'], 'last');
      expect(dups).toEqual([true, false, false]);
    });

    it('debe marcar todos los duplicados (keep false)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 1 }],
      });

      const dups = data.duplicated(['a'], false);
      expect(dups).toEqual([true, false, true]);
    });
  });

  describe('shift()', () => {
    it('debe desplazar valores hacia abajo (períodos positivos)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 3 }],
      });

      const shifted = data.shift(1, ['a']);
      const values = shifted.pluck('a');

      expect(values).toEqual([null, 1, 2]);
    });

    it('debe desplazar valores hacia arriba (períodos negativos)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: 2 }, { a: 3 }],
      });

      const shifted = data.shift(-1, ['a']);
      const values = shifted.pluck('a');

      expect(values).toEqual([2, 3, null]);
    });
  });

  describe('str operations', () => {
    describe('upper()', () => {
      it('debe convertir a mayúsculas', () => {
        const data = new Toon({
          name: 'test',
          schema: { text: 'string' },
          rows: [{ text: 'hello' }, { text: 'world' }],
        });

        const upper = data.str.upper(['text']);
        expect(upper.pluck('text')).toEqual(['HELLO', 'WORLD']);
      });
    });

    describe('lower()', () => {
      it('debe convertir a minúsculas', () => {
        const data = new Toon({
          name: 'test',
          schema: { text: 'string' },
          rows: [{ text: 'HELLO' }, { text: 'WORLD' }],
        });

        const lower = data.str.lower(['text']);
        expect(lower.pluck('text')).toEqual(['hello', 'world']);
      });
    });

    describe('trim()', () => {
      it('debe eliminar espacios en blanco', () => {
        const data = new Toon({
          name: 'test',
          schema: { text: 'string' },
          rows: [{ text: '  hello  ' }, { text: '  world  ' }],
        });

        const trimmed = data.str.trim(['text']);
        expect(trimmed.pluck('text')).toEqual(['hello', 'world']);
      });
    });

    describe('contains()', () => {
      it('debe verificar si contiene substring', () => {
        const data = new Toon({
          name: 'test',
          schema: { text: 'string' },
          rows: [{ text: 'hello world' }, { text: 'goodbye' }],
        });

        const contains = data.str.contains('text', 'world');
        expect(contains).toEqual([true, false]);
      });
    });

    describe('split()', () => {
      it('debe dividir strings', () => {
        const data = new Toon({
          name: 'test',
          schema: { text: 'string' },
          rows: [{ text: 'a,b,c' }],
        });

        const split = data.str.split('text', ',', ['col1', 'col2', 'col3']);
        const row = split.first();

        expect(row?.col1).toBe('a');
        expect(row?.col2).toBe('b');
        expect(row?.col3).toBe('c');
      });
    });
  });
});

describe('Nivel 3: Nice to Have', () => {
  describe('melt()', () => {
    it('debe convertir de wide a long format', () => {
      const data = new Toon({
        name: 'test',
        schema: { id: 'number', a: 'number', b: 'number' },
        rows: [
          { id: 1, a: 10, b: 20 },
          { id: 2, a: 30, b: 40 },
        ],
      });

      const melted = data.melt(['id'], ['a', 'b']);
      expect(melted.count()).toBe(4);

      const firstRow = melted.first();
      expect(firstRow?.id).toBe(1);
      expect(firstRow?.variable).toBe('a');
      expect(firstRow?.value).toBe(10);
    });
  });

  describe('crosstab()', () => {
    it('debe crear tabla de tabulación cruzada', () => {
      const data = new Toon({
        name: 'test',
        schema: { gender: 'string', preference: 'string' },
        rows: [
          { gender: 'M', preference: 'A' },
          { gender: 'M', preference: 'A' },
          { gender: 'M', preference: 'B' },
          { gender: 'F', preference: 'A' },
          { gender: 'F', preference: 'B' },
          { gender: 'F', preference: 'B' },
        ],
      });

      const crosstab = data.crosstab('gender', 'preference');
      expect(crosstab.count()).toBe(2);

      const maleRow = crosstab.findAll(r => r.gender === 'M')[0];
      expect(maleRow.A).toBe(2);
      expect(maleRow.B).toBe(1);

      const femaleRow = crosstab.findAll(r => r.gender === 'F')[0];
      expect(femaleRow.A).toBe(1);
      expect(femaleRow.B).toBe(2);
    });
  });

  describe('interpolate()', () => {
    it('debe interpolar valores faltantes (lineal)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: null }, { a: null }, { a: 4 }],
      });

      const interpolated = data.interpolate(['a'], 'linear');
      const values = interpolated.pluck('a');

      expect(values[0]).toBe(1);
      expect(values[1]).toBeCloseTo(2, 5);
      expect(values[2]).toBeCloseTo(3, 5);
      expect(values[3]).toBe(4);
    });

    it('debe interpolar valores faltantes (nearest)', () => {
      const data = new Toon({
        name: 'test',
        schema: { a: 'number' },
        rows: [{ a: 1 }, { a: null }, { a: null }, { a: 10 }],
      });

      const interpolated = data.interpolate(['a'], 'nearest');
      const values = interpolated.pluck('a');

      expect(values[0]).toBe(1);
      expect(values[1]).toBe(1); // Más cerca de 1
      expect(values[2]).toBe(10); // Más cerca de 10
      expect(values[3]).toBe(10);
    });
  });
});
