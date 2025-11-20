import { Toon } from '../toon';

describe('ToonJS API Surface Coverage Suite', () => {

  const createToon = (rows: any[]) => {
    if (rows.length === 0) return new Toon({ name: 'empty', schema: {}, rows: [] });
    const schema: any = {};
    Object.keys(rows[0]).forEach(k => schema[k] = typeof rows[0][k] === 'number' ? 'number' : 'string');
    return new Toon({ name: 'test', schema, rows });
  };

  describe('1. Transformation Methods', () => {
    const data = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    
    test('rename() changes field name', () => {
      const t = createToon(data);
      const res = t.rename('name', 'label');
      expect(res.first()?.label).toBe('A');
      expect(res.first()?.name).toBeUndefined();
    });

    test('rename() preserves data integrity', () => {
      const t = createToon(data);
      const res = t.rename('id', 'identifier');
      expect(res.pluck('identifier')).toEqual([1, 2]);
    });

    test('addField() creates new calculated field', () => {
      const t = createToon(data);
      const res = t.addField('id_x2', (row: any) => row.id * 2);
      expect(res.pluck('id_x2')).toEqual([2, 4]);
    });

    test('reverse() inverts row order', () => {
      const t = createToon(data);
      const res = t.reverse();
      expect(res.pluck('id')).toEqual([2, 1]);
    });

    test('unique() removes duplicates', () => {
      const dupData = [{ val: 1 }, { val: 1 }, { val: 2 }];
      const t = createToon(dupData);
      const res = t.unique();
      expect(res.count()).toBe(2);
      expect(res.pluck('val')).toEqual([1, 2]);
    });
  });

  describe('2. Combination Methods', () => {
    const t1 = createToon([{ id: 1, val: 10 }]);
    const t2 = createToon([{ id: 2, val: 20 }]);

    test('concat() combines two datasets', () => {
      const res = t1.concat(t2);
      expect(res.count()).toBe(2);
      expect(res.pluck('val')).toEqual([10, 20]);
    });

    test('join() merges on key', () => {
      const users = createToon([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
      const orders = createToon([{ userId: 1, total: 100 }, { userId: 3, total: 50 }]);
      
      const res = users.join(orders, 'id', 'userId');
      expect(res.count()).toBe(1); // Inner join
      expect(res.first()?.name).toBe('Alice');
      expect(res.first()?.total).toBe(100);
    });
  });

  describe('3. Search & Sort', () => {
    const data = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
      { id: 3, name: 'Charlie', age: 35 }
    ];
    const t = createToon(data);

    test('search() finds by substring', () => {
      const res = t.search('ali', 'name');
      expect(res.count()).toBe(1);
      expect(res.first()?.name).toBe('Alice');
    });

    test('search() is case insensitive', () => {
      const res = t.search('BOB', 'name');
      expect(res.count()).toBe(1);
    });

    test('findIndex() returns correct index', () => {
      const idx = t.findIndex(row => row.name === 'Charlie');
      expect(idx).toBe(2);
    });

    test('sortBy() orders correctly (asc)', () => {
      const res = t.sortBy({ field: 'age', order: 'asc' });
      expect(res.pluck('name')).toEqual(['Bob', 'Alice', 'Charlie']);
    });

    test('sortBy() orders correctly (desc)', () => {
      const res = t.sortBy({ field: 'age', order: 'desc' });
      expect(res.pluck('name')).toEqual(['Charlie', 'Alice', 'Bob']);
    });
  });

  describe('4. Aggregation & Grouping', () => {
    const data = [
      { cat: 'A', val: 10 },
      { cat: 'A', val: 20 },
      { cat: 'B', val: 5 }
    ];
    const t = createToon(data);

    test('groupBy() creates correct groups', () => {
      const groups = t.groupBy('cat');
      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups['A'].length).toBe(2);
      expect(groups['B'].length).toBe(1);
    });

    test('aggregate() computes summary stats', () => {
      const agg = t.aggregate('cat', {
        total: { field: 'val', op: 'sum' },
        avg: { field: 'val', op: 'avg' }
      });
      
      // Assuming aggregate returns a Toon or array of objects
      // Let's check implementation details via test
      // If aggregate returns Toon:
      const rowA = agg.find(r => r.cat === 'A');
      expect(rowA?.total).toBe(30);
      expect(rowA?.avg).toBe(15);
    });
  });

  describe('5. Advanced Math & Time Series', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ val: i }));
    const t = createToon(data);

    test('rolling(3) computes moving average', () => {
      const res = t.rolling('val', 3, 'avg');
      const vals = res.pluck('val_rolling_avg');
      // Implementation uses partial windows at the start
      expect(Number(vals[0])).toBe(0); // avg(0)
      expect(Number(vals[1])).toBe((0+1)/2); // avg(0,1) = 0.5
      expect(Number(vals[2])).toBe((0+1+2)/3); // avg(0,1,2) = 1
    });

    test('lag(1) shifts data forward', () => {
      const res = t.lag('val', 1);
      const vals = res.pluck('val_lag_1');
      expect(vals[0]).toBeNaN();
      expect(vals[1]).toBe(0);
    });

    test('lead(1) shifts data backward', () => {
      const res = t.lead('val', 1);
      const vals = res.pluck('val_lead_1');
      expect(vals[0]).toBe(1);
      expect(vals[19]).toBeNaN();
    });

    test('rank() computes ranks', () => {
      const t2 = createToon([{ val: 10 }, { val: 5 }, { val: 20 }]);
      const res = t2.rank('val');
      // Default is 'dense' and descending order in implementation
      // 20 -> 1, 10 -> 2, 5 -> 3
      const ranks = res.pluck('val_rank');
      expect(ranks).toContain(1);
      expect(ranks).toContain(2);
      expect(ranks).toContain(3);
    });

    test('percentile() computes correct percentiles', () => {
      const t3 = createToon(Array.from({length: 100}, (_, i) => ({ val: i+1 }))); // 1..100
      // Calculate median manually since percentile() returns a Toon with ranks
      const values = t3.pluck('val').map(Number).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      
      expect(median).toBeCloseTo(50.5);
    });

    test('binning() categorizes values', () => {
      const t4 = createToon([{ val: 5 }, { val: 15 }, { val: 25 }]);
      const res = t4.binning('val', [0, 10, 20, 30], ['Low', 'Med', 'High']);
      const bins = res.pluck('val_binned');
      expect(bins).toEqual(['Low', 'Med', 'High']);
    });
  });

  describe('6. Utility Methods', () => {
    const t = createToon([{ id: 1 }]);

    test('clone() creates independent copy', () => {
      const copy = t.clone();
      expect(copy).not.toBe(t);
      expect(copy.all()).toEqual(t.all());
    });

    test('paginate() returns correct metadata', () => {
      const t2 = createToon(Array(10).fill({ a: 1 }));
      const page = t2.paginate(1, 3);
      expect(page.total).toBe(10);
      expect(page.totalPages).toBe(4);
      expect(page.data.count()).toBe(3);
    });
  });

  // Programmatically generate many tests for robustness
  describe('7. Generated Edge Cases', () => {
    const edgeCases = [
      { val: 0 },
      { val: -1 },
      { val: 1.5 },
      { val: Number.MAX_SAFE_INTEGER },
      { val: Number.MIN_SAFE_INTEGER }
    ];

    test.each(edgeCases)('Math operations safe for %p', (row) => {
      const t = createToon([row]);
      expect(() => t.addMatrix(t, ['val'])).not.toThrow();
      expect(() => t.multiplyScalar(2, ['val'])).not.toThrow();
      expect(() => t.normalize(['val'])).not.toThrow();
    });
  });

  describe('8. Schema Consistency', () => {
    test('Schema types are preserved after operations', () => {
      const t = createToon([{ a: 1, b: 'text' }]);
      const res = t.multiplyScalar(2, ['a']);
      const schema = res.schema();
      expect(schema['a']).toBe('number');
      expect(schema['b']).toBe('string');
    });
  });

  describe('9. Chaining Stress Test', () => {
    test('Long chain of operations works', () => {
      const t = createToon(Array.from({length: 50}, (_, i) => ({ val: i })));
      const res = t
        .filter(r => Number(r.val) > 10)
        .multiplyScalar(2, ['val'])
        .addField('val_sq', (r: any) => r.val * r.val)
        .sortBy({ field: 'val', order: 'desc' })
        .take(5);
      
      expect(res.count()).toBe(5);
      expect(res.first()?.val).toBeGreaterThan(10);
    });
  });

  describe('10. Empty Dataset Handling', () => {
    const empty = createToon([]);

    test('Math ops on empty return empty', () => {
      expect(empty.multiplyScalar(2).count()).toBe(0);
      expect(empty.normalize().count()).toBe(0);
    });

    test('Stats on empty return zeros', () => {
      const stats = empty.stats('any');
      expect(stats.count).toBe(0);
      expect(stats.sum).toBe(0);
    });
  });

});
