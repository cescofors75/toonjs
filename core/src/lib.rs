//! ToonJS columnar core (Rust -> WASM).
//!
//! El módulo posee toda la data columnar en su memoria lineal. JS interactúa
//! mediante:
//!   - `tj_alloc`/`tj_free`: reservar/liberar buffers para pasar texto de entrada
//!     y leer resultados.
//!   - handles `u32`: identifican DataFrames en un registro global. Las
//!     operaciones reciben handles y devuelven nuevos handles, de modo que la
//!     data NUNCA cruza el límite JS<->WASM entre operaciones encadenadas.
//!
//! Convención de retorno para buffers: se devuelve un `u64` empaquetado como
//! `(ptr << 32) | len`, que JS recibe como BigInt y desempaqueta.

mod dataframe;
mod ops;
mod parser;
mod serialize;

use dataframe::{Column, DataFrame};
use std::cell::RefCell;
use std::collections::HashMap;

// ----- Registro global de DataFrames (single-thread en wasm) -----

thread_local! {
    static REGISTRY: RefCell<HashMap<u32, DataFrame>> = RefCell::new(HashMap::new());
    static NEXT_ID: RefCell<u32> = const { RefCell::new(1) };
}

fn store(df: DataFrame) -> u32 {
    let id = NEXT_ID.with(|n| {
        let mut n = n.borrow_mut();
        let id = *n;
        *n += 1;
        id
    });
    REGISTRY.with(|r| r.borrow_mut().insert(id, df));
    id
}

fn with_df<T>(handle: u32, f: impl FnOnce(&DataFrame) -> T, default: T) -> T {
    REGISTRY.with(|r| match r.borrow().get(&handle) {
        Some(df) => f(df),
        None => default,
    })
}

// ----- Gestión de memoria expuesta a JS -----

/// Reserva `len` bytes y devuelve el puntero. JS escribe ahí la entrada.
#[no_mangle]
pub extern "C" fn tj_alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

/// Libera un buffer previamente reservado con `tj_alloc`.
///
/// # Safety
/// `ptr`/`len` deben provenir de una llamada previa a `tj_alloc`.
#[no_mangle]
pub unsafe extern "C" fn tj_free(ptr: *mut u8, len: usize) {
    if !ptr.is_null() {
        drop(Vec::from_raw_parts(ptr, 0, len));
    }
}

/// Libera un buffer de `len` f64 devuelto por `tj_column_f64`.
/// Es necesario un free dedicado por la alineación de f64 (8 bytes).
///
/// # Safety
/// `ptr`/`len` deben provenir de `tj_column_f64`.
#[no_mangle]
pub unsafe extern "C" fn tj_free_f64(ptr: *mut f64, len: usize) {
    if !ptr.is_null() {
        drop(Vec::from_raw_parts(ptr, 0, len));
    }
}

/// Empaqueta (ptr, len) en un u64 para devolver buffers a JS.
fn pack(ptr: *const u8, len: usize) -> u64 {
    ((ptr as u64) << 32) | (len as u64)
}

/// Mueve un `String` a memoria estable y devuelve su (ptr,len) empaquetado.
/// JS debe leerlo y luego llamar a `tj_free(ptr, len)`.
fn return_string(s: String) -> u64 {
    let bytes = s.into_bytes();
    let len = bytes.len();
    let mut boxed = bytes.into_boxed_slice();
    let ptr = boxed.as_mut_ptr();
    std::mem::forget(boxed);
    pack(ptr, len)
}

/// Mueve un `Vec<f64>` a memoria estable y devuelve (ptr,len-en-elementos)
/// empaquetado. JS lo lee como Float64Array y libera con `tj_free_f64`.
fn return_f64(data: Vec<f64>) -> u64 {
    let len = data.len();
    let mut boxed = data.into_boxed_slice();
    let ptr = boxed.as_mut_ptr() as *const u8;
    std::mem::forget(boxed);
    pack(ptr, len)
}

// ----- Operaciones expuestas a JS -----

/// Parsea texto TOON (UTF-8 en `ptr..ptr+len`). Devuelve un handle (0 = error).
///
/// # Safety
/// `ptr`/`len` deben apuntar a UTF-8 válido reservado con `tj_alloc`.
#[no_mangle]
pub unsafe extern "C" fn tj_parse(ptr: *const u8, len: usize) -> u32 {
    let slice = std::slice::from_raw_parts(ptr, len);
    let text = match std::str::from_utf8(slice) {
        Ok(t) => t,
        Err(_) => return 0,
    };
    match parser::parse(text) {
        Some(df) => store(df),
        None => 0,
    }
}

/// Libera un DataFrame del registro.
#[no_mangle]
pub extern "C" fn tj_release(handle: u32) {
    REGISTRY.with(|r| r.borrow_mut().remove(&handle));
}

/// Número de filas.
#[no_mangle]
pub extern "C" fn tj_count(handle: u32) -> u32 {
    with_df(handle, |df| df.nrows as u32, 0)
}

/// Número de columnas.
#[no_mangle]
pub extern "C" fn tj_ncols(handle: u32) -> u32 {
    with_df(handle, |df| df.fields.len() as u32, 0)
}

/// Código de tipo de la columna `col` (0=number,1=string,2=boolean; 255=error).
#[no_mangle]
pub extern "C" fn tj_col_type(handle: u32, col: u32) -> u32 {
    with_df(
        handle,
        |df| match df.col_index(col) {
            Some(i) => df.columns[i].type_code(),
            None => 255,
        },
        255,
    )
}

/// Estadístico de una columna numérica.
/// `which`: 0=min, 1=max, 2=sum, 3=avg, 4=count.
#[no_mangle]
pub extern "C" fn tj_stat(handle: u32, col: u32, which: u32) -> f64 {
    with_df(
        handle,
        |df| {
            let idx = match df.col_index(col) {
                Some(i) => i,
                None => return 0.0,
            };
            let column = &df.columns[idx];
            let mut min = f64::INFINITY;
            let mut max = f64::NEG_INFINITY;
            let mut sum = 0.0;
            let mut count = 0u64;
            for i in 0..df.nrows {
                let v = column.num_at(i);
                if !v.is_nan() {
                    if v < min {
                        min = v;
                    }
                    if v > max {
                        max = v;
                    }
                    sum += v;
                    count += 1;
                }
            }
            if count == 0 {
                return 0.0;
            }
            match which {
                0 => min,
                1 => max,
                2 => sum,
                3 => sum / count as f64,
                4 => count as f64,
                _ => 0.0,
            }
        },
        0.0,
    )
}

/// Filtra filas donde `col` está en [min, max]. Devuelve un nuevo handle.
#[no_mangle]
pub extern "C" fn tj_filter_range(handle: u32, col: u32, min: f64, max: f64) -> u32 {
    let new_df = REGISTRY.with(|r| {
        let reg = r.borrow();
        let df = reg.get(&handle)?;
        let idx = df.col_index(col)?;
        let column = &df.columns[idx];
        let mut indices = Vec::new();
        for i in 0..df.nrows {
            let v = column.num_at(i);
            if !v.is_nan() && v >= min && v <= max {
                indices.push(i);
            }
        }
        Some(df.take_rows(&indices))
    });
    match new_df {
        Some(df) => store(df),
        None => 0,
    }
}

/// Multiplica por un escalar todas las columnas numéricas (SIMD). Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_multiply_scalar(handle: u32, scalar: f64) -> u32 {
    op_new(handle, |df| Some(ops::multiply_scalar(df, scalar)))
}

/// Normaliza (min-max -> [0,1]) todas las columnas numéricas. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_normalize(handle: u32) -> u32 {
    let new_df = REGISTRY.with(|r| {
        let reg = r.borrow();
        let df = reg.get(&handle)?;
        let columns = df
            .columns
            .iter()
            .map(|c| match c {
                Column::F64(v) => {
                    let mut min = f64::INFINITY;
                    let mut max = f64::NEG_INFINITY;
                    for &x in v {
                        if !x.is_nan() {
                            if x < min {
                                min = x;
                            }
                            if x > max {
                                max = x;
                            }
                        }
                    }
                    if min.is_infinite() {
                        return Column::F64(v.clone());
                    }
                    let range = max - min;
                    let out = v
                        .iter()
                        .map(|&x| {
                            if x.is_nan() {
                                f64::NAN
                            } else if range == 0.0 {
                                0.0
                            } else {
                                (x - min) / range
                            }
                        })
                        .collect();
                    Column::F64(out)
                }
                other => other.clone(),
            })
            .collect();
        Some(DataFrame {
            name: df.name.clone(),
            fields: df.fields.clone(),
            columns,
            nrows: df.nrows,
        })
    });
    match new_df {
        Some(df) => store(df),
        None => 0,
    }
}

/// Serializa un DataFrame a TOON. Devuelve (ptr<<32)|len; JS lee y luego `tj_free`.
#[no_mangle]
pub extern "C" fn tj_to_toon(handle: u32) -> u64 {
    let s = with_df(handle, |df| serialize::to_toon(df), String::new());
    return_string(s)
}

/// Copia una columna numérica a un buffer f64 nuevo. Devuelve (ptr<<32)|len
/// (len = nº de elementos f64). JS construye un Float64Array y luego libera con
/// `tj_free(ptr, len*8)`.
#[no_mangle]
pub extern "C" fn tj_column_f64(handle: u32, col: u32) -> u64 {
    let data: Vec<f64> = with_df(
        handle,
        |df| match df.col_index(col) {
            Some(i) => (0..df.nrows).map(|r| df.columns[i].num_at(r)).collect(),
            None => Vec::new(),
        },
        Vec::new(),
    );
    return_f64(data)
}

/// Devuelve el nombre de un campo. (ptr<<32)|len, JS lee y `tj_free`.
#[no_mangle]
pub extern "C" fn tj_field_name(handle: u32, col: u32) -> u64 {
    let s = with_df(
        handle,
        |df| df.fields.get(col as usize).cloned().unwrap_or_default(),
        String::new(),
    );
    return_string(s)
}

// ----- Operaciones pesadas (ops.rs) -----

/// Aplica una operación que produce un nuevo DataFrame y devuelve su handle.
fn op_new(handle: u32, f: impl FnOnce(&DataFrame) -> Option<DataFrame>) -> u32 {
    let new_df = REGISTRY.with(|r| {
        let reg = r.borrow();
        let df = reg.get(&handle)?;
        f(df)
    });
    match new_df {
        Some(df) => store(df),
        None => 0,
    }
}

/// Ordena por columna `col` (desc != 0 invierte). Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_sort_by(handle: u32, col: u32, desc: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::sort_by(df, i, desc != 0))
    })
}

/// Correlación de Pearson entre dos columnas.
#[no_mangle]
pub extern "C" fn tj_correlation(handle: u32, c1: u32, c2: u32) -> f64 {
    with_df(
        handle,
        |df| match (df.col_index(c1), df.col_index(c2)) {
            (Some(a), Some(b)) => ops::correlation(df, a, b),
            _ => 0.0,
        },
        0.0,
    )
}

/// Matriz de correlación (ncols x ncols). Devuelve (ptr<<32)|len f64; `tj_free_f64`.
#[no_mangle]
pub extern "C" fn tj_correlation_matrix(handle: u32) -> u64 {
    let data = with_df(handle, ops::correlation_matrix, Vec::new());
    return_f64(data)
}

/// Suma acumulada de `col`. Añade columna `${field}_cumsum`. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_cumsum(handle: u32, col: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::cumsum(df, i))
    })
}

/// Diferencia con `periods` atrás. Añade `${field}_diff_${periods}`. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_diff(handle: u32, col: u32, periods: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::diff(df, i, periods as usize))
    })
}

/// Agrupa por `group_col` y agrega `value_col`.
/// `op`: 0=sum,1=avg,2=min,3=max,4=count. Nuevo handle (cols: group, value).
#[no_mangle]
pub extern "C" fn tj_group_agg(handle: u32, group_col: u32, value_col: u32, op: u32) -> u32 {
    op_new(handle, |df| {
        let g = df.col_index(group_col)?;
        let v = df.col_index(value_col)?;
        Some(ops::group_agg(df, g, v, op))
    })
}

/// Z-score de todas las columnas numéricas. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_standardize(handle: u32) -> u32 {
    op_new(handle, |df| Some(ops::standardize(df)))
}

/// Ventana deslizante (op: 0=sum,1=avg,2=min,3=max). Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_rolling(handle: u32, col: u32, window: u32, op: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::rolling(df, i, window as usize, op))
    })
}

/// Cambio porcentual con `periods` atrás. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_pct_change(handle: u32, col: u32, periods: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::pct_change(df, i, periods as usize))
    })
}

/// Ranking descendente (method: 0=dense,1=min,2=max). Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_rank(handle: u32, col: u32, method: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::rank(df, i, method))
    })
}

/// Percentil de cada valor. Nuevo handle.
#[no_mangle]
pub extern "C" fn tj_percentile(handle: u32, col: u32) -> u32 {
    op_new(handle, |df| {
        let i = df.col_index(col)?;
        Some(ops::percentile(df, i))
    })
}
