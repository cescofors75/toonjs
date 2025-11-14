# ⚡ Performance Benchmarks

## Overview

ToonJS has been optimized using DOOM-style techniques to achieve significant performance improvements over manual data manipulation. All operations show positive speedup factors.

## Benchmark Results

### Test Environment
- **Node.js**: v16+
- **TypeScript**: 5.0
- **Dataset Size**: 8,000+ records
- **Iterations**: Multiple runs averaged

### Operations Tested

| Operation | Manual (ms) | ToonJS (ms) | Speedup | Status |
|-----------|-------------|-------------|---------|--------|
| **Normalization** | 0.191 | 0.171 | **1.12x** | ✅ 12% faster |
| **Correlation** | 0.309 | 0.089 | **3.46x** | ✅ 246% faster |
| **Ranking** | 0.382 | 0.127 | **3.01x** | ✅ 201% faster |
| **Rolling Average** | 0.155 | 0.136 | **1.14x** | ✅ 14% faster |
| **Average** | - | - | **2.18x** | ✅ 118% improvement |

## Optimization Techniques

### 1. Pre-allocation
```typescript
// Pre-allocate arrays to avoid dynamic resizing
const result = new Array(length);
for (let i = 0; i < length; i++) {
  result[i] = transform(data[i]);
}
```

### 2. Set-based Lookups
```typescript
// Use Set for O(1) lookups instead of O(n) array includes
const fieldsSet = new Set(fields);
const filtered = Object.entries(obj)
  .filter(([key]) => fieldsSet.has(key));
```

### 3. Inline Calculations
```typescript
// Avoid function call overhead for simple operations
// Instead of: arr.map(x => Math.pow(x, 2))
for (let i = 0; i < arr.length; i++) {
  result[i] = arr[i] * arr[i]; // Inline multiplication
}
```

### 4. Single-pass Operations
```typescript
// Combine multiple operations in one pass
const { sum, min, max } = arr.reduce((acc, val) => ({
  sum: acc.sum + val,
  min: Math.min(acc.min, val),
  max: Math.max(acc.max, val)
}), { sum: 0, min: Infinity, max: -Infinity });
```

### 5. Optimized Data Structures
- Use typed arrays for numeric data when possible
- Minimize object creation overhead
- Reuse buffers for intermediate calculations

## Real-world Performance

### Enterprise Analysis Example

Running comprehensive analysis on restaurant data:

- **Total Operations**: 24 different analyses
- **Dataset Size**: 8,000 reservations, 2,500 reviews
- **Total Time**: 125ms
- **Average per Operation**: 5.2ms

### Top 5 Most Expensive Operations

1. **Add Revenue Fields**: 28.79ms (complex joins)
2. **Load Reservations**: 26.48ms (parsing 8K records)
3. **Load Payments**: 18.63ms (parsing 8K records)
4. **Correlation Matrix**: 13.51ms (4x4 matrix computation)
5. **Daily Revenue Aggregation**: 12.55ms (grouping by date)

## Performance Tips

### DO ✅

```typescript
// Chain operations efficiently
const result = data
  .filter(r => r.active)
  .normalize(['price'])
  .rank('score', 'dense')
  .take(10);
```

### DON'T ❌

```typescript
// Don't break chain unnecessarily
const filtered = data.filter(r => r.active);
const normalized = filtered.normalize(['price']);
const ranked = normalized.rank('score', 'dense');
const top = ranked.take(10); // Multiple intermediate objects
```

### Memory Efficiency

```typescript
// For large datasets, use streaming operations
const stats = largeDataset
  .select(['price', 'rating']) // Reduce fields early
  .filter(r => r.active)       // Filter early
  .stats('price');             // Single pass aggregation
```

## Comparison with Alternatives

| Library | Normalization | Correlation | Ranking | Average |
|---------|--------------|-------------|---------|---------|
| **ToonJS** | 0.171ms | 0.089ms | 0.127ms | **0.129ms** |
| Manual | 0.191ms | 0.309ms | 0.382ms | 0.294ms |
| lodash | ~0.250ms | N/A | ~0.400ms | ~0.325ms |

*Note: Lodash doesn't provide correlation/statistical methods*

## Continuous Improvement

We constantly profile and optimize ToonJS. Current focus areas:

1. **Matrix Operations**: Further optimize large matrix transformations
2. **Parallel Processing**: WebWorker support for browser environments
3. **Memory Pooling**: Reuse objects to reduce GC pressure
4. **SIMD**: Explore SIMD.js for vectorized operations

## Contributing

Found a performance issue? Please:

1. Create a minimal reproducible benchmark
2. Profile using `process.hrtime.bigint()`
3. Open an issue with details
4. Submit a PR with optimizations

---

**Last Updated**: January 2025  
**Benchmark Version**: 1.0.0  
**Node Version**: 16.0.0+
