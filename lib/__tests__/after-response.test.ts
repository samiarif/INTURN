import { describe, it, expect, vi, beforeEach } from 'vitest';

const afterMock = vi.fn();
vi.mock('next/server', () => ({ after: (cb: () => Promise<unknown>) => afterMock(cb) }));

import { afterResponse } from '@/lib/after-response';

describe('afterResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defers work through next/server after() in a request scope', () => {
    const work = vi.fn(async () => {});
    afterResponse(work);
    expect(afterMock).toHaveBeenCalledWith(work);
    expect(work).not.toHaveBeenCalled();
  });

  it('falls back to firing the work directly when after() throws (tests/scripts)', () => {
    afterMock.mockImplementation(() => {
      throw new Error('outside request scope');
    });
    const work = vi.fn(async () => {});
    afterResponse(work);
    expect(work).toHaveBeenCalledTimes(1);
  });
});
