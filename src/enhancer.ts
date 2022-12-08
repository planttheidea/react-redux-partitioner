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
  PartState,
  CombinedPartsState,
  PartsStoreExtensions,
  Unsubscribe,
  AnySelectablePart,
  PartId,
} from './types';
import { getStatefulPartMap, noop, updateUniqueList } from './utils';
import { IGNORE_ALL_DEPENDENCIES } from './constants';

const EMPTY_LISTENERS: [Listener[] | null, Listener[]] = [[], []];

export function createPartitioner<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts,
  notifier: Notifier = (notify) => notify()
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
      const partMap = getStatefulPartMap(parts);
      const partListenerMap = {} as Record<
        number,
        [Listener[] | null, Listener[]]
      >;

      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;

      let batch = notifier || ((notify: Notify) => notify());
      let notifyPartsQueue: AnySelectablePart[] = [];
      let storeListeners: Listener[] | null = [];
      let nextStoreListeners = storeListeners!;
      let version: number = 0;

      /**
       * Add the Part id as a unique entry to the queue to be notified, ensuring that any dependents
       * that also need to be notified are included and in the order needed for future gets.
       */
      function addToNotifyPartsQueue(
        partsToNotify: PartId[],
        part: AnySelectablePart
      ) {
        const index = partsToNotify.indexOf(part.id);

        partsToNotify.push(part.id);

        if (index !== -1) {
          partsToNotify.splice(index, 1);
        }

        for (let index = 0; index < part.d.length; ++index) {
          addToNotifyPartsQueue(partsToNotify, part.d[index]);
        }
      }

      function dispatch(action: any) {
        if (isPartAction(action)) {
          const id = action.$$part;
          const part = partMap[id];

          if (!part) {
            throw new Error(
              `Part with id ${id} not found. Is it included in this store?`
            );
          }

          updateUniqueList(notifyPartsQueue, part);
        }

        const prev = originalGetState();
        const result = originalDispatch(action);
        const next = originalGetState();

        if (prev !== next) {
          version++;
          notify();
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

      /**
       * Hidden method to get the version of state changes, to help with async selectors
       * both be more efficient but also potentially avoid infinite render loops whe used
       * with Suspense.
       */
      getState.v = function () {
        return version;
      };

      function notify() {
        batch(notifyListeners);
      }

      function notifyListeners() {
        const listeners = (storeListeners = nextStoreListeners);

        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]();
        }

        const nextNotifyPartsQueue = notifyPartsQueue;

        notifyPartsQueue = [];

        // Delay the construction of parts to notify until notification is required, in case there are
        // timing concidences related to parts added / removed as dependents, which could impact
        // the notification tree.
        const partsToNotify: PartId[] = [];
        for (let index = 0; index < nextNotifyPartsQueue.length; ++index) {
          addToNotifyPartsQueue(partsToNotify, nextNotifyPartsQueue[index]);
        }

        for (let index = 0; index < partsToNotify.length; ++index) {
          const partListeners = partListenerMap[partsToNotify[index]];

          if (!partListeners) {
            continue;
          }

          const listeners = (partListeners[0] = partListeners[1]);

          for (let index = 0; index < listeners.length; ++index) {
            listeners[index]();
          }
        }
      }

      function subscribe(listener: Listener): Unsubscribe {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function; received '${typeof listener}'`
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
            `Expected the listener to be a function; received '${typeof listener}'`
          );
        }

        if (part.d === IGNORE_ALL_DEPENDENCIES) {
          return noop;
        }

        if (!partListenerMap[part.id]) {
          const initialListeners: Listener[] = [];

          partListenerMap[part.id] = [initialListeners, initialListeners];
        }

        if ((part as any).b === false) {
          subscribe(listener);
        }

        let subscribed = true;
        updatePartListeners(part, listener, true);

        return () => {
          if (!subscribed) {
            return;
          }

          console.group('unsubscribed');

          subscribed = false;
          updatePartListeners(part, listener, false);

          console.groupEnd();
        };
      }

      function updatePartListeners(
        part: AnySelectablePart,
        listener: Listener,
        add: boolean
      ) {
        const partListeners = partListenerMap[part.id];

        let [currentPartListeners, nextPartListeners] = partListeners;

        if (nextPartListeners === currentPartListeners) {
          nextPartListeners = partListeners[1] = nextPartListeners.slice(0);
        }

        if (add) {
          nextPartListeners.push(listener);
        } else {
          const index = nextPartListeners.indexOf(listener);

          if (index === 0 && nextPartListeners.length === 1) {
            delete partListenerMap[part.id];
          } else if (index !== -1) {
            nextPartListeners.splice(index, 1);
            partListeners[0] = null;
          }
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
