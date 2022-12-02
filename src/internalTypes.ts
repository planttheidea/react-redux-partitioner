import type { Action, AnyAction, Dispatch, Store as ReduxStore } from 'redux';
import type {
  COMPOSED_PARTITION,
  SELECT_PARTITION,
  PRIMITIVE_PARTITION,
  UPDATE_PARTITION,
} from './flags';

export type Tuple<Type> = readonly [Type] | readonly Type[];

export type PartitionId = number;
export interface PartitionAction extends Action {
  $$part?: PartitionId;
  context?: any;
  value?: any;
}

declare const $CombinedState: unique symbol;

interface EmptyObject {
  readonly [$CombinedState]?: undefined;
}

export type CombinedState<State> = EmptyObject & State;

export type Store<
  State = any,
  DispatchableAction extends Action = AnyAction
> = ReduxStore<State, DispatchableAction> & PartitionsStoreExtensions;

export interface PartitionsStoreExtensions<
  State extends AnyPartitionsState = any
> {
  getState: GetState<State>;
  subscribeToPartition: SubscribeToPartition;
}

export type FunctionalUpdate<Value> = (current: Value) => Value;

export type Get<State> = (getState: GetState) => State;
export type Set<State> = <ActionContext, Result extends void | Promise<void>>(
  getState: GetState,
  dispatch: Dispatch,
  update: State | FunctionalUpdate<State>,
  context?: ActionContext
) => Result;

export type Listener = () => void;
export type Unsubscribe = () => void;
export type Notify = () => void;
export type Notifier = (notify: Notify) => void;

export type PartitionState<StatefulPartition extends AnyStatefulPartition> = {
  [Name in StatefulPartition as StatefulPartition['n']]: StatefulPartition['i'];
};

export type SourceResult<Source> = Source extends AnyStatefulPartition
  ? Source['i']
  : Source extends AnySelectPartition
  ? ReturnType<Source['select']>
  : any;

export type CombineState<
  PrevState,
  Partitions extends Tuple<AnyStatefulPartition>
> = Partitions extends [
  infer Head extends AnyStatefulPartition,
  ...infer Tail extends Tuple<AnyStatefulPartition>
]
  ? CombineState<PrevState & PartitionState<Head>, Tail>
  : {} extends PrevState
  ? Record<string, any>
  : PrevState;

export type PartitionsState<Partitions extends Tuple<AnyStatefulPartition>> =
  CombineState<{}, [...Partitions]>;
export type AnyPartitionsState = PartitionsState<AnyStatefulPartition[]>;

export interface GetState<
  State = any,
  Source extends AnySelectPartition | AnyStatefulPartition =
    | AnySelectPartition
    | AnyStatefulPartition
> {
  (): State;
  (source: Source): SourceResult<Source>;
}

export type SubscribeToPartition = (
  partition: AnyStatefulPartition,
  listener: Listener
) => Unsubscribe;

export type IsEqual<Value> = (a: Value, b: Value) => boolean;

type MergeSelectPartitionArgs<
  Args extends any[],
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>
> = Sources extends [
  infer Head extends AnySelectPartition | AnyStatefulPartition,
  ...infer Tail extends Tuple<AnySelectPartition | AnyStatefulPartition>
]
  ? MergeSelectPartitionArgs<[...Args, SourceResult<Head>], Tail>
  : Args;

export type SelectPartitionArgs<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>
> = MergeSelectPartitionArgs<[], [...Sources]>;

export interface BasePartition {
  id: PartitionId;
}
export interface BaseStatefulPartition<Name extends string, State>
  extends BasePartition {
  action: <ActionContext>(
    nextValue: State,
    context?: ActionContext
  ) => StatefulPartitionAction<State, ActionContext>;
  toString: () => Name;

  d: AnyStatefulPartition[];
  g: Get<State>;
  i: State;
  n: Name;
  o: string;
  p: string[];
  r: StatefulPartitionReducer<State>;
  s: Set<State>;
}
export interface PrimitivePartition<Name extends string, State>
  extends BaseStatefulPartition<Name, State> {
  t: typeof PRIMITIVE_PARTITION;
}
export interface SelectPartition<Selector extends (...args: any[]) => any>
  extends BasePartition {
  reset: never;
  select: Get<ReturnType<Selector>>;

  d: AnyStatefulPartition[];
  e: IsEqual<ReturnType<Selector>>;
  g: Get<ReturnType<Selector>>;
  i: never;
  r: Selector;
  s: never;
  t: typeof SELECT_PARTITION;
}
export interface ComposedPartition<Name extends string, State>
  extends BaseStatefulPartition<Name, State> {
  t: typeof COMPOSED_PARTITION;
}

export type StatefulPartition<
  Name extends string,
  State,
  Composed
> = Composed extends true
  ? ComposedPartition<Name, State>
  : PrimitivePartition<Name, State>;

export interface StatefulPartitionConfig<State> {
  get?: Get<State>;
  reduce?: (state: State, action: any) => State;
  set?: Set<State>;
}

export interface PrimitivePartitionConfig<State>
  extends StatefulPartitionConfig<State> {
  initialState: State;
}

export interface ComposedPartitionConfig<
  Partitions extends readonly AnyStatefulPartition[]
> extends StatefulPartitionConfig<PartitionsState<[...Partitions]>> {
  partitions: Partitions;
}

export interface StatefulPartitionAction<State, ActionContext> {
  $$part: PartitionId;
  context?: ActionContext;
  value: State;
  type: string;
}

export interface StatefulPartitionReducer<State> {
  (state: State, action: AnyAction): State;
}

export interface UsePartitionValueInstance<Selection> {
  h: boolean;
  v: Selection | null;
}

export type UpdatePartitionArgs<Updater extends (...args: any[]) => any> =
  Updater extends (
    getState: GetState,
    dispatch: Dispatch,
    ...rest: infer Rest
  ) => any
    ? Rest
    : never;

export type UpdatePartitionHandler = (
  getState: GetState,
  dispatch: Dispatch,
  ...args: any[]
) => any;

export interface UpdatePartition<Updater extends UpdatePartitionHandler>
  extends BasePartition {
  update: Updater;

  d: [];
  i: never;
  g: never;
  s: Updater;
  t: typeof UPDATE_PARTITION;
}

export type UseUpdatePartitionHandler<Updater extends UpdatePartitionHandler> =
  (...args: UpdatePartitionArgs<Updater>) => ReturnType<Updater>;

export type AnyPartition =
  | AnyStatefulPartition
  | AnySelectPartition
  | AnyUpdatePartition;
export type AnyComposedPartition = StatefulPartition<string, any, true>;
export type AnyPrimitivePartition = StatefulPartition<string, any, false>;
export type AnyStatefulPartition = AnyComposedPartition | AnyPrimitivePartition;
export type AnyStatefulPartitionAction = StatefulPartitionAction<any, any>;
export type AnyStatefulPartitionReducer = StatefulPartitionReducer<any>;
export type AnySelectPartition = SelectPartition<(...args: any[]) => any>;
export type AnyUpdatePartition = UpdatePartition<UpdatePartitionHandler>;
