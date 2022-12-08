export interface CacheEntry<Result> {
  c: () => void;
  e: Error | null;
  p: Promise<Result>;
  r: Result;
  s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}

const CACHE = new WeakMap<Promise<unknown>, CacheEntry<unknown>>();

export function cancelSuspensePromise(promise: Promise<unknown>): void {
  const cached = CACHE.get(promise);

  if (cached) {
    cached.s = 'canceled';
  }
}

export function createSuspensePromise<Result>(
  promise: Promise<Result>
): Promise<Result> {
  const entry: CacheEntry<Result> = {
    c: undefined,
    e: null,
    p: undefined,
    r: undefined,
    s: 'pending',
  };

  entry.p = new Promise<Result>((resolve, reject) => {
    entry.c = () => cancelSuspensePromise(entry.p);

    promise.then(
      (result) => {
        if (entry.s === 'canceled') {
          return;
        }

        entry.e = null;
        entry.r = result;
        entry.s = 'resolved';

        resolve(result);
      },
      (error) => {
        if (entry.s === 'canceled') {
          return;
        }

        entry.e = error;
        entry.r = undefined;
        entry.s = 'rejected';

        reject(error);
      }
    );
  });

  CACHE.set(entry.p, entry);

  return entry.p;
}

export function getSuspensePromise<Result>(
  promise: Promise<Result>
): Result | Promise<Result> {
  const cached = CACHE.get(promise) as CacheEntry<Result> | undefined;

  return cached ? cached.p : createSuspensePromise(promise);
}

export function getSuspensePromiseCacheEntry<Result>(
  promise: Promise<Result>
): CacheEntry<Result> | undefined {
  return CACHE.get(promise) as CacheEntry<Result>;
}

export function isSuspensePromiseCanceled<Result>(
  promise: Promise<Result>
): boolean {
  const entry = CACHE.get(promise);

  return !!entry && entry.s !== 'canceled';
}
