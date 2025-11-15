# 🎯 ToonJS

**A high-performance TypeScript library for tabular data manipulation with a custom TOON format**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-75%20passing-brightgreen.svg)](https://github.com/cescofors75/toonjs)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/cescofors75/toonjs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-+99%25-orange.svg)](https://github.com/cescofors75/toonjs/blob/main/PERFORMANCE.md)

[English](#english) | [Español](#español)

---

## English

### 📖 Overview

ToonJS is a powerful, zero-dependency TypeScript library for working with tabular data. It introduces the TOON format - a human-readable, efficient way to represent datasets - and provides 64+ optimized methods for data manipulation, analysis, and transformation.

### ✨ Key Features

- **🚀 High Performance**: Up to 3.5x faster than manual operations (optimized with DOOM-style techniques)
- **📦 Zero Dependencies**: Pure TypeScript, no external packages
- **🎯 Type-Safe**: Full TypeScript support with comprehensive type definitions
- **🔗 Chainable API**: Fluent interface for elegant data pipelines
- **📊 Rich Functionality**: 64+ methods covering filtering, aggregation, statistics, and more
- **🎨 Custom Format**: TOON format - compact and human-readable
- **✅ Well-Tested**: 77 comprehensive tests with 100% coverage
- **🌐 Universal**: Works in Node.js and browsers

### 🚀 Quick Start

#### Installation

```bash
npm install @cescofors/toonjs
```

#### Basic Usage

```typescript
import { ToonFactory } from '@cescofors/toonjs';

// Create dataset from TOON format
const data = ToonFactory.from(`
users[3]{id,name,age}:
  1,Alice,28
  2,Bob,35
  3,Charlie,42
`);

// Chain operations
const result = data
  .filter(user => user.age > 30)
  .sortBy(['age'], ['desc'])
  .select(['name', 'age'])
  .all();

console.log(result);
// [{ name: 'Charlie', age: 42 }, { name: 'Bob', age: 35 }]
```

### 📚 Core Concepts

#### TOON Format

The TOON format is designed to be both human-readable and efficient:

```
name[count]{field1,field2,...}:
  value1,value2,...
  value1,value2,...
```

**Example:**
```
products[2]{id,name,price}:
  101,Laptop,999.99
  102,Mouse,25.50
```

### 🛠️ API Reference

#### Data Access

```typescript
.all()           // Get all rows
.first()         // Get first row
.last()          // Get last row
.at(index)       // Get row at index
.find(fn)        // Find first matching row
.findAll(fn)     // Find all matching rows
.pluck(field)    // Extract single field values
.take(n)         // Get first n rows
.skip(n)         // Skip first n rows
.slice(start, end) // Get rows slice
```

#### Filtering & Search

```typescript
.filter(fn)              // Filter rows
.filterRange(field, min, max) // Filter by range
.search(term, fields)    // Search in fields
.distinct(field)         // Get unique values
.unique()                // Remove duplicates
```

#### Transformation

```typescript
.map(fn)                 // Transform rows
.mapRows(fn)             // Map to array (optimized)
.select(fields)          // Select specific fields
.exclude(fields)         // Exclude fields
.rename(old, new)        // Rename field
.addField(name, fn)      // Add calculated field
.reverse()               // Reverse order
```

#### Sorting & Ordering

```typescript
.sort(fn)                // Custom sort
.sortBy(fields, orders)  // Sort by multiple fields
```

#### Aggregation & Statistics

```typescript
.groupBy(field)          // Group by field
.countBy(field)          // Count occurrences
.aggregate(by, ops)      // Group with operations
.stats(field)            // Calculate statistics
```

#### Mathematical Operations

```typescript
.toMatrix(fields)        // Convert to 2D array
.fromMatrix(matrix)      // Create from matrix
.addMatrix(other)        // Add matrices
.normalize(fields)       // Normalize to [0,1]
.standardize(fields)     // Z-score normalization
.correlation(f1, f2)     // Calculate correlation
.correlationMatrix()     // Correlation matrix
.covariance(f1, f2)      // Calculate covariance
```

#### Time Series

```typescript
.rolling(field, window)  // Rolling average
.lag(field, periods)     // Lag values
.lead(field, periods)    // Lead values
.diff(field)             // Differences
.pctChange(field)        // Percentage changes
.cumsum(field)           // Cumulative sum
```

#### Ranking & Binning

```typescript
.rank(field, order)      // Assign ranks
.percentile(field, p)    // Calculate percentile
.binning(field, bins)    // Create categories
```

#### Combination

```typescript
.concat(other)           // Concatenate datasets
.join(other, on)         // Inner join
```

#### Validation

```typescript
.some(fn)                // Check if any matches
.every(fn)               // Check if all match
.isEmpty()               // Check if empty
.count()                 // Get row count
```

#### Export

```typescript
.toToon()                // Export to TOON format
.toCSV()                 // Export to CSV
.toJSON()                // Export to JSON
.toTable()               // Display as ASCII table
```

### 🎯 Advanced Examples

#### Data Analysis Pipeline

```typescript
const analysis = data
  .filter(row => row.value > 0)
  .normalize(['value'])
  .rank('value', 'desc')
  .take(10)
  .toTable();
```

#### Time Series Analysis

```typescript
const trend = data
  .sortBy(['date'], ['asc'])
  .rolling('sales', 7)      // 7-day moving average
  .pctChange('sales')        // Percentage changes
  .all();
```

#### Statistical Analysis

```typescript
const matrix = data.correlationMatrix([
  'price', 'rating', 'sales'
]);

const stats = data.stats('revenue');
// { min, max, avg, sum, count, median }
```

### ⚡ Performance

ToonJS is optimized for high performance:

- **Normalization**: 1.68x faster than manual code
- **Correlation**: 3.51x faster
- **Ranking**: 3.23x faster
- **Rolling Average**: 1.25x faster
- **Overall**: 75.5% average improvement

See [PERFORMANCE.md](docs/PERFORMANCE.md) for detailed benchmarks.

### 🧪 Testing

```bash
npm test              # Run all tests
npm run build         # Build TypeScript
```

All 77 tests passing with 100% coverage.

### 📄 License

MIT © 2025

### 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

### 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@cescofors/toonjs)
- [GitHub Repository](https://github.com/cescofors75/toonjs)
- [Performance Benchmarks](https://github.com/cescofors75/toonjs/blob/main/PERFORMANCE.md)
- [Changelog](https://github.com/cescofors75/toonjs/blob/main/CHANGELOG.md)

---

## Español

### 📖 Descripción

ToonJS es una poderosa biblioteca TypeScript sin dependencias para trabajar con datos tabulares. Introduce el formato TOON - una forma legible y eficiente de representar conjuntos de datos - y proporciona más de 60 métodos optimizados para manipulación, análisis y transformación de datos.

### ✨ Características Principales

- **🚀 Alto Rendimiento**: Hasta 3.5x más rápido que operaciones manuales (optimizado con técnicas estilo DOOM)
- **📦 Sin Dependencias**: TypeScript puro, sin paquetes externos
- **🎯 Type-Safe**: Soporte completo de TypeScript con definiciones exhaustivas
- **🔗 API Encadenable**: Interfaz fluida para pipelines elegantes
- **📊 Funcionalidad Rica**: Más de 60 métodos cubriendo filtrado, agregación, estadísticas y más
- **🎨 Formato Personalizado**: Formato TOON - compacto y legible
- **✅ Bien Probado**: 77 tests exhaustivos con 100% de cobertura
- **🌐 Universal**: Funciona en Node.js y navegadores

### 🚀 Inicio Rápido

#### Instalación

```bash
npm install @cescofors/toonjs
```

#### Uso Básico

```typescript
import { ToonFactory } from '@cesco/toon';

// Crear dataset desde formato TOON
const data = ToonFactory.from(`
usuarios[3]{id,nombre,edad}:
  1,Alicia,28
  2,Roberto,35
  3,Carlos,42
`);

// Encadenar operaciones
const resultado = data
  .filter(usuario => usuario.edad > 30)
  .sortBy(['edad'], ['desc'])
  .select(['nombre', 'edad'])
  .all();

console.log(resultado);
// [{ nombre: 'Carlos', edad: 42 }, { nombre: 'Roberto', edad: 35 }]
```

### 📚 Ejemplos Avanzados

#### Pipeline de Análisis

```typescript
const analisis = data
  .filter(fila => fila.valor > 0)
  .normalize(['valor'])
  .rank('valor', 'desc')
  .take(10)
  .toTable();
```

#### Análisis de Series Temporales

```typescript
const tendencia = data
  .sortBy(['fecha'], ['asc'])
  .rolling('ventas', 7)      // Media móvil de 7 días
  .pctChange('ventas')       // Cambios porcentuales
  .all();
```

#### Análisis Estadístico

```typescript
const matriz = data.correlationMatrix([
  'precio', 'calificacion', 'ventas'
]);

const estadisticas = data.stats('ingresos');
// { min, max, avg, sum, count, median }
```

### ⚡ Rendimiento

ToonJS está optimizado para alto rendimiento:

- **Normalización**: 1.68x más rápido que código manual
- **Correlación**: 3.51x más rápido
- **Ranking**: 3.23x más rápido
- **Media Móvil**: 1.25x más rápido
- **General**: 75.5% de mejora promedio

Ver [PERFORMANCE.md](docs/PERFORMANCE.md) para benchmarks detallados.

### 🧪 Pruebas

```bash
npm test              # Ejecutar todos los tests
npm run build         # Compilar TypeScript
```

Los 77 tests pasan con 100% de cobertura.

### 📄 Licencia

MIT © 2025

---

**Made with ❤️ by the ToonJS Team**
