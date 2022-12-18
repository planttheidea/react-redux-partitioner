import { isPromise } from './validate';

import type { SuspensePromiseCacheEntry } from './types';

const CACHE = new WeakMap<
  Promise<unknown>,
  SuspensePromiseCacheEntry<unknown>
>();

export function cancelSuspensePromise(promise: Promise<unknown>): void {
  const entry = isPromise(promise) && CACHE.get(promise);

  if (entry) {
    entry.c();
  }
}

export function createSuspensePromise<Result>(
  promise: Promise<Result>
): Promise<Result> {
  const entry: SuspensePromiseCacheEntry<Result> = {
    c: () => {
      entry.s = 'canceled';
    },
    e: null,
    p: new Promise<Result>((resolve, reject) => {
      promise.then(
        (result) => {
          if (entry.s === 'canceled') {
            return resolve(undefined as Result);
          }

          entry.e = null;
          entry.r = result;
          entry.s = 'resolved';

          resolve(result);
        },
        (error) => {
          if (entry.s === 'canceled') {
            return resolve(undefined as Result);
          }

          entry.e = error;
          entry.r = undefined;
          entry.s = 'rejected';

          reject(error);
        }
      );
    }),
    r: undefined,
    s: 'pending',
  };

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
