import type { Dispatch } from 'redux';
import type {
  COMPOSED_PARTITION,
  PRIMITIVE_PARTITION,
  SELECT_PARTITION,
  STATEFUL_PARTITION,
  UPDATE_PARTITION,
} from '../flags';
import type { GetState } from './store';
import type { FunctionalUpdate, IsEqual, Tuple } from './utils';

export type PartitionId = number;

export type PartitionState<BaseStatefulPartition extends AnyStatefulPartition> =
  {
    [Name in BaseStatefulPartition as BaseStatefulPartition['n']]: BaseStatefulPartition['i'];
  };

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

export type Get<State> = (getState: GetState) => State;
export type Set<State> = (
  getState: GetState,
  dispatch: Dispatch,
  nextState: State | FunctionalUpdate<State>
) => any;

export interface BasePartitionConfig {}

export interface StatefulPartitionConfig<Name extends string>
  extends BasePartitionConfig {
  name: Name;
}

export interface PrimitivePartitionConfig<Name extends string, State>
  extends StatefulPartitionConfig<Name> {
  initialState: State;
}

export interface ComposedPartitionConfig<
  Name extends string,
  Partitions extends readonly AnyStatefulPartition[]
> extends StatefulPartitionConfig<Name> {
  partitions: Partitions;
}

export interface BasePartition {
  id: PartitionId;

  d: AnyStatefulPartition[];
}

export interface BaseStatefulPartition<Name extends string, State>
  extends BasePartition {
  (nextValue: State): any;

  toString(): Name;

  a: string;
  f: typeof STATEFUL_PARTITION;
  g: Get<State>;
  i: State;
  n: Name;
  o: string;
  p: string[];
  r(state: State, action: any): State;
  s: Set<State>;
}

export interface PrimitivePartition<Name extends string, State>
  extends BaseStatefulPartition<Name, State> {
  f: typeof PRIMITIVE_PARTITION;
}

export interface ComposedPartition<
  Name extends string,
  Partitions extends Tuple<AnyStatefulPartition>
> extends BaseStatefulPartition<Name, PartitionsState<[...Partitions]>> {
  f: typeof COMPOSED_PARTITION;
}

export type StatefulPartition<
  Name extends string,
  State,
  Partitions extends Tuple<AnyStatefulPartition>,
  IsComposed
> = IsComposed extends true
  ? ComposedPartition<Name, Partitions>
  : PrimitivePartition<Name, State>;

export type PartitionResult<Partition> = Partition extends AnyStatefulPartition
  ? Partition['i']
  : Partition extends AnySelectPartition
  ? ReturnType<Partition>
  : never;

type MergeSelectPartitionArgs<
  Args extends any[],
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>
> = Partitions extends [
  infer Head extends AnySelectPartition | AnyStatefulPartition,
  ...infer Tail extends Tuple<AnySelectPartition | AnyStatefulPartition>
]
  ? MergeSelectPartitionArgs<[...Args, PartitionResult<Head>], Tail>
  : Args;

export type SelectPartitionArgs<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>
> = MergeSelectPartitionArgs<[], [...Partitions]>;

export interface SelectPartitionConfig<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends AnySelector<Partitions> | AnyGenericSelector
> extends BasePartitionConfig {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  partitions?: Partitions;
}

export type AnySelector<
  Partitions extends readonly AnySelectablePartition[] = AnySelectablePartition[]
> = (...args: SelectPartitionArgs<Partitions>) => any;
export type AnyGenericSelector = (getState: GetState) => any;

export interface SelectPartition<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends AnySelector<Partitions> | AnyGenericSelector
> extends BasePartition {
  (getState: GetState): ReturnType<Selector>;

  e: IsEqual<ReturnType<Selector>>;
  f: typeof SELECT_PARTITION;
  g: Get<ReturnType<Selector>>;
  s: () => void;
}

export type AnyUpdater = (
  getState: GetState,
  dispatch: Dispatch,
  ...rest: any[]
) => any;

export type UpdatePartitionArgs<Updater extends AnyUpdater> = Updater extends (
  getState: GetState,
  dispatch: Dispatch,
  ...rest: infer Rest
) => any
  ? Rest
  : never;

export interface UpdatePartitionConfig<Updater extends AnyUpdater>
  extends BasePartitionConfig {
  set: Updater;
}

export interface UpdatePartition<Updater extends AnyUpdater>
  extends BasePartition {
  (
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartitionArgs<Updater>
  ): ReturnType<Updater>;

  d: [];
  f: typeof UPDATE_PARTITION;
  g: () => void;
  s: Updater;
}

export type AnyPartition =
  | AnyStatefulPartition
  | AnySelectPartition
  | AnyUpdatePartition;
export type AnyComposedPartition = ComposedPartition<
  string,
  AnyStatefulPartition[]
>;
export type AnyPrimitivePartition = PrimitivePartition<string, any>;
export type AnyStatefulPartition = StatefulPartition<
  string,
  any,
  readonly AnyStatefulPartition[],
  boolean
>;
export type AnySelectPartition = SelectPartition<
  Array<AnySelectPartition | AnyStatefulPartition>,
  AnySelector
>;
export type AnySelectablePartition = AnyStatefulPartition | AnySelectPartition;
export type AnyUpdatePartition = UpdatePartition<AnyUpdater>;
