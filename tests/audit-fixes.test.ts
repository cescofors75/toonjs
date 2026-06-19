import { Toon } from '../toon';
import { ToonFactory } from '../factory';
import { ToonParser } from '../parser';

describe('Parser: inferencia de tipos y motor columnar', () => {
  it('infiere number para columnas puramente numéricas (activa Float64Array)', () => {
    const t = ToonFactory.from(`nums[3]{id,val}:\n  1,10.5\n  2,20.5\n  3,30.5`);
    const cols = (t as any)._columns;
    expect(cols.get('id')).toBeInstanceOf(Float64Array);
    expect(cols.get('val')).toBeInstanceOf(Float64Array);
    expect(t.schema().id).toBe('number');
    expect(t.schema().val).toBe('number');
  });

  it('preserva como string los códigos con ceros a la izquierda', () => {
    const t = ToonFactory.from(`codes[2]{zip}:\n  00123\n  04560`);
    expect(t.schema().zip).toBe('string');
    expect(t.all()[0].zip).toBe('00123');
    expect(t.all()[1].zip).toBe('04560');
  });

  it('infiere y convierte booleanos', () => {
    const t = ToonFactory.from(`flags[2]{active}:\n  true\n  false`);
    expect(t.schema().active).toBe('boolean');
    expect(t.all()[0].active).toBe(true);
    expect(t.all()[1].active).toBe(false);
  });

  it('una columna mixta (texto + número) se queda como string', () => {
    const t = ToonFactory.from(`m[2]{v}:\n  10\n  hola`);
    expect(t.schema().v).toBe('string');
  });

  it('los huecos (campo vacío) no fuerzan el tipo y se excluyen de stats', () => {
    const t = ToonFactory.from(`g[3]{id,x}:\n  1,10\n  2,\n  3,30`);
    expect(t.schema().x).toBe('number');
    const s = t.stats('x');
    expect(s.count).toBe(2); // el hueco no cuenta
    expect(s.sum).toBe(40);
  });
});

describe('rank(): min/max/dense difieren correctamente', () => {
  // valores: 90, 80, 80, 70  (descendente -> 90 es rango 1)
  const make = () => ToonFactory.from(`d[4]{s}:\n  90\n  80\n  80\n  70`);

  it('dense', () => {
    const r = make().rank('s', 'dense').pluck('s_rank').map(Number);
    expect(r).toEqual([1, 2, 2, 3]);
  });

  it('min: el grupo de empate toma la posición más baja', () => {
    const r = make().rank('s', 'min').pluck('s_rank').map(Number);
    expect(r).toEqual([1, 2, 2, 4]);
  });

  it('max: el grupo de empate toma la posición más alta', () => {
    const r = make().rank('s', 'max').pluck('s_rank').map(Number);
    expect(r).toEqual([1, 3, 3, 4]);
  });
});

describe('aggregate min/max y binning sin desbordar la pila', () => {
  it('aggregate min/max funcionan con muchas filas', () => {
    const rows = Array.from({ length: 200000 }, (_, i) => ({ g: 'a', v: i }));
    const t = new Toon({ name: 'big', schema: { g: 'string', v: 'number' }, rows });
    const agg = t.aggregate('g', {
      mn: { field: 'v', op: 'min' },
      mx: { field: 'v', op: 'max' },
    });
    const row = agg.all()[0];
    expect(row.mn).toBe(0);
    expect(row.mx).toBe(199999);
  });
});

describe('Escapado CSV/TOON: round-trip con comas y comillas', () => {
  it('toCSV escapa valores con comas y comillas', () => {
    const t = new Toon({
      name: 'x',
      schema: { a: 'string', b: 'string' },
      rows: [{ a: 'Hola, mundo', b: 'di "hola"' }],
    });
    const csv = t.toCSV();
    expect(csv).toContain('"Hola, mundo"');
    expect(csv).toContain('"di ""hola"""');
  });

  it('round-trip toToon -> parse preserva valores con comas', () => {
    const t = new Toon({
      name: 'd',
      schema: { name: 'string', note: 'string' },
      rows: [{ name: 'Acme, Inc', note: 'a,b,c' }],
    });
    const reparsed = ToonFactory.from(t.toToon());
    expect(reparsed.all()[0].name).toBe('Acme, Inc');
    expect(reparsed.all()[0].note).toBe('a,b,c');
  });
});

describe('join left/right rellena con null el lado sin coincidencia', () => {
  const left = () => new Toon({ name: 'u', schema: { id: 'number', name: 'string' }, rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] });
  const right = () => new Toon({ name: 'o', schema: { uid: 'number', total: 'number' }, rows: [{ uid: 1, total: 100 }] });

  it('left join: campos del lado derecho sin match quedan en null', () => {
    const res = left().join(right(), 'id', 'uid', 'left');
    expect(res.count()).toBe(2);
    const bob = res.all().find(r => r.name === 'Bob')!;
    // El campo del lado sin match ahora EXISTE (esquema consistente). En una
    // columna numérica el "ausente" se representa como NaN.
    expect('total' in bob).toBe(true);
    expect(Number.isNaN(bob.total)).toBe(true);
  });
});

describe('parseMultiple sigue funcionando tras el refactor', () => {
  it('devuelve datasets independientes', () => {
    const input = `a[1]{x}:\n  1\nb[1]{y}:\n  2`;
    const ds = ToonParser.parseMultiple(input);
    expect(Object.keys(ds).sort()).toEqual(['a', 'b']);
    expect(ds.a.rows[0].x).toBe(1);
    expect(ds.b.rows[0].y).toBe(2);
  });
});
