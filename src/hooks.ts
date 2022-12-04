import { useContext, useMemo } from 'react';
import { ReactReduxContext, useStore } from 'react-redux';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { isSelectPartition, isStatefulPartition } from './validate';
import { createSelectPart, createUpdatePart } from './part';

import type {
  AnyPartition,
  AnyPrimitivePartition,
  AnySelectPartition,
  AnyStatefulPartition,
  AnyUpdatePartition,
  AnyUpdater,
  IsEqual,
  Listener,
  SelectPartitionArgs,
  Store,
  Tuple,
  UpdatePartitionArgs,
  Unsubscribe,
  UseUpdateUpdater,
} from './types';
import { is } from './utils';

function noop(): undefined {
  return;
}
function noopSubscribe() {
  return noop;
}

export function usePart<Partition extends AnyStatefulPartition>(
  partition: Partition,
  isEqual?: IsEqual<Partition['g']>
): [ReturnType<Partition['g']>, UseUpdateUpdater<Partition['s']>];
export function usePart<Partition extends AnySelectPartition>(
  partition: Partition,
  isEqual?: IsEqual<Partition['g']>
): [ReturnType<Partition['g']>, never];
export function usePart<Partition extends AnyUpdatePartition>(
  partition: Partition,
  isEqual?: IsEqual<Partition['g']>
): [never, UseUpdateUpdater<Partition['s']>];
export function usePart<
  Partition extends AnyStatefulPartition | AnySelectPartition
>(partition: Partition, isEqual?: IsEqual<Partition['g']>) {
  return [usePartValue(partition, isEqual), usePartUpdate(partition)];
}

export function usePartUpdate<
  Partition extends AnyStatefulPartition | AnyUpdatePartition
>(partition: Partition): UseUpdateUpdater<Partition['s']>;
export function usePartUpdate<Partition extends AnyPartition>(
  partition: Partition
): never;
export function usePartUpdate<Partition extends AnyPartition>(
  partition: Partition
) {
  const store = useStore();

  return useMemo(
    () =>
      (...rest: UpdatePartitionArgs<Partition['s']>) =>
        partition.s(
          store.getState,
          store.dispatch,
          // @ts-expect-error - Spread is not liked here.
          ...rest
        ),
    [store, partition]
  );
}

export function usePartValue<
  Partition extends AnyStatefulPartition | AnySelectPartition
>(
  partition: Partition,
  isEqual?: IsEqual<ReturnType<Partition['g']>>
): ReturnType<Partition['g']>;
export function usePartValue<Partition extends AnyPartition>(
  partition: Partition,
  isEqual?: IsEqual<ReturnType<Partition['g']>>
): never;
export function usePartValue<Partition extends AnyPartition>(
  partition: Partition,
  isEqual?: IsEqual<ReturnType<Partition['g']>>
) {
  const context = useContext(ReactReduxContext);
  const getServerState = context.getServerState;
  const store = context.store as Store;

  const subscribe = useMemo(() => {
    if (partition && partition.d && partition.d.length) {
      if (partition.d.length === 1) {
        return (listener: Listener) =>
          store.subscribeToPartition(
            partition as AnyPrimitivePartition,
            listener
          );
      }

      return (listener: Listener): Unsubscribe => {
        let subscribed = true;

        const unsubscribes = partition.d.map((partition) =>
          store.subscribeToPartition(partition, listener)
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
    }

    return noopSubscribe;
  }, [store, partition]);

  const getSnapshot = useMemo(
    () => (partition && partition.g ? () => partition.g(store.getState) : noop),
    [store, partition]
  );

  const isSnapshotEqual = useMemo(() => {
    if (isEqual) {
      return isEqual;
    }

    if (isSelectPartition(partition)) {
      return partition.e;
    }

    return is;
  }, [partition, isEqual]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    isSnapshotEqual
  );
}
