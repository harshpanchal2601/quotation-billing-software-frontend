export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseContentDispositionFilename(
  contentDispositionHeader: string | null | undefined,
  fallbackFilename: string,
): string {
  if (!contentDispositionHeader) return fallbackFilename;
  const match = /filename\*?=['"]?(?:UTF-8'')?([^'";\r\n]+)['"]?/i.exec(contentDispositionHeader);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return fallbackFilename;
}
