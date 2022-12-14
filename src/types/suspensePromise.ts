export interface SuspensePromiseCacheEntry<Result> {
  c: () => void;
  e: Error | null;
  p: Promise<Result>;
  r: Result | undefined;
  s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}
