//! Serialización de un DataFrame de vuelta a formato TOON.

use crate::dataframe::{Column, DataFrame};

/// Formatea un f64 como lo haría `String(n)` en JS (entero sin `.0`, NaN -> "").
fn fmt_f64(x: f64) -> String {
    if x.is_nan() {
        return String::new();
    }
    if x.is_finite() && x.fract() == 0.0 && x.abs() < 1e15 {
        return format!("{}", x as i64);
    }
    format!("{}", x)
}

/// Escapa un campo si contiene `,`, `"` o saltos de línea (estilo RFC 4180).
fn escape_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') || s.contains('\r') {
        let mut out = String::with_capacity(s.len() + 2);
        out.push('"');
        for ch in s.chars() {
            if ch == '"' {
                out.push('"');
            }
            out.push(ch);
        }
        out.push('"');
        out
    } else {
        s.to_string()
    }
}

fn cell(col: &Column, i: usize) -> String {
    match col {
        Column::F64(v) => fmt_f64(v[i]),
        Column::Str(v) => v[i].clone(),
        Column::Bool(v) => if v[i] != 0 { "true".into() } else { "false".into() },
    }
}

pub fn to_toon(df: &DataFrame) -> String {
    let mut out = String::new();
    out.push_str(&df.name);
    out.push('[');
    out.push_str(&df.nrows.to_string());
    out.push_str("]{");
    out.push_str(&df.fields.join(","));
    out.push_str("}:\n");

    for r in 0..df.nrows {
        out.push_str("  ");
        let row: Vec<String> = df
            .columns
            .iter()
            .map(|col| escape_field(&cell(col, r)))
            .collect();
        out.push_str(&row.join(","));
        out.push('\n');
    }
    out
}
