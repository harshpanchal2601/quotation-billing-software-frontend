import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LOADING_DELAY_MS,
  DEFAULT_MINIMUM_LOADING_VISIBLE_MS,
  useStableLoadingIndicator,
} from './useStableLoadingIndicator';

describe('useStableLoadingIndicator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show when loading resolves before the display delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ loading }) => useStableLoadingIndicator(loading), {
      initialProps: { loading: true },
    });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_LOADING_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LOADING_DELAY_MS);
    });

    expect(result.current).toBe(false);
  });

  it('keeps a visible loader mounted for the minimum duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { result, rerender } = renderHook(({ loading }) => useStableLoadingIndicator(loading), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_LOADING_DELAY_MS);
      vi.setSystemTime(DEFAULT_LOADING_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_MINIMUM_LOADING_VISIBLE_MS - 1);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('cleans timers when unmounted', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useStableLoadingIndicator(true));

    unmount();
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current).toBe(false);
  });
});
