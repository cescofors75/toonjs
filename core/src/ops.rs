//! Operaciones de cómputo pesado sobre el store columnar. Todo permanece en
//! memoria WASM: la entrada es un `&DataFrame` y la salida un nuevo `DataFrame`
//! o un escalar/buffer, sin volver a JS entre pasos.

use crate::dataframe::{Column, DataFrame};
use std::collections::HashMap;

/// Ordena por una columna. `desc` invierte el orden. Estable.
pub fn sort_by(df: &DataFrame, col: usize, desc: bool) -> DataFrame {
    let mut idx: Vec<usize> = (0..df.nrows).collect();
    let column = &df.columns[col];

    match column {
        Column::Str(v) => {
            idx.sort_by(|&a, &b| v[a].cmp(&v[b]));
        }
        _ => {
            idx.sort_by(|&a, &b| {
                let (x, y) = (column.num_at(a), column.num_at(b));
                // NaN al final.
                match (x.is_nan(), y.is_nan()) {
                    (true, true) => std::cmp::Ordering::Equal,
                    (true, false) => std::cmp::Ordering::Greater,
                    (false, true) => std::cmp::Ordering::Less,
                    (false, false) => x.partial_cmp(&y).unwrap(),
                }
            });
        }
    }

    if desc {
        idx.reverse();
    }
    df.take_rows(&idx)
}

/// Covarianza poblacional entre dos columnas (pares válidos).
pub fn covariance(df: &DataFrame, c1: usize, c2: usize) -> f64 {
    let (col1, col2) = (&df.columns[c1], &df.columns[c2]);
    let mut sum1 = 0.0;
    let mut sum2 = 0.0;
    let mut count = 0u64;
    for i in 0..df.nrows {
        let (a, b) = (col1.num_at(i), col2.num_at(i));
        if !a.is_nan() && !b.is_nan() {
            sum1 += a;
            sum2 += b;
            count += 1;
        }
    }
    if count == 0 {
        return 0.0;
    }
    let (m1, m2) = (sum1 / count as f64, sum2 / count as f64);
    let mut cov = 0.0;
    for i in 0..df.nrows {
        let (a, b) = (col1.num_at(i), col2.num_at(i));
        if !a.is_nan() && !b.is_nan() {
            cov += (a - m1) * (b - m2);
        }
    }
    cov / count as f64
}

/// Correlación de Pearson entre dos columnas.
pub fn correlation(df: &DataFrame, c1: usize, c2: usize) -> f64 {
    let cov = covariance(df, c1, c2);
    let s1 = covariance(df, c1, c1).sqrt();
    let s2 = covariance(df, c2, c2).sqrt();
    if s1 == 0.0 || s2 == 0.0 {
        return 0.0;
    }
    cov / (s1 * s2)
}

/// Matriz de correlación de TODAS las columnas (ncols x ncols, fila por fila).
///
/// Camino rápido (una sola pasada sobre las filas) cuando todas las columnas son
/// numéricas y sin huecos: acumula los productos cruzados y deriva la covarianza
/// como `E[xy] - E[x]E[y]`. Si hay columnas no numéricas o NaN, cae al camino
/// naïve por pares (exacto con datos incompletos).
pub fn correlation_matrix(df: &DataFrame) -> Vec<f64> {
    let n = df.columns.len();
    let nrows = df.nrows;

    // ¿Podemos usar el camino rápido? Todas las columnas F64 y sin NaN.
    let mut slices: Vec<&[f64]> = Vec::with_capacity(n);
    let mut fast = nrows > 0;
    for c in &df.columns {
        match c {
            Column::F64(v) => slices.push(v.as_slice()),
            _ => {
                fast = false;
                break;
            }
        }
    }
    if fast {
        'scan: for s in &slices {
            for &x in *s {
                if x.is_nan() {
                    fast = false;
                    break 'scan;
                }
            }
        }
    }

    if !fast {
        // Naïve por pares (maneja NaN/strings correctamente).
        let mut out = vec![0.0; n * n];
        for i in 0..n {
            for j in i..n {
                let r = correlation(df, i, j);
                out[i * n + j] = r;
                out[j * n + i] = r;
            }
        }
        return out;
    }

    // Camino rápido: una pasada.
    let nf = nrows as f64;
    let mut sum = vec![0.0f64; n];
    let mut cross = vec![0.0f64; n * n];
    for i in 0..nrows {
        for a in 0..n {
            let ra = slices[a][i];
            sum[a] += ra;
            let base = a * n;
            for b in a..n {
                cross[base + b] += ra * slices[b][i];
            }
        }
    }
    let mean: Vec<f64> = sum.iter().map(|s| s / nf).collect();

    // Covarianza poblacional (triangular superior, espejada).
    let mut cov = vec![0.0f64; n * n];
    for a in 0..n {
        for b in a..n {
            let c = cross[a * n + b] / nf - mean[a] * mean[b];
            cov[a * n + b] = c;
            cov[b * n + a] = c;
        }
    }

    let mut out = vec![0.0f64; n * n];
    for a in 0..n {
        let sa = cov[a * n + a].sqrt();
        for b in 0..n {
            let denom = sa * cov[b * n + b].sqrt();
            out[a * n + b] = if denom == 0.0 { 0.0 } else { cov[a * n + b] / denom };
        }
    }
    out
}

/// Suma acumulada de una columna numérica. Añade `${field}_cumsum`.
pub fn cumsum(df: &DataFrame, col: usize) -> DataFrame {
    let column = &df.columns[col];
    let mut acc = 0.0;
    let mut out = Vec::with_capacity(df.nrows);
    for i in 0..df.nrows {
        let v = column.num_at(i);
        if !v.is_nan() {
            acc += v;
        }
        out.push(acc);
    }
    append_f64(df, format!("{}_cumsum", df.fields[col]), out)
}

/// Diferencia con `periods` atrás. Añade `${field}_diff_${periods}`.
pub fn diff(df: &DataFrame, col: usize, periods: usize) -> DataFrame {
    let column = &df.columns[col];
    let mut out = Vec::with_capacity(df.nrows);
    for i in 0..df.nrows {
        if i >= periods {
            let (a, b) = (column.num_at(i), column.num_at(i - periods));
            out.push(if a.is_nan() || b.is_nan() { f64::NAN } else { a - b });
        } else {
            out.push(f64::NAN);
        }
    }
    append_f64(df, format!("{}_diff_{}", df.fields[col], periods), out)
}

/// Agrupa por `group_col` y agrega `value_col`.
/// `op`: 0=sum, 1=avg, 2=min, 3=max, 4=count. Preserva el orden de aparición.
pub fn group_agg(df: &DataFrame, group_col: usize, value_col: usize, op: u32) -> DataFrame {
    let gcol = &df.columns[group_col];
    let vcol = &df.columns[value_col];

    let mut order: Vec<String> = Vec::new();
    let mut index: HashMap<String, usize> = HashMap::new();
    let mut sums: Vec<f64> = Vec::new();
    let mut mins: Vec<f64> = Vec::new();
    let mut maxs: Vec<f64> = Vec::new();
    let mut counts: Vec<f64> = Vec::new();

    for i in 0..df.nrows {
        let key = cell_string(gcol, i);
        let slot = match index.get(&key) {
            Some(&s) => s,
            None => {
                let s = order.len();
                index.insert(key.clone(), s);
                order.push(key);
                sums.push(0.0);
                mins.push(f64::INFINITY);
                maxs.push(f64::NEG_INFINITY);
                counts.push(0.0);
                s
            }
        };
        let v = vcol.num_at(i);
        if !v.is_nan() {
            sums[slot] += v;
            if v < mins[slot] {
                mins[slot] = v;
            }
            if v > maxs[slot] {
                maxs[slot] = v;
            }
            counts[slot] += 1.0;
        }
    }

    let results: Vec<f64> = (0..order.len())
        .map(|s| match op {
            0 => sums[s],
            1 => if counts[s] > 0.0 { sums[s] / counts[s] } else { 0.0 },
            2 => if counts[s] > 0.0 { mins[s] } else { f64::NAN },
            3 => if counts[s] > 0.0 { maxs[s] } else { f64::NAN },
            4 => counts[s],
            _ => 0.0,
        })
        .collect();

    let nrows = order.len();
    DataFrame {
        name: format!("{}_grouped", df.name),
        fields: vec![df.fields[group_col].clone(), "value".to_string()],
        columns: vec![Column::Str(order), Column::F64(results)],
        nrows,
    }
}

/// Z-score (estandarización poblacional) de todas las columnas numéricas.
pub fn standardize(df: &DataFrame) -> DataFrame {
    let columns = df
        .columns
        .iter()
        .map(|c| match c {
            Column::F64(v) => {
                let mut sum = 0.0;
                let mut count = 0u64;
                for &x in v {
                    if !x.is_nan() {
                        sum += x;
                        count += 1;
                    }
                }
                if count == 0 {
                    return Column::F64(v.clone());
                }
                let mean = sum / count as f64;
                let mut sq = 0.0;
                for &x in v {
                    if !x.is_nan() {
                        let d = x - mean;
                        sq += d * d;
                    }
                }
                let std = (sq / count as f64).sqrt();
                let out = v
                    .iter()
                    .map(|&x| {
                        if x.is_nan() {
                            f64::NAN
                        } else if std == 0.0 {
                            0.0
                        } else {
                            (x - mean) / std
                        }
                    })
                    .collect();
                Column::F64(out)
            }
            other => other.clone(),
        })
        .collect();
    DataFrame {
        name: df.name.clone(),
        fields: df.fields.clone(),
        columns,
        nrows: df.nrows,
    }
}

/// Ventana deslizante. `op`: 0=sum,1=avg,2=min,3=max. Añade `${field}_rolling_${op}`.
pub fn rolling(df: &DataFrame, col: usize, window: usize, op: u32) -> DataFrame {
    let column = &df.columns[col];
    let n = df.nrows;
    let w = window.max(1);
    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let mut sum = 0.0;
        let mut count = 0u64;
        let mut mn = f64::INFINITY;
        let mut mx = f64::NEG_INFINITY;
        for j in start..=i {
            let v = column.num_at(j);
            if !v.is_nan() {
                sum += v;
                count += 1;
                if v < mn {
                    mn = v;
                }
                if v > mx {
                    mx = v;
                }
            }
        }
        out.push(match op {
            0 => sum,
            1 => if count > 0 { sum / count as f64 } else { 0.0 },
            2 => if count > 0 { mn } else { 0.0 },
            3 => if count > 0 { mx } else { 0.0 },
            _ => 0.0,
        });
    }
    let suffix = match op {
        0 => "sum",
        1 => "avg",
        2 => "min",
        3 => "max",
        _ => "avg",
    };
    append_f64(df, format!("{}_rolling_{}", df.fields[col], suffix), out)
}

/// Cambio porcentual con `periods` atrás. Añade `${field}_pct_change_${periods}`.
pub fn pct_change(df: &DataFrame, col: usize, periods: usize) -> DataFrame {
    let column = &df.columns[col];
    let mut out = Vec::with_capacity(df.nrows);
    for i in 0..df.nrows {
        if i >= periods {
            let (a, b) = (column.num_at(i), column.num_at(i - periods));
            out.push(if a.is_nan() || b.is_nan() || b == 0.0 {
                f64::NAN
            } else {
                (a - b) / b * 100.0
            });
        } else {
            out.push(f64::NAN);
        }
    }
    append_f64(df, format!("{}_pct_change_{}", df.fields[col], periods), out)
}

/// Ranking descendente (mayor valor = rango 1). `method`: 0=dense,1=min,2=max.
/// Añade `${field}_rank`.
pub fn rank(df: &DataFrame, col: usize, method: u32) -> DataFrame {
    let column = &df.columns[col];
    let n = df.nrows;
    let mut idx: Vec<usize> = (0..n).collect();
    // Orden descendente por valor (NaN al final).
    idx.sort_by(|&a, &b| {
        let (x, y) = (column.num_at(a), column.num_at(b));
        match (x.is_nan(), y.is_nan()) {
            (true, true) => std::cmp::Ordering::Equal,
            (true, false) => std::cmp::Ordering::Greater,
            (false, true) => std::cmp::Ordering::Less,
            (false, false) => y.partial_cmp(&x).unwrap(),
        }
    });

    let mut ranks = vec![0.0f64; n];
    let mut dense = 0.0;
    let mut i = 0usize;
    while i < n {
        let mut j = i;
        while j + 1 < n && column.num_at(idx[j + 1]) == column.num_at(idx[i]) {
            j += 1;
        }
        dense += 1.0;
        for k in i..=j {
            ranks[idx[k]] = match method {
                0 => dense,
                1 => (i + 1) as f64,
                _ => (j + 1) as f64,
            };
        }
        i = j + 1;
    }
    append_f64(df, format!("{}_rank", df.fields[col]), ranks)
}

/// Percentil de cada valor (posición del primer valor ordenado >= v) / len * 100.
/// Añade `${field}_percentile`.
pub fn percentile(df: &DataFrame, col: usize) -> DataFrame {
    let column = &df.columns[col];
    let mut sorted: Vec<f64> = (0..df.nrows)
        .map(|i| column.num_at(i))
        .filter(|v| !v.is_nan())
        .collect();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let len = sorted.len();

    let mut out = Vec::with_capacity(df.nrows);
    for i in 0..df.nrows {
        let v = column.num_at(i);
        if v.is_nan() || len == 0 {
            out.push(f64::NAN);
            continue;
        }
        // Primer índice con sorted[idx] >= v (búsqueda binaria).
        let pos = sorted.partition_point(|&x| x < v);
        out.push(pos as f64 / len as f64 * 100.0);
    }
    append_f64(df, format!("{}_percentile", df.fields[col]), out)
}

// ----- helpers -----

fn cell_string(col: &Column, i: usize) -> String {
    match col {
        Column::Str(v) => v[i].clone(),
        Column::Bool(v) => if v[i] != 0 { "true".into() } else { "false".into() },
        Column::F64(v) => {
            let x = v[i];
            if x.is_nan() {
                "NaN".into()
            } else if x.fract() == 0.0 && x.abs() < 1e15 {
                format!("{}", x as i64)
            } else {
                format!("{}", x)
            }
        }
    }
}

/// Devuelve una copia del DataFrame con una columna f64 extra al final.
fn append_f64(df: &DataFrame, name: String, data: Vec<f64>) -> DataFrame {
    let mut fields = df.fields.clone();
    let mut columns = df.columns.clone();
    fields.push(name);
    columns.push(Column::F64(data));
    DataFrame {
        name: df.name.clone(),
        fields,
        columns,
        nrows: df.nrows,
    }
}
