# 🔍 Auditoría ToonJS

Auditoría de bugs, mejoras y optimizaciones. Fecha: 2026-06-19.

Estado: **285 tests en verde** (275 originales + 10 nuevos), `tsc` limpio, build OK.

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

## 📋 Recomendado (no modificado — requiere decisión de diseño)

### A. 🔴 `toCSV()` / `toToon()` no escapan separadores
Si un valor contiene `,`, `"` o salto de línea, la salida queda corrupta y el
**round-trip se rompe** (`parse(toCSV(x)) != x`). El parser tampoco soporta
valores con comas. Solución: comillado estilo RFC 4180 en exportación + parseo.
No incluido aquí por ser un cambio de formato con impacto en la compatibilidad.

### B. 🟠 README desactualizado / inexacto
- Afirma **"Zero Dependencies"**, pero hay deps reales: `pino`, `pino-pretty`,
  `@assemblyscript/loader`.
- Incoherencia en el nº de tests ("102" vs "275+").
- Ejemplo en español importa de `@cesco/toon` (paquete inexistente; debería ser
  `@cescofors/toonjs`).
- Enlaza a `docs/PERFORMANCE.md` y `CONTRIBUTING.md` que no están en el repo.

### C. 🟠 `join` left/right incompleto
No rellena con `null` los campos del lado sin coincidencia y, si ambos datasets
comparten nombre de columna, uno sobrescribe al otro (spread `{...a, ...b}`).

### D. 🟡 El parser ignora el `[count]` declarado
`name[N]{...}` no valida que `N` coincida con el nº real de filas; sería una
comprobación de integridad barata.

### E. 🟡 `assembly/` (WASM) nunca se enlaza
`multiplyScalar`/`transpose` en `assembly/index.ts` existen pero `toon.ts` usa
implementaciones JS puras. La integración WASM está incompleta (característica a
medias o código muerto según la intención).

### F. 🟡 Reconstrucciones de filas innecesarias (rendimiento)
`first/last/at/some/every/distinct/pluck/countBy/sort/...` usan el getter
`dataset`/`rows`, que **reconstruye todas las filas** (O(filas·campos)) en cada
llamada. Operan sobre el modelo de filas en vez de aprovechar las columnas.
Migrarlos al acceso columnar (como ya hacen `stats`/`filterRange`) daría la
ventaja de rendimiento que promete el README.

### G. 🟢 Otros menores
- `addField` marca el nuevo campo como `'string'` aunque el callback devuelva número.
- `percentile`: la rama `: 100` es inalcanzable (`findIndex` siempre encuentra el valor).
- `benchmark-v2.js` construye con `schema: number` directo, así que mide el path
  columnar que el parser **no** activaba — no reflejaba el uso real.

---

## Resumen
| Severidad | Corregidos | Recomendados |
|-----------|-----------|--------------|
| 🔴 Crítico | 3 | 1 |
| 🟠 Alto    | 4 | 2 |
| 🟡 Medio   | 2 | 3 |
| 🟢 Bajo    | 1 | 1 |
