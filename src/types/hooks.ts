import type { AnyUpdater, UpdatePartArgs } from './part';

export type UseUpdateUpdater<Updater extends AnyUpdater> = (
  ...args: UpdatePartArgs<Updater>
) => ReturnType<Updater>;
