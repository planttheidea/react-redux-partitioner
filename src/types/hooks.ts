import type { AnyUpdater, UpdatePartitionArgs } from './partition';

export type UseUpdateUpdater<Updater extends AnyUpdater> = (
  ...args: UpdatePartitionArgs<Updater>
) => ReturnType<Updater>;
