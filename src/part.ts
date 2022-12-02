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

function createAction<S extends AnyStatefulPartition>(
  partition: S,
  typeOverride: string | undefined
) {
  type State = S['i'];

  const type = typeOverride || toScreamingSnakeCase(`Update ${partition.n}`);

  return function <ActionContext>(
    nextState: State,
    context?: ActionContext
  ): StatefulPartitionAction<State, ActionContext> {
    const action = {
      $$part: partition.id,
      value: nextState,
      type,
    } as StatefulPartitionAction<State, ActionContext>;

    if (context) {
      action.context = context;
    }

    return action;
  };
}

function createReset<S extends AnyStatefulPartition>(partition: S) {
  type State = S['i'];

  const type = toScreamingSnakeCase(`Reset ${partition.n}`);

  return function <ActionContext>(
    context?: ActionContext
  ): StatefulPartitionAction<State, ActionContext> {
    const action = {
      $$part: partition.id,
      type,
      value: partition.i,
    } as StatefulPartitionAction<State, ActionContext>;

    if (context) {
      action.context = context;
    }

    return action;
  };
}

function createDefaultComposedHandle<S extends AnyStatefulPartition>(
  partition: S
) {
  type State = S['i'];

  return function handle(state: State = partition.i, action: AnyAction): State {
    return action.$$part === partition.id &&
      !is(state[partition.n], action.value)
      ? { ...state, [partition.n]: action.value }
      : partition.i;
  };
}

function createDefaultPrimitiveHandle<S extends AnyStatefulPartition>(
  partition: S
) {
  type State = S['i'];

  return function handle(state: State = partition.i, action: AnyAction): State {
    return action.$$part === partition.id && !is(state, action.value)
      ? action.value
      : state;
  };
}

function createDefaultGet<S extends AnyStatefulPartition>(partition: S) {
  return function get(getState: GetState): S['i'] {
    return getState(partition);
  };
}

function createDefaultSet<S extends AnyStatefulPartition>(partition: S) {
  return function set<ActionContext>(
    getState: GetState,
    dispatch: Dispatch,
    update: S['i'] | FunctionalUpdate<S['i']>,
    context?: ActionContext
  ) {
    const nextState = isFunctionalUpdate(update)
      ? update(getState(partition))
      : update;

    dispatch(partition.action(nextState, context));
  } as Set<S['i']>;
}

function createComposedPartition<
  Name extends string,
  ChildPartitions extends readonly AnyStatefulPartition[]
>(name: Name, config: ComposedPartitionConfig<ChildPartitions>) {
  type ComposedState = PartitionsState<[...ChildPartitions]>;

  const initialState = config.partitions.reduce((state, childPartition) => {
    state[childPartition.n as keyof ComposedState] = childPartition.i;

    return state;
  }, {} as ComposedState);

  const partition = {
    id: getId(name),
    toString: () => name,

    d: getDescendantPartitions(config.partitions),
    i: initialState,
    n: name,
    p: [name],
    t: COMPOSED_PARTITION,
  } as unknown as StatefulPartition<Name, ComposedState, true>;

  partition.d.forEach((descendantPartition) => {
    const originalReducer = descendantPartition.r;
    const parentName = descendantPartition.o;

    descendantPartition.r = (
      state: Record<string, any>,
      action: AnyAction
    ) => ({
      ...state,
      [parentName]: originalReducer(state[parentName], action),
    });
    descendantPartition.o = name;
    descendantPartition.p = [name, ...descendantPartition.p];
    descendantPartition.id = getId(descendantPartition.p.join('_'));
  });

  partition.g = config.get || createDefaultGet(partition);
  partition.r = config.handle || createDefaultComposedHandle(partition);
  partition.s = config.set || createDefaultSet(partition);

  partition.action = createAction(partition, config.type);
  partition.reset = createReset(partition);

  return partition;
}

function createPrimitivePartition<Name extends string, State>(
  name: Name,
  config: PrimitivePartitionConfig<State>
) {
  const partition = {
    id: getId(name),
    toString: () => name,

    i: config.initialState,
    n: name,
    o: name,
    p: [name],
    t: PRIMITIVE_PARTITION,
  } as unknown as StatefulPartition<Name, State, false>;

  partition.d = [partition];
  partition.g = config.get || createDefaultGet(partition);
  partition.r = config.handle || createDefaultPrimitiveHandle(partition);
  partition.s = config.set || createDefaultSet(partition);

  partition.action = createAction(partition, config.type);
  partition.reset = createReset(partition);

  return partition;
}

function createSelect<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  selector: Selector,
  isEqual: IsEqual<ReturnType<Selector>>
): Get<ReturnType<Selector>> {
  type Values = SelectPartitionArgs<Sources>;
  type Result = ReturnType<Selector>;

  const length = sources.length;

  let values: Values;
  let result: Result;

  return function select(getState: GetState): Result {
    if (!values) {
      values = sources.map((source) =>
        isStatefulPartition(source) ? getState(source) : source.select(getState)
      ) as Values;

      return (result = selector(...values));
    }

    const nextValues = [] as Values;

    let valuesChanged = false;

    for (let index = 0; index < length; ++index) {
      const source = sources[index];

      nextValues[index] = isStatefulPartition(source)
        ? getState(source)
        : source.select(getState);
      valuesChanged =
        valuesChanged || isEqual(values[index], nextValues[index]);
    }

    values = nextValues;

    return valuesChanged ? (result = selector(...values)) : result;
  };
}

export function createSelectPartition<
  Sources extends Tuple<AnySelectPartition | AnyStatefulPartition>,
  Selector extends (...args: SelectPartitionArgs<Sources>) => any
>(
  sources: Sources,
  selector: Selector,
  isEqual: IsEqual<ReturnType<Selector>> = is
) {
  const subscriptionSources = sources.reduce<AnyStatefulPartition[]>(
    (partitions, source) => {
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
    },
    []
  );
  const select = createSelect(sources, selector as Selector, isEqual);

  const partition = {
    id: getId('SelectPartition'),
    select,

    d: subscriptionSources,
    e: isEqual,
    g: select,
    r: selector,
    t: SELECT_PARTITION,
  } as SelectPartition<Selector>;

  return partition;
}

export function createUpdatePartition<Updater extends UpdatePartitionHandler>(
  updater: Updater
) {
  const partition = {
    id: getId('UpdatePartition'),
    update: updater,

    d: [],
    s: updater,
    t: UPDATE_PARTITION,
  } as UpdatePartition<Updater>;

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
