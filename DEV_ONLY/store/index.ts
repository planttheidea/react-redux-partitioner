import { configureStore } from '@reduxjs/toolkit';
import {
  applyMiddleware,
  compose,
  createStore,
  type AnyAction,
  type Middleware,
} from 'redux';
import createSagaMiddleware from 'redux-saga';
import { call, select, take } from 'redux-saga/effects';

import {
  createPartitioner,
  part,
  type PartAction,
  type PartsStoreExtensions,
  type Store,
} from '../../src';

import { storeParts, todosPart, type Todo } from './parts';

const legacy = (state = 'legacy', action: AnyAction) => {
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

const sagaMiddleware = createSagaMiddleware();

export const selectTodos = part([todosPart], (todos) => todos);

function* logTodos(action: PartAction<Todo[]>, before: Todo[]) {
  console.log('-----------');
  yield call(console.log, 'before', before);
  yield call(console.log, 'action', action.value);
  yield call(console.log, 'state', yield select(selectTodos));
  console.log('-----------');
}

function* mySaga() {
  while (true) {
    const before = yield select(selectTodos);
    const action = yield take(todosPart);

    yield call(logTodos, action, before);
  }
}

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

const { enhancer, reducer } = createPartitioner({
  parts: storeParts,
  notifier: debouncedNotify,
  otherReducer: { legacy },
});
const composeEnhancers =
  // @ts-expect-error - Devtools not on window type
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const reduxStoreEnhancer = composeEnhancers(
  applyMiddleware(sagaMiddleware, logger),
  enhancer
);

export const store = createStore<
  ReduxState,
  AnyAction,
  PartsStoreExtensions<ReduxState>,
  {}
>(reducer, reduxStoreEnhancer);

export const storeConfigured = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => [
    sagaMiddleware,
    logger,
    ...getDefaultMiddleware(),
  ],
  enhancers: [enhancer],
});

sagaMiddleware.run(mySaga);
