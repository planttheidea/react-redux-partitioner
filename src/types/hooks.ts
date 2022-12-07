import type {
  AnyPart,
  AnySelectablePart,
  AnyUpdateablePart,
  AnyUpdater,
  UpdatePartArgs,
} from './part';

export type UseUpdateUpdater<Updater extends AnyUpdater> = (
  ...args: UpdatePartArgs<Updater>
) => ReturnType<Updater>;

export type UsePartPair<Part extends AnyPart> = [
  UsePartValue<Part>,
  UsePartUpdate<Part>
];

export type UsePartValue<Part extends AnyPart> = Part extends AnySelectablePart
  ? ReturnType<Part['g']>
  : never;

export type UsePartUpdate<Part extends AnyPart> = Part extends AnyUpdateablePart
  ? (...rest: UpdatePartArgs<Part['s']>) => ReturnType<Part['s']>
  : never;
