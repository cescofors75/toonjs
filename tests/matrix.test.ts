import { Toon } from '../toon';
import { ToonFactory } from '../factory';

describe('Operaciones Matriciales - Conversión', () => {
  test('toMatrix() convierte a matriz 2D', () => {
    const data = ToonFactory.from(`d[2]{a,b,c}:\n  1,2,3\n  4,5,6`);
    const matrix = data.toMatrix(['a', 'b', 'c']);
    expect(matrix).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  test('fromMatrix() crea dataset desde matriz', () => {
    const matrix = [[1, 2], [3, 4]];
    const toon = Toon.fromMatrix(matrix, ['x', 'y']);
    expect(toon.count()).toBe(2);
    expect(toon.first()?.x).toBe(1);
  });
});

describe('Operaciones Matriciales - Escalares', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = ToonFactory.from(`d[3]{x,y}:\n  2,4\n  6,8\n  10,12`);
  });

  test('addMatrix() suma matrices', () => {
    const other = ToonFactory.from(`d[3]{x,y}:\n  1,1\n  2,2\n  3,3`);
    const result = toon.addMatrix(other, ['x', 'y']);
    expect(result.first()?.x).toBe(3);
    expect(result.first()?.y).toBe(5);
  });

  test('multiplyScalar() multiplica por escalar', () => {
    const result = toon.multiplyScalar(2, ['x', 'y']);
    expect(result.first()?.x).toBe(4);
    expect(result.first()?.y).toBe(8);
  });
});

describe('Operaciones Matriciales - Álgebra Lineal', () => {
  test('norm() calcula norma L2', () => {
    const v = ToonFactory.from(`v[1]{x,y}:\n  3,4`);
    const norm = v.norm('l2', ['x', 'y']);
    expect(norm).toBe(5);
  });

  test('norm() calcula norma L1', () => {
    const v = ToonFactory.from(`v[1]{x,y}:\n  3,4`);
    const norm = v.norm('l1', ['x', 'y']);
    expect(norm).toBe(7);
  });

  test('dotProduct() calcula producto punto', () => {
    const v1 = ToonFactory.from(`v[1]{x,y,z}:\n  1,2,3`);
    const v2 = { x: 4, y: 5, z: 6 };
    const dot = v1.dotProduct(v2, ['x', 'y', 'z']);
    expect(dot).toBe(32); // 1*4 + 2*5 + 3*6 = 32
  });
});

describe('Operaciones Matriciales - Normalización', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = ToonFactory.from(`d[4]{val}:\n  10\n  20\n  30\n  40`);
  });

  test('normalize() normaliza a [0,1]', () => {
    const normalized = toon.normalize(['val']);
    const first = normalized.first()?.val as number;
    const last = normalized.last()?.val as number;
    expect(first).toBe(0);
    expect(last).toBe(1);
  });

  test('standardize() estandariza valores', () => {
    const standardized = toon.standardize(['val']);
    const values = standardized.pluck('val').map(v => Number(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(Math.abs(mean)).toBeLessThan(0.0001); // Media cercana a 0
  });
});

describe('Operaciones Matriciales - Estadísticas', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = ToonFactory.from(`d[5]{x,y}:\n  1,2\n  2,4\n  3,6\n  4,8\n  5,10`);
  });

  test('covariance() calcula covarianza', () => {
    const cov = toon.covariance('x', 'y');
    expect(cov).toBeGreaterThan(0); // Covarianza positiva
  });

  test('correlation() calcula correlación', () => {
    const corr = toon.correlation('x', 'y');
    expect(corr).toBeCloseTo(1, 1); // Correlación perfecta
  });

  test('correlationMatrix() genera matriz', () => {
    const matrix = toon.correlationMatrix(['x', 'y']);
    expect(matrix.x.x).toBeCloseTo(1, 10); // Auto-correlación = 1
    expect(matrix.x.y).toBeCloseTo(matrix.y.x, 5); // Simétrica
  });
});

describe('Operaciones Matriciales - Transformaciones', () => {
  test('transpose() transpone filas y columnas', () => {
    const toon = ToonFactory.from(`d[2]{a,b}:\n  1,2\n  3,4`);
    const transposed = toon.transpose();
    expect(transposed.count()).toBe(2);
    expect(transposed.first()?.row_0).toBe(1);
    expect(transposed.first()?.row_1).toBe(3);
  });

  test('applyFunction() aplica función', () => {
    const toon = ToonFactory.from(`d[3]{x}:\n  1\n  2\n  3`);
    const squared = toon.applyFunction(x => x * x, ['x']);
    expect(squared.at(0)?.x).toBe(1);
    expect(squared.at(1)?.x).toBe(4);
    expect(squared.at(2)?.x).toBe(9);
  });

  test('binning() crea categorías', () => {
    const toon = ToonFactory.from(`d[5]{val}:\n  10\n  20\n  30\n  40\n  50`);
    const binned = toon.binning('val', 2, ['bajo', 'alto']);
    const binnedField = binned.pluck('val_binned');
    expect(binnedField).toContain('bajo');
    expect(binnedField).toContain('alto');
  });
});

describe('Operaciones Matriciales - Series Temporales', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = ToonFactory.from(`d[5]{val}:\n  10\n  20\n  30\n  40\n  50`);
  });

  test('rolling() calcula media móvil', () => {
    const rolled = toon.rolling('val', 2, 'avg');
    const values = rolled.pluck('val_rolling_avg').map(v => Number(v));
    expect(values[0]).toBe(10);
    expect(values[1]).toBe(15); // (10+20)/2
  });

  test('lag() crea valores rezagados', () => {
    const lagged = toon.lag('val', 1);
    expect(lagged.at(0)?.val_lag_1).toBeNaN();
    expect(lagged.at(1)?.val_lag_1).toBe(10);
  });

  test('lead() crea valores adelantados', () => {
    const leaded = toon.lead('val', 1);
    expect(leaded.at(0)?.val_lead_1).toBe(20);
    expect(leaded.at(4)?.val_lead_1).toBeNaN();
  });

  test('diff() calcula diferencias', () => {
    const diffed = toon.diff('val', 1);
    expect(diffed.at(0)?.val_diff_1).toBeNaN();
    expect(diffed.at(1)?.val_diff_1).toBe(10); // 20-10
  });

  test('pctChange() calcula cambios porcentuales', () => {
    const pctChanged = toon.pctChange('val', 1);
    expect(pctChanged.at(0)?.val_pct_change_1).toBeNaN();
    expect(pctChanged.at(1)?.val_pct_change_1).toBe(100); // (20-10)/10 * 100
  });

  test('cumsum() calcula suma acumulada', () => {
    const cumulative = toon.cumsum('val');
    const values = cumulative.pluck('val_cumsum').map(v => Number(v));
    expect(values[0]).toBe(10);
    expect(values[1]).toBe(30);
    expect(values[4]).toBe(150);
  });
});

describe('Operaciones Matriciales - Ranking', () => {
  let toon: Toon;

  beforeEach(() => {
    toon = ToonFactory.from(`d[5]{score}:\n  85\n  92\n  78\n  92\n  88`);
  });

  test('rank() asigna rankings', () => {
    const ranked = toon.rank('score', 'dense');
    const ranks = ranked.pluck('score_rank').map(v => Number(v));
    expect(Math.min(...ranks)).toBe(1);
    expect(ranks.length).toBe(5);
  });

  test('percentile() calcula percentiles', () => {
    const percentiled = toon.percentile('score');
    const percentiles = percentiled.pluck('score_percentile').map(v => Number(v));
    expect(percentiles.every(p => p >= 0 && p <= 100)).toBe(true);
  });
});

describe('Operaciones Matriciales - Casos de Uso', () => {
  test('Pipeline completo de análisis', () => {
    const data = ToonFactory.from(`
      ventas[6]{dia,monto}:
        1,100
        2,120
        3,110
        4,130
        5,125
        6,140
    `);

    const analisis = data
      .normalize(['monto'])
      .rolling('monto', 3, 'avg')
      .diff('monto', 1)
      .rank('monto', 'dense');

    expect(analisis.count()).toBe(6);
    expect(analisis.schema()).toHaveProperty('monto_rolling_avg');
    expect(analisis.schema()).toHaveProperty('monto_diff_1');
    expect(analisis.schema()).toHaveProperty('monto_rank');
  });

  test('Análisis de correlación múltiple', () => {
    const data = ToonFactory.from(`
      datos[4]{x,y,z}:
        1,2,3
        2,4,6
        3,6,9
        4,8,12
    `);

    const corrMatrix = data.correlationMatrix(['x', 'y', 'z']);
    
    // Todas las auto-correlaciones deben ser 1
    expect(corrMatrix.x.x).toBeCloseTo(1, 10);
    expect(corrMatrix.y.y).toBeCloseTo(1, 10);
    expect(corrMatrix.z.z).toBeCloseTo(1, 10);

    // Correlación perfecta entre variables proporcionales
    expect(Math.abs(corrMatrix.x.y)).toBeCloseTo(1, 1);
  });
});
