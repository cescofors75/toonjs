/**
 * Utilidades de escapado/parseo de campos separados por coma (estilo RFC 4180).
 * Compartido por el parser (lectura) y las exportaciones toCSV/toToon (escritura)
 * para que el round-trip sea seguro cuando un valor contiene `,`, `"` o saltos.
 */

/** Escapa un valor para una línea CSV/TOON. */
export function escapeField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (
    s.includes(',') ||
    s.includes('"') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Divide una línea en campos respetando comillas dobles.
 * Los campos sin comillas se recortan (trim); los entrecomillados se preservan
 * literalmente y soportan comillas internas escapadas como `""`.
 */
export function splitFields(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"' && cur.trim() === '') {
      // Apertura de campo entrecomillado (descartando espacios previos).
      inQuotes = true;
      quoted = true;
      cur = '';
    } else if (ch === ',') {
      result.push(quoted ? cur : cur.trim());
      cur = '';
      quoted = false;
    } else {
      cur += ch;
    }
  }

  result.push(quoted ? cur : cur.trim());
  return result;
}
