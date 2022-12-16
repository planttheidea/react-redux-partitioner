import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { call, select, take } from 'redux-saga/effects';
import { type PartAction, createPartitioner } from '../../../src';
import { descriptionPart } from './description';
import { titlePart } from './title';
import { type Todo, selectTodos, todosPart } from './todos';

const sagaMiddleware = createSagaMiddleware();

function* logTodos(action: PartAction<Todo[]>, before: Todo[]): Generator {
  console.log('-----------');
  yield call(console.log, 'before', before);
  yield call(console.log, 'action', action.value);
  yield call(console.log, 'state', yield select(selectTodos));
  console.log('-----------');
}

function* mySaga(): Generator {
  while (true) {
    const before = yield select(selectTodos);
    const action = yield take(todosPart);

    yield call(logTodos, action as PartAction<Todo[]>, before as Todo[]);
  }
}

const partitioner = createPartitioner({
  parts: [descriptionPart, titlePart, todosPart] as const,
});

export const store = configureStore({
  reducer: partitioner.reducer,
  middleware: (getDefaultMiddleware) => [
    sagaMiddleware,
    ...getDefaultMiddleware(),
  ],
  enhancers: [partitioner.enhancer],
});

sagaMiddleware.run(mySaga);
