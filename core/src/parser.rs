//! Parser TOON con inferencia de tipos por columna (paridad con el parser JS).

use crate::dataframe::{Column, DataFrame};

/// ¿Encaja `s` con el patrón numérico estricto?
/// `-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?` — rechaza ceros a la izquierda
/// ("00123") para no corromper códigos postales / IDs.
fn is_number(s: &str) -> bool {
    let b = s.as_bytes();
    let n = b.len();
    let mut i = 0usize;
    if n == 0 {
        return false;
    }
    if b[i] == b'-' {
        i += 1;
    }
    if i >= n {
        return false;
    }
    // Parte entera.
    if b[i] == b'0' {
        i += 1;
    } else if (b'1'..=b'9').contains(&b[i]) {
        i += 1;
        while i < n && b[i].is_ascii_digit() {
            i += 1;
        }
    } else {
        return false;
    }
    // Fracción.
    if i < n && b[i] == b'.' {
        i += 1;
        if i >= n || !b[i].is_ascii_digit() {
            return false;
        }
        while i < n && b[i].is_ascii_digit() {
            i += 1;
        }
    }
    // Exponente.
    if i < n && (b[i] == b'e' || b[i] == b'E') {
        i += 1;
        if i < n && (b[i] == b'+' || b[i] == b'-') {
            i += 1;
        }
        if i >= n || !b[i].is_ascii_digit() {
            return false;
        }
        while i < n && b[i].is_ascii_digit() {
            i += 1;
        }
    }
    i == n
}

fn is_bool(s: &str) -> bool {
    s.eq_ignore_ascii_case("true") || s.eq_ignore_ascii_case("false")
}

fn is_gap(s: &str) -> bool {
    s.is_empty() || s == "null"
}

/// Divide una línea en campos respetando comillas dobles (estilo RFC 4180).
fn split_fields(line: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    let mut quoted = false;
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if in_quotes {
            if ch == '"' {
                if i + 1 < chars.len() && chars[i + 1] == '"' {
                    cur.push('"');
                    i += 1;
                } else {
                    in_quotes = false;
                }
            } else {
                cur.push(ch);
            }
        } else if ch == '"' && cur.trim().is_empty() {
            in_quotes = true;
            quoted = true;
            cur.clear();
        } else if ch == ',' {
            result.push(if quoted { cur.clone() } else { cur.trim().to_string() });
            cur.clear();
            quoted = false;
        } else {
            cur.push(ch);
        }
        i += 1;
    }
    result.push(if quoted { cur.clone() } else { cur.trim().to_string() });
    result
}

/// Parsea la cabecera `name[N]{f1,f2,...}:` sin regex.
fn parse_header(trimmed: &str) -> Option<(String, Vec<String>)> {
    let open = trimmed.find('[')?;
    let close = trimmed.find(']')?;
    let brace = trimmed.find('{')?;
    let brace_close = trimmed.find('}')?;
    if !(open < close && close < brace && brace < brace_close) {
        return None;
    }
    let name = trimmed[..open].trim().to_string();
    if name.is_empty() {
        return None;
    }
    let fields = trimmed[brace + 1..brace_close]
        .split(',')
        .map(|f| f.trim().to_string())
        .collect();
    Some((name, fields))
}

/// Infiere el tipo de una columna a partir de todos sus valores crudos.
fn infer_type(values: &[&str]) -> u32 {
    let mut saw = false;
    let mut all_num = true;
    let mut all_bool = true;
    for &v in values {
        if is_gap(v) {
            continue;
        }
        saw = true;
        if all_num && !is_number(v) {
            all_num = false;
        }
        if all_bool && !is_bool(v) {
            all_bool = false;
        }
        if !all_num && !all_bool {
            break;
        }
    }
    if !saw {
        1
    } else if all_num {
        0
    } else if all_bool {
        2
    } else {
        1
    }
}

/// Parsea una cadena TOON al primer dataset encontrado.
pub fn parse(input: &str) -> Option<DataFrame> {
    let trimmed_input = input.trim();
    let mut name: Option<String> = None;
    let mut fields: Vec<String> = Vec::new();
    let mut raw_rows: Vec<Vec<String>> = Vec::new();

    for line in trimmed_input.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("//") {
            continue;
        }
        let is_header =
            !line.starts_with(' ') && !line.starts_with('\t') && trimmed.contains(':');
        if is_header {
            if let Some((n, f)) = parse_header(trimmed) {
                // Solo soportamos el primer dataset en esta vía (como JS parse()).
                if name.is_some() {
                    break;
                }
                name = Some(n);
                fields = f;
            }
        } else if (line.starts_with(' ') || line.starts_with('\t')) && name.is_some() {
            raw_rows.push(split_fields(trimmed));
        }
    }

    let name = name?;
    let ncols = fields.len();
    let nrows = raw_rows.len();

    // Inferir tipo por columna.
    let mut columns: Vec<Column> = Vec::with_capacity(ncols);
    for c in 0..ncols {
        let col_vals: Vec<&str> = raw_rows
            .iter()
            .map(|r| r.get(c).map(|s| s.as_str()).unwrap_or(""))
            .collect();
        let t = infer_type(&col_vals);
        match t {
            0 => {
                let mut v = Vec::with_capacity(nrows);
                for s in &col_vals {
                    v.push(if is_gap(s) {
                        f64::NAN
                    } else {
                        s.parse::<f64>().unwrap_or(f64::NAN)
                    });
                }
                columns.push(Column::F64(v));
            }
            2 => {
                let mut v = Vec::with_capacity(nrows);
                for s in &col_vals {
                    v.push(if s.eq_ignore_ascii_case("true") { 1u8 } else { 0u8 });
                }
                columns.push(Column::Bool(v));
            }
            _ => {
                let mut v = Vec::with_capacity(nrows);
                for s in &col_vals {
                    v.push(if is_gap(s) { String::new() } else { s.to_string() });
                }
                columns.push(Column::Str(v));
            }
        }
    }

    Some(DataFrame {
        name,
        fields,
        columns,
        nrows,
    })
}
