import {
  COMPOSED_PARTITION,
  SELECT_PARTITION,
  PRIMITIVE_PARTITION,
  UPDATE_PARTITION,
} from './flags';
import {
  getDescendantPartitions,
  getId,
  is,
  isSelectPartition,
  isStatefulPartition,
  toScreamingSnakeCase,
} from './utils';

import type { AnyAction, Dispatch } from 'redux';
import type {
  AnySelectPartition,
  AnyStatefulPartition,
  ComposedPartition,
  ComposedPartitionConfig,
  FunctionalUpdate,
  Get,
  GetState,
  IsEqual,
  PrimitivePartition,
  PrimitivePartitionConfig,
  SelectPartition,
  SelectPartitionArgs,
  StatefulPartition,
  StatefulPartitionAction,
  PartitionsState,
  Set,
  Tuple,
  UpdatePartition,
  UpdatePartitionHandler,
} from './internalTypes';

const sliceArray = Array.prototype.slice;

function isFunctionalUpdate<Value>(
  value: any
): value is FunctionalUpdate<Value> {
  return typeof value === 'function';
}

function createDefaultComposedReduce<Partition extends AnyStatefulPartition>(
  partition: Partition
) {
  type State = Partition['i'];

  return function reduce(state: State = partition.i, action: AnyAction): State {
    return action.$$part === partition.id &&
      !is(state[partition.n], action.value)
      ? { ...state, [partition.n]: action.value }
      : partition.i;
  };
}

function createDefaultPrimitiveReduce<Partition extends AnyStatefulPartition>(
  partition: Partition
) {
  type State = Partition['i'];

  return function reduce(state: State = partition.i, action: AnyAction): State {
    return action.$$part === partition.id && !is(state, action.value)
      ? action.value
      : state;
  };
}

function createDefaultGet<Partition extends AnyStatefulPartition>(
  partition: Partition
) {
  return function get(getState: GetState): Partition['i'] {
    return getState(partition);
  } as Get<Partition['i']>;
}

function createDefaultSet<Partition extends AnyStatefulPartition>(
  partition: Partition
) {
  return function set<ActionContext>(
    getState: GetState,
    dispatch: Dispatch,
    update: Partition['i'] | FunctionalUpdate<Partition['i']>,
    context?: ActionContext
  ) {
    const nextState = isFunctionalUpdate(update)
      ? update(getState(partition))
      : update;

    dispatch(partition(nextState, context));
  } as Set<Partition['i']>;
}

function createComposedPartition<
  Name extends string,
  ChildPartitions extends readonly AnyStatefulPartition[]
>(name: Name, config: ComposedPartitionConfig<ChildPartitions>) {
  type State = PartitionsState<[...ChildPartitions]>;

  const initialState = config.partitions.reduce((state, childPartition) => {
    state[childPartition.n as keyof State] = childPartition.i;

    return state;
  }, {} as State);

  const descendantPartitions = getDescendantPartitions(config.partitions);
  const actionCreator = function <ActionContext>(
    nextState: State,
    context?: ActionContext
  ): StatefulPartitionAction<State, ActionContext> {
    const action = {
      $$part: partition.id,
      value: nextState,
      type: partition.a,
    } as StatefulPartitionAction<State, ActionContext>;

    if (context) {
      action.context = context;
    }

    return action;
  };

  const partition = actionCreator as unknown as StatefulPartition<
    Name,
    State,
    true
  >;
  const type = config.type || `UPDATE_${toScreamingSnakeCase(name)}`;

  partition.id = getId(name);
  partition.toString = () => name;
  partition.type = type;

  partition.a = type;
  partition.d = descendantPartitions;
  partition.g = config.get || createDefaultGet(partition);
  partition.i = initialState;
  partition.n = partition.o = name;
  partition.p = [name];
  partition.r = config.reduce || createDefaultComposedReduce(partition);
  partition.s = config.set || createDefaultSet(partition);
  partition.t = COMPOSED_PARTITION;

  descendantPartitions.forEach((descendantPartition) => {
    const originalReducer = descendantPartition.r;
    const parentName = descendantPartition.o;
    const path = [name, ...descendantPartition.p];

    descendantPartition.a = `${path.slice(0, path.length - 1).join('.')}/${
      descendantPartition.type
    }`;
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

  return partition;
}

function createPrimitivePartition<Name extends string, State>(
  name: Name,
  config: PrimitivePartitionConfig<State>
) {
  const actionCreator = function <ActionContext>(
    nextState: State,
    context?: ActionContext
  ): StatefulPartitionAction<State, ActionContext> {
    const action = {
      $$part: partition.id,
      value: nextState,
      type: partition.a,
    } as StatefulPartitionAction<State, ActionContext>;

    if (context) {
      action.context = context;
    }

    return action;
  };

  const partition = actionCreator as StatefulPartition<Name, State, false>;
  const type = config.type || `UPDATE_${toScreamingSnakeCase(name)}`;

  partition.id = getId(name);
  partition.toString = () => name;
  partition.type = type;

  console.log({ type });

  partition.a = type;
  partition.d = [partition];
  partition.g = config.get || createDefaultGet(partition);
  partition.i = config.initialState;
  partition.n = partition.o = name;
  partition.p = [name];
  partition.r = config.reduce || createDefaultPrimitiveReduce(partition);
  partition.s = config.set || createDefaultSet(partition);
  partition.t = PRIMITIVE_PARTITION;

  return partition;
}

export function createSelectPartition<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  selector: Selector,
  isEqual: IsEqual<ReturnType<Selector>> = is
) {
  type Values = SelectPartitionArgs<Sources>;
  type Result = ReturnType<Selector>;

  const length = sources.length;

  let values: Values;
  let result: Result;

  function select(getState: GetState): Result {
    if (!values) {
      values = sources.map((source) =>
        isStatefulPartition(source) ? getState(source) : source(getState)
      ) as Values;

      return (result = selector(...values));
    }

    const nextValues = [] as Values;

    let valuesChanged = false;

    for (let index = 0; index < length; ++index) {
      const source = sources[index];

      nextValues[index] = isStatefulPartition(source)
        ? getState(source)
        : source(getState);
      valuesChanged =
        valuesChanged || isEqual(values[index], nextValues[index]);
    }

    values = nextValues;

    return valuesChanged ? (result = selector(...values)) : result;
  }

  const partition = select as SelectPartition<Selector>;

  partition.id = getId('SelectPartition');
  partition.d = sources.reduce<AnyStatefulPartition[]>((partitions, source) => {
    if (isStatefulPartition(source)) {
      if (!~partitions.indexOf(source)) {
        partitions.push(source);
      }
    } else if (isSelectPartition(source)) {
      source.d.forEach((sourcePartition: AnyStatefulPartition) => {
        if (!~partitions.indexOf(sourcePartition)) {
          partitions.push(sourcePartition);
        }
      });
    } else {
      throw new Error('Invalid source provided to partition select');
    }

    return partitions;
  }, []);
  partition.e = isEqual;
  partition.g = select;
  partition.t = SELECT_PARTITION;

  return partition;
}

export function createUpdatePartition<Updater extends UpdatePartitionHandler>(
  updater: Updater
) {
  const partition = function update(
    ...args: Parameters<Updater>
  ): ReturnType<Updater> {
    return updater.apply(this, args);
  } as UpdatePartition<Updater>;

  partition.id = getId('UpdatePartition');
  partition.d = [];
  partition.s = updater;
  partition.t = UPDATE_PARTITION;

  return partition;
}

function isComposedConfig(
  value: any
): value is ComposedPartitionConfig<AnyStatefulPartition[]> {
  return !!value && typeof value === 'object' && 'partitions' in value;
}

function isPrimitiveConfig(value: any): value is PrimitivePartitionConfig<any> {
  return !!value && typeof value === 'object' && 'initialState' in value;
}

function isSelectSources(
  value: any
): value is Tuple<AnySelectPartition | AnyStatefulPartition> {
  return Array.isArray(value);
}

export function part<Name extends string, State>(
  name: Name,
  config: PrimitivePartitionConfig<State>
): PrimitivePartition<Name, State>;
export function part<
  Name extends string,
  ChildPartitions extends readonly AnyStatefulPartition[]
>(
  name: Name,
  config: ComposedPartitionConfig<ChildPartitions>
): ComposedPartition<Name, PartitionsState<[...ChildPartitions]>>;

export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePartition<Name, State>;
export function part<
  Name extends string,
  ChildPartitions extends readonly AnyStatefulPartition[]
>(
  name: Name,
  ...partitions: ChildPartitions
): ComposedPartition<Name, PartitionsState<[...ChildPartitions]>>;

export function part<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Updater extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  updater: Updater,
  isEqual?: IsEqual<ReturnType<Updater>>
): SelectPartition<Updater>;

export function part<Updater extends UpdatePartitionHandler>(
  _ignored: null | undefined,
  updater: Updater
): UpdatePartition<Updater>;

export function part<
  Name extends string,
  State,
  ChildPartitions extends readonly AnyStatefulPartition[],
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Sources>) => any,
  Updater extends UpdatePartitionHandler
>(
  name: Name | Sources | null,
  config?:
    | PrimitivePartitionConfig<State>
    | ComposedPartitionConfig<ChildPartitions>
    | AnyStatefulPartition
    | State
    | Selector
    | Updater,
  maybeIsEqual?: IsEqual<ReturnType<Selector>>
) {
  if (!name) {
    return createUpdatePartition(config as Updater);
  }

  if (isSelectSources(name)) {
    return createSelectPartition(
      name as Sources,
      config as Selector,
      maybeIsEqual
    );
  }

  if (isComposedConfig(config)) {
    return createComposedPartition(name, config);
  }

  if (isPrimitiveConfig(config)) {
    return createPrimitivePartition(name, config);
  }

  if (isStatefulPartition(config)) {
    // eslint-disable-next-line prefer-rest-params
    return createComposedPartition(name, {
      partitions: sliceArray.call(arguments, 1),
    });
  }

  return createPrimitivePartition(name, { initialState: config });
}
