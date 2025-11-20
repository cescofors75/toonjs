import { Toon } from '../toon';

describe('ToonJS Fuzzing & Invariant Suite', () => {

  // Helper to create random datasets
  const generateRandomDataset = (rows: number, seed: number) => {
    const data = [];
    for (let i = 0; i < rows; i++) {
      data.push({
        id: i,
        val: Math.sin(i + seed) * 100, // Deterministic pseudo-random
        cat: i % 2 === 0 ? 'A' : 'B',
        noise: Math.cos(i * seed)
      });
    }
    
    if (rows === 0) return new Toon({ name: 'empty', schema: {}, rows: [] });

    const schema = {
      id: 'number',
      val: 'number',
      cat: 'string',
      noise: 'number'
    };
    
    return new Toon({ name: `fuzz_${rows}_${seed}`, schema, rows: data });
  };

  // Generate 20 datasets of varying sizes and characteristics
  const datasets = [
    { name: 'Empty', rows: 0, seed: 1 },
    { name: 'Single Row', rows: 1, seed: 2 },
    { name: 'Tiny', rows: 5, seed: 3 },
    { name: 'Small', rows: 10, seed: 4 },
    { name: 'Medium', rows: 50, seed: 5 },
    { name: 'Large', rows: 100, seed: 6 },
    { name: 'Odd Size', rows: 33, seed: 7 },
    { name: 'Prime Size', rows: 17, seed: 8 },
    { name: 'Power of 2', rows: 32, seed: 9 },
    { name: 'Power of 2 + 1', rows: 33, seed: 10 },
    { name: 'Negative Seed', rows: 20, seed: -1 },
    { name: 'Zero Seed', rows: 20, seed: 0 },
    { name: 'Large Seed', rows: 20, seed: 9999 },
    { name: 'Float Seed', rows: 20, seed: 0.5 },
    { name: 'Mixed 1', rows: 15, seed: 100 },
    { name: 'Mixed 2', rows: 25, seed: 200 },
    { name: 'Mixed 3', rows: 35, seed: 300 },
    { name: 'Mixed 4', rows: 45, seed: 400 },
    { name: 'Mixed 5', rows: 55, seed: 500 },
    { name: 'Mixed 6', rows: 65, seed: 600 },
  ];

  describe.each(datasets)('Dataset: $name (rows: $rows)', ({ rows, seed }) => {
    let t: Toon;

    beforeAll(() => {
      t = generateRandomDataset(rows, seed);
    });

    test('Invariant: Reverse is involutive (reverse(reverse(t)) == t)', () => {
      if (rows === 0) {
        expect(t.reverse().count()).toBe(0);
        return;
      }
      const rev = t.reverse();
      const revRev = rev.reverse();
      expect(revRev.first()?.id).toBe(t.first()?.id);
      expect(revRev.last()?.id).toBe(t.last()?.id);
      expect(revRev.count()).toBe(t.count());
    });

    test('Invariant: Filter(true) preserves count', () => {
      const res = t.filter(() => true);
      expect(res.count()).toBe(t.count());
    });

    test('Invariant: Filter(false) returns empty', () => {
      const res = t.filter(() => false);
      expect(res.count()).toBe(0);
      expect(res.isEmpty()).toBe(true);
    });

    test('Invariant: Take(n) + Skip(n) covers all rows', () => {
      const n = Math.floor(rows / 2);
      const taken = t.take(n);
      const skipped = t.skip(n);
      expect(taken.count() + skipped.count()).toBe(t.count());
    });

    test('Invariant: Stats consistency (min <= avg <= max)', () => {
      if (rows === 0) return;
      const stats = t.stats('val');
      expect(stats.min).toBeLessThanOrEqual(stats.max);
      expect(stats.avg).toBeGreaterThanOrEqual(stats.min);
      expect(stats.avg).toBeLessThanOrEqual(stats.max);
    });

    test('Invariant: Normalization range [0, 1]', () => {
      if (rows === 0) return;
      const norm = t.normalize(['val']);
      const stats = norm.stats('val');
      
      // If all values are same, range is 0. If empty, 0.
      // If values differ, min should be 0, max 1.
      // If single row, min=max, so normalized to 0 (implementation detail: range=0 -> 0)
      
      if (stats.count > 0) {
        if (stats.min === stats.max) {
           // Constant column
           expect(stats.min).toBe(0);
        } else {
           expect(stats.min).toBeCloseTo(0);
           expect(stats.max).toBeCloseTo(1);
        }
      }
    });

    test('Invariant: Clone equality', () => {
      const clone = t.clone();
      expect(clone.count()).toBe(t.count());
      if (rows > 0) {
        expect(clone.first()).toEqual(t.first());
      }
    });
  });
});
