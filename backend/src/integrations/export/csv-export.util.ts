export function toCsvRow(
  cells: (string | number | boolean | null | undefined)[],
): string {
  return cells
    .map((c) => {
      const s = c === null || c === undefined ? '' : String(c);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

export function buildCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const lines = [toCsvRow(headers), ...rows.map((r) => toCsvRow(r))];
  return lines.join('\r\n') + '\r\n';
}
