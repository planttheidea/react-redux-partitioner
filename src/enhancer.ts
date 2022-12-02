import {
  isSelectPartition,
  isPartitionAction,
  isStatefulPartition,
} from './utils';

import type {
  PreloadedState,
  Reducer,
  StoreEnhancer,
  StoreEnhancerStoreCreator,
} from 'redux';
import type {
  AnySelectPartition,
  AnyStatefulPartition,
  Listener,
  Notifier,
  Notify,
  PartitionId,
  PartitionsState,
  PartitionsStoreExtensions,
  SourceResult,
  Unsubscribe,
} from './internalTypes';

export function createPartitioner<
  Partitions extends readonly AnyStatefulPartition[]
>(
  partitions: Partitions,
  notifier: Notifier
): StoreEnhancer<PartitionsStoreExtensions<PartitionsState<Partitions>>> {
  type PartitionedState = PartitionsState<Partitions>;
  type PartitionedExtensions = PartitionsStoreExtensions<PartitionedState>;

  return function enhancer(
    createStore: StoreEnhancerStoreCreator<PartitionedExtensions>
  ) {
    return function enhance<StoreReducer extends Reducer>(
      reducer: StoreReducer,
      preloadedState: PreloadedState<PartitionedState> | undefined
    ) {
      const partitionMap: Record<string, AnyStatefulPartition> = {};

      partitions.forEach((partition) => {
        partition.d.forEach((descendantPartition) => {
          partitionMap[descendantPartition.id] = descendantPartition;
        });
      });

      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;
      const slicesToNotify: PartitionId[] = [];

      let batch = notifier || ((notify: Notify) => notify());
      let partitionListeners: Record<string, Listener[]> | null = {};
      let nextPartitionListeners = partitionListeners!;
      let storeListeners: Listener[] | null = [];
      let nextStoreListeners = storeListeners!;

      function dispatch(action: any) {
        if (isPartitionAction(action)) {
          const id = action.$$part;

          if (!hasPartition(id)) {
            throw new Error(
              `Partition with id ${id} not found. Is it part of this store?`
            );
          }

          if (!~slicesToNotify.indexOf(id)) {
            slicesToNotify.push(id);
          }
        }

        const prev = originalGetState();
        const result = originalDispatch(action);
        const next = originalGetState();

        if (prev !== next) {
          notifyListeners();
        }

        return result;
      }

      function getState(): PartitionedState;
      function getState<
        Source extends AnySelectPartition | AnyStatefulPartition | undefined
      >(source: Source): SourceResult<Source>;
      function getState<
        Source extends AnySelectPartition | AnyStatefulPartition | undefined
      >(
        source?: Source
      ): Source extends any ? SourceResult<Source> : PartitionedState {
        if (!source) {
          return originalGetState();
        }

        if (isSelectPartition(source)) {
          return source(getState);
        }

        if (isStatefulPartition(source)) {
          const path = source.p;

          let state: any = originalGetState();

          for (let index = 0, length = path.length; index < length; ++index) {
            state = state[path[index]];

            if (!state) {
              return state;
            }
          }

          return state;
        }

        return originalGetState();
      }

      function hasPartition(id: PartitionId) {
        return !!partitionMap[id];
      }

      function notify() {
        const listeners = (storeListeners = nextStoreListeners);

        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]();
        }

        const allPartitionListeners = (partitionListeners =
          nextPartitionListeners);

        while (slicesToNotify.length > 0) {
          const id = slicesToNotify.pop();
          const partitionListeners = allPartitionListeners[id];

          if (!partitionListeners) {
            continue;
          }

          for (let index = 0; index < partitionListeners.length; ++index) {
            partitionListeners[index]();
          }
        }
      }

      function notifyListeners() {
        batch(notify);
      }

      function subscribe(listener: Listener): Unsubscribe {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function. Instead, received: '${typeof listener}'`
          );
        }

        let subscribed = true;
        updateStoreListeners(listener, true);

        return () => {
          if (!subscribed) {
            return;
          }

          subscribed = false;
          updateStoreListeners(listener, false);
        };
      }

      function subscribeToPartition(
        partition: AnyStatefulPartition,
        listener: Listener
      ) {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function. Instead, received: '${typeof listener}'`
          );
        }

        let subscribed = true;
        updatePartitionListeners(partition.id, listener, true);

        return () => {
          if (!subscribed) {
            return;
          }

          subscribed = false;
          updatePartitionListeners(partition.id, listener, false);
        };
      }

      function updatePartitionListeners(
        id: PartitionId,
        listener: Listener,
        add: boolean
      ) {
        if (
          nextPartitionListeners === partitionListeners ||
          !partitionListeners ||
          !partitionListeners[id]
        ) {
          const listeners = nextPartitionListeners[id];

          nextPartitionListeners = {
            ...nextPartitionListeners,
            [id]: listeners ? listeners.slice(0) : [],
          };
        }

        if (add) {
          nextPartitionListeners[id].push(listener);
        } else {
          const listeners = nextPartitionListeners[id];

          listeners.splice(listeners.indexOf(listener), 1);

          if (!listeners.length) {
            delete nextPartitionListeners[id];
          }

          partitionListeners = null;
        }
      }

      function updateStoreListeners(listener: Listener, add: boolean) {
        if (nextStoreListeners === storeListeners) {
          nextStoreListeners = storeListeners.slice(0);
        }

        if (add) {
          nextStoreListeners.push(listener);
        } else {
          nextStoreListeners.splice(nextStoreListeners.indexOf(listener), 1);
          storeListeners = null;
        }
      }

      return {
        ...store,
        dispatch,
        getState,
        subscribe,
        subscribeToPartition,
      };
    };
  } as StoreEnhancer<PartitionedExtensions>;
}
