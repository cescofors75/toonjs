import { Toon } from '../toon';

describe('ToonJS Comprehensive Reliability Suite', () => {
  
  // Helper to create Toon from objects (inferring schema)
  const createToonFromObjects = (rows: any[]) => {
    if (rows.length === 0) return new Toon({ name: 'empty', schema: {}, rows: [] });
    
    const schema: any = {};
    const keys = Object.keys(rows[0]);
    for (const k of keys) {
      const val = rows[0][k];
      schema[k] = typeof val === 'number' ? 'number' : 'string';
    }
    
    return new Toon({ name: 'test', schema, rows });
  };

  // Helper to create numeric range
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  
  // Helper to create random dataset
  const createRandomToon = (rows: number, seed = 1) => {
    const data = range(rows).map(i => ({
      id: i,
      val_a: Math.sin(i + seed) * 100,
      val_b: Math.cos(i + seed) * 100,
      val_c: (i % 2 === 0) ? i : NaN, // Mixed with NaNs
      cat: i % 2 === 0 ? 'A' : 'B'
    }));
    return createToonFromObjects(data);
  };

  describe('1. Algebraic Properties & Invariants', () => {
    const size = 100;
    const toon = createRandomToon(size);

    test('Addition Commutativity: A + B = B + A', () => {
      const sum1 = toon.addMatrix(toon, ['val_a']);
      const sum2 = toon.addMatrix(toon, ['val_a']); 
      
      // Better: (A + B)
      const t1 = createRandomToon(10, 1);
      const t2 = createRandomToon(10, 2);
      
      const res1 = t1.addMatrix(t2, ['val_a']);
      const res2 = t2.addMatrix(t1, ['val_a']); 
      
      const col1 = res1.pluck('val_a');
      const col2 = res2.pluck('val_a');
      
      col1.forEach((v, i) => {
        expect(Number(v)).toBeCloseTo(Number(col2[i]));
      });
    });

    test('Identity Element: A + 0 = A', () => {
      const t1 = createRandomToon(50);
      const zeros = createToonFromObjects(Array(50).fill({ val_a: 0 }));
      
      const res = t1.addMatrix(zeros, ['val_a']);
      const original = t1.pluck('val_a');
      const result = res.pluck('val_a');
      
      original.forEach((v, i) => {
        expect(Number(result[i])).toBeCloseTo(Number(v));
      });
    });

    test('Scalar Multiplication Distributivity: k(A + B) = kA + kB', () => {
      const t1 = createRandomToon(20, 1);
      const t2 = createRandomToon(20, 2);
      const k = 2.5;

      const sum = t1.addMatrix(t2, ['val_a']);
      const left = sum.multiplyScalar(k, ['val_a']);

      const kA = t1.multiplyScalar(k, ['val_a']);
      const kB = t2.multiplyScalar(k, ['val_a']);
      const right = kA.addMatrix(kB, ['val_a']);

      const lVals = left.pluck('val_a');
      const rVals = right.pluck('val_a');

      lVals.forEach((v, i) => {
        expect(Number(v)).toBeCloseTo(Number(rVals[i]));
      });
    });
  });

  describe('2. Statistical Correctness (Vectorized vs Native)', () => {
    const sizes = [10, 100, 1000];
    
    sizes.forEach(size => {
      test(`Mean calculation is correct for size ${size}`, () => {
        const t = createRandomToon(size);
        const stats = t.stats('val_a');
        
        const jsValues = t.pluck('val_a').map(Number);
        const jsSum = jsValues.reduce((a, b) => a + b, 0);
        const jsMean = jsSum / size;
        
        expect(stats.avg).toBeCloseTo(jsMean);
        expect(stats.sum).toBeCloseTo(jsSum);
      });

      test(`Standard Deviation matches manual calculation for size ${size}`, () => {
        const t = createRandomToon(size);
        const std = t.standardize(['val_a']);
        
        // After standardization, mean should be ~0 and stdDev ~1
        const resStats = std.stats('val_a');
        expect(resStats.avg).toBeCloseTo(0, 10); // Floating point precision
        
        // Manual variance check of result
        const vals = std.pluck('val_a').map(Number);
        const variance = vals.reduce((acc, v) => acc + v*v, 0) / size;
        expect(Math.sqrt(variance)).toBeCloseTo(1, 10);
      });
    });
  });

  describe('3. Normalization Boundaries', () => {
    test('Normalize produces values in [0, 1]', () => {
      const t = createRandomToon(100);
      const norm = t.normalize(['val_a']);
      const vals = norm.pluck('val_a').map(Number);
      
      vals.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
      
      const stats = norm.stats('val_a');
      expect(stats.min).toBeCloseTo(0);
      expect(stats.max).toBeCloseTo(1);
    });

    test('Normalize handles constant columns (all same value)', () => {
      const data = Array(50).fill({ val: 100 });
      const t = createToonFromObjects(data);
      const norm = t.normalize(['val']);
      const vals = norm.pluck('val').map(Number);
      
      // Should be all 0 (or handled gracefully)
      vals.forEach(v => expect(v).toBe(0));
    });
  });

  describe('4. Missing Data (NaN) Handling', () => {
    test('Stats ignores NaNs correctly', () => {
      const data = [
        { val: 10 },
        { val: NaN },
        { val: 20 },
        { val: undefined }, // converts to NaN in number context usually
        { val: 30 }
      ];
      // Need to handle undefined explicitly in helper or data prep
      const cleanData = data.map(d => ({ val: d.val === undefined ? NaN : d.val }));
      
      const t = createToonFromObjects(cleanData);
      const stats = t.stats('val');
      
      expect(stats.count).toBe(3); // Only valid numbers
      // Valid count check if exposed, otherwise check sum
      expect(stats.sum).toBe(60);
      expect(stats.avg).toBe(20); // 60 / 3 valid
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
    });

    test('Vectorized operations propagate NaNs where appropriate', () => {
      const t = createToonFromObjects([{ a: 10 }, { a: NaN }]);
      const res = t.multiplyScalar(2, ['a']);
      const vals = res.pluck('a').map(Number);
      
      expect(vals[0]).toBe(20);
      expect(vals[1]).toBeNaN();
    });
  });

  describe('5. Time Series Logic', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ val: i * 10 })); // 0, 10, 20...
    const t = createToonFromObjects(data);

    test('Diff (period=1) is constant for linear data', () => {
      const diff = t.diff('val', 1);
      const vals = diff.pluck('val_diff_1').map(Number);
      
      expect(vals[0]).toBeNaN(); // First is NaN
      for(let i=1; i<10; i++) {
        expect(vals[i]).toBe(10);
      }
    });

    test('Cumsum matches manual sum', () => {
      const cs = t.cumsum('val');
      const vals = cs.pluck('val_cumsum').map(Number);
      
      let sum = 0;
      for(let i=0; i<10; i++) {
        sum += i * 10;
        expect(vals[i]).toBe(sum);
      }
    });

    test('PctChange calculation', () => {
      const t2 = createToonFromObjects([{ val: 100 }, { val: 110 }, { val: 88 }]);
      const pct = t2.pctChange('val');
      const vals = pct.pluck('val_pct_change_1').map(Number);
      
      expect(vals[0]).toBeNaN();
      expect(vals[1]).toBeCloseTo(10); // (110-100)/100 * 100 = 10%
      expect(vals[2]).toBeCloseTo(-20); // (88-110)/110 * 100 = -20%
    });
  });

  describe('6. Advanced Filtering & Search', () => {
    const t = createRandomToon(100);

    test('filterRange matches manual filter', () => {
      const min = -50;
      const max = 50;
      
      const optimized = t.filterRange('val_a', min, max);
      const manual = t.filter(row => {
        const v = Number(row['val_a']);
        return v >= min && v <= max;
      });
      
      expect(optimized.count()).toBe(manual.count());
      
      // Check content integrity
      const optVals = optimized.pluck('val_a');
      const manVals = manual.pluck('val_a');
      expect(optVals).toEqual(manVals);
    });

    test('filterRange handles empty result', () => {
      const empty = t.filterRange('val_a', 99999, 100000);
      expect(empty.count()).toBe(0);
      expect(empty.all()).toEqual([]);
    });
  });

  describe('7. Mixed Type Columns (Slow Path Fallback)', () => {
    test('Operations work on mixed string/number columns', () => {
      const data = [
        { val: 10 },
        { val: "20" },
        { val: 30 }
      ];
      // Helper infers number if first is number, so we need to force mixed or string schema
      // Let's manually create mixed
      const t = new Toon({
          name: 'mixed',
          schema: { val: 'string' }, // Force string schema to trigger mixed path
          rows: data
      });
      
      // Add scalar
      const res = t.multiplyScalar(2, ['val']);
      const vals = res.pluck('val').map(Number);
      
      expect(vals).toEqual([20, 40, 60]);
    });

    test('Stats works on mixed columns', () => {
      const data = [
        { val: 10 },
        { val: "20" },
        { val: "invalid" }
      ];
      const t = new Toon({
          name: 'mixed',
          schema: { val: 'string' },
          rows: data
      });
      const stats = t.stats('val');
      
      expect(stats.sum).toBe(30);
      expect(stats.max).toBe(20);
    });
  });

  describe('8. Large Dataset Stress Test (Mini)', () => {
    test('Can handle 10,000 rows operations quickly', () => {
      const t = createRandomToon(10000);
      const start = performance.now();
      
      t.multiplyScalar(2, ['val_a'])
       .normalize(['val_a'])
       .stats('val_a');
       
      const end = performance.now();
      expect(end - start).toBeLessThan(500); // Should be very fast with vectors
    });
  });

  // Generating many specific test cases for coverage
  describe('9. Edge Case Matrix', () => {
    const datasets = [
      { name: 'Single Row', data: [{a: 1}] },
      { name: 'All Zeros', data: [{a: 0}, {a: 0}] },
      { name: 'Negative Values', data: [{a: -1}, {a: -5}] },
      { name: 'Large Numbers', data: [{a: 1e9}, {a: 1e9+1}] },
      { name: 'Decimals', data: [{a: 0.1}, {a: 0.2}] }
    ];

    test.each(datasets)('Stats robust on $name', ({ data }) => {
      const t = createToonFromObjects(data);
      const stats = t.stats('a');
      expect(stats.avg).not.toBeNaN();
      expect(stats.sum).not.toBeNaN();
    });
  });
  
  describe('10. Immutability Checks', () => {
    test('Original dataset is not modified by operations', () => {
      const t = createRandomToon(10);
      const originalSum = t.stats('val_a').sum;
      
      t.multiplyScalar(100, ['val_a']);
      t.normalize(['val_a']);
      t.filterRange('val_a', 0, 10);
      
      const newSum = t.stats('val_a').sum;
      expect(newSum).toBe(originalSum);
    });
  });

});
