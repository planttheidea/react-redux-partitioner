import { Dispatch } from 'redux';
import { GetState } from './store';

export type IsEqual<Value> = (a: Value, b: Value) => boolean;

export type FunctionalUpdate<State> = (prev: State) => State;

export type Thunk<State, Result> = (
  dispatch: Dispatch,
  getState: GetState<State>
) => Result;

export type Tuple<Type> = readonly [Type] | readonly Type[];
