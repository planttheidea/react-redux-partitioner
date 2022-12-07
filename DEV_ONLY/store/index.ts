import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import {
  applyMiddleware,
  compose,
  createStore,
  type AnyAction,
  type Middleware,
} from 'redux';

import {
  createReducer,
  createPartitioner,
  type Store,
  type PartsStoreExtensions,
} from '../../src';

import { storeParts } from './parts';

const legacy = (state: string = 'legacy', action: AnyAction) => {
  return action.type === 'LEGACY' ? 'modern' : state;
};

export type ReduxState = ReturnType<typeof reducer>;
export type MyStore = Store<ReduxState>;

// const logging = true;
const logging = false;
const logger: Middleware<MyStore> = () => (next) => (action) => {
  if (logging) {
    console.group(action);
    console.log('dispatching');
  }
  const result = next(action);
  if (logging) {
    console.log(result);
    console.log('finished');
    console.groupEnd();
  }
  return result;
};

function debounce<Fn extends (notify: () => void) => void>(fn: Fn, ms = 0): Fn {
  let id: ReturnType<typeof setTimeout> | null = null;

  return function (notify: () => void): void {
    if (id) {
      clearTimeout(id);
    }

    id = setTimeout(() => {
      fn(notify);
      id = null;
    }, ms);
  } as Fn;
}
const debouncedNotify = debounce((notify) => notify(), 0);

const reducer = createReducer(storeParts, { legacy });
const composeEnhancers =
  // @ts-expect-error - Devtools not on window type
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

type StoreState = ReturnType<typeof reducer>;

const reduxStoreEnhancer = composeEnhancers(
  applyMiddleware(logger),
  createPartitioner(storeParts, debouncedNotify)
);

export const store = createStore<
  StoreState,
  AnyAction,
  PartsStoreExtensions<StoreState>,
  {}
>(reducer, reduxStoreEnhancer);

export const storeConfigured = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => [logger, ...getDefaultMiddleware()],
  enhancers: [createPartitioner(storeParts, debouncedNotify)],
});
