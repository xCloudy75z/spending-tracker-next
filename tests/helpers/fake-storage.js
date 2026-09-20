export function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  let getError = null;
  let nextSetError = null;
  let nextSetKey = null;
  let readbackKey = null;
  let readbackValue = null;
  let pendingReadbackKey = null;
  let pendingReadbackValue = null;

  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (getError) throw getError;
      if (key === readbackKey && readbackValue !== null && values.has(key)) {
        const value = readbackValue;
        readbackKey = null;
        readbackValue = null;
        return value;
      }
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (nextSetError && (!nextSetKey || nextSetKey === key)) {
        const error = nextSetError;
        nextSetError = null;
        nextSetKey = null;
        throw error;
      }
      values.set(key, String(value));
      if (key === pendingReadbackKey) {
        readbackKey = pendingReadbackKey;
        readbackValue = pendingReadbackValue;
        pendingReadbackKey = null;
        pendingReadbackValue = null;
      }
    },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
    keys() { return [...values.keys()].sort(); },
    failReads(error) { getError = error; },
    failNextSet(error, key = null) {
      nextSetError = error;
      nextSetKey = key;
    },
    mismatchNextRead(key, value) {
      pendingReadbackKey = key;
      pendingReadbackValue = value;
    },
    raw(key) { return values.get(key); },
  };
}
