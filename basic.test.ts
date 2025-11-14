import { Toon } from './toon';
import { ToonFactory } from './factory';
import { ToonParser } from './parser';

describe('ToonParser', () => {
  it('debe parsear formato Toon básico', () => {
    const toonString = `
    maridajes[2]{plato,vino,score}:
      Croquetas,Albariño,0.92
      Pollo asado,Rioja,0.88
    `;

    const dataset = ToonParser.parse(toonString);
    
    expect(dataset.name).toBe('maridajes');
    expect(dataset.rows.length).toBe(2);
    expect(dataset.rows[0].plato).toBe('Croquetas');
    expect(dataset.rows[0].score).toBe(0.92);
  });
});

describe('ToonFactory', () => {
  it('debe crear Toon desde string', () => {
    const toonString = `
    vinos[1]{nombre,precio}:
      Albariño,12.50
    `;

    const toon = ToonFactory.from(toonString);
    expect(toon.count()).toBe(1);
  });

  it('debe crear Toon programáticamente', () => {
    const toon = ToonFactory.create(
      'test',
      { nombre: 'string', valor: 'number' },
      [{ nombre: 'test1', valor: 100 }]
    );
    
    expect(toon.count()).toBe(1);
    expect(toon.all()[0].nombre).toBe('test1');
  });
});

describe('Toon - Operaciones básicas', () => {
  let toon: Toon;

  beforeEach(() => {
    const toonString = `
    maridajes[4]{plato,vino,score}:
      Croquetas,Albariño,0.92
      Pollo asado,Rioja,0.88
      Gambas,Verdejo,0.95
      Pulpo,Godello,0.89
    `;
    toon = ToonFactory.from(toonString);
  });

  test('count() devuelve el número correcto de filas', () => {
    expect(toon.count()).toBe(4);
  });

  test('all() devuelve todas las filas', () => {
    const rows = toon.all();
    expect(rows.length).toBe(4);
    expect(rows[0].plato).toBe('Croquetas');
  });

  test('find() encuentra el primer elemento que cumple condición', () => {
    const result = toon.find(row => (row.score as number) > 0.90);
    expect(result).toBeDefined();
    expect(result?.plato).toBe('Croquetas');
  });

  test('findAll() encuentra todos los elementos que cumplen condición', () => {
    const results = toon.findAll(row => (row.score as number) > 0.88);
    expect(results.length).toBe(3);
  });

  test('map() transforma cada fila', () => {
    const platos = toon.map(row => row.plato);
    expect(platos).toEqual(['Croquetas', 'Pollo asado', 'Gambas', 'Pulpo']);
  });

  test('filter() filtra filas y devuelve nueva instancia', () => {
    const filtered = toon.filter(row => (row.score as number) > 0.90);
    expect(filtered.count()).toBe(2);
    expect(toon.count()).toBe(4); // Original no cambia
  });

  test('sort() ordena filas', () => {
    const sorted = toon.sort((a, b) => (b.score as number) - (a.score as number));
    const scores = sorted.map(row => row.score as number);
    expect(scores[0]).toBe(0.95);
    expect(scores[scores.length - 1]).toBe(0.88);
  });

  test('reduce() acumula valores', () => {
    const sum = toon.reduce((acc, row) => acc + (row.score as number), 0);
    expect(sum).toBeCloseTo(3.64, 2);
  });

  test('groupBy() agrupa por campo', () => {
    const grouped = toon.groupBy('vino');
    expect(Object.keys(grouped).length).toBe(4);
    expect(grouped['Albariño'].length).toBe(1);
  });
});

describe('Toon - Exportación', () => {
  let toon: Toon;

  beforeEach(() => {
    const toonString = `
    test[2]{nombre,valor}:
      A,1
      B,2
    `;
    toon = ToonFactory.from(toonString);
  });

  test('toToon() exporta a formato Toon', () => {
    const toonStr = toon.toToon();
    expect(toonStr).toContain('test[2]');
    expect(toonStr).toContain('nombre,valor');
  });

  test('toCSV() exporta a formato CSV', () => {
    const csv = toon.toCSV();
    expect(csv).toContain('nombre,valor');
    expect(csv).toContain('A,1');
  });

  test('toJSON() exporta a objeto JSON', () => {
    const json = toon.toJSON();
    expect(json.name).toBe('test');
    expect((json.rows as any[]).length).toBe(2);
  });

  test('schema() devuelve el esquema', () => {
    const schema = toon.schema();
    expect(schema.nombre).toBe('string');
    expect(schema.valor).toBe('string');
  });
});

describe('Toon - Operaciones encadenadas', () => {
  test('permite encadenar filter, sort y map', () => {
    const toonString = `
    items[4]{name,value}:
      A,10
      B,20
      C,5
      D,15
    `;
    const toon = ToonFactory.from(toonString);

    const result = toon
      .filter(row => (row.value as number) >= 10)
      .sort((a, b) => (b.value as number) - (a.value as number))
      .map(row => row.name);

    expect(result).toEqual(['B', 'D', 'A']);
  });
});
