import { Dispatch } from 'redux';
import { GetState } from './store';

export type IsEqual<Type = any> = (a: Type, b: Type) => boolean;

export type FunctionalUpdate<State> = (prev: State) => State;

export type MaybePromise<Value> = Value | Promise<Value>;

export type ResolvedValue<Value> = Value extends Promise<infer Result>
  ? ResolvedValue<Result>
  : Value;

export type Thunk<State, Result> = (
  dispatch: Dispatch,
  getState: GetState<State>
) => Result;

export type Tuple<Type> = readonly [Type] | readonly Type[];
