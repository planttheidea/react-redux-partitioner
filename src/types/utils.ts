export type IsEqual<Value> = (a: Value, b: Value) => boolean;

export type FunctionalUpdate<State> = (prev: State) => State;

export type Tuple<Type> = readonly [Type] | readonly Type[];
