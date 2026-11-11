import { afterEach, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps the URL alive through the click, then removes the element and releases the URL', () => {
  vi.useFakeTimers();
  const create = vi.fn(() => 'blob:export'); const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this).toHaveAttribute('download', 'review.csv');
    expect(document.body.contains(this)).toBe(true);
    expect(revoke).not.toHaveBeenCalled();
  });
  downloadBlob(new Blob(['exact value']), 'review.csv');
  expect(document.querySelector('a[download]')).toBeNull();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledTimes(1);
  expect(revoke).toHaveBeenCalledWith('blob:export');
});
