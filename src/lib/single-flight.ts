const inFlightRequests = new Map<string, Promise<unknown>>();

export function withSingleFlight<T>(key: string, action: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const request = Promise.resolve().then(action);
  inFlightRequests.set(key, request);

  const clear = () => {
    if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
  };
  void request.then(clear, clear);

  return request;
}
