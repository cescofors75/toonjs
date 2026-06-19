# ⚙️ ToonJS — Core Columnar Rust → WASM

Motor columnar opcional escrito en **Rust** y compilado a **WebAssembly**. La
data vive en la memoria lineal de WASM; las operaciones encadenadas no cruzan el
límite JS↔WASM, que es la única arquitectura donde WASM realmente compensa
(estilo Polars/Arrow).

> Estado: **vertical slice** funcional con paridad probada contra el motor JS.
> No es aún paridad completa de la API — ver *Roadmap*.

---

## Arquitectura

```
 texto TOON ──tj_alloc+tj_parse──▶  [ DataFrame en memoria WASM ]
                                         │  (handle u32)
   JS (fachada ToonWasm)                 ├─ tj_filter_range ─▶ nuevo handle
   solo guarda handles  ◀───────────────┤─ tj_multiply_scalar ─▶ nuevo handle
                                         ├─ tj_normalize ─▶ nuevo handle
   resultados escalares ◀── tj_stat ─────┤
   buffers (TOON/f64)  ◀── (ptr<<32)|len ┘  (JS lee y libera)
```

- **Sin `wasm-bindgen` ni crates externos.** Solo `core`/`std` y funciones
  `#[no_mangle] extern "C"`. El *glue* JS está escrito a mano en `wasm/loader.ts`.
- **Registro global** de `DataFrame`s (`thread_local! HashMap<u32, DataFrame>`),
  single-thread (WASM sin atomics). Cada operación devuelve un nuevo handle.
- **Convención de buffers:** las funciones que devuelven datos retornan un `u64`
  empaquetado `(ptr << 32) | len`; JS lo recibe como BigInt, lee la memoria y
  libera con `tj_free` / `tj_free_f64`.
- **Inferencia de tipos** idéntica al motor JS: numérico estricto (rechaza ceros
  a la izquierda), booleanos, y huecos → `NaN`.

### Ficheros

| Ruta | Qué es |
|------|--------|
| `core/Cargo.toml` | Crate Rust (`cdylib`). |
| `core/src/lib.rs` | Exports `extern "C"`, registro, memoria. |
| `core/src/parser.rs` | Parser TOON + inferencia de tipos. |
| `core/src/dataframe.rs` | Store columnar (`F64`/`Str`/`Bool`). |
| `core/src/serialize.rs` | `to_toon` con escapado RFC 4180. |
| `scripts/embed-wasm.cjs` | Embebe el `.wasm` como base64 en TS. |
| `wasm/loader.ts` | Fachada `ToonWasm` + carga universal. |
| `wasm/toon-core.wasm.ts` | **Generado**: binario en base64. |

---

## Build

Requiere toolchain Rust + target wasm:

```bash
rustup target add wasm32-unknown-unknown
npm run build:wasm        # cargo build + embebe el base64 en wasm/
```

El binario embebido (`wasm/toon-core.wasm.ts`) se versiona para que la librería
funcione **sin** toolchain de Rust (consumidores npm, CI). Solo hay que
regenerarlo al tocar el código Rust.

---

## Uso

```ts
import { initToonWasm, ToonWasm } from '@cescofors/toonjs/wasm';

await initToonWasm(); // carga el WASM una vez

const t = ToonWasm.from(`big[3]{id,price}:\n  1,9.9\n  2,19.9\n  3,29.9`);

const filtered = t.filterRange('price', 10, 30); // permanece en WASM
console.log(filtered.stats('price'));            // { min, max, avg, sum, count }
console.log(filtered.toToon());

t.free();          // ⚠️ liberar handles para evitar fugas en memoria WASM
filtered.free();
```

### API actual

Acceso/estructura: `count`, `ncols`, `fields`, `colType`, `columnF64`, `toToon`,
`free`.
Operaciones: `stats`, `filterRange`, `multiplyScalar`, `normalize`, `sortBy`,
`correlation`, `correlationMatrix`, `cumsum`, `diff`, `groupAggregate`.

---

## Benchmark (200k filas, ~3.5 MB TOON; matriz: 20k×30)

| Operación | JS | WASM | Speedup |
|-----------|----|------|---------|
| parse | 176 ms | 104 ms | **1.70x** |
| filterRange + stats | 7.9 ms | 4.3 ms | **1.85x** |
| correlationMatrix | 187 ms | 11 ms | **16.7x** |

**Lectura honesta:**

- En operaciones **dominadas por bucles numéricos simples** (parse, filter+stats),
  WASM da ~**1.7–1.9x**, *no* 10x: el JIT ya optimiza muy bien los bucles sobre
  `Float64Array` y copiar la entrada a memoria WASM cuesta. Con el **mismo**
  algoritmo naïve, `correlationMatrix` daba apenas **1.07x**.
- El salto a **16.7x** viene de poder **mejorar el algoritmo** en el core: una
  covarianza en **una sola pasada** (`E[xy] − E[x]E[y]`) en vez de las ~6 pasadas
  por par del naïve. WASM aporta el factor constante (~1.8x); el resto es el
  algoritmo. *Esta es la verdadera razón para tener un core propio:* control total
  sobre layout de memoria y algoritmos, no la magia de WASM en sí.

---

## Roadmap a paridad completa

1. ✅ **Operaciones pesadas in-WASM**: `sortBy`, `groupAggregate`, `correlation`/
   `correlationMatrix` (single-pass), `cumsum`, `diff`. *(hecho)*
2. **Pendientes**: `rolling`, `pctChange`, `standardize`, `join`, `aggregate`
   multi-columna, `rank`/`percentile`.
3. **Acceso a filas/JSON** sin reconstrucción cara (cursor columnar).
3. **Fachada drop-in**: que `ToonWasm` implemente la misma interfaz que `Toon`
   para intercambiar motor sin cambiar el código de usuario.
4. **Memoria**: API estilo `using`/disposable para liberar handles automáticamente.
5. **SIMD** (`wasm32` + `simd128`) en los kernels numéricos.
6. **Tamaño**: `wasm-opt -Oz` reduce el binario (actualmente ~96 KB).
