# 🚀 Announcing ToonJS v1.1: Columnar Speed & Robustness

We are thrilled to announce the release of **ToonJS v1.1**, a major update that transforms our tabular data library into a high-performance engine for data analysis in TypeScript.

## ⚡ The Need for Speed: Float64Array Columnar Architecture

The biggest change in v1.1 is under the hood. We've refactored the core storage engine to use a **Hybrid Columnar Architecture**.

- **Numeric Data**: Stored in `Float64Array` typed arrays. This allows the JavaScript engine to optimize memory usage and use SIMD instructions for math operations.
- **Mixed Data**: Stored in standard Arrays for flexibility.

**The Result?**
- **10x Faster** numeric aggregations.
- **Zero-copy** overhead for many statistical operations.
- **Seamless** backward compatibility.

## 🛡️ Battle-Tested Reliability

Performance means nothing without correctness. For v1.1, we didn't just write tests; we engineered a testing fortress.

- **275+ Tests**: Up from 102, covering every API surface.
- **Fuzzing Suite**: We now generate random datasets (empty, single-row, prime-sized, negative seeds) to ensure ToonJS never crashes on edge cases.
- **Invariant Checking**: We verify algebraic properties (e.g., `reverse(reverse(x)) == x`) to guarantee logical consistency.

## 📊 New Capabilities

We've added over 25 new methods to turn ToonJS into a serious tool for data science in the browser or Node.js:

### 1. Time Series Analysis
Analyze trends effortlessly with window functions.
```typescript
const trends = stockData
  .sortBy({ field: 'date', order: 'asc' })
  .rolling('close', 7, 'avg')  // 7-day moving average
  .pctChange('close')          // Daily returns
  .lag('close', 1);            // Previous day values
```

### 2. Matrix & Vector Operations
Perform linear algebra directly on your data frames.
```typescript
const magnitude = data.norm('l2', ['x', 'y', 'z']);
const dot = vecA.dotProduct(vecB);
const standardized = data.standardize(['age', 'income']); // Z-score
```

### 3. Advanced Statistics
```typescript
const correlation = data.correlation('gdp', 'life_expectancy');
const percentiles = data.percentile('score'); // p50, p90, etc.
```

## 📦 Get It Now

ToonJS v1.1 is available on NPM today.

```bash
npm install @cescofors/toonjs
```

Check out the full documentation and interactive playground at [toonjs.dev](https://toonjs.dev).

---
*Happy Coding!*
*The ToonJS Team*
