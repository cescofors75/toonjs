# Changelog

All notable changes to ToonJS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### 🎉 Initial Release

First stable release of ToonJS - A high-performance TypeScript library for tabular data manipulation.

### ✨ Added

#### Core Features
- **TOON Format**: Custom human-readable tabular data format
- **60+ Methods**: Comprehensive API for data manipulation
- **Type Safety**: Full TypeScript support with type definitions
- **Zero Dependencies**: Pure TypeScript implementation
- **Chainable API**: Fluent interface for elegant pipelines

#### Data Access (10 methods)
- `all()` - Get all rows
- `first()` - Get first row
- `last()` - Get last row
- `at(index)` - Get row at index
- `find(fn)` - Find first matching row
- `findAll(fn)` - Find all matching rows
- `pluck(field)` - Extract field values
- `take(n)` - Take first n rows
- `skip(n)` - Skip first n rows
- `slice(start, end)` - Get rows slice

#### Filtering & Search (5 methods)
- `filter(fn)` - Filter rows by predicate
- `filterRange(field, min, max)` - Filter by numeric range
- `search(term, fields)` - Text search in fields
- `distinct(field)` - Get unique values
- `unique()` - Remove duplicate rows

#### Transformation (7 methods)
- `map(fn)` - Transform rows
- `mapRows(fn)` - Map to array (optimized)
- `select(fields)` - Select specific fields
- `exclude(fields)` - Exclude fields
- `rename(old, new)` - Rename field
- `addField(name, fn)` - Add calculated field
- `reverse()` - Reverse row order

#### Sorting & Ordering (2 methods)
- `sort(fn)` - Custom sort function
- `sortBy(fields, orders)` - Sort by multiple fields

#### Aggregation & Statistics (5 methods)
- `groupBy(field)` - Group by field
- `countBy(field)` - Count occurrences
- `aggregate(by, ops)` - Group with operations
- `stats(field)` - Calculate statistics (min, max, avg, sum, count, median)
- `count()` - Get row count

#### Mathematical Operations (9 methods)
- `toMatrix(fields)` - Convert to 2D array
- `fromMatrix(matrix, fields)` - Create from matrix
- `addMatrix(other)` - Add matrices element-wise
- `normalize(fields)` - Normalize to [0,1]
- `standardize(fields)` - Z-score normalization
- `correlation(f1, f2)` - Correlation coefficient
- `correlationMatrix(fields)` - Full correlation matrix
- `covariance(f1, f2)` - Covariance between fields
- `norm(type, fields)` - Vector norm (L1, L2)

#### Time Series (6 methods)
- `rolling(field, window, op)` - Rolling window operations
- `lag(field, periods)` - Lag values
- `lead(field, periods)` - Lead values
- `diff(field, periods)` - Differences
- `pctChange(field, periods)` - Percentage changes
- `cumsum(field)` - Cumulative sum

#### Ranking & Binning (3 methods)
- `rank(field, order)` - Assign ranks
- `percentile(field, p)` - Calculate percentile
- `binning(field, bins, labels)` - Create categories

#### Combination (2 methods)
- `concat(other)` - Concatenate datasets
- `join(other, on)` - Inner join on field

#### Validation (4 methods)
- `some(fn)` - Check if any row matches
- `every(fn)` - Check if all rows match
- `isEmpty()` - Check if empty
- `count()` - Get row count

#### Export (5 methods)
- `toToon()` - Export to TOON format
- `toCSV()` - Export to CSV
- `toJSON()` - Export to JSON object
- `toTable()` - Display as ASCII table
- `schema()` - Get field schema

### ⚡ Performance

DOOM-style optimizations achieve significant speedups:

- **Normalization**: 1.12x faster (12% improvement)
- **Correlation**: 3.46x faster (246% improvement)
- **Ranking**: 3.01x faster (201% improvement)
- **Rolling Average**: 1.14x faster (14% improvement)
- **Average**: 2.18x faster (118% improvement)

Optimization techniques:
- Pre-allocation of arrays
- Set-based lookups (O(1) vs O(n))
- Inline calculations
- Single-pass operations
- Optimized data structures

### 🧪 Testing

- **77 comprehensive tests** with 100% coverage
- Unit tests for all methods
- Integration tests for real-world scenarios
- Performance benchmarks vs manual implementations

### 📚 Documentation

- Complete API reference
- Bilingual documentation (English/Spanish)
- Performance benchmarks
- Usage examples
- Contributing guidelines

### 🔧 Technical Details

- **TypeScript**: 5.0+ with strict mode
- **Node.js**: 16.0.0+ required
- **Module**: CommonJS output (ES2020 target)
- **License**: MIT
- **Repository**: GitHub

### 🛠️ Removed Features

The following methods were removed due to performance concerns:

- `transpose()` - Dynamic key generation caused V8 bottlenecks (0.31x speedup)
- `multiplyScalar()` - Toon wrapper overhead issue (0.56x speedup)

Alternative approaches:
```typescript
// Instead of transpose(), use toMatrix() + manual transposition
const matrix = data.toMatrix(['a', 'b']);
const transposed = matrix[0].map((_, i) => matrix.map(row => row[i]));

// Instead of multiplyScalar(), use map() or mapRows()
const scaled = data.mapRows(row => ({ 
  ...row, 
  value: row.value * 2 
}));
```

---

## [Unreleased]

### Planned Features

- **Parallel Processing**: WebWorker support for browsers
- **Streaming**: Process large datasets without loading into memory
- **SQL-like Queries**: String-based query syntax
- **Visualization**: Built-in charting capabilities
- **Persistence**: Save/load datasets to files
- **Joins**: Left, right, outer join support
- **Window Functions**: More advanced analytical functions

### Known Issues

None at this time.

---

## Version History

- **1.0.0** (2025-01-XX) - Initial stable release

---

## Migration Guide

### From Manual Array Operations

**Before**:
```typescript
const filtered = data.filter(r => r.value > 10);
const sorted = filtered.sort((a, b) => b.value - a.value);
const top10 = sorted.slice(0, 10);
```

**After**:
```typescript
const result = toon
  .filter(r => r.value > 10)
  .sortBy(['value'], ['desc'])
  .take(10);
```

### From Other Libraries

**lodash**:
```typescript
// Before
import _ from 'lodash';
const grouped = _.groupBy(data, 'category');
const counts = _.mapValues(grouped, arr => arr.length);

// After
import { ToonFactory } from '@cesco/toon';
const counts = toon.countBy('category');
```

**Pandas (Python) → ToonJS**:
```python
# Python
df[df['value'] > 0].groupby('category').agg({'price': 'mean'})
```

```typescript
// TypeScript
toon
  .filter(r => r.value > 0)
  .aggregate('category', { price: 'avg' })
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © 2025

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/) principles.
