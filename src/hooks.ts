import { useCallback, useContext, useMemo } from 'react';
import { ReactReduxContext, useStore } from 'react-redux';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { is, noop } from './utils';
import { isPromise, isSelectablePart, isUpdateablePart } from './validate';

import type {
  AnyPart,
  AnyPrimitivePart,
  Listener,
  UsePartPair,
  UsePartValue,
  UsePartUpdate,
  Store,
  UpdatePartArgs,
} from './types';
import { getSuspensePromiseCacheEntry } from './suspensePromise';

export function usePart<Part extends AnyPart>(part: Part): UsePartPair<Part> {
  return [usePartValue(part), usePartUpdate(part)];
}

export function usePartUpdate<Part extends AnyPart>(
  part: Part
): UsePartUpdate<Part> {
  const store = useStore();

  return useMemo(
    () =>
      isUpdateablePart(part)
        ? (...rest: UpdatePartArgs<Part['s']>) =>
            part.s(
              store.dispatch,
              store.getState,
              // @ts-expect-error - Tuple is not able to be attained with `UpdatePartArgs`.
              ...rest
            )
        : noop,
    [store, part]
  ) as UsePartUpdate<Part>;
}

export function usePartValue<Part extends AnyPart>(
  part: Part
): UsePartValue<Part> {
  const context = useContext(ReactReduxContext);
  const getServerState = context.getServerState;
  const store = context.store as Store;

  const subscribe = useCallback(
    (listener: Listener) =>
      store.subscribeToPart(part as AnyPrimitivePart, listener),
    [store, part]
  );

  const getSnapshot = useMemo(
    () => (isSelectablePart(part) ? () => part.g(store.getState) : noop),
    [store, part]
  );

  const result: UsePartValue<Part> = useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    is
  );

  if (!isPromise(result)) {
    return result;
  }

  const entry = getSuspensePromiseCacheEntry<UsePartValue<Part>>(result);

  if (!entry) {
    return result;
  }

  switch (entry.s) {
    case 'pending':
      throw entry.p;

    case 'resolved':
      return entry.r;

    case 'rejected':
      throw entry.e;

    case 'canceled':
      return entry.r;

    default:
      return result as UsePartValue<Part>;
  }
}
