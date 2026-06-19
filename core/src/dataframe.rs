//! Almacén columnar: un `DataFrame` posee sus columnas dentro de la memoria
//! lineal de WASM. JS solo maneja handles (u32) hacia un registro global.

/// Tipo de columna. Coincide con los códigos expuestos a JS en `lib.rs`.
#[derive(Clone)]
pub enum Column {
    /// Columna numérica. Los huecos se representan como `NaN`.
    F64(Vec<f64>),
    /// Columna de texto.
    Str(Vec<String>),
    /// Columna booleana (1 = true, 0 = false).
    Bool(Vec<u8>),
}

impl Column {
    /// Código de tipo: 0 = number, 1 = string, 2 = boolean.
    pub fn type_code(&self) -> u32 {
        match self {
            Column::F64(_) => 0,
            Column::Str(_) => 1,
            Column::Bool(_) => 2,
        }
    }

    /// Valor numérico de la fila `i` (NaN si no aplica / hueco).
    pub fn num_at(&self, i: usize) -> f64 {
        match self {
            Column::F64(v) => v[i],
            Column::Bool(v) => v[i] as f64,
            Column::Str(v) => v[i].parse::<f64>().unwrap_or(f64::NAN),
        }
    }
}

#[derive(Clone)]
pub struct DataFrame {
    pub name: String,
    pub fields: Vec<String>,
    pub columns: Vec<Column>,
    pub nrows: usize,
}

impl DataFrame {
    pub fn col_index(&self, name_idx: u32) -> Option<usize> {
        let i = name_idx as usize;
        if i < self.columns.len() {
            Some(i)
        } else {
            None
        }
    }

    /// Construye un nuevo DataFrame seleccionando un subconjunto de filas por índice.
    pub fn take_rows(&self, indices: &[usize]) -> DataFrame {
        let columns = self
            .columns
            .iter()
            .map(|col| match col {
                Column::F64(v) => Column::F64(indices.iter().map(|&i| v[i]).collect()),
                Column::Str(v) => Column::Str(indices.iter().map(|&i| v[i].clone()).collect()),
                Column::Bool(v) => Column::Bool(indices.iter().map(|&i| v[i]).collect()),
            })
            .collect();
        DataFrame {
            name: self.name.clone(),
            fields: self.fields.clone(),
            columns,
            nrows: indices.len(),
        }
    }
}
