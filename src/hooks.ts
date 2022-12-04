import { useContext, useMemo } from 'react';
import { ReactReduxContext, useStore } from 'react-redux';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { isSelectPart } from './validate';

import type {
  AnyPart,
  AnyPrimitivePart,
  AnySelectPart,
  AnyStatefulPart,
  AnyUpdatePart,
  IsEqual,
  Listener,
  Store,
  UpdatePartArgs,
  Unsubscribe,
  UseUpdateUpdater,
} from './types';
import { is } from './utils';
import { ALL_DEPENDENCIES, NO_DEPENDENCIES } from './constants';

function noop(): undefined {
  return;
}
function noopSubscribe() {
  return noop;
}

export function usePart<Part extends AnyStatefulPart>(
  part: Part,
  isEqual?: IsEqual<Part['g']>
): [ReturnType<Part['g']>, UseUpdateUpdater<Part['s']>];
export function usePart<Part extends AnySelectPart>(
  part: Part,
  isEqual?: IsEqual<Part['g']>
): [ReturnType<Part['g']>, never];
export function usePart<Part extends AnyUpdatePart>(
  part: Part,
  isEqual?: IsEqual<Part['g']>
): [never, UseUpdateUpdater<Part['s']>];
export function usePart<Part extends AnyStatefulPart | AnySelectPart>(
  part: Part,
  isEqual?: IsEqual<Part['g']>
) {
  return [usePartValue(part, isEqual), usePartUpdate(part)];
}

export function usePartUpdate<Part extends AnyStatefulPart | AnyUpdatePart>(
  part: Part
): UseUpdateUpdater<Part['s']>;
export function usePartUpdate<Part extends AnyPart>(part: Part): never;
export function usePartUpdate<Part extends AnyPart>(part: Part) {
  const store = useStore();

  return useMemo(
    () =>
      (...rest: UpdatePartArgs<Part['s']>) =>
        part.s(
          store.getState,
          store.dispatch,
          // @ts-expect-error - Spread is not liked here.
          ...rest
        ),
    [store, part]
  );
}

export function usePartValue<Part extends AnyStatefulPart | AnySelectPart>(
  part: Part,
  isEqual?: IsEqual<ReturnType<Part['g']>>
): ReturnType<Part['g']>;
export function usePartValue<Part extends AnyPart>(
  part: Part,
  isEqual?: IsEqual<ReturnType<Part['g']>>
): never;
export function usePartValue<Part extends AnyPart>(
  part: Part,
  isEqual?: IsEqual<ReturnType<Part['g']>>
) {
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
