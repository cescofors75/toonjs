/// <reference types="assemblyscript/std/assembly" />
// The entry file of your WebAssembly module.

/**
 * Multiplica un array de números (Float64) por un escalar
 * @param ptr Puntero al inicio del array en memoria
 * @param len Longitud del array
 * @param scalar Valor escalar a multiplicar
 */
export function multiplyScalar(ptr: i32, len: i32, scalar: f64): void {
  for (let i = 0; i < len; i++) {
    // Cargar valor (Float64 son 8 bytes)
    let val = load<f64>(ptr + (i * 8));
    // Multiplicar y guardar
    store<f64>(ptr + (i * 8), val * scalar);
  }
}

/**
 * Transpone una matriz plana (row-major)
 * @param ptr Puntero a la matriz
 * @param rows Número de filas
 * @param cols Número de columnas
 */
export function transpose(ptr: i32, rows: i32, cols: i32): void {
  // Necesitamos un buffer temporal o hacerlo in-place (complicado in-place para no-cuadradas)
  // Por simplicidad, asumimos que el output buffer está justo después del input buffer
  // Input: [0...rows*cols*8]
  // Output: [rows*cols*8...2*rows*cols*8]
  
  let inputStart = ptr;
  let outputStart = ptr + (rows * cols * 8);
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Input index: r * cols + c
      let val = load<f64>(inputStart + ((r * cols + c) * 8));
      
      // Output index: c * rows + r
      store<f64>(outputStart + ((c * rows + r) * 8), val);
    }
  }
}
