import { initToonWasm, ToonWasm } from '../wasm/loader';
import { ToonFactory } from '../factory';
import { ToonLike } from '../types';

beforeAll(async () => {
  await initToonWasm();
});

describe('Core WASM: parseo e inferencia de tipos', () => {
  it('cuenta filas y columnas', () => {
    const t = ToonWasm.from(`d[3]{id,val}:\n  1,10.5\n  2,20.5\n  3,30.5`);
    expect(t.count()).toBe(3);
    expect(t.ncols()).toBe(2);
    expect(t.fields()).toEqual(['id', 'val']);
    t.free();
  });

  it('infiere number / string / boolean igual que el motor JS', () => {
    const t = ToonWasm.from(`d[2]{n,zip,flag}:\n  10.5,00123,true\n  20.5,04560,false`);
    expect(t.colType('n')).toBe('number');
    expect(t.colType('zip')).toBe('string'); // ceros a la izquierda preservados
    expect(t.colType('flag')).toBe('boolean');
    t.free();
  });

  it('preserva los ceros a la izquierda en la serialización', () => {
    const t = ToonWasm.from(`c[2]{zip}:\n  00123\n  04560`);
    expect(t.toToon()).toContain('00123');
    t.free();
  });
});

describe('Core WASM: paridad estadística con el motor JS', () => {
  const TOON = `s[6]{v}:\n  10\n  20\n  30\n  40\n  50\n  60`;

  it('stats coincide con Toon.stats', () => {
    const w = ToonWasm.from(TOON);
    const js = ToonFactory.from(TOON).stats('v');
    const ws = w.stats('v');
    expect(ws.min).toBe(js.min);
    expect(ws.max).toBe(js.max);
    expect(ws.sum).toBe(js.sum);
    expect(ws.avg).toBeCloseTo(js.avg);
    expect(ws.count).toBe(js.count);
    w.free();
  });

  it('los huecos numéricos (NaN) se excluyen de stats', () => {
    const t = ToonWasm.from(`g[3]{id,x}:\n  1,10\n  2,\n  3,30`);
    const s = t.stats('x');
    expect(s.count).toBe(2);
    expect(s.sum).toBe(40);
    t.free();
  });
});

describe('Core WASM: operaciones encadenadas (data permanece en WASM)', () => {
  it('filterRange -> multiplyScalar -> stats sin volver a JS', () => {
    const base = ToonWasm.from(`d[5]{v}:\n  1\n  2\n  3\n  4\n  5`);
    const filtered = base.filterRange('v', 2, 4); // 2,3,4
    const scaled = filtered.multiplyScalar(10); // 20,30,40
    const s = scaled.stats('v');
    expect(filtered.count()).toBe(3);
    expect(s.sum).toBe(90);
    expect(s.min).toBe(20);
    expect(s.max).toBe(40);
    base.free();
    filtered.free();
    scaled.free();
  });

  it('normalize lleva a [0,1]', () => {
    const t = ToonWasm.from(`d[4]{v}:\n  0\n  5\n  10\n  20`);
    const n = t.normalize() as ToonWasm;
    const col = n.columnF64('v');
    expect(col[0]).toBeCloseTo(0);
    expect(col[3]).toBeCloseTo(1);
    expect(Math.min(...Array.from(col))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...Array.from(col))).toBeLessThanOrEqual(1);
    t.free();
    n.free();
  });

  it('columnF64 devuelve los valores numéricos', () => {
    const t = ToonWasm.from(`d[3]{v}:\n  1.5\n  2.5\n  3.5`);
    expect(Array.from(t.columnF64('v'))).toEqual([1.5, 2.5, 3.5]);
    t.free();
  });
});

describe('Core WASM: operaciones pesadas (paridad con JS)', () => {
  it('sortBy asc/desc', () => {
    const t = ToonWasm.from(`d[4]{v}:\n  3\n  1\n  4\n  2`);
    const asc = t.sortBy({ field: 'v', order: 'asc' }) as ToonWasm;
    const desc = t.sortBy({ field: 'v', order: 'desc' }) as ToonWasm;
    expect(Array.from(asc.columnF64('v'))).toEqual([1, 2, 3, 4]);
    expect(Array.from(desc.columnF64('v'))).toEqual([4, 3, 2, 1]);
    t.free();
  });

  it('correlation coincide con Toon.correlation', () => {
    const TOON = `d[4]{x,y}:\n  1,2\n  2,4\n  3,6\n  4,8`;
    const w = ToonWasm.from(TOON).correlation('x', 'y');
    const js = ToonFactory.from(TOON).correlation('x', 'y');
    expect(w).toBeCloseTo(js);
    expect(w).toBeCloseTo(1); // perfectamente lineal
  });

  it('correlationMatrix indexada por campo', () => {
    const t = ToonWasm.from(`d[3]{a,b}:\n  1,1\n  2,2\n  3,3`);
    const m = t.correlationMatrix();
    expect(m.a.a).toBeCloseTo(1);
    expect(m.a.b).toBeCloseTo(1);
    t.free();
  });

  it('cumsum acumula', () => {
    const t = ToonWasm.from(`d[4]{v}:\n  1\n  2\n  3\n  4`);
    const c = t.cumsum('v');
    expect(Array.from(c.columnF64('v_cumsum'))).toEqual([1, 3, 6, 10]);
    t.free();
    c.free();
  });

  it('diff calcula diferencias', () => {
    const t = ToonWasm.from(`d[4]{v}:\n  10\n  12\n  15\n  20`);
    const d = t.diff('v', 1);
    const out = Array.from(d.columnF64('v_diff_1'));
    expect(out[0]).toBeNaN();
    expect(out.slice(1)).toEqual([2, 3, 5]);
    t.free();
    d.free();
  });

  it('groupAggregate suma por grupo', () => {
    const t = ToonWasm.from(`d[4]{cat,val}:\n  a,10\n  b,5\n  a,20\n  b,15`);
    const g = t.groupAggregate('cat', 'val', 'sum');
    expect(g.count()).toBe(2);
    expect(g.fields()).toEqual(['cat', 'value']);
    expect(Array.from(g.columnF64('value'))).toEqual([30, 20]);
    t.free();
    g.free();
  });
});

describe('Drop-in: el mismo pipeline en ambos motores da igual resultado', () => {
  const TOON = `ventas[6]{producto,region,monto}:
    A,norte,100
    B,sur,250
    A,sur,150
    C,norte,300
    B,norte,80
    A,sur,200`;

  // Pipeline escrito UNA vez contra la interfaz común ToonLike.
  const pipeline = (t: ToonLike) =>
    t
      .filterRange('monto', 100, 300)
      .sortBy({ field: 'monto', order: 'desc' })
      .rank('monto', 'dense')
      .all();

  it('Toon (JS) y ToonWasm producen el mismo all()', () => {
    const js = pipeline(ToonFactory.from(TOON));
    const w = pipeline(ToonWasm.from(TOON));
    expect(w).toEqual(js);
  });

  it('stats coincide entre motores tras normalize', () => {
    const js = ToonFactory.from(TOON).normalize(['monto']).stats('monto');
    const w = ToonWasm.from(TOON).normalize(['monto']).stats('monto');
    expect(w.min).toBeCloseTo(js.min);
    expect(w.max).toBeCloseTo(js.max);
    expect(w.avg).toBeCloseTo(js.avg);
  });

  it('rolling/diff/percentile coinciden entre motores', () => {
    const seq = `s[5]{v}:\n  10\n  20\n  15\n  30\n  25`;
    const jsR = ToonFactory.from(seq).rolling('v', 3, 'avg').pluck('v_rolling_avg').map(Number);
    const wT = ToonWasm.from(seq);
    const wR = (wT.rolling('v', 3, 'avg') as ToonWasm).pluck('v_rolling_avg').map(Number);
    jsR.forEach((x, i) => expect(wR[i]).toBeCloseTo(x));

    const jsP = ToonFactory.from(seq).percentile('v').pluck('v_percentile').map(Number);
    const wP = (wT.percentile('v') as ToonWasm).pluck('v_percentile').map(Number);
    jsP.forEach((x, i) => expect(wP[i]).toBeCloseTo(x));
    wT.free();
  });
});

describe('Core WASM: round-trip TOON con comas entrecomilladas', () => {
  it('toToon -> from preserva valores con comas', () => {
    const src = ToonWasm.from(`x[1]{name,note}:\n  "Acme, Inc","a,b"`);
    const round = ToonWasm.from(src.toToon());
    expect(round.count()).toBe(1);
    expect(round.colType('name')).toBe('string');
    src.free();
    round.free();
  });
});
