import { useCallback, useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { ReactReduxPartitionerContext } from './context';
import { getSuspensePromiseCacheEntry } from './suspensePromise';
import { is, noop } from './utils';
import { isPromise, isSelectablePart, isUpdateablePart } from './validate';

import type { Action, AnyAction, Dispatch } from 'redux';
import type {
  AnyPart,
  AnyPrimitivePart,
  Listener,
  UsePartPair,
  UsePartValue,
  UsePartUpdate,
  Store,
  UpdatePartArgs,
  ReactReduxPartitionerContextType,
} from './types';

export function useDispatch(): Dispatch {
  return useStore().dispatch;
}

export function usePartitionerContext<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): ReactReduxPartitionerContextType<DispatchableAction, State> {
  const context = useContext(
    ReactReduxPartitionerContext
  ) as ReactReduxPartitionerContextType<DispatchableAction, State>;

  if (!context) {
    throw new Error('boom');
  }

  return context;
}

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
  const { getServerState, store } = usePartitionerContext();

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

  if (entry.s === 'resolved') {
    return entry.r;
  }

  if (entry.s === 'rejected') {
    throw entry.e;
  }

  throw entry.p;
}

export function useStore<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): Store<State, DispatchableAction> {
  return usePartitionerContext<State, DispatchableAction>().store;
}
