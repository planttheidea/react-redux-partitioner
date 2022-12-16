import { IGNORE_ALL_DEPENDENCIES } from './constants';
import { noop, updateUniqueList } from './utils';
import { isPartAction, isSelectablePart } from './validate';

import type {
  Action,
  AnyAction,
  PreloadedState,
  Reducer,
  Store as ReduxStore,
} from 'redux';
import type {
  AnySelectPart,
  AnySelectablePart,
  AnyStatefulPart,
  CombinedPartsState,
  Enhancer,
  EnhancerConfig,
  GetState,
  GetVersion,
  Listener,
  Notify,
  PartId,
  PartState,
  Unsubscribe,
} from './types';

export function createGetState<State>(
  originalGetState: ReduxStore<State>['getState'],
  getVersion?: GetVersion
): GetState<State> {
  function getState<Part extends AnySelectPart | AnyStatefulPart>(
    part?: Part
  ): Part extends any ? PartState<Part> : State {
    return part && isSelectablePart(part)
      ? part.g(getState, getVersion)
      : originalGetState();
  }

  return getState;
}

export function createEnhancer<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
>({ notifier, partMap }: EnhancerConfig): Enhancer<Parts, DispatchableAction> {
  type PartedState = CombinedPartsState<Parts>;

  return function enhancer(createStore) {
    return function enhance<StoreReducer extends Reducer>(
      reducer: StoreReducer,
      preloadedState: PreloadedState<PartedState> | undefined
    ) {
      const partListenerMap = {} as Record<
        number,
        [Listener[] | null, Listener[]]
      >;

      const batch = notifier || ((notify: Notify) => notify());
      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;
      const originalSubscribe = store.subscribe;

      let notifyPartsQueue: AnySelectablePart[] = [];
      let storeListeners: Listener[] | null = [];
      let nextStoreListeners = storeListeners!;
      let version = 0;

      /**
       * Add the Part id as a unique entry to the queue to be notified, ensuring that any dependents
       * that also need to be notified are included and in the order needed for future gets.
       */
      function addPartsToNotify(
        partsToNotify: PartId[],
        part: AnySelectablePart
      ) {
        const index = partsToNotify.indexOf(part.id);

        if (index === -1 || index < partsToNotify.length - 1) {
          if (index !== -1) {
            partsToNotify.splice(index, 1);
          }

          partsToNotify.push(part.id);
        }

        for (let index = 0; index < part.d.length; ++index) {
          addPartsToNotify(partsToNotify, part.d[index]!);
        }
      }

      function dispatch(action: any) {
        const prev = originalGetState();
        const result = originalDispatch(action);
        const next = originalGetState();

        if (prev !== next) {
          if (isPartAction(action)) {
            const id = action.$$part;
            const part = partMap[id];

            if (!part) {
              throw new Error(
                `Part with id ${id} not found. Is it included in this store?`
              );
            }

            // Only queue the part notification if state has changed, otherwise
            // it will cause unnecessary work.
            queuePartsToNotify(part);
          }

          version++;
          notify();
        }

        return result;
      }

      const getState = createGetState(originalGetState, () => version);

      function getVersion(): number {
        return version;
      }

      function notify() {
        batch(notifyListeners);
      }

      function notifyListeners() {
        const listeners = (storeListeners = nextStoreListeners);

        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]!();
        }

        const nextNotifyPartsQueue = notifyPartsQueue;

        notifyPartsQueue = [];

        // Delay the construction of parts to notify until notification is required, in case there are
        // timing concidences related to parts added / removed as dependents, which could impact
        // the notification tree.
        const partsToNotify: PartId[] = [];
        for (let index = 0; index < nextNotifyPartsQueue.length; ++index) {
          addPartsToNotify(partsToNotify, nextNotifyPartsQueue[index]!);
        }

        for (let index = 0; index < partsToNotify.length; ++index) {
          const partListeners = partListenerMap[partsToNotify[index]!];

          if (!partListeners) {
            continue;
          }

          const listeners = (partListeners[0] = partListeners[1]);

          for (let index = 0; index < listeners.length; ++index) {
            listeners[index]!();
          }
        }
      }

      function queuePartsToNotify(part: AnyStatefulPart): AnyStatefulPart[] {
        const descendantParts: AnyStatefulPart[] = [];

        for (let index = 0; index < part.c.length; ++index) {
          queuePartsToNotify(part.c[index]!);
        }

        updateUniqueList(notifyPartsQueue, part);

        return descendantParts;
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

          subscribed = false;
          updatePartListeners(part, listener, false);
        };
      }

      function updatePartListeners(
        part: AnySelectablePart,
        listener: Listener,
        add: boolean
      ) {
        const partListeners = partListenerMap[part.id]!;

        let [, nextPartListeners] = partListeners;

        if (nextPartListeners === partListeners[0]) {
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
        getVersion,
        subscribe,
        subscribeToDispatch: originalSubscribe,
        subscribeToPart,
      };
    };
  } as Enhancer<Parts, DispatchableAction>;
}
