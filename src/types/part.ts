import type { Dispatch } from 'redux';
import type {
  COMPOSED_PART,
  PRIMITIVE_PART,
  PROXY_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATE_PART,
} from '../flags';
import type { GetState, PartAction } from './store';
import type { FunctionalUpdate, IsEqual, Tuple } from './utils';

export type PartId = number;

export type PartialPartState<BaseStatefulPart extends AnyStatefulPart> = {
  [Name in BaseStatefulPart as BaseStatefulPart['n']]: BaseStatefulPart['i'];
};

export type CombineState<
  PrevState,
  Parts extends Tuple<AnyStatefulPart>
> = Parts extends [
  infer Head extends AnyStatefulPart,
  ...infer Tail extends Tuple<AnyStatefulPart>
]
  ? CombineState<PrevState & PartialPartState<Head>, Tail>
  : {} extends PrevState
  ? Record<string, any>
  : PrevState;

export type CombinedPartsState<Parts extends Tuple<AnyStatefulPart>> =
  CombineState<{}, [...Parts]>;
export type AnyPartsState = CombinedPartsState<AnyStatefulPart[]>;

export type Get<State> = (getState: GetState) => State;
export type Set<State> = (
  getState: GetState,
  dispatch: Dispatch,
  nextState: State | FunctionalUpdate<State>
) => ReturnType<Dispatch<PartAction<State>>>;

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
    UpdatePart<GetValueUpdater<State, (nextState: State) => State>>
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
> extends BaseStatefulPart<Name, CombinedPartsState<[...Parts]>> {
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

export type PartState<Part> = Part extends AnyStatefulPart
  ? Part['i']
  : Part extends AnySelectablePart
  ? ReturnType<Part['g']>
  : undefined;

type MergeSelectPartArgs<
  Args extends any[],
  Parts extends Tuple<AnySelectablePart>
> = Parts extends [
  infer Head extends AnySelectablePart,
  ...infer Tail extends Tuple<AnySelectablePart>
]
  ? MergeSelectPartArgs<[...Args, PartState<Head>], Tail>
  : Args;

export type SelectPartArgs<Parts extends Tuple<AnySelectablePart>> =
  MergeSelectPartArgs<[], [...Parts]>;

export interface BoundSelectPartConfig<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
> extends BasePartConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
}

export interface UnboundSelectPartConfig<Selector extends AnyGenericSelector>
  extends BasePartConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts?: never;
}

export type AnySelector<
  Parts extends readonly AnySelectablePart[] = AnySelectablePart[]
> = (...args: SelectPartArgs<Parts>) => any;
export type AnyGenericSelector = (getState: GetState) => any;

export interface BaseSelectPart extends BasePart {
  f: typeof SELECT_PART;
  s: () => void;
}

export interface UnboundSelectPart<Selector extends AnyGenericSelector>
  extends BaseSelectPart {
  (getState: GetState): ReturnType<Selector>;

  d: [];
  e: IsEqual<ReturnType<Selector>>;
  g: Get<ReturnType<Selector>>;
}

export interface BoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
> extends BaseSelectPart {
  (getState: GetState): ReturnType<Selector>;

  d: AnyStatefulPart[];
  e: IsEqual<ReturnType<Selector>>;
  g: Get<ReturnType<Selector>>;
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

export type AnyPart =
  | AnyStatefulPart
  | AnySelectPart
  | AnyUpdatePart
  | AnyProxyPart;
export type AnyComposedPart = ComposedPart<string, AnyStatefulPart[]>;
export type AnyPrimitivePart = PrimitivePart<string, any>;
export type AnyProxyPart =
  | BoundProxyPart<AnySelectablePart[], AnySelector, AnyUpdater>
  | UnboundProxyPart<AnySelector, AnyUpdater>;
export type AnyStatefulPart = StatefulPart<
  string,
  any,
  readonly AnyStatefulPart[],
  boolean
>;
export type AnySelectPart =
  | BoundSelectPart<AnySelectablePart[], AnySelector>
  | UnboundSelectPart<AnyGenericSelector>;
export type AnySelectablePart = AnyStatefulPart | AnySelectPart | AnyProxyPart;
export type AnyUpdatePart = UpdatePart<AnyUpdater>;
export type AnyUpdateablePart = AnyStatefulPart | AnyProxyPart | AnyUpdatePart;

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

export interface BoundProxyPartConfig<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
> extends BasePartConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
  set: Updater;
}

export interface UnboundProxyPartConfig<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> extends BasePartConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  part?: never;
  set: Updater;
}

export interface BaseProxyPart extends BasePart {
  f: typeof PROXY_PART;
}

export interface UnboundProxyPart<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> extends BaseProxyPart {
  select(getState: GetState): ReturnType<Selector>;
  update(
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartArgs<Updater>
  ): ReturnType<Updater>;

  d: [];
  e: IsEqual<ReturnType<Selector>>;
  g: Get<ReturnType<Selector>>;
  s: Updater;
}

export interface BoundProxyPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
> extends BaseProxyPart {
  select(getState: GetState): ReturnType<Selector>;
  update(
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartArgs<Updater>
  ): ReturnType<Updater>;

  d: AnyStatefulPart[];
  e: IsEqual<ReturnType<Selector>>;
  g: Get<ReturnType<Selector>>;
  s: Updater;
}

export type IsPartEqual<Part extends AnyPart> = Part extends AnySelectablePart
  ? IsEqual<Part['g']>
  : IsEqual<undefined>;

export type UsePartPair<Part extends AnyPart> = [
  UsePartValue<Part>,
  UsePartUpdate<Part>
];

export type UsePartValue<Part extends AnyPart> = Part extends AnySelectablePart
  ? ReturnType<Part['g']>
  : never;

export type UsePartUpdate<Part extends AnyPart> = Part extends AnyUpdateablePart
  ? (...rest: UpdatePartArgs<Part['s']>) => ReturnType<Part['s']>
  : never;
