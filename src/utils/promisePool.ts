/**
 * Execute promises with limited concurrency using a pool pattern
 * @param items - Array of items to process
 * @param fn - Async function to execute for each item
 * @param concurrency - Maximum number of concurrent promises (default: 5)
 * @returns Array of results in the same order as items
 */
export async function promisePool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const [index, item] of items.entries()) {
    const promise = fn(item).then(result => {
      results[index] = result;
    });

    const executingPromise = promise.then(() => {
      executing.splice(executing.indexOf(executingPromise), 1);
    });

    executing.push(executingPromise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
