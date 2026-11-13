export type Presentation = { language: 'en' | 'hi' | 'gu'; locale: 'en-IN' | 'en-US' | 'en-GB' | 'hi-IN' | 'gu-IN'; timezone: string };
export function formatExactDecimal(value: string, locale: Presentation['locale'], minimumFractionDigits = 0) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return value;
  const [integer = '0', sourceFraction] = value.split('.');
  const fraction = minimumFractionDigits > 0 ? (sourceFraction ?? '').padEnd(minimumFractionDigits, '0') : sourceFraction;
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const signed = BigInt(integer);
  const minus = formatter.formatToParts(-1).find((part) => part.type === 'minusSign')?.value ?? '-';
  const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
  return `${value.startsWith('-') && signed === 0n ? minus : ''}${formatter.format(signed)}${fraction === undefined ? '' : separator + fraction}`;
}
export function formatTimestamp(value: string, presentation: Presentation) {
  return new Intl.DateTimeFormat(presentation.locale, { timeZone: presentation.timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
