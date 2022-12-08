interface CacheEntry<Result> {
  c: boolean;
  e: Error | null;
  o: Promise<Result>;
  p: Promise<Result>;
  r: Result;
  s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}

const CACHE = new WeakMap<Promise<unknown>, CacheEntry<unknown>>();

export function createSuspensePromise<Result>(
  promise: Promise<Result>
): Result | Promise<Result> {
  const cached = CACHE.get(promise) as CacheEntry<Result> | undefined;

  if (cached) {
    if (cached.p === promise) {
      return cached.p;
    }

    switch (cached.s) {
      case 'resolved':
        return cached.r;

      case 'rejected':
        throw cached.e;

      case 'canceled':
        return;

      default:
        return cached.p;
    }
  }

  const entry: CacheEntry<Result> = {
    c: false,
    e: null,
    o: promise,
    p: undefined,
    r: undefined,
    s: 'pending',
  };

  entry.p = new Promise<Result>((resolve, reject) =>
    promise.then(
      (result) => {
        entry.e = null;
        entry.r = result;
        entry.s = 'resolved';

        resolve(result);
      },
      (error) => {
        entry.e = error;
        entry.r = undefined;
        entry.s = 'rejected';

        reject(error);
      }
    )
  );

  CACHE.set(entry.p, entry);

  return entry.p;
}

export function getSuspensePromiseCacheEntry<Result>(
  promise: Promise<Result>
): CacheEntry<Result> | undefined {
  return CACHE.get(promise) as CacheEntry<Result>;
}
