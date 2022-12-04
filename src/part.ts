import {
  COMPOSED_PARTITION,
  PRIMITIVE_PARTITION,
  SELECT_PARTITION,
  UPDATE_PARTITION,
} from './flags';
import {
  getDescendantPartitions,
  getId,
  is,
  noop,
  toScreamingSnakeCase,
} from './utils';
import {
  isComposedConfig,
  isStatefulPartitionsList,
  isPrimitiveConfig,
  isSelectConfig,
  isSelector,
  isUpdateConfig,
  isUpdater,
} from './validate';

import type { AnyAction, Dispatch } from 'redux';
import type {
  AnySelector,
  AnySelectPartition,
  AnyStatefulPartition,
  AnyUpdater,
  ComposedPartition,
  ComposedPartitionConfig,
  FunctionalUpdate,
  GetState,
  PartitionsState,
  PrimitivePartition,
  PrimitivePartitionConfig,
  SelectPartition,
  SelectPartitionArgs,
  SelectPartitionConfig,
  Tuple,
  UpdatePartition,
  UpdatePartitionArgs,
  UpdatePartitionConfig,
} from './types';
import { ALL_DEPENDENCIES, NO_DEPENDENCIES } from './constants';

function isFunctionalUpdate<State>(
  value: any
): value is FunctionalUpdate<State> {
  return typeof value === 'function';
}

export function createComposedPart<
  Name extends string,
  Partitions extends Tuple<AnyStatefulPartition>
>(
  config: ComposedPartitionConfig<Name, Partitions>
): ComposedPartition<Name, Partitions> {
  type State = PartitionsState<[...Partitions]>;

  const { name, partitions: basePartitions } = config;

  const descendantPartitions = getDescendantPartitions(basePartitions);
  const initialState = basePartitions.reduce((state, childPartition) => {
    state[childPartition.n as keyof State] = childPartition.i;

    return state;
  }, {} as State);

  descendantPartitions.forEach((descendantPartition) => {
    const originalReducer = descendantPartition.r;
    const parentName = descendantPartition.o;
    const path = [name, ...descendantPartition.p];

    const splitType = descendantPartition.a.split('/');
    const baseType =
      splitType.length > 1 ? splitType[splitType.length - 1] : splitType[0];
    const newTypePrefix = path.slice(0, path.length - 1).join('.');

    descendantPartition.a = `${newTypePrefix}/${baseType}`;
    descendantPartition.o = name;
    descendantPartition.p = path;
    descendantPartition.r = (
      state: Record<string, any>,
      action: AnyAction
    ) => ({
      ...state,
      [parentName]: originalReducer(state[parentName], action),
    });
  });

  const partition: ComposedPartition<Name, Partitions> = function actionCreator(
    nextValue: State
  ) {
    return {
      $$part: partition.id,
      type: partition.a,
      value: nextValue,
    };
  };

  partition.id = getId(name);
  partition.toString = () => name;

  partition.a = `UPDATE_${toScreamingSnakeCase(name)}`;
  partition.d = descendantPartitions;
  partition.f = COMPOSED_PARTITION as ComposedPartition<Name, Partitions>['f'];
  partition.g = (getState: any) => getState(partition);
  partition.i = initialState;
  partition.n = name;
  partition.o = name;
  partition.p = [name];
  partition.r = (state: State = initialState, action: any) =>
    action.$$part === partition.id && !is(state, action.value)
      ? { ...state, ...action.value }
      : state;
  partition.s = (getState, dispatch, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(getState(partition))
      : update;

    return dispatch(partition(nextValue));
  };

  return partition;
}

export function createPrimitivePart<Name extends string, State>(
  config: PrimitivePartitionConfig<Name, State>
): PrimitivePartition<Name, State> {
  const { initialState, name } = config;

  const partition: PrimitivePartition<Name, State> = function actionCreator(
    nextValue: State
  ) {
    return {
      $$part: partition.id,
      type: partition.a,
      value: nextValue,
    };
  };

  partition.id = getId(name);
  partition.toString = () => name;

  partition.a = `UPDATE_${toScreamingSnakeCase(name)}`;
  partition.d = [partition];
  partition.f = PRIMITIVE_PARTITION as PrimitivePartition<Name, State>['f'];
  partition.g = (getState: any) => getState(partition);
  partition.i = initialState;
  partition.n = name;
  partition.o = name;
  partition.p = [name];
  partition.r = (state: State = initialState, action: any) =>
    action.$$part === partition.id && !is(state, action.value)
      ? action.value
      : state;
  partition.s = (getState, dispatch, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(getState(partition))
      : update;

    return dispatch(partition(nextValue));
  };

  return partition;
}

export function createSelectPart<
  Partitions extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Partitions>) => any
>(
  config: SelectPartitionConfig<Partitions, Selector>
): SelectPartition<Partitions, Selector> {
  const { get, isEqual = is, partitions = [] } = config;

  const select = function select(getState: any): ReturnType<Selector> {
    const values = partitions.map(getState) as SelectPartitionArgs<Partitions>;

    return get(...values);
  };
  const partition = select as SelectPartition<Partitions, Selector>;

  partition.id = getId('SelectPartition');

  partition.d = partitions.length
    ? getDescendantPartitions(partitions)
    : ALL_DEPENDENCIES;
  partition.e = isEqual;
  partition.f = SELECT_PARTITION as SelectPartition<Partitions, Selector>['f'];
  partition.g = select;
  partition.s = noop;

  return partition;
}

export function createUpdatePart<Updater extends AnyUpdater>(
  config: UpdatePartitionConfig<Updater>
) {
  const { set } = config;

  const update = function update(
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartitionArgs<Updater>
  ): ReturnType<Updater> {
    return set(getState, dispatch, ...rest);
  };

  const partition = update as UpdatePartition<Updater>;

  partition.d = NO_DEPENDENCIES;
  partition.f = UPDATE_PARTITION as UpdatePartition<Updater>['f'];
  partition.g = noop;
  partition.s = set;

  return partition;
}

export function part<Name extends string, State>(
  name: Name,
  initialState: []
): PrimitivePartition<Name, any[]>;

export function part<
  Name extends string,
  Partitions extends Tuple<AnyStatefulPartition>
>(name: Name, partitions: Partitions): ComposedPartition<Name, Partitions>;
export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePartition<Name, State>;
export function part<
  Partitions extends Tuple<AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Partitions>) => any
>(
  partitions: Partitions,
  selector: Selector
): SelectPartition<Partitions, Selector>;

export function part<Updater extends AnyUpdater>(
  _: null,
  update: Updater
): UpdatePartition<Updater>;

export function part<
  Name extends string,
  Partitions extends Tuple<AnyStatefulPartition>
>(
  config: ComposedPartitionConfig<Name, Partitions>
): ComposedPartition<Name, Partitions>;
export function part<Name extends string, State>(
  config: PrimitivePartitionConfig<Name, State>
): PrimitivePartition<Name, State>;
export function part<
  Partitions extends Tuple<AnyStatefulPartition>,
  Selector extends AnySelector
>(
  config: SelectPartitionConfig<Partitions, Selector>
): SelectPartition<Partitions, Selector>;
export function part<Updater extends AnyUpdater>(
  config: UpdatePartitionConfig<Updater>
): UpdatePartition<Updater>;

export function part<
  Name extends string,
  State,
  Partitions extends Tuple<AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Partitions>) => any,
  Updater extends AnyUpdater
>(
  first:
    | Name
    | Partitions
    | ComposedPartitionConfig<Name, Partitions>
    | PrimitivePartitionConfig<Name, State>
    | SelectPartitionConfig<Partitions, Selector>
    | UpdatePartitionConfig<Updater>
    | null,
  second?: State | Partitions | Selector | Updater
) {
  if (first === null) {
    if (isUpdater(second)) {
      return createUpdatePart({ set: second });
    }

    throw new Error('Invalid update options provided');
  }

  if (typeof first === 'string') {
    if (isStatefulPartitionsList(second)) {
      return createComposedPart({
        name: first,
        partitions: second,
      });
    }

    return createPrimitivePart({
      name: first,
      initialState: second,
    });
  }

  if (isStatefulPartitionsList(first)) {
    if (isSelector(second)) {
      return createSelectPart({ get: second, partitions: first });
    }

    throw new Error('Invalid select options provided');
  }

  if (isSelectConfig(first)) {
    return createSelectPart(first);
  }

  if (isUpdateConfig(first)) {
    return createUpdatePart(first);
  }

  if (isComposedConfig(first)) {
    return createComposedPart(first);
  }

  if (isPrimitiveConfig(first)) {
    return createPrimitivePart(first);
  }

  throw new Error('Invalid config provided');
}
