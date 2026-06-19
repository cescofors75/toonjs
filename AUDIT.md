# 🔍 Auditoría ToonJS

Auditoría de bugs, mejoras y optimizaciones. Fecha: 2026-06-19.

Estado: **288 tests en verde** (275 originales + 13 nuevos), `tsc` limpio, build OK.

> Segunda iteración: se han implementado además los puntos A, B, C, D, F y G
> que inicialmente estaban como "recomendados" (ver sección correspondiente).

---

## ✅ Corregido en esta rama

### 1. 🔴 CRÍTICO — El motor columnar `Float64Array` nunca se activaba
**Antes:** `ToonParser` asignaba el tipo `'string'` a **todas** las columnas. Como
el constructor de `Toon` solo crea `Float64Array` cuando el tipo es `'number'`,
**cada** dataset creado con `ToonFactory.from()` usaba arrays normales. La
"Float64Array Columnar Architecture / hasta 10x más rápido" —la característica
estrella del proyecto— era **código muerto** por la vía normal de uso.

Verificado empíricamente: `col id -> Array`, `col val -> Array`.

**Ahora:** el parser hace inferencia de tipo por columna (dos pasadas). Una
columna se marca `'number'` solo si **todos** sus valores presentes son numéricos
→ se usa `Float64Array` de verdad.

### 2. 🔴 CRÍTICO — Corrupción de datos (ceros a la izquierda)
`parseValue` convertía cualquier string "numérico" a número:
`"00123" → 123`. Códigos postales, IDs, teléfonos... corrompidos silenciosamente.

**Ahora:** el regex de inferencia rechaza enteros con cero a la izquierda
(`/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/`), por lo que esas columnas
permanecen como `string` y conservan el valor original.

### 3. 🟠 Los booleanos nunca se parseaban
La rama `type === 'boolean'` era inalcanzable (el tipo siempre era `'string'`).
`"true"` se quedaba como string. **Ahora** se infieren y convierten a `boolean`.

### 4. 🟠 Valores ausentes coercionados a `0` en columnas numéricas
El constructor hacía `Number(null) === 0`, contaminando `stats`, `filterRange`,
medias, etc. **Ahora** los huecos (`null`/`undefined`) se mapean a `NaN` y se
excluyen correctamente de los cálculos.

### 5. 🟠 `rank('min')` y `rank('max')` daban el mismo resultado
La lógica de empates era incorrecta: ambos métodos calculaban `i + 1`.
**Ahora** se agrupan los empates: `min` toma la posición más baja del grupo,
`max` la más alta, `dense` el nº de valores distintos. (Tests añadidos.)

### 6. 🟠 Desbordamiento de pila con datasets grandes
`Math.min(...values)` / `Math.max(...values)` en `aggregate` y `binning`
lanza `RangeError: Maximum call stack size exceeded` con arrays grandes
(~100k+ elementos) — relevante dado el dataset de 1.5 MB del repo.
**Ahora** se usan bucles. (Test con 200k filas añadido.)

### 7. 🟡 `logger.ts` arrancaba un *worker thread* muerto en cada import
`const fastDevTransport = pino.transport({...})` creaba un transporte (worker
thread) que **nunca se usaba**. Coste de arranque y un hilo colgando en cada
`import` de la librería. **Eliminado.**

### 8. 🔴 `package.json` `exports` apuntaba a un archivo inexistente
`exports["."].import = "./build/release.js"` (salida de AssemblyScript que no
existe y que ni siquiera está en `files`). En Node moderno `exports` tiene
prioridad sobre `main`, así que **el paquete publicado no se podía importar**.
**Ahora** apunta a `./dist/index.js` + `./dist/index.d.ts` (verificado:
resuelve y exporta `Toon, ToonFactory, ToonParser, logger`).

### 9. 🟡 Scripts `lint`/`format` apuntaban a `src/**` (no existe)
Los fuentes están en la raíz. Corregido a `*.ts`.

### 10. 🟢 Refactor: duplicación parse/parseMultiple
`parse()` y `parseMultiple()` eran ~95% idénticos. Extraído un núcleo
`parseRaw()` compartido.

---

## ✅ Corregido (segunda iteración)

### A. 🔴 `toCSV()` / `toToon()` no escapaban separadores → **CORREGIDO**
Si un valor contenía `,`, `"` o salto de línea, la salida quedaba corrupta y el
**round-trip se rompía**. Añadido `csv-util.ts` con `escapeField`/`splitFields`
(comillado estilo RFC 4180). Lo usan tanto las exportaciones como el parser.
Test de round-trip con comas y comillas añadido.

### B. 🟠 README desactualizado → **CORREGIDO**
- Eliminado el falso **"Zero Dependencies"** (se documenta `pino`).
- Nº de tests unificado a **288**.
- Import del ejemplo en español corregido a `@cescofors/toonjs`.
- Enlaces muertos a `docs/PERFORMANCE.md` reemplazados por `node benchmark-v2.js`.

### C. 🟠 `join` left/right incompleto → **CORREGIDO**
Los left/right join ahora rellenan con `null` los campos del lado sin
coincidencia (esquema consistente; en columnas numéricas el ausente es `NaN`).
Test añadido.

### D. 🟡 El parser ignoraba el `[count]` declarado → **CORREGIDO**
`materialize()` avisa (vía `logger.warn`, no fatal) si el `[N]` declarado no
coincide con las filas reales.

### F. 🟡 Reconstrucciones de filas innecesarias → **CORREGIDO**
Migrados a acceso columnar directo (sin reconstruir todas las filas):
`first`, `last`, `at`, `isEmpty`, `distinct`, `pluck`, `countBy`, `some`,
`every`, `findIndex`.

### G. 🟢 Menores → **CORREGIDO**
- `addField` ahora infiere el tipo del valor calculado (number/boolean/string).
- `percentile`: eliminada la rama inalcanzable `: 100`.

---

## 📋 Pendiente (requiere decisión de diseño)

### E. 🟡 `assembly/` (WASM) nunca se enlaza
`multiplyScalar`/`transpose` en `assembly/index.ts` existen pero `toon.ts` usa
implementaciones JS puras, y el build de AssemblyScript no se genera ni se
incluye en `files`. Integrarlo de verdad (carga del `.wasm`, gestión de memoria,
fallback) es una **funcionalidad nueva**, no una corrección de auditoría, por lo
que se deja documentado para decisión: o se cablea, o se elimina junto a la
dependencia `@assemblyscript/loader`.

---

## Resumen
| Severidad | Corregidos | Pendientes |
|-----------|-----------|------------|
| 🔴 Crítico | 4 | 0 |
| 🟠 Alto    | 6 | 0 |
| 🟡 Medio   | 4 | 1 |
| 🟢 Bajo    | 2 | 0 |
