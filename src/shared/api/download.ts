// Features own authorization, filenames and feedback. This helper owns only the
// browser resource lifecycle shared by report and protected-document downloads.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    // Allow the browser to consume the click before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
