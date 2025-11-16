# 🎯 ToonJS

**A high-performance TypeScript library for tabular data manipulation with a custom TOON format**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen.svg)](https://github.com/cescofors75/toonjs)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/cescofors75/toonjs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-2.2x%20avg-orange.svg)](https://github.com/cescofors75/toonjs/blob/main/PERFORMANCE.md)

> 📚 **[Complete Documentation, Interactive Playground & Tools → toonjs.dev](https://toonjs.dev)**

[English](#english) | [Español](#español)

---

## English

### 📖 Overview

ToonJS is a powerful, zero-dependency TypeScript library for working with tabular data. It introduces the TOON format - a human-readable, efficient way to represent datasets - and provides 76+ optimized methods for data manipulation, analysis, and transformation.

### ✨ Key Features

- **🚀 High Performance**: Promedio 2.2x más rápido que operaciones manuales, hasta 3.5x en operaciones como correlación y normalización
- **📦 Zero Dependencies**: Pure TypeScript, no external packages
- **🎯 Type-Safe**: Full TypeScript support with comprehensive type definitions
- **🔗 Chainable API**: Fluent interface for elegant data pipelines
- **📊 Rich Functionality**: 76+ methods covering filtering, aggregation, statistics, and more
- **🎨 Custom Format**: TOON format - compact and human-readable
- **✅ Well-Tested**: 102 comprehensive tests with 100% coverage
- **🌐 Universal**: Works in Node.js and browsers

### 🚀 Quick Start

> 💡 **Try it live at [toonjs.dev/playground](https://toonjs.dev/playground)** - Interactive code editor with examples!

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

- **Correlación**: 3.5x más rápido
- **Normalización**: 3.5x más rápido  
- **Ranking**: 3.23x más rápido
- **Rolling Average**: 1.25x más rápido
- **Overall**: Promedio 2.2x más rápido en benchmarks verificables

See [PERFORMANCE.md](docs/PERFORMANCE.md) for detailed benchmarks.

### 🧪 Testing

```bash
npm test              # Run all tests
npm run build         # Build TypeScript
```

All 102 tests passing with 100% coverage.

### 📄 License

MIT © 2025

### 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

### 🔗 Links

- 🌐 **[toonjs.dev](https://toonjs.dev)** - Official website with full documentation
- 📚 **[Documentation](https://toonjs.dev/docs)** - Complete API reference & guides  
- 🎮 **[Playground](https://toonjs.dev/playground)** - Try ToonJS in your browser
- 🔧 **[Tools](https://toonjs.dev/converter)** - JSON/CSV to TOON converter
- 📝 **[Blog](https://toonjs.dev/blog)** - Updates, tutorials & insights
- 📦 **[NPM Package](https://www.npmjs.com/package/@cescofors/toonjs)** - Install via npm
- 🐙 **[GitHub Repository](https://github.com/cescofors75/toonjs)** - Source code & issues
- ⚡ **[Performance Benchmarks](https://github.com/cescofors75/toonjs/blob/main/PERFORMANCE.md)** - Speed comparisons
- 📋 **[Changelog](https://github.com/cescofors75/toonjs/blob/main/CHANGELOG.md)** - Version history

---

## Español

### 📖 Descripción

ToonJS es una poderosa biblioteca TypeScript sin dependencias para trabajar con datos tabulares. Introduce el formato TOON - una forma legible y eficiente de representar conjuntos de datos - y proporciona más de 60 métodos optimizados para manipulación, análisis y transformación de datos.

### ✨ Características Principales

- **🚀 Alto Rendimiento**: Promedio 2.2x más rápido que operaciones manuales, hasta 3.5x en operaciones como correlación y normalización
- **📦 Sin Dependencias**: TypeScript puro, sin paquetes externos
- **🎯 Type-Safe**: Soporte completo de TypeScript con definiciones exhaustivas
- **🔗 API Encadenable**: Interfaz fluida para pipelines elegantes
- **📊 Funcionalidad Rica**: Más de 76 métodos cubriendo filtrado, agregación, estadísticas y más
- **🎨 Formato Personalizado**: Formato TOON - compacto y legible
- **✅ Bien Probado**: 102 tests exhaustivos con 100% de cobertura
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

- **Correlación**: 3.5x más rápido
- **Normalización**: 3.5x más rápido
- **Ranking**: 3.23x más rápido
- **Media Móvil**: 1.25x más rápido
- **General**: Promedio 2.2x más rápido en benchmarks verificables

Ver [PERFORMANCE.md](docs/PERFORMANCE.md) para benchmarks detallados.

### 🧪 Pruebas

```bash
npm test              # Ejecutar todos los tests
npm run build         # Compilar TypeScript
```

Los 102 tests pasan con 100% de cobertura.

### 📄 Licencia

MIT © 2025

---

## 🌐 Resources / Recursos

- 🌐 **[toonjs.dev](https://toonjs.dev)** - Official website with full documentation
- 📚 **[Documentation](https://toonjs.dev/docs)** - Complete API reference & guides
- 🎮 **[Playground](https://toonjs.dev/playground)** - Try ToonJS in your browser
- 🔧 **[Tools](https://toonjs.dev/converter)** - JSON/CSV to TOON converter
- 📝 **[Blog](https://toonjs.dev/blog)** - Updates, tutorials & insights
- 📦 **[NPM Package](https://www.npmjs.com/package/@cescofors/toonjs)** - Install via npm
- 🐙 **[GitHub](https://github.com/cescofors75/toonjs)** - Source code & issues

---

**Made with ❤️ by the ToonJS Team**
