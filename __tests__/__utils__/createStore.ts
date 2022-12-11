import { configureStore, type Dispatch } from '@reduxjs/toolkit';
import {
  type AnyStatefulPart,
  type Store,
  part,
  createPartitioner,
  GetState,
} from '../../src';

export function createStore<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts
): Store {
  const { enhancer, reducer } = createPartitioner({ parts });

  const store = configureStore({
    reducer,
    enhancers: [enhancer],
  });

  // @ts-expect-error - v is hidden
  const v = store.getState.v;

  const dispatch = jest.fn(store.dispatch) as Dispatch;
  const getState = jest.fn(store.getState) as unknown as GetState;

  // @ts-expect-error - v is hidden
  getState.v = v;

  return { ...store, dispatch, getState };
}
