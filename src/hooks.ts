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

/**
 * Use the store's `dispatch` method within the scope of a React component.
 */
export function useDispatch(): Dispatch {
  return useStore().dispatch;
}

/**
 * Access the partitioner context used by `react-redux-partitioner`.
 */
export function usePartitionerContext<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): ReactReduxPartitionerContextType<DispatchableAction, State> {
  const context = useContext(
    ReactReduxPartitionerContext
  ) as ReactReduxPartitionerContextType<DispatchableAction, State>;

  if (!context) {
    throw new Error(
      'The context required for `react-redux-partitioner` does not exist. ' +
        'Have you wrapped the React tree in a `Provider`?'
    );
  }

  return context;
}

/**
 * Returns a [value, update] `useState`-style pair for the Part passed.
 *
 * Note: Certain Part types do not support both value and update:
 * - Select Parts have no update method, and therefore the update returned is a no-op
 *   for those Parts.
 * - Update Parts have no value, and therefore the value returned is `undefined` for
 *   those Parts.
 */
export function usePart<Part extends AnyPart>(part: Part): UsePartPair<Part> {
  return [usePartValue(part), usePartUpdate(part)];
}

/**
 * Returns the updater for the Part, bound to the store's `dispatch` method.
 *
 * Note: Select Parts have no update method, and therefore the update returned is a no-op
 * for those Parts.
 */
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

/**
 * Returns the value for the Part passed. For Stateful Parts this is the value stored in
 * state, and for Select or Proxy parts this is the derived value.
 *
 * Note: Update Parts have no value, and therefore the value returned is `undefined` for
 * those Parts.
 */
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

/**
 * Use the store within the scope of a React component.
 */
export function useStore<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): Store<State, DispatchableAction> {
  return usePartitionerContext<State, DispatchableAction>().store;
}
