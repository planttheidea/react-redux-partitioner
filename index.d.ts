import type { Context } from 'react';
import type { Action, AnyAction, Dispatch } from 'redux';
import type {
  AnyGenericSelector,
  AnyPart,
  AnySelectablePart,
  AnySelector,
  AnyStatefulPart,
  AnyUpdater,
  BoundProxyPart,
  BoundProxyPartConfig,
  BoundSelectPart,
  BoundSelectPartConfig,
  ComposedPart,
  ComposedPartConfig,
  SelectPartArgs,
  Tuple,
  Partitioner,
  PartitionerOptions,
  PrimitivePart,
  PrimitivePartConfig,
  ProviderProps,
  ReactReduxPartitionerContextType,
  Store,
  UnboundProxyPart,
  UnboundProxyPartConfig,
  UnboundSelectPart,
  UnboundSelectPartConfig,
  UpdatePart,
  UpdatePartConfig,
  UsePartPair,
  UsePartUpdate,
  UsePartValue,
} from './src/types';

export * from './src/types';

/** Partitioner */

/**
 * Create the partitioner, which will manage all Parts that consume or
 * produce a value in Redux State. This includes both the reducer that
 * governs state, as well as the store enhancer to manage the Parts stored.
 */
export function createPartitioner<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
>(
  options: PartitionerOptions<Parts, OtherReducerState, DispatchableAction>
): Partitioner<Parts, OtherReducerState, DispatchableAction>;

/** Context */

/**
 * Context used by partitioner hooks internally.
 */
export const ReactReduxPartitionerContext: Context<ReactReduxPartitionerContextType>;

/**
 * Provides the store values used by the partitioner to manage updates
 * of Parts within the subtree.
 */
export function Provider<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(props: ProviderProps<State, DispatchableAction>): JSX.Element;

/** Parts */

/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string>(
  name: Name,
  initialState: []
): PrimitivePart<Name, any[]>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  name: Name,
  parts: Parts
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any,
  Updater extends AnyUpdater
>(
  parts: Parts,
  selector: Selector,
  updater: Updater
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object
 * changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(selector: Selector, updater: Updater): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any
>(parts: Parts, selector: Selector): BoundSelectPart<Parts, Selector>;
/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<Selector extends AnyGenericSelector>(
  selector: Selector
): UnboundSelectPart<Selector>;

/**
 * Creates an Update Part, which allows performing updates of values in
 * state. When used with `usePart`, it itself will never trigger an update.
 * As such, it is recommended to use this with `usePartUpdate` instead of
 * `usePart`.
 */
export function part<Updater extends AnyUpdater>(
  _: null,
  update: Updater
): UpdatePart<Updater>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  config: ComposedPartConfig<Name, Parts>
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(
  config: BoundSelectPartConfig<Parts, Selector>
): BoundSelectPart<Parts, Selector>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector>;

/**
 * Creates an Update Part, which allows performing updates of values in
 * state. When used with `usePart`, it itself will never trigger an update.
 * As such, it is recommended to use this with `usePartUpdate` instead of
 * `usePart`.
 */
export function part<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
): UpdatePart<Updater>;

/**
 * Use the store within the scope of a React component.
 */
export function useStore<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): Store<State, DispatchableAction>;

/** Hooks */

/**
 * Use the store's `dispatch` method within the scope of a React component.
 */
export function useDispatch(): Dispatch;

/**
 * Access the partitioner context used by `react-redux-partitioner`.
 */
export function usePartitionerContext<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): ReactReduxPartitionerContextType<State, DispatchableAction>;

/**
 * Returns a [value, update] `useState`-style pair for the Part passed.
 *
 * Note: Certain Part types do not support both value and update:
 * - Select Parts have no update method, and therefore the update returned is a no-op
 *   for those Parts.
 * - Update Parts have no value, and therefore the value returned is `undefined` for
 *   those Parts.
 */
export function usePart<Part extends AnyPart>(part: Part): UsePartPair<Part>;

/**
 * Returns the updater for the Part, bound to the store's `dispatch` method.
 *
 * Note: Select Parts have no update method, and therefore the update returned is a no-op
 * for those Parts.
 */
export function usePartUpdate<Part extends AnyPart>(
  part: Part
): UsePartUpdate<Part>;

/**
 * Returns the value for the Part passed. For Stateful Parts this is the value stored in
 * state, and for Select or Proxy parts this is the derived value.
 *
 * Note: Update Parts have no value, and therefore the value returned is `undefined` for
 * those Parts.
 */
export function usePartValue<Part extends AnyPart>(
  part: Part
): UsePartValue<Part>;
