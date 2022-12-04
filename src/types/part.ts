import type { Dispatch } from 'redux';
import type {
  COMPOSED_PART,
  PRIMITIVE_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATE_PART,
} from '../flags';
import type { GetState, PartAction } from './store';
import type { FunctionalUpdate, IsEqual, Tuple } from './utils';

export type PartId = number;

export type PartState<BaseStatefulPart extends AnyStatefulPart> = {
  [Name in BaseStatefulPart as BaseStatefulPart['n']]: BaseStatefulPart['i'];
};

export type CombineState<
  PrevState,
  Parts extends Tuple<AnyStatefulPart>
> = Parts extends [
  infer Head extends AnyStatefulPart,
  ...infer Tail extends Tuple<AnyStatefulPart>
]
  ? CombineState<PrevState & PartState<Head>, Tail>
  : {} extends PrevState
  ? Record<string, any>
  : PrevState;

export type PartsState<Parts extends Tuple<AnyStatefulPart>> = CombineState<
  {},
  [...Parts]
>;
export type AnyPartsState = PartsState<AnyStatefulPart[]>;

export type Get<State> = (getState: GetState) => State;
export type Set<State> = (
  getState: GetState,
  dispatch: Dispatch,
  nextState: State | FunctionalUpdate<State>
) => any;

export interface BasePartConfig {}

export interface StatefulPartConfig<Name extends string>
  extends BasePartConfig {
  name: Name;
}

export interface PrimitivePartConfig<Name extends string, State>
  extends StatefulPartConfig<Name> {
  initialState: State;
}

export interface ComposedPartConfig<
  Name extends string,
  Parts extends readonly AnyStatefulPart[]
> extends StatefulPartConfig<Name> {
  parts: Parts;
}

export interface BasePart {
  id: PartId;

  d: AnyStatefulPart[];
}

export type GetValueUpdater<State, GetValue extends AnyGetValue<State>> = (
  getState: GetState<State>,
  dispatch: Dispatch,
  ...args: Parameters<GetValue>
) => PartAction<State>;

export interface StatefulPartUpdater<State> {
  <GetValue extends AnyGetValue<State>>(type: string): UpdatePart<
    GetValueUpdater<State, (nextState: State) => State>
  >;
  <GetValue extends AnyGetValue<State>>(
    type: string,
    getValue: GetValue
  ): UpdatePart<GetValueUpdater<State, GetValue>>;
}

export interface BaseStatefulPart<Name extends string, State> extends BasePart {
  (nextValue: State): PartAction<State>;

  toString(): string;
  update: StatefulPartUpdater<State>;

  a: string;
  f: typeof STATEFUL_PART;
  g: Get<State>;
  i: State;
  n: Name;
  o: string;
  p: string[];
  r(state: State, action: any): State;
  s: Set<State>;
}

export interface PrimitivePart<Name extends string, State>
  extends BaseStatefulPart<Name, State> {
  f: typeof PRIMITIVE_PART;
}

export interface ComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
> extends BaseStatefulPart<Name, PartsState<[...Parts]>> {
  f: typeof COMPOSED_PART;
}

export type StatefulPart<
  Name extends string,
  State,
  Parts extends Tuple<AnyStatefulPart>,
  IsComposed
> = IsComposed extends true
  ? ComposedPart<Name, Parts>
  : PrimitivePart<Name, State>;

export type PartResult<Part> = Part extends AnyStatefulPart
  ? Part['i']
  : Part extends AnySelectPart
  ? ReturnType<Part>
  : undefined;

type MergeSelectPartArgs<
  Args extends any[],
  Parts extends Tuple<AnySelectPart | AnyStatefulPart>
> = Parts extends [
  infer Head extends AnySelectPart | AnyStatefulPart,
  ...infer Tail extends Tuple<AnySelectPart | AnyStatefulPart>
]
  ? MergeSelectPartArgs<[...Args, PartResult<Head>], Tail>
  : Args;

export type SelectPartArgs<
  Parts extends Tuple<AnySelectPart | AnyStatefulPart>
> = MergeSelectPartArgs<[], [...Parts]>;

export interface SelectPartConfig<
  Parts extends Tuple<AnySelectPart | AnyStatefulPart>,
  Selector extends AnySelector<Parts> | AnyGenericSelector
> extends BasePartConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts?: Parts;
}

export type AnySelector<
  Parts extends readonly AnySelectablePart[] = AnySelectablePart[]
> = (...args: SelectPartArgs<Parts>) => any;
export type AnyGenericSelector = (getState: GetState) => any;

export interface SelectPart<
  Parts extends Tuple<AnySelectPart | AnyStatefulPart>,
  Selector extends AnySelector<Parts> | AnyGenericSelector
> extends BasePart {
  (getState: GetState): ReturnType<Selector>;

  e: IsEqual<ReturnType<Selector>>;
  f: typeof SELECT_PART;
  g: Get<ReturnType<Selector>>;
  s: () => void;
}

export type AnyUpdater = (
  getState: GetState,
  dispatch: Dispatch,
  ...rest: any[]
) => any;

export type UpdatePartArgs<Updater extends AnyUpdater> = Updater extends (
  getState: GetState,
  dispatch: Dispatch,
  ...rest: infer Rest
) => any
  ? Rest
  : never;

export interface UpdatePartConfig<Updater extends AnyUpdater>
  extends BasePartConfig {
  set: Updater;
}

export interface UpdatePart<Updater extends AnyUpdater> extends BasePart {
  (
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartArgs<Updater>
  ): ReturnType<Updater>;

  d: [];
  f: typeof UPDATE_PART;
  g: () => void;
  s: Updater;
}

export type AnyPart = AnyStatefulPart | AnySelectPart | AnyUpdatePart;
export type AnyComposedPart = ComposedPart<string, AnyStatefulPart[]>;
export type AnyPrimitivePart = PrimitivePart<string, any>;
export type AnyStatefulPart = StatefulPart<
  string,
  any,
  readonly AnyStatefulPart[],
  boolean
>;
export type AnySelectPart = SelectPart<
  Array<AnySelectPart | AnyStatefulPart>,
  AnySelector
>;
export type AnySelectablePart = AnyStatefulPart | AnySelectPart;
export type AnyUpdatePart = UpdatePart<AnyUpdater>;

export type AnyGetValue<State> = (
  ...args: any[]
) => State | FunctionalUpdate<State>;

export interface PartActionConfig<
  Part extends AnyStatefulPart,
  GetValue extends AnyGetValue<Part['i']>
> {
  getValue?: GetValue;
  type: string;
}
