# 🐼 Guía Completa de Métodos DataFrame en ToonJS

Una guía exhaustiva de todos los métodos tipo pandas disponibles en ToonJS, con ejemplos del mundo real.

---

## 📑 Índice

- [Nivel 1: Métodos Esenciales](#nivel-1-métodos-esenciales)
  - [fillna()](#fillna)
  - [dropna()](#dropna)
  - [describe()](#describe)
  - [merge()](#merge)
  - [pivot()](#pivot)
- [Nivel 2: Métodos Muy Útiles](#nivel-2-métodos-muy-útiles)
  - [replace()](#replace)
  - [sample()](#sample)
  - [duplicated()](#duplicated)
  - [shift()](#shift)
  - [Operaciones de String (.str)](#operaciones-de-string-str)
- [Nivel 3: Nice to Have](#nivel-3-nice-to-have)
  - [melt()](#melt)
  - [crosstab()](#crosstab)
  - [interpolate()](#interpolate)

---

## Nivel 1: Métodos Esenciales

### fillna()

**Descripción:** Rellena valores nulos/undefined/vacíos con un valor específico.

**Sintaxis:**
```typescript
.fillna(value: unknown, fields?: string[]): Toon
```

**Parámetros:**
- `value`: Valor con el que reemplazar los nulos
- `fields`: (Opcional) Array de campos específicos a rellenar. Si no se especifica, se aplica a todos los campos.

**Ejemplo del Mundo Real: Sistema de E-commerce**

Imagina que tienes datos de ventas donde algunos productos no tienen descuento aplicado:

```typescript
import { ToonFactory } from '@cescofors/toonjs';

// Datos de ventas con descuentos faltantes
const ventas = ToonFactory.from(`
ventas[4]{producto,precio,descuento,stock}:
  Laptop,999.99,,15
  Mouse,25.50,5,50
  Teclado,79.99,,30
  Monitor,299.99,10,
`);

// Rellenar descuentos faltantes con 0
const ventasLimpias = ventas.fillna(0, ['descuento']);

console.log(ventasLimpias.all());
// [
//   { producto: 'Laptop', precio: 999.99, descuento: 0, stock: 15 },
//   { producto: 'Mouse', precio: 25.50, descuento: 5, stock: 50 },
//   { producto: 'Teclado', precio: 79.99, descuento: 0, stock: 30 },
//   { producto: 'Monitor', precio: 299.99, descuento: 10, stock: 0 }
// ]

// Rellenar todos los campos vacíos con un valor por defecto
const todoCompleto = ventas.fillna('N/A');
```

**Casos de Uso:**
- Preparar datos para análisis donde los nulos causan errores
- Llenar campos opcionales con valores por defecto
- Normalizar datasets antes de exportar a otros sistemas

---

### dropna()

**Descripción:** Elimina filas que contienen valores nulos/undefined/vacíos.

**Sintaxis:**
```typescript
.dropna(fields?: string[], how?: 'any' | 'all'): Toon
```

**Parámetros:**
- `fields`: (Opcional) Campos a verificar
- `how`:
  - `'any'` (default): Elimina fila si CUALQUIER campo es nulo
  - `'all'`: Elimina fila solo si TODOS los campos son nulos

**Ejemplo del Mundo Real: Validación de Formularios**

Sistema que recoge datos de registro de usuarios:

```typescript
// Datos de registro con información incompleta
const registros = ToonFactory.from(`
usuarios[5]{nombre,email,telefono,direccion}:
  Ana,ana@email.com,555-0001,Calle 1
  Pedro,,,
  Maria,maria@email.com,,Calle 3
  Juan,juan@email.com,555-0004,
  Sofia,,555-0005,Calle 5
`);

// Eliminar registros donde falte nombre o email (críticos)
const usuariosValidos = registros.dropna(['nombre', 'email'], 'any');

console.log(usuariosValidos.count()); // 3 usuarios válidos
console.log(usuariosValidos.all());
// [
//   { nombre: 'Ana', email: 'ana@email.com', telefono: '555-0001', direccion: 'Calle 1' },
//   { nombre: 'Maria', email: 'maria@email.com', telefono: null, direccion: 'Calle 3' },
//   { nombre: 'Juan', email: 'juan@email.com', telefono: '555-0004', direccion: null }
// ]

// Eliminar solo filas completamente vacías
const conAlgunDato = registros.dropna(undefined, 'all');
console.log(conAlgunDato.count()); // 4 (Pedro eliminado)
```

**Casos de Uso:**
- Limpiar datos antes de entrenar modelos de ML
- Validar completitud de formularios
- Preparar datos para reportes donde nulos no son aceptables

---

### describe()

**Descripción:** Genera un resumen estadístico completo de los campos numéricos (similar a pandas.describe()).

**Sintaxis:**
```typescript
.describe(fields?: string[]): Record<string, Record<string, number>>
```

**Retorna:** Objeto con estadísticas: count, mean, std, min, 25%, 50% (mediana), 75%, max

**Ejemplo del Mundo Real: Análisis de Ventas Mensuales**

```typescript
// Ventas mensuales de una tienda online
const ventasMensuales = ToonFactory.from(`
ventas[12]{mes,ingresos,ordenes,ticket_promedio}:
  Enero,45000,230,195.65
  Febrero,52000,280,185.71
  Marzo,61000,310,196.77
  Abril,58000,295,196.61
  Mayo,63000,320,196.88
  Junio,71000,360,197.22
  Julio,68000,340,200.00
  Agosto,72000,365,197.26
  Septiembre,69000,350,197.14
  Octubre,75000,380,197.37
  Noviembre,82000,420,195.24
  Diciembre,95000,490,193.88
`);

const estadisticas = ventasMensuales.describe(['ingresos', 'ordenes', 'ticket_promedio']);

console.log(estadisticas);
// {
//   ingresos: {
//     count: 12,
//     mean: 67583.33,
//     std: 13847.23,
//     min: 45000,
//     '25%': 60250,
//     '50%': 68500,    // mediana
//     '75%': 73250,
//     max: 95000
//   },
//   ordenes: {
//     count: 12,
//     mean: 344.17,
//     std: 68.91,
//     min: 230,
//     '25%': 303.75,
//     '50%': 347.5,
//     '75%': 373.75,
//     max: 490
//   },
//   ticket_promedio: {
//     count: 12,
//     mean: 195.81,
//     std: 1.89,
//     min: 185.71,
//     '25%': 194.86,
//     '50%': 196.69,
//     '75%': 197.24,
//     max: 200.00
//   }
// }

// Usar las estadísticas para detectar meses atípicos
const stats = estadisticas.ingresos;
const umbralAlto = stats['75%'] + 1.5 * (stats['75%'] - stats['25%']);
console.log(`Ingresos excepcionales: > ${umbralAlto}`);
```

**Casos de Uso:**
- Análisis exploratorio de datos
- Detectar outliers
- Generar reportes ejecutivos con KPIs
- Validar calidad de datos

---

### merge()

**Descripción:** Combina dos datasets con múltiples tipos de join (inner, left, right, outer, cross).

**Sintaxis:**
```typescript
.merge(other: Toon, options: {
  on?: string;              // Campo común para join
  leftOn?: string;          // Campo en dataset izquierdo
  rightOn?: string;         // Campo en dataset derecho
  how?: 'inner' | 'left' | 'right' | 'outer' | 'cross';
  suffixes?: [string, string]; // Sufijos para campos duplicados
}): Toon
```

**Ejemplo del Mundo Real: Sistema CRM**

Combinar información de clientes con sus compras:

```typescript
// Tabla de clientes
const clientes = ToonFactory.from(`
clientes[3]{cliente_id,nombre,segmento}:
  1,TechCorp,Enterprise
  2,StartupXYZ,SMB
  3,MegaRetail,Enterprise
`);

// Tabla de pedidos
const pedidos = ToonFactory.from(`
pedidos[5]{pedido_id,cliente_id,monto,estado}:
  101,1,5000,Completado
  102,1,3000,Completado
  103,2,1500,Pendiente
  104,4,2000,Completado
  105,3,8000,Completado
`);

// INNER JOIN: Solo clientes con pedidos
const clientesActivos = clientes.merge(pedidos, {
  on: 'cliente_id',
  how: 'inner'
});

console.log(clientesActivos.all());
// [
//   { cliente_id: 1, nombre: 'TechCorp', segmento: 'Enterprise',
//     pedido_id: 101, monto: 5000, estado: 'Completado' },
//   { cliente_id: 1, nombre: 'TechCorp', segmento: 'Enterprise',
//     pedido_id: 102, monto: 3000, estado: 'Completado' },
//   { cliente_id: 2, nombre: 'StartupXYZ', segmento: 'SMB',
//     pedido_id: 103, monto: 1500, estado: 'Pendiente' },
//   { cliente_id: 3, nombre: 'MegaRetail', segmento: 'Enterprise',
//     pedido_id: 105, monto: 8000, estado: 'Completado' }
// ]

// LEFT JOIN: Todos los clientes, incluso sin pedidos
const todosClientes = clientes.merge(pedidos, {
  on: 'cliente_id',
  how: 'left'
});
// Incluirá los 3 clientes, el cliente sin pedidos tendrá nulls en campos de pedidos

// CROSS JOIN: Todas las combinaciones posibles
const colores = ToonFactory.from(`
colores[2]{color}:
  Rojo
  Azul
`);

const tallas = ToonFactory.from(`
tallas[3]{talla}:
  S
  M
  L
`);

const productosCatalogo = colores.merge(tallas, { how: 'cross' });
console.log(productosCatalogo.count()); // 6 combinaciones (2 x 3)
```

**Tipos de Join:**

1. **INNER**: Solo filas con match en ambos datasets
2. **LEFT**: Todas las filas del izquierdo + matches del derecho
3. **RIGHT**: Todas las filas del derecho + matches del izquierdo
4. **OUTER**: Todas las filas de ambos datasets
5. **CROSS**: Producto cartesiano (todas las combinaciones)

**Casos de Uso:**
- Enriquecer datos de usuarios con información adicional
- Combinar métricas de diferentes fuentes
- Crear catálogos de productos con variantes
- Análisis de relaciones muchos-a-muchos

---

### pivot()

**Descripción:** Crea una tabla pivote (similar a Excel pivot tables o pandas.pivot_table).

**Sintaxis:**
```typescript
.pivot(
  index: string,           // Campo para filas
  columns: string,         // Campo para columnas
  values: string,          // Campo para valores
  aggFunc?: 'sum' | 'avg' | 'min' | 'max' | 'count'  // Función de agregación
): Toon
```

**Ejemplo del Mundo Real: Análisis de Ventas por Región**

```typescript
// Ventas por región y producto
const ventasDetalle = ToonFactory.from(`
ventas[12]{region,producto,trimestre,ventas}:
  Norte,Laptops,Q1,25000
  Norte,Laptops,Q2,28000
  Norte,Tablets,Q1,15000
  Norte,Tablets,Q2,18000
  Sur,Laptops,Q1,30000
  Sur,Laptops,Q2,32000
  Sur,Tablets,Q1,20000
  Sur,Tablets,Q2,22000
  Este,Laptops,Q1,22000
  Este,Laptops,Q2,25000
  Este,Tablets,Q1,12000
  Este,Tablets,Q2,14000
`);

// Tabla pivote: Ventas totales por región y producto
const ventasPorRegionProducto = ventasDetalle.pivot(
  'region',      // Filas: regiones
  'producto',    // Columnas: productos
  'ventas',      // Valores: ventas
  'sum'          // Sumar ventas
);

console.log(ventasPorRegionProducto.toTable());
// +--------+---------+---------+
// | region | Laptops | Tablets |
// +--------+---------+---------+
// | Norte  | 53000   | 33000   |
// | Sur    | 62000   | 42000   |
// | Este   | 47000   | 26000   |
// +--------+---------+---------+

// Ventas promedio por trimestre y región
const ventasPromedio = ventasDetalle.pivot(
  'trimestre',
  'region',
  'ventas',
  'avg'
);

console.log(ventasPromedio.all());
// [
//   { trimestre: 'Q1', Norte: 20000, Sur: 25000, Este: 17000 },
//   { trimestre: 'Q2', Norte: 23000, Sur: 27000, Este: 19500 }
// ]
```

**Casos de Uso:**
- Reportes ejecutivos con vistas resumen
- Análisis multidimensional
- Dashboards con métricas agregadas
- Comparación de KPIs por categorías

---

## Nivel 2: Métodos Muy Útiles

### replace()

**Descripción:** Reemplaza valores específicos en el dataset.

**Sintaxis:**
```typescript
// Reemplazo simple
.replace(toReplace: unknown, value: unknown, fields?: string[]): Toon

// Reemplazo con mapeo
.replace(mapping: Record<string, unknown>, fields?: string[]): Toon
```

**Ejemplo del Mundo Real: Normalización de Datos**

```typescript
// Datos de encuesta con respuestas inconsistentes
const encuesta = ToonFactory.from(`
respuestas[6]{pregunta,respuesta}:
  satisfaccion,Si
  satisfaccion,si
  satisfaccion,SI
  satisfaccion,No
  satisfaccion,no
  satisfaccion,N/A
`);

// Mapeo para normalizar respuestas
const respuestasNormalizadas = encuesta.replace({
  'Si': 'Sí',
  'si': 'Sí',
  'SI': 'Sí',
  'No': 'No',
  'no': 'No',
  'N/A': null
}, ['respuesta']);

// Códigos de estado HTTP a mensajes
const logs = ToonFactory.from(`
logs[4]{endpoint,status}:
  /api/users,200
  /api/products,404
  /api/orders,500
  /api/auth,200
`);

const logsConMensaje = logs.replace({
  '200': 'OK',
  '404': 'Not Found',
  '500': 'Server Error'
}, ['status']);

// Reemplazo simple de valores inválidos
const datos = ToonFactory.from(`
datos[3]{valor}:
  10
  -999
  25
`);

const sinSentinelas = datos.replace(-999, null, ['valor']);
```

**Casos de Uso:**
- Normalizar datos de entrada
- Limpiar valores sentinela (ej: -999, N/A)
- Estandarizar categorías
- Traducir códigos a descripciones

---

### sample()

**Descripción:** Obtiene una muestra aleatoria del dataset.

**Sintaxis:**
```typescript
.sample(n?: number, frac?: number): Toon
```

**Parámetros:**
- `n`: Número de filas a muestrear
- `frac`: Fracción del dataset a muestrear (0-1)

**Ejemplo del Mundo Real: Testing y QA**

```typescript
// Base de datos de 10,000 usuarios
const usuarios = /* ... dataset grande ... */;

// Muestreo para testing manual (100 usuarios aleatorios)
const muestraTest = usuarios.sample(100);

// Muestreo para QA (10% del total)
const muestraQA = usuarios.sample(undefined, 0.1);

// Split de entrenamiento/prueba para ML
const datosCompletos = /* ... dataset ... */;
const entrenamiento = datosCompletos.sample(undefined, 0.8);
const pruebaIds = entrenamiento.pluck('id');
const prueba = datosCompletos.filter(row =>
  !pruebaIds.includes(row.id)
);

console.log(`Entrenamiento: ${entrenamiento.count()} filas`);
console.log(`Prueba: ${prueba.count()} filas`);
```

**Casos de Uso:**
- División train/test para ML
- Muestreo para análisis exploratorio de datasets grandes
- Auditorías aleatorias
- Testing A/B

---

### duplicated()

**Descripción:** Marca filas duplicadas basándose en campos específicos.

**Sintaxis:**
```typescript
.duplicated(fields?: string[], keep?: 'first' | 'last' | false): boolean[]
```

**Parámetros:**
- `fields`: Campos a considerar para detectar duplicados
- `keep`:
  - `'first'`: Marca duplicados excepto la primera ocurrencia
  - `'last'`: Marca duplicados excepto la última ocurrencia
  - `false`: Marca todas las ocurrencias como duplicadas

**Ejemplo del Mundo Real: Detección de Fraude**

```typescript
// Transacciones bancarias
const transacciones = ToonFactory.from(`
transacciones[8]{id,email,tarjeta,monto,timestamp}:
  1,juan@email.com,1234,100.00,2024-01-15T10:00:00
  2,maria@email.com,5678,50.00,2024-01-15T10:05:00
  3,juan@email.com,1234,100.00,2024-01-15T10:00:00
  4,pedro@email.com,9012,200.00,2024-01-15T10:10:00
  5,juan@email.com,1234,100.00,2024-01-15T10:00:00
  6,maria@email.com,5678,50.00,2024-01-15T10:05:00
  7,ana@email.com,3456,75.00,2024-01-15T10:15:00
  8,pedro@email.com,9012,200.00,2024-01-15T10:10:00
`);

// Detectar transacciones duplicadas (posible fraude)
const esDuplicado = transacciones.duplicated(
  ['email', 'tarjeta', 'monto', 'timestamp'],
  'first'
);

const posibleFraude = transacciones.filter((row, idx) => esDuplicado[idx]);

console.log(`${posibleFraude.count()} transacciones sospechosas detectadas`);
console.log(posibleFraude.all());
// [
//   { id: 3, email: 'juan@email.com', tarjeta: '1234', monto: 100.00, ... },
//   { id: 5, email: 'juan@email.com', tarjeta: '1234', monto: 100.00, ... },
//   { id: 6, email: 'maria@email.com', tarjeta: '5678', monto: 50.00, ... },
//   { id: 8, email: 'pedro@email.com', tarjeta: '9012', monto: 200.00, ... }
// ]

// Mantener solo la última transacción por usuario
const duplicadosEmail = transacciones.duplicated(['email'], 'last');
const ultimaTransaccionPorUsuario = transacciones.filter((row, idx) =>
  !duplicadosEmail[idx]
);

// Encontrar TODAS las filas involucradas en duplicación
const todasDuplicadas = transacciones.duplicated(['email'], false);
const gruposDuplicados = transacciones.filter((row, idx) =>
  todasDuplicadas[idx]
);
```

**Casos de Uso:**
- Detección de fraude
- Limpieza de datos
- Deduplicación de registros
- Auditoría de calidad de datos

---

### shift()

**Descripción:** Desplaza valores hacia arriba o abajo en las columnas.

**Sintaxis:**
```typescript
.shift(periods: number, fields?: string[], fillValue?: unknown): Toon
```

**Parámetros:**
- `periods`: Número de posiciones a desplazar (positivo = hacia abajo, negativo = hacia arriba)
- `fields`: Campos a desplazar
- `fillValue`: Valor para rellenar posiciones vacías

**Ejemplo del Mundo Real: Análisis de Series Temporales**

```typescript
// Precios de acciones diarios
const preciosAcciones = ToonFactory.from(`
precios[7]{fecha,precio_cierre}:
  2024-01-15,150.25
  2024-01-16,152.50
  2024-01-17,151.75
  2024-01-18,154.00
  2024-01-19,153.50
  2024-01-20,155.25
  2024-01-21,156.00
`);

// Crear columna con precio del día anterior
const conPrecioAnterior = preciosAcciones
  .shift(1, ['precio_cierre'], null)
  .rename('precio_cierre', 'precio_ayer')
  .addField('precio_hoy', (row, idx) =>
    preciosAcciones.at(idx)?.precio_cierre
  )
  .addField('cambio_diario', row => {
    if (row.precio_ayer === null) return null;
    return row.precio_hoy - row.precio_ayer;
  });

console.log(conPrecioAnterior.all());
// [
//   { fecha: '2024-01-15', precio_ayer: null, precio_hoy: 150.25, cambio_diario: null },
//   { fecha: '2024-01-16', precio_ayer: 150.25, precio_hoy: 152.50, cambio_diario: 2.25 },
//   { fecha: '2024-01-17', precio_ayer: 152.50, precio_hoy: 151.75, cambio_diario: -0.75 },
//   ...
// ]

// Crear características para ML (lag features)
const features = preciosAcciones
  .shift(1, ['precio_cierre'], null)  // t-1
  .rename('precio_cierre', 'precio_t1')
  .shift(2, ['precio_cierre'], null)  // t-2
  .rename('precio_cierre', 'precio_t2');

// Predicción: precio del siguiente día
const conPrediccion = preciosAcciones
  .shift(-1, ['precio_cierre'], null)
  .rename('precio_cierre', 'precio_siguiente');
```

**Casos de Uso:**
- Crear características temporales para ML
- Calcular cambios diarios/mensuales
- Análisis de tendencias
- Comparaciones periodo a periodo

---

### Operaciones de String (.str)

**Descripción:** Namespace con métodos para manipular campos de texto.

#### .str.upper() / .str.lower()

Convierte texto a mayúsculas/minúsculas.

```typescript
// Normalizar códigos de país
const usuarios = ToonFactory.from(`
usuarios[3]{nombre,pais}:
  Ana,mx
  Pedro,ES
  Maria,Mx
`);

const paisesNormalizados = usuarios.str.upper(['pais']);
console.log(paisesNormalizados.pluck('pais')); // ['MX', 'ES', 'MX']
```

#### .str.trim()

Elimina espacios en blanco al inicio y final.

```typescript
// Limpiar entrada de formularios
const formularios = ToonFactory.from(`
datos[3]{nombre,email}:
  " Ana García ",ana@email.com
  Pedro López," pedro@email.com "
  "  Maria  ","  maria@email.com  "
`);

const datosLimpios = formularios
  .str.trim(['nombre'])
  .str.trim(['email']);
```

#### .str.contains()

Verifica si el campo contiene un substring.

```typescript
// Filtrar productos por categoría
const productos = ToonFactory.from(`
productos[5]{nombre,descripcion}:
  Laptop Pro,Computadora portátil de alto rendimiento
  Mouse Gaming,Mouse ergonómico para gaming
  Teclado Mecánico,Teclado mecánico RGB
  Monitor 4K,Monitor profesional 4K
  Webcam HD,Cámara web alta definición
`);

const productosGaming = productos.filter((row, idx) =>
  productos.str.contains('descripcion', 'gaming', false)[idx]
);

console.log(productosGaming.count()); // 1 (Mouse Gaming)
```

#### .str.split()

Divide strings en múltiples campos.

```typescript
// Separar nombre completo
const clientes = ToonFactory.from(`
clientes[3]{id,nombre_completo}:
  1,Ana María García López
  2,Pedro José Rodríguez
  3,María Fernanda Martínez Sánchez
`);

const nombresSeparados = clientes.str.split(
  'nombre_completo',
  ' ',
  ['primer_nombre', 'segundo_nombre', 'apellido_paterno', 'apellido_materno']
);

console.log(nombresSeparados.all());
// [
//   { id: 1, nombre_completo: 'Ana María García López',
//     primer_nombre: 'Ana', segundo_nombre: 'María',
//     apellido_paterno: 'García', apellido_materno: 'López' },
//   ...
// ]
```

#### .str.extract()

Extrae patrones usando expresiones regulares.

```typescript
// Extraer códigos postales de direcciones
const direcciones = ToonFactory.from(`
direcciones[3]{cliente,direccion}:
  1,Calle Principal 123 CP:28001 Madrid
  2,Avenida Central 456 CP:08002 Barcelona
  3,Plaza Mayor 789 CP:41001 Sevilla
`);

const conCodigoPostal = direcciones.str.extract(
  'direccion',
  /CP:(\d{5})/,
  'codigo_postal'
);

// Extraer precios de descripciones
const productos = ToonFactory.from(`
productos[2]{descripcion}:
  Laptop - Precio: $999.99 - En stock
  Mouse - Precio: $25.50 - Agotado
`);

const conPrecio = productos.str.extract(
  'descripcion',
  /\$[\d.]+/,
  'precio'
);
```

**Casos de Uso:**
- Limpieza y normalización de datos de texto
- Validación de formatos
- Extracción de información estructurada
- Preparación de datos para NLP

---

## Nivel 3: Nice to Have

### melt()

**Descripción:** Convierte datos de formato "ancho" a formato "largo" (unpivot).

**Sintaxis:**
```typescript
.melt(
  idVars: string[],        // Columnas identificadoras
  valueVars?: string[],    // Columnas a "derretir"
  varName?: string,        // Nombre para columna de variables
  valueName?: string       // Nombre para columna de valores
): Toon
```

**Ejemplo del Mundo Real: Datos de Ventas Trimestrales**

```typescript
// Formato ancho: una columna por trimestre
const ventasAncho = ToonFactory.from(`
ventas[3]{region,producto,Q1,Q2,Q3,Q4}:
  Norte,Laptops,25000,28000,30000,35000
  Norte,Tablets,15000,18000,20000,22000
  Sur,Laptops,30000,32000,35000,40000
`);

// Convertir a formato largo para análisis
const ventasLargo = ventasAncho.melt(
  ['region', 'producto'],  // Mantener estas columnas
  ['Q1', 'Q2', 'Q3', 'Q4'], // Derretir trimestres
  'trimestre',              // Nombre para la columna de trimestres
  'ventas'                  // Nombre para la columna de valores
);

console.log(ventasLargo.all());
// [
//   { region: 'Norte', producto: 'Laptops', trimestre: 'Q1', ventas: 25000 },
//   { region: 'Norte', producto: 'Laptops', trimestre: 'Q2', ventas: 28000 },
//   { region: 'Norte', producto: 'Laptops', trimestre: 'Q3', ventas: 30000 },
//   { region: 'Norte', producto: 'Laptops', trimestre: 'Q4', ventas: 35000 },
//   { region: 'Norte', producto: 'Tablets', trimestre: 'Q1', ventas: 15000 },
//   ...
// ]

// Ahora es fácil analizar por trimestre
const ventasPorTrimestre = ventasLargo
  .aggregate('trimestre', {
    total_ventas: { field: 'ventas', op: 'sum' },
    promedio: { field: 'ventas', op: 'avg' }
  });

console.log(ventasPorTrimestre.toTable());
// +-----------+--------------+----------+
// | trimestre | total_ventas | promedio |
// +-----------+--------------+----------+
// | Q1        | 70000        | 23333.33 |
// | Q2        | 78000        | 26000.00 |
// | Q3        | 85000        | 28333.33 |
// | Q4        | 97000        | 32333.33 |
// +-----------+--------------+----------+
```

**Casos de Uso:**
- Preparar datos para visualizaciones con librerías que requieren formato largo
- Análisis temporal donde cada observación es una fila
- Normalización de bases de datos
- Facilitar groupby y agregaciones

---

### crosstab()

**Descripción:** Crea una tabla de tabulación cruzada (contingency table).

**Sintaxis:**
```typescript
.crosstab(row: string, col: string, normalize?: boolean): Toon
```

**Parámetros:**
- `row`: Campo para filas
- `col`: Campo para columnas
- `normalize`: Si es true, muestra proporciones en lugar de conteos

**Ejemplo del Mundo Real: Análisis de Encuesta de Satisfacción**

```typescript
// Resultados de encuesta de satisfacción
const encuesta = ToonFactory.from(`
respuestas[30]{edad_grupo,satisfaccion}:
  18-25,Satisfecho
  18-25,Muy Satisfecho
  18-25,Satisfecho
  18-25,Neutral
  18-25,Satisfecho
  26-35,Muy Satisfecho
  26-35,Satisfecho
  26-35,Muy Satisfecho
  26-35,Satisfecho
  26-35,Muy Satisfecho
  36-45,Neutral
  36-45,Satisfecho
  36-45,Insatisfecho
  36-45,Neutral
  36-45,Satisfecho
  46-55,Satisfecho
  46-55,Muy Satisfecho
  46-55,Satisfecho
  46-55,Satisfecho
  46-55,Neutral
  56+,Neutral
  56+,Insatisfecho
  56+,Neutral
  56+,Satisfecho
  56+,Neutral
`);

// Tabla de contingencia: conteos
const tablaCruzada = encuesta.crosstab('edad_grupo', 'satisfaccion');

console.log(tablaCruzada.toTable());
// +------------+--------------+--------+---------------+---------+
// | edad_grupo | Insatisfecho | Neutral| Muy Satisfecho| Satisf. |
// +------------+--------------+--------+---------------+---------+
// | 18-25      | 0            | 1      | 1             | 3       |
// | 26-35      | 0            | 0      | 3             | 2       |
// | 36-45      | 1            | 2      | 0             | 2       |
// | 46-55      | 0            | 1      | 1             | 3       |
// | 56+        | 1            | 3      | 0             | 1       |
// +------------+--------------+--------+---------------+---------+

// Tabla normalizada (proporciones)
const tablaNormalizada = encuesta.crosstab('edad_grupo', 'satisfaccion', true);

console.log(tablaNormalizada.toTable());
// +------------+--------------+--------+---------------+---------+
// | edad_grupo | Insatisfecho | Neutral| Muy Satisfecho| Satisf. |
// +------------+--------------+--------+---------------+---------+
// | 18-25      | 0.00         | 0.04   | 0.04          | 0.12    |
// | 26-35      | 0.00         | 0.00   | 0.12          | 0.08    |
// | 36-45      | 0.04         | 0.08   | 0.00          | 0.08    |
// | 46-55      | 0.00         | 0.04   | 0.04          | 0.12    |
// | 56+        | 0.04         | 0.12   | 0.00          | 0.04    |
// +------------+--------------+--------+---------------+---------+
```

**Casos de Uso:**
- Análisis de encuestas
- Estudios de correlación entre variables categóricas
- Reportes de distribución
- Test de independencia chi-cuadrado

---

### interpolate()

**Descripción:** Rellena valores faltantes mediante interpolación.

**Sintaxis:**
```typescript
.interpolate(fields?: string[], method?: 'linear' | 'nearest'): Toon
```

**Parámetros:**
- `fields`: Campos a interpolar
- `method`:
  - `'linear'`: Interpolación lineal entre valores adyacentes
  - `'nearest'`: Usa el valor más cercano

**Ejemplo del Mundo Real: Sensores IoT**

```typescript
// Lecturas de sensores de temperatura con fallos
const sensorTemperatura = ToonFactory.from(`
lecturas[10]{timestamp,temperatura,humedad}:
  2024-01-15T10:00:00,22.5,65
  2024-01-15T10:15:00,23.0,
  2024-01-15T10:30:00,,66
  2024-01-15T10:45:00,,
  2024-01-15T11:00:00,24.5,68
  2024-01-15T11:15:00,25.0,69
  2024-01-15T11:30:00,,
  2024-01-15T11:45:00,26.0,71
  2024-01-15T12:00:00,26.5,72
  2024-01-15T12:15:00,27.0,
`);

// Interpolar linealmente valores faltantes
const datosCompletos = sensorTemperatura.interpolate(
  ['temperatura', 'humedad'],
  'linear'
);

console.log(datosCompletos.all());
// [
//   { timestamp: '2024-01-15T10:00:00', temperatura: 22.5, humedad: 65 },
//   { timestamp: '2024-01-15T10:15:00', temperatura: 23.0, humedad: 65.5 },
//   { timestamp: '2024-01-15T10:30:00', temperatura: 23.5, humedad: 66 },
//   { timestamp: '2024-01-15T10:45:00', temperatura: 24.0, humedad: 67 },
//   { timestamp: '2024-01-15T11:00:00', temperatura: 24.5, humedad: 68 },
//   ...
// ]

// Interpolación por valor más cercano (útil para datos categóricos numéricos)
const sensoresNumericos = sensorTemperatura.interpolate(
  ['temperatura'],
  'nearest'
);
```

**Métodos de Interpolación:**

1. **Linear**: Calcula valores intermedios proporcionales
   - Ejemplo: Entre 20 y 30, el punto medio sería 25

2. **Nearest**: Usa el valor no-nulo más cercano
   - Útil cuando no tiene sentido calcular valores intermedios

**Casos de Uso:**
- Rellenar gaps en series temporales
- Procesar datos de sensores con fallos
- Preparar datasets para ML (muchos modelos no aceptan nulos)
- Suavizar curvas con datos faltantes

---

## 🎓 Ejemplos Completos del Mundo Real

### Ejemplo 1: Pipeline de Análisis E-commerce Completo

```typescript
// Cargar datos de ventas
const ventasCrudas = ToonFactory.from(`...`);

// Pipeline completo de limpieza y análisis
const analisisFinal = ventasCrudas
  // 1. Limpiar datos
  .dropna(['cliente_id', 'producto_id', 'monto'], 'any')
  .fillna(0, ['descuento'])
  .replace({ 'CANCELLED': null, 'PENDING': null }, ['estado'])
  .dropna(['estado'], 'any')

  // 2. Detectar y eliminar duplicados
  .filter((row, idx) =>
    !ventasCrudas.duplicated(['orden_id'], 'first')[idx]
  )

  // 3. Normalizar datos
  .str.upper(['categoria'])
  .str.trim(['producto_nombre'])

  // 4. Crear características
  .addField('monto_final', row =>
    row.monto - (row.monto * row.descuento / 100)
  )
  .addField('mes', row => row.fecha.substring(0, 7))

  // 5. Análisis y agregación
  .aggregate('mes', {
    total_ventas: { field: 'monto_final', op: 'sum' },
    num_ordenes: { field: 'orden_id', op: 'count' },
    ticket_promedio: { field: 'monto_final', op: 'avg' }
  })

  // 6. Ordenar y exportar
  .sortBy([{ field: 'mes', order: 'asc' }]);

console.log(analisisFinal.toTable());
```

### Ejemplo 2: Sistema de Recomendaciones

```typescript
// Datos de usuarios y productos
const usuarios = ToonFactory.from(`...`);
const productos = ToonFactory.from(`...`);
const compras = ToonFactory.from(`...`);

// Crear matriz de usuario-producto
const matrizCompras = compras
  .pivot('usuario_id', 'producto_id', 'cantidad', 'sum')
  .fillna(0);

// Encontrar usuarios similares
const usuarioActual = 123;
const comprasUsuario = compras
  .filter(row => row.usuario_id === usuarioActual);

const productosComprados = comprasUsuario.pluck('producto_id');

// Usuarios que compraron productos similares
const usuariosSimilares = compras
  .filter(row => productosComprados.includes(row.producto_id))
  .filter(row => row.usuario_id !== usuarioActual)
  .countBy('usuario_id');

// Productos recomendados
const recomendaciones = compras
  .filter(row => Object.keys(usuariosSimilares).includes(String(row.usuario_id)))
  .filter(row => !productosComprados.includes(row.producto_id))
  .aggregate('producto_id', {
    score: { field: 'cantidad', op: 'sum' }
  })
  .sortBy([{ field: 'score', order: 'desc' }])
  .take(10);
```

---

## 📚 Mejores Prácticas

### 1. Orden de Operaciones

El orden importa para performance:

```typescript
// ✅ BIEN: Filtrar primero, luego procesar
const resultado = datos
  .filter(row => row.activo === true)  // Reduce el dataset
  .dropna(['campo_importante'])
  .fillna(0)
  .describe();

// ❌ MAL: Procesar todo antes de filtrar
const resultado = datos
  .fillna(0)
  .describe()
  .filter(row => row.activo === true);  // Trabajo innecesario
```

### 2. Manejo de Nulos

Decide estrategia según el caso:

```typescript
// Para análisis: eliminar
const paraAnalisis = datos.dropna();

// Para reportes: rellenar con valor por defecto
const paraReporte = datos.fillna('N/A');

// Para ML: interpolar
const paraML = datos.interpolate(['feature1', 'feature2'], 'linear');
```

### 3. Validación de Datos

Siempre valida después de merge:

```typescript
const merged = tabla1.merge(tabla2, { on: 'id', how: 'left' });

// Verificar que el merge fue exitoso
const conNulos = merged.filter(row => row.campo_de_tabla2 === null);
if (!conNulos.isEmpty()) {
  console.warn(`${conNulos.count()} filas sin match en merge`);
}
```

---

## 🔍 Comparación con Pandas

| ToonJS | Pandas | Notas |
|--------|--------|-------|
| `.fillna(0)` | `.fillna(0)` | Sintaxis idéntica |
| `.dropna()` | `.dropna()` | Sintaxis idéntica |
| `.describe()` | `.describe()` | Retorna objeto en lugar de DataFrame |
| `.merge(..., how='left')` | `.merge(..., how='left')` | Sintaxis similar |
| `.pivot()` | `.pivot_table()` | Similar a pivot_table |
| `.sample(100)` | `.sample(100)` | Sintaxis idéntica |
| `.duplicated()` | `.duplicated()` | Sintaxis idéntica |
| `.shift(1)` | `.shift(1)` | Sintaxis idéntica |
| `.str.upper()` | `.str.upper()` | Mismo namespace |
| `.melt()` | `.melt()` | Sintaxis muy similar |
| `.crosstab()` | `pd.crosstab()` | Método de instancia vs función |
| `.interpolate()` | `.interpolate()` | Sintaxis similar |

---

## 📞 Soporte y Recursos

- **Documentación**: [README.md](README.md)
- **GitHub**: [github.com/cescofors75/toonjs](https://github.com/cescofors75/toonjs)
- **NPM**: [@cescofors/toonjs](https://www.npmjs.com/package/@cescofors/toonjs)
- **Issues**: [github.com/cescofors75/toonjs/issues](https://github.com/cescofors75/toonjs/issues)

---

**Licencia**: MIT © 2025
