import { useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { ReduxPartitionsContext } from './Context';
import { createSelectPartition, createUpdatePartition } from '../../src/part';

import type { Store } from 'redux';
import type {
  AnyPartition,
  AnySelectPartition,
  AnyUpdatePartition,
  AnyStatefulPartition,
  IsEqual,
  Listener,
  SelectPartitionArgs,
  Tuple,
  UpdatePartitionArgs,
  UpdatePartitionHandler,
  Unsubscribe,
  UseUpdatePartitionHandler,
  AnyPrimitivePartition,
} from '../../src';
import { isPartition, isStatefulPartition } from '../../src/utils';

export function useDispatch() {
  return useStore().dispatch;
}

function noop(): undefined {
  return;
}
function noopSubscribe() {
  return noop;
}

function useReduxContext() {
  const context = useContext(ReduxPartitionsContext);

  if (!context) {
    throw new Error(
      'There is no context provided. Is this React tree wrapped in a `Provider`?'
    );
  }

  return context;
}

export function usePart<Partition extends AnyStatefulPartition>(
  partition: Partition
): [ReturnType<Partition['r']>, UseUpdatePartitionHandler<Partition['s']>];

export function usePart<Partition extends AnySelectPartition>(
  partition: Partition
): [ReturnType<Partition['r']>, never];
export function usePart<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  SourcesHandler extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
): [ReturnType<SourcesHandler>, never];

export function usePart<Partition extends AnyUpdatePartition>(
  partition: Partition
): [never, UseUpdatePartitionHandler<Partition['s']>];
export function usePart<UpdateHandler extends UpdatePartitionHandler>(
  ignored: null | undefined,
  handler: UpdateHandler
): [never, UseUpdatePartitionHandler<UpdateHandler>];

export function usePart<
  StatefulPartition extends AnyPartition,
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  SourcesHandler extends (...args: SelectPartitionArgs<Sources>) => any,
  UpdateHandler extends UpdatePartitionHandler
>(
  partition: StatefulPartition | Sources | null,
  handler?: SourcesHandler | UpdateHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
) {
  const updateValue = partition || handler;

  return [
    usePartValue(partition as any, handler as SourcesHandler, isEqual),
    usePartUpdate(updateValue as any),
  ];
}

export function usePartUpdate<SourcesHandler extends UpdatePartitionHandler>(
  handler: SourcesHandler
): UseUpdatePartitionHandler<SourcesHandler>;
export function usePartUpdate<
  StatefulPartition extends AnyStatefulPartition | AnyUpdatePartition
>(
  partition: StatefulPartition
): UseUpdatePartitionHandler<StatefulPartition['s']>;
export function usePartUpdate<StatefulPartition extends AnySelectPartition>(
  partition: StatefulPartition
): never;
export function usePartUpdate<
  StatefulPartition extends AnyPartition,
  SourcesHandler extends UpdatePartitionHandler
>(partitionOrHandler: StatefulPartition | SourcesHandler) {
  const store = useStore();
  const partition = useMemo(
    () =>
      isStatefulPartition(partitionOrHandler)
        ? partitionOrHandler
        : createUpdatePartition(partitionOrHandler),
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
>(partition: StatefulPartition): ReturnType<StatefulPartition['r']>;
export function usePartValue<StatefulPartition extends AnyUpdatePartition>(
  partition: StatefulPartition
): never;
export function usePartValue<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  SourcesHandler extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
): ReturnType<SourcesHandler>;
export function usePartValue<
  StatefulPartition extends AnyPartition,
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  SourcesHandler extends (...args: SelectPartitionArgs<Sources>) => any
>(
  partitionOrSources: StatefulPartition | Sources | null,
  handler?: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
) {
  const sources: Array<AnySelectPartition | AnyStatefulPartition> =
    Array.isArray(partitionOrSources)
      ? partitionOrSources
      : [partitionOrSources];
  const partition = useMemo(
    () =>
      sources.length > 1
        ? createSelectPartition(sources, handler!, isEqual)
        : sources[0],
    [...sources, handler, isEqual]
  ) as StatefulPartition;

  const { getServerState, store } = useReduxContext();

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

export function useStore(): Store {
  return useReduxContext().store;
}
