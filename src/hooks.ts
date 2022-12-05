import { useContext, useMemo } from 'react';
import { ReactReduxContext, useStore } from 'react-redux';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { isSelectPart } from './validate';

import type {
  AnyPart,
  AnyPrimitivePart,
  Listener,
  UsePartPair,
  UsePartValue,
  UsePartUpdate,
  Store,
  UpdatePartArgs,
  Unsubscribe,
  IsPartEqual,
} from './types';
import { is, noop } from './utils';
import { ALL_DEPENDENCIES, NO_DEPENDENCIES } from './constants';

function noopSubscribe() {
  return noop;
}

export function usePart<Part extends AnyPart>(
  part: Part,
  isEqual?: IsPartEqual<Part>
): UsePartPair<Part> {
  return [usePartValue(part, isEqual), usePartUpdate(part)];
}

export function usePartUpdate<Part extends AnyPart>(
  part: Part
): UsePartUpdate<Part> {
  const store = useStore();

  return useMemo(
    () =>
      part.s === noop
        ? noop
        : (...rest: UpdatePartArgs<Part['s']>) =>
            part.s(
              store.getState,
              store.dispatch,
              // @ts-expect-error - Tuple is not able to be attained with `UpdatePartArgs`.
              ...rest
            ),
    [store, part]
  ) as UsePartUpdate<Part>;
}

export function usePartValue<Part extends AnyPart>(
  part: Part,
  isEqual?: IsPartEqual<Part>
): UsePartValue<Part> {
  const context = useContext(ReactReduxContext);
  const getServerState = context.getServerState;
  const store = context.store as Store;

  const subscribe = useMemo(() => {
    const dependencies = part.d;

    if (dependencies === ALL_DEPENDENCIES) {
      return store.subscribe;
    }

    if (dependencies === NO_DEPENDENCIES || !dependencies.length) {
      return noopSubscribe;
    }

    if (dependencies.length === 1) {
      return (listener: Listener) =>
        store.subscribeToPart(part as AnyPrimitivePart, listener);
    }

    return (listener: Listener): Unsubscribe => {
      let subscribed = true;

      const unsubscribes = dependencies.map((dependency) =>
        store.subscribeToPart(dependency, listener)
      );

      return () => {
        if (!subscribed) {
          return;
        }

        subscribed = false;

        for (let index = 0; index < unsubscribes.length; ++index) {
          unsubscribes[index]();
        }
      };
    };
  }, [store, part]);

  const getSnapshot = useMemo(
    () => (part && part.g ? () => part.g(store.getState) : noop),
    [store, part]
  );

  const isSnapshotEqual = useMemo(() => {
    if (isEqual) {
      return isEqual;
    }

    if (isSelectPart(part)) {
      return part.e;
    }

    return is;
  }, [part, isEqual]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    isSnapshotEqual
  );
}
