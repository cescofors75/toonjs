import { Toon } from './toon';
import { ToonFactory } from './factory';

describe('Nuevas Funcionalidades - Acceso a Datos', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[4]{id,name,value}:
      1,A,10
      2,B,20
      3,C,30
      4,D,40`;
    toon = ToonFactory.from(data);
  });

  test('first() devuelve primera fila', () => {
    const first = toon.first();
    expect(first?.id).toBe(1);
    expect(first?.name).toBe('A');
  });

  test('last() devuelve última fila', () => {
    const last = toon.last();
    expect(last?.id).toBe(4);
    expect(last?.name).toBe('D');
  });

  test('at() con índice positivo', () => {
    const item = toon.at(1);
    expect(item?.name).toBe('B');
  });

  test('at() con índice negativo', () => {
    const item = toon.at(-1);
    expect(item?.name).toBe('D');
  });

  test('slice() extrae porción', () => {
    const sliced = toon.slice(1, 3);
    expect(sliced.count()).toBe(2);
    expect(sliced.first()?.name).toBe('B');
  });

  test('take() obtiene primeros N', () => {
    const taken = toon.take(2);
    expect(taken.count()).toBe(2);
    expect(taken.last()?.name).toBe('B');
  });

  test('skip() salta primeros N', () => {
    const skipped = toon.skip(2);
    expect(skipped.count()).toBe(2);
    expect(skipped.first()?.name).toBe('C');
  });
});

describe('Nuevas Funcionalidades - Validaciones', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[3]{value}:
      10
      20
      30`;
    toon = ToonFactory.from(data);
  });

  test('some() retorna true si alguno cumple', () => {
    expect(toon.some(row => (row.value as number) > 25)).toBe(true);
  });

  test('some() retorna false si ninguno cumple', () => {
    expect(toon.some(row => (row.value as number) > 100)).toBe(false);
  });

  test('every() retorna true si todos cumplen', () => {
    expect(toon.every(row => (row.value as number) > 0)).toBe(true);
  });

  test('every() retorna false si alguno no cumple', () => {
    expect(toon.every(row => (row.value as number) > 20)).toBe(false);
  });

  test('isEmpty() retorna false con datos', () => {
    expect(toon.isEmpty()).toBe(false);
  });

  test('isEmpty() retorna true sin datos', () => {
    const empty = toon.filter(() => false);
    expect(empty.isEmpty()).toBe(true);
  });
});

describe('Nuevas Funcionalidades - Valores Únicos', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[5]{category,value}:
      A,10
      B,20
      A,15
      C,30
      A,25`;
    toon = ToonFactory.from(data);
  });

  test('distinct() retorna valores únicos', () => {
    const unique = toon.distinct('category');
    expect(unique).toEqual(['A', 'B', 'C']);
  });

  test('countBy() cuenta ocurrencias', () => {
    const counts = toon.countBy('category');
    expect(counts['A']).toBe(3);
    expect(counts['B']).toBe(1);
    expect(counts['C']).toBe(1);
  });
});

describe('Nuevas Funcionalidades - Proyección', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[2]{id,name,category,price}:
      1,Item1,Cat1,100
      2,Item2,Cat2,200`;
    toon = ToonFactory.from(data);
  });

  test('select() selecciona campos específicos', () => {
    const selected = toon.select('name', 'price');
    const schema = selected.schema();
    expect(Object.keys(schema)).toEqual(['name', 'price']);
  });

  test('exclude() excluye campos', () => {
    const excluded = toon.exclude('id', 'category');
    const schema = excluded.schema();
    expect(Object.keys(schema)).toEqual(['name', 'price']);
  });

  test('pluck() extrae valores de un campo', () => {
    const names = toon.pluck('name');
    expect(names).toEqual(['Item1', 'Item2']);
  });
});

describe('Nuevas Funcionalidades - Transformaciones', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[3]{id,value}:
      1,10
      2,20
      3,30`;
    toon = ToonFactory.from(data);
  });

  test('rename() renombra campo', () => {
    const renamed = toon.rename('value', 'amount');
    expect(renamed.first()?.amount).toBe(10);
    expect(renamed.first()?.value).toBeUndefined();
  });

  test('addField() agrega campo calculado', () => {
    const withField = toon.addField('double', row => (row.value as number) * 2);
    expect(withField.first()?.double).toBe(20);
  });

  test('reverse() invierte orden', () => {
    const reversed = toon.reverse();
    expect(reversed.first()?.id).toBe(3);
    expect(reversed.last()?.id).toBe(1);
  });

  test('unique() elimina duplicados', () => {
    const data = `items[4]{value}:
      10
      20
      10
      30`;
    const withDupes = ToonFactory.from(data);
    const unique = withDupes.unique();
    expect(unique.count()).toBe(3);
  });
});

describe('Nuevas Funcionalidades - Combinaciones', () => {
  test('concat() combina datasets', () => {
    const data1 = ToonFactory.from(`items[2]{id}:\n  1\n  2`);
    const data2 = ToonFactory.from(`items[2]{id}:\n  3\n  4`);
    const combined = data1.concat(data2);
    expect(combined.count()).toBe(4);
  });

  test('join() hace inner join', () => {
    const left = ToonFactory.from(`users[2]{id,name}:\n  1,Alice\n  2,Bob`);
    const right = ToonFactory.from(`orders[2]{user_id,amount}:\n  1,100\n  2,200`);
    const joined = left.join(right, 'id', 'user_id', 'inner');
    expect(joined.count()).toBe(2);
  });
});

describe('Nuevas Funcionalidades - Estadísticas', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[4]{value}:
      10
      20
      30
      40`;
    toon = ToonFactory.from(data);
  });

  test('stats() calcula estadísticas', () => {
    const stats = toon.stats('value');
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(40);
    expect(stats.avg).toBe(25);
    expect(stats.sum).toBe(100);
    expect(stats.count).toBe(4);
  });
});

describe('Nuevas Funcionalidades - Paginación', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[10]{id}:
      1
      2
      3
      4
      5
      6
      7
      8
      9
      10`;
    toon = ToonFactory.from(data);
  });

  test('paginate() retorna página correcta', () => {
    const page = toon.paginate(2, 3);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(3);
    expect(page.total).toBe(10);
    expect(page.totalPages).toBe(4);
    expect(page.data.count()).toBe(3);
    expect(page.data.first()?.id).toBe(4);
  });
});

describe('Nuevas Funcionalidades - Ordenamiento', () => {
  test('sortBy() ordena por múltiples campos', () => {
    const data = `items[4]{cat,val}:
      B,30
      A,20
      B,10
      A,40`;
    const toon = ToonFactory.from(data);
    const sorted = toon.sortBy(
      { field: 'cat', order: 'asc' },
      { field: 'val', order: 'desc' }
    );
    
    const rows = sorted.all();
    expect(rows[0].cat).toBe('A');
    expect(rows[0].val).toBe(40);
    expect(rows[1].val).toBe(20);
  });
});

describe('Nuevas Funcionalidades - Filtrado Avanzado', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `items[5]{name,value}:
      Apple,50
      Banana,30
      Cherry,70
      Date,20
      Elderberry,90`;
    toon = ToonFactory.from(data);
  });

  test('filterRange() filtra por rango', () => {
    const filtered = toon.filterRange('value', 30, 70);
    expect(filtered.count()).toBe(3);
  });

  test('search() busca en campos', () => {
    const results = toon.search('rr', 'name');
    expect(results.count()).toBe(2); // Cherry, Elderberry
  });

  test('findIndex() encuentra índice', () => {
    const idx = toon.findIndex(row => row.name === 'Cherry');
    expect(idx).toBe(2);
  });
});

describe('Nuevas Funcionalidades - Agregaciones', () => {
  test('aggregate() agrupa con operaciones', () => {
    const data = `sales[6]{cat,amt}:
      A,100
      B,200
      A,150
      B,300
      A,200
      B,100`;
    const toon = ToonFactory.from(data);
    const agg = toon.aggregate('cat', {
      total: { field: 'amt', op: 'sum' },
      avg: { field: 'amt', op: 'avg' },
      count: { field: 'amt', op: 'count' }
    });
    
    expect(agg.count()).toBe(2);
    const rowA = agg.find(r => r.cat === 'A');
    expect(rowA?.total).toBe(450);
    expect(rowA?.count).toBe(3);
  });
});

describe('Nuevas Funcionalidades - Utilities', () => {
  let toon: Toon;

  beforeEach(() => {
    const data = `test[2]{id}:\n  1\n  2`;
    toon = ToonFactory.from(data);
  });

  test('getName() retorna nombre', () => {
    expect(toon.getName()).toBe('test');
  });

  test('setName() cambia nombre', () => {
    const renamed = toon.setName('nuevo');
    expect(renamed.getName()).toBe('nuevo');
  });

  test('clone() crea copia', () => {
    const clone = toon.clone();
    expect(clone.count()).toBe(toon.count());
    expect(clone).not.toBe(toon);
  });

  test('toTable() genera tabla ASCII', () => {
    const table = toon.toTable();
    expect(table).toContain('|');
    expect(table).toContain('+');
  });
});
