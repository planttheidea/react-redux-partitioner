import type { StoreEnhancer, StoreEnhancerStoreCreator } from 'redux';
import type { AnyStatefulPart, CombinedPartsState } from './part';
import type { PartMap } from './partitioner';
import type { PartsStoreExtensions } from './store';
import type { Notifier } from './subscription';

export interface EnhancerConfig {
  notifier: Notifier;
  partMap: PartMap;
}

export type Enhancer<Parts extends readonly AnyStatefulPart[]> = StoreEnhancer<
  PartsStoreExtensions<CombinedPartsState<Parts>>
>;

export type EnhancerStoreCreator<Parts extends readonly AnyStatefulPart[]> =
  StoreEnhancerStoreCreator<PartsStoreExtensions<CombinedPartsState<Parts>>>;
