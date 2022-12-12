import type { SuspensePromiseCacheEntry } from './types';

const CACHE = new WeakMap<
  Promise<unknown>,
  SuspensePromiseCacheEntry<unknown>
>();

export function cancelSuspensePromise(promise: Promise<unknown>): void {
  const cached = CACHE.get(promise);

  if (cached) {
    cached.s = 'canceled';
  }
}

export function createSuspensePromise<Result>(
  promise: Promise<Result>
): Promise<Result> {
  const entry: SuspensePromiseCacheEntry<Result> = {
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
  const cached = CACHE.get(promise) as
    | SuspensePromiseCacheEntry<Result>
    | undefined;

  return cached ? cached.p : createSuspensePromise(promise);
}

export function getSuspensePromiseCacheEntry<Result>(
  promise: Promise<Result>
): SuspensePromiseCacheEntry<Result> | undefined {
  return CACHE.get(promise) as SuspensePromiseCacheEntry<Result>;
}
