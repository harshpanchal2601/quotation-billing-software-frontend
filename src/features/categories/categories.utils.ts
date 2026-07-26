export const UNCATEGORISED_SLUG = 'uncategorised';

export function isProtectedCategory(slug: string): boolean {
  return slug === UNCATEGORISED_SLUG;
}
