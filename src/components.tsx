import React from 'react';
import { usePart, usePartUpdate, usePartValue } from './hooks';

import type { ComponentType } from 'react';
import type {
  AnyPart,
  UsePartPair,
  UsePartUpdate,
  UsePartValue,
} from './types';

type PartPairMap<PartMap extends Record<string, AnyPart>> = {
  [Key in keyof PartMap]: UsePartPair<PartMap[Key]>;
};

type PartUpdateMap<PartMap extends Record<string, AnyPart>> = {
  [Key in keyof PartMap]: UsePartUpdate<PartMap[Key]>;
};

type PartValueMap<PartMap extends Record<string, AnyPart>> = {
  [Key in keyof PartMap]: UsePartValue<PartMap[Key]>;
};

function getComponentName<
  Prefix extends string,
  Component extends ComponentType<any>
>(prefix: Prefix, Component: Component): string {
  return `${prefix}(${Component.displayName || Component.name || 'Component'})`;
}

export function withParts<PartMap extends Record<string, AnyPart>>(
  partMap: PartMap
) {
  return function withParts<Props>(
    ComponentToWrap: ComponentType<Props>
  ): ComponentType<Omit<Props, keyof PartMap>> {
    function WithParts(props: Props): JSX.Element {
      const parts = {} as PartPairMap<PartMap>;

      for (const key in partMap) {
        parts[key] = usePart(partMap[key]);
      }

      return <ComponentToWrap {...props} {...parts} />;
    }

    WithParts.displayName = getComponentName('withParts', ComponentToWrap);

    return WithParts;
  };
}

export function withPartUpdates<PartMap extends Record<string, AnyPart>>(
  partMap: PartMap
) {
  return function withPartUpdates<Props>(
    ComponentToWrap: ComponentType<Props>
  ): ComponentType<Omit<Props, keyof PartMap>> {
    function WithPartUpdates(props: Props): JSX.Element {
      const parts = {} as PartUpdateMap<PartMap>;

      for (const key in partMap) {
        parts[key] = usePartUpdate(partMap[key]);
      }

      return <ComponentToWrap {...props} {...parts} />;
    }

    WithPartUpdates.displayName = getComponentName(
      'withPartUpdates',
      ComponentToWrap
    );

    return WithPartUpdates;
  };
}

export function withPartValues<PartMap extends Record<string, AnyPart>>(
  partMap: PartMap
) {
  return function withParts<Props>(
    ComponentToWrap: ComponentType<Props>
  ): ComponentType<Omit<Props, keyof PartMap>> {
    function WithPartValues(props: Props): JSX.Element {
      const parts = {} as PartValueMap<PartMap>;

      for (const key in partMap) {
        parts[key] = usePartValue(partMap[key]);
      }

      return <ComponentToWrap {...props} {...parts} />;
    }

    WithPartValues.displayName = getComponentName(
      'withPartValues',
      ComponentToWrap
    );

    return WithPartValues;
  };
}
