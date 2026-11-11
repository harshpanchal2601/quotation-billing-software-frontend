export type TableSortValue = string | number | boolean | null | undefined;

// Compare decimal strings without rounding money or quantities through Number.
export function compareTableValues(left: TableSortValue, right: TableSortValue) {
  const a = String(left ?? ''); const b = String(right ?? '');
  if (/^-?\d+(?:\.\d+)?$/.test(a) && /^-?\d+(?:\.\d+)?$/.test(b)) {
    const normalize = (value: string) => {
      const [integer = '0', fraction = ''] = value.replace(/^-/, '').split('.');
      return { negative: value.startsWith('-') && /[1-9]/.test(value), integer: integer.replace(/^0+(?=\d)/, ''), fraction };
    };
    const x = normalize(a); const y = normalize(b);
    if (x.negative !== y.negative) return x.negative ? -1 : 1;
    const scale = Math.max(x.fraction.length, y.fraction.length);
    const magnitude = x.integer.length - y.integer.length || x.integer.localeCompare(y.integer) || x.fraction.padEnd(scale, '0').localeCompare(y.fraction.padEnd(scale, '0'));
    return x.negative ? -magnitude : magnitude;
  }
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
