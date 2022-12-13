import type {
  Action,
  AnyAction,
  StoreEnhancer,
  StoreEnhancerStoreCreator,
} from 'redux';
import type { AnyStatefulPart, CombinedPartsState } from './part';
import type { PartMap } from './partitioner';
import type { PartsStoreExtensions } from './store';
import type { Notifier } from './subscription';

export interface EnhancerConfig {
  notifier: Notifier;
  partMap: PartMap;
}

export type Enhancer<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
> = StoreEnhancer<
  PartsStoreExtensions<CombinedPartsState<Parts>, DispatchableAction>
>;

export type EnhancerStoreCreator<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
> = StoreEnhancerStoreCreator<
  PartsStoreExtensions<CombinedPartsState<Parts>, DispatchableAction>
>;
