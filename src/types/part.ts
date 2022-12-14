import type { IgnoreAllDependencies } from '../constants';
import type {
  COMPOSED_PART,
  PART,
  PRIMITIVE_PART,
  PROXY_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATE_PART,
} from '../flags';
import type { Dispatch, GetState, PartAction } from './store';
import type {
  FunctionalUpdate,
  IsEqual,
  MaybePromise,
  ResolvedValue,
  Thunk,
  Tuple,
} from './utils';

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
export type GetSelector<State> = (getState: GetState) => MaybePromise<State>;
export type Set<State> = (
  dispatch: Dispatch,
  getState: GetState<State>,
  nextState: State | FunctionalUpdate<State>
) => ReturnType<Dispatch<PartAction<State>>>;

export interface StatefulPartConfig<Name extends string> {
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
  /**
   * The unique identifier of the Part.
   */
  id: PartId;

  /**
   * List of [d]ependent Parts, which should be notified whenever
   * the Part updates.
   */
  d: AnySelectablePart[];
  /**
   * The [f]lag used to identify the type of Part.
   */
  f: typeof PART;
}

export type GetValueUpdater<State, Args extends any[]> = (
  dispatch: Dispatch,
  getState: GetState<State>,
  ...args: Args
) => PartAction<State>;

export interface StatefulPartUpdater<State> {
  /**
   * Creates a dedicated action creator for updating the value in state
   * for this part. Allows for declarative action types.
   */
  (type: string): UpdatePart<GetValueUpdater<State, [State]>>;
  /**
   * Creates a dedicated action creator for updating the value in state
   * for this part. Allows for declarative action types, as well as custom
   * input handling for deriving the next value.
   */
  <GetValue extends AnyGetValue<State>>(
    type: string,
    getValue: GetValue
  ): UpdatePart<
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - The tuple is not inferrable here, but passes through to the consumer.
    GetValueUpdater<State, Parameters<GetValue>>
  >;
}

export interface BaseStatefulPart<Name extends string, State> extends BasePart {
  /**
   * Action creator, which returns an action that when dispatched will
   * update the value for this Part in state.
   */
  (nextValue: State): PartAction<State>;

  /**
   * Returns the action type used whenever the Part updates its value
   * in state. Can be useful as a key for action handlers on non-Part
   * reducers, or in third-party tools like `redux-saga`'s `take`.
   */
  toString(): string;
  update: StatefulPartUpdater<State>;

  f: typeof STATEFUL_PART;
  /**
   * The [g]etter which returns the value in state whcn retrieved
   * via `usePart` or `usePartValue`.
   */
  g: Get<State>;
  /**
   * The [i]nitial state of the Part.
   */
  i: State;
  /**
   * The [n]ame used as a key within state. If composed within
   * another Part, it will not reflect the key on the state object,
   * but rather the key within that Part.
   */
  n: Name;
  /**
   * The [o]wner of the Part, which is the key in top-level state
   * this Part is ultimately composed under.
   */
  o: string;
  /**
   * The [p]ath of keys within state used to get the value associated
   * with this specific Part.
   */
  p: string[];
  /**
   * The [r]educer used to set the new value in state whenever an
   * update is triggered for thie Part.
   */
  r(state: State, action: any): State;
  /**
   * The update method used to [s]et the value in state. When used in
   * concert with `usePart` / `usePartUpdate`, it will dispatch the
   * action created by the Part.
   */
  s: Set<State>;
  /**
   * The action [t]ype used by the action creator for the Part. This
   * will change based on composition within other Parts, to more easily
   * identify the nesting within state.
   */
  t: string;
}

/**
 * The most granular form of state stored. Can be composed with other
 * Primitive and/or Composed Parts to form a slice of state.
 */
export interface PrimitivePart<Name extends string, State>
  extends BaseStatefulPart<Name, State> {
  c: [];
  f: typeof PRIMITIVE_PART;
}

/**
 * A namespaced slice of state containing 1-n Primitive and/or Composed
 * Parts. Can itself be composed with other Primitive and/or Composed
 * Parts to build another Composed Part.
 */
export interface ComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
> extends BaseStatefulPart<Name, CombinedPartsState<[...Parts]>> {
  /**
   * List of [c]hild Parts contained within this Part.
   */
  c: AnyStatefulPart[];
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
  ? ResolvedValue<ReturnType<Part['g']>>
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
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
}

export interface UnboundSelectPartConfig<Selector extends AnyGenericSelector> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts?: never;
}

export type AnySelector<
  Parts extends readonly AnySelectablePart[] = AnySelectablePart[]
> = (...args: SelectPartArgs<Parts>) => any;
export type AnyGenericSelector = (getState: GetState) => any;

export interface BaseSelectPart extends BasePart {
  /**
   * Whether the Select Part is [b]ound to specific Parts of state. If
   * false, the Part will update whenever any piece of state changes.
   */
  b: boolean;
  f: typeof SELECT_PART;
  /**
   * The update method used for [s]etting values in state for other Parts.
   * It is a no-op on Select Parts; it exists to avoid unnecessary exceptions
   * if a Select Part is misused at runtime.
   */
  s: () => void;
}

export interface BoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
> extends BaseSelectPart {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by the resolved values of the specific Parts in state provided.
   */
  <State = any>(state: State): MaybePromise<ReturnType<Selector>>;

  /**
   * The [g]etter used to derive a value based on the resolved value
   * for the Parts passed.
   */
  g: GetSelector<ReturnType<Selector>>;
}

export interface UnboundSelectPart<Selector extends AnyGenericSelector>
  extends BaseSelectPart {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by values in state.
   */
  <State = any>(state: State): ReturnType<Selector>;

  /**
   * The [g]etter used to derive a value based on the values in state.
   */
  g: Get<ReturnType<Selector>>;
}

export type AnyUpdater = (
  dispatch: Dispatch,
  getState: GetState,
  ...rest: any[]
) => any;

export type UpdatePartArgs<Updater extends AnyUpdater> = Updater extends (
  dispatch: Dispatch,
  getState: GetState,
  ...rest: infer Rest
) => any
  ? Rest
  : never;

export interface UpdatePartConfig<Updater extends AnyUpdater> {
  set: Updater;
}

export interface UpdatePart<Updater extends AnyUpdater> extends BasePart {
  /**
   * Thunk action creator, used for updating 1-n values in state.
   */
  (...rest: UpdatePartArgs<Updater>): Thunk<any, ReturnType<Updater>>;

  d: IgnoreAllDependencies;
  f: typeof UPDATE_PART;
  /**
   * The [g]etter used by other Parts to either retrieve a value in state or
   * derive a value from other stateful values. It is a no-op on Update Parts;
   * it exists to avoid unnecessary exceptions if a Select Part is misused
   * at runtime.
   */
  g: () => void;
  /**
   * The update method used to [s]et 1-n values in state.
   */
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
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
  set: Updater;
}

export interface UnboundProxyPartConfig<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  part?: never;
  set: Updater;
}

export interface BaseProxyPart<Updater extends AnyUpdater> extends BasePart {
  /**
   * Thunk action creator, used for updating 1-n values in state.
   */
  update(...args: UpdatePartArgs<Updater>): Thunk<any, ReturnType<Updater>>;

  /**
   * Whether the Proxy Part is [b]ound to specific Parts of state. If
   * false, the Part will update whenever any piece of state changes.
   */
  b: boolean;
  f: typeof PROXY_PART;
}

export interface BoundProxyPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
> extends BaseProxyPart<Updater> {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by the resolved values of the specific Parts in state provided.
   */
  select<State>(state: State): MaybePromise<ReturnType<Selector>>;

  /**
   * The [g]etter used to derive a value based on the resolved value
   * for the Parts passed.
   */
  g: GetSelector<ReturnType<Selector>>;
  /**
   * The update method used to [s]et 1-n values in state.
   */
  s: Updater;
}

export interface UnboundProxyPart<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> extends BaseProxyPart<Updater> {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by values in state.
   */
  select<State>(state: State): ReturnType<Selector>;

  /**
   * The [g]etter used to derive a value based on the values in state.
   */
  g: Get<ReturnType<Selector>>;
  /**
   * The update method used to [s]et 1-n values in state.
   */
  s: Updater;
}
