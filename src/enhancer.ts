import { isComposedPart, isPartAction, isSelectablePart } from './validate';

import type {
  PreloadedState,
  Reducer,
  StoreEnhancer,
  StoreEnhancerStoreCreator,
} from 'redux';
import type {
  AnySelectPart,
  AnyStatefulPart,
  Listener,
  Notifier,
  Notify,
  PartId,
  PartState,
  CombinedPartsState,
  PartsStoreExtensions,
  Unsubscribe,
  AnySelectablePart,
} from './types';
import { FULL_STATE_DEPENDENCY, IGNORE_ALL_DEPENDENCIES } from './constants';
import { noop } from './utils';

export function createPartitioner<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts,
  notifier: Notifier
): StoreEnhancer<PartsStoreExtensions<CombinedPartsState<Parts>>> {
  type PartedState = CombinedPartsState<Parts>;
  type PartedExtensions = PartsStoreExtensions<PartedState>;

  return function enhancer(
    createStore: StoreEnhancerStoreCreator<PartedExtensions>
  ) {
    return function enhance<StoreReducer extends Reducer>(
      reducer: StoreReducer,
      preloadedState: PreloadedState<PartedState> | undefined
    ) {
      const partMap: Record<string, AnyStatefulPart> = {};

      parts.forEach((part) => {
        part.d.forEach((descendantPart) => {
          partMap[descendantPart.id] = descendantPart;
        });

        partMap[part.id] = part;
      });

      const store = createStore(reducer, preloadedState);
      const notifyPartsQueue: PartId[] = [];
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;

      let batch = notifier || ((notify: Notify) => notify());
      let partListeners: Record<string, Listener[]> | null = {};
      let nextPartListeners = partListeners!;
      let storeListeners: Listener[] | null = [];
      let nextStoreListeners = storeListeners!;

      function dispatch(action: any) {
        if (isPartAction(action)) {
          const id = action.$$part;

          const part = partMap[id];

          if (!part) {
            throw new Error(
              `Part with id ${id} not found. Is it part of this store?`
            );
          }

          queueNotifyPart(part);

          if (isComposedPart(part)) {
            for (let index = 0; index < part.d.length; ++index) {
              queueNotifyPart(part.d[index]);
            }
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

      function getState(): PartedState;
      function getState<
        Part extends AnySelectPart | AnyStatefulPart | undefined
      >(part: Part): PartState<Part>;
      function getState<
        Part extends AnySelectPart | AnyStatefulPart | undefined
      >(part?: Part): Part extends any ? PartState<Part> : PartedState {
        return part && isSelectablePart(part)
          ? part.g(getState)
          : originalGetState();
      }

      function notify() {
        const listeners = (storeListeners = nextStoreListeners);

        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]();
        }

        const allPartListeners = (partListeners = nextPartListeners);

        while (notifyPartsQueue.length > 0) {
          const id = notifyPartsQueue.pop()!;
          const partListeners = allPartListeners[id];

          if (!partListeners) {
            continue;
          }

          for (let index = 0; index < partListeners.length; ++index) {
            partListeners[index]();
          }
        }
      }

      function notifyListeners() {
        batch(notify);
      }

      function queueNotifyPart(part: AnyStatefulPart) {
        if (!~notifyPartsQueue.indexOf(part.id)) {
          notifyPartsQueue.push(part.id);
        }
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

      function subscribeToPart(part: AnySelectablePart, listener: Listener) {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function. Instead, received: '${typeof listener}'`
          );
        }

        const dependencies = part.d;

        if (dependencies === FULL_STATE_DEPENDENCY) {
          return subscribe(listener);
        }

        if (dependencies === IGNORE_ALL_DEPENDENCIES || !dependencies.length) {
          return noop;
        }

        let subscribed = true;

        for (let index = 0; index < dependencies.length; ++index) {
          updatePartListeners(dependencies[index].id, listener, true);
        }

        return () => {
          if (!subscribed) {
            return;
          }

          subscribed = false;

          for (let index = 0; index < dependencies.length; ++index) {
            updatePartListeners(dependencies[index].id, listener, false);
          }
        };
      }

      function updatePartListeners(
        id: PartId,
        listener: Listener,
        add: boolean
      ) {
        if (
          nextPartListeners === partListeners ||
          !partListeners ||
          !partListeners[id]
        ) {
          const listeners = nextPartListeners[id];

          nextPartListeners = {
            ...nextPartListeners,
            [id]: listeners ? listeners.slice(0) : [],
          };
        }

        if (add) {
          nextPartListeners[id].push(listener);
        } else {
          const listeners = nextPartListeners[id];

          listeners.splice(listeners.indexOf(listener), 1);

          if (!listeners.length) {
            delete nextPartListeners[id];
          }

          partListeners = null;
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
        subscribeToPart,
      };
    };
  } as StoreEnhancer<PartedExtensions>;
}
