import {
  createSuspensePromise,
  getSuspensePromiseCacheEntry,
} from '../src/suspensePromise';

describe('suspensePromise', () => {
  describe('createSuspensePromise', () => {
    it('should handle errors', async () => {
      const promiseError = new Error('promise');
      const basePromise = Promise.reject(promiseError);
      const suspensePromise = createSuspensePromise(basePromise);

      try {
        await suspensePromise;
      } catch (error) {
        expect(error).toBe(promiseError);

        const entry = getSuspensePromiseCacheEntry(suspensePromise);

        expect(entry).toEqual({
          c: expect.any(Function),
          e: error,
          p: suspensePromise,
          r: undefined,
          s: 'rejected',
        });
      }
    });

    it('should resolve with no result and not update the entry when canceled', async () => {
      const basePromise = Promise.resolve('foo');
      const suspensePromise = createSuspensePromise(basePromise);

      const entry = getSuspensePromiseCacheEntry(suspensePromise)!;

      expect(entry.s).toBe('pending');

      entry.c();

      const result = await suspensePromise;

      expect(result).toBeUndefined();

      expect(entry).toEqual({
        c: expect.any(Function),
        e: null,
        p: suspensePromise,
        r: undefined,
        s: 'canceled',
      });
    });

    it('should resolve with no result and not update the entry when canceled even if error occurs', async () => {
      const promiseError = new Error('promise');
      const basePromise = Promise.reject(promiseError);
      const suspensePromise = createSuspensePromise(basePromise);

      const entry = getSuspensePromiseCacheEntry(suspensePromise)!;

      expect(entry.s).toBe('pending');

      entry.c();

      const result = await suspensePromise;

      expect(result).toBeUndefined();

      expect(entry).toEqual({
        c: expect.any(Function),
        e: null,
        p: suspensePromise,
        r: undefined,
        s: 'canceled',
      });
    });
  });
});
