import { useContext, useMemo } from 'react';
import { ReactReduxContext, useStore } from 'react-redux';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { isStatefulPartition } from './validate';
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

function noop(): undefined {
  return;
}
function noopSubscribe() {
  return noop;
}

export function usePart<Partition extends AnyStatefulPartition>(
  partition: Partition
): [ReturnType<Partition['g']>, UseUpdateUpdater<Partition['s']>];

export function usePart<Partition extends AnySelectPartition>(
  partition: Partition
): [ReturnType<Partition['g']>, never];
export function usePart<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  PartitionsHandler extends (...args: SelectPartitionArgs<Partitions>) => any
>(
  partitions: Partitions,
  handler: PartitionsHandler,
  isEqual?: IsEqual<ReturnType<PartitionsHandler>>
): [ReturnType<PartitionsHandler>, never];

export function usePart<Partition extends AnyUpdatePartition>(
  partition: Partition
): [never, UseUpdateUpdater<Partition['s']>];
export function usePart<UpdateHandler extends AnyUpdater>(
  ignored: null | undefined,
  handler: UpdateHandler
): [never, UseUpdateUpdater<UpdateHandler>];

export function usePart<
  StatefulPartition extends AnyPartition,
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  PartitionsHandler extends (...args: SelectPartitionArgs<Partitions>) => any,
  UpdateHandler extends AnyUpdater
>(
  partition: StatefulPartition | Partitions | null,
  handler?: PartitionsHandler | UpdateHandler,
  isEqual?: IsEqual<ReturnType<PartitionsHandler>>
) {
  const updateValue = partition || handler;

  return [
    usePartValue(partition as any, handler as PartitionsHandler, isEqual),
    usePartUpdate(updateValue as any),
  ];
}

export function usePartUpdate<PartitionsHandler extends AnyUpdater>(
  handler: PartitionsHandler
): UseUpdateUpdater<PartitionsHandler>;
export function usePartUpdate<
  Partition extends AnyStatefulPartition | AnyUpdatePartition
>(partition: Partition): UseUpdateUpdater<Partition['s']>;
export function usePartUpdate<StatefulPartition extends AnySelectPartition>(
  partition: StatefulPartition
): never;
export function usePartUpdate<
  StatefulPartition extends AnyPartition,
  PartitionsHandler extends AnyUpdater
>(partitionOrHandler: StatefulPartition | PartitionsHandler) {
  const store = useStore();
  const partition = useMemo(
    () =>
      isStatefulPartition(partitionOrHandler)
        ? partitionOrHandler
        : createUpdatePart({ set: partitionOrHandler }),
    [partitionOrHandler]
  ) as AnyUpdatePartition;

  return useMemo(
    () =>
      partition.s
        ? (...args: UpdatePartitionArgs<StatefulPartition['s']>) =>
            partition.s(store.getState, store.dispatch, ...args)
        : ((() => {}) as never),
    [store, partition]
  );
}

export function usePartValue<
  StatefulPartition extends AnyStatefulPartition | AnySelectPartition
>(partition: StatefulPartition): ReturnType<StatefulPartition['g']>;
export function usePartValue<StatefulPartition extends AnyUpdatePartition>(
  partition: StatefulPartition
): never;
export function usePartValue<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  PartitionsHandler extends (...args: SelectPartitionArgs<Partitions>) => any
>(
  partitions: Partitions,
  handler: PartitionsHandler,
  isEqual?: IsEqual<ReturnType<PartitionsHandler>>
): ReturnType<PartitionsHandler>;
export function usePartValue<
  StatefulPartition extends AnyPartition,
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  PartitionsHandler extends (...args: SelectPartitionArgs<Partitions>) => any
>(
  partitionOrPartitions: StatefulPartition | Partitions | null,
  handler?: PartitionsHandler,
  isEqual?: IsEqual<ReturnType<PartitionsHandler>>
) {
  const partitions: Array<AnySelectPartition | AnyStatefulPartition> =
    Array.isArray(partitionOrPartitions)
      ? partitionOrPartitions
      : [partitionOrPartitions];
  const partition = useMemo(
    () =>
      partitions.length > 1
        ? createSelectPart({ get: handler!, isEqual, partitions: partitions })
        : partitions[0],
    [...partitions, handler, isEqual]
  ) as StatefulPartition;

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

  return useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    isEqual
  );
}
