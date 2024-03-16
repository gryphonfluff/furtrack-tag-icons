export type Entry = {
  tagName: string;
  tagThumb?: string;
};

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onerror = _e => reject(r);
    r.onsuccess = _e => resolve(r.result);
  });
}

export function removeStubCache() {
  // Delete obsolete stub cache. Does not matter if this succeeds or not.
  window.indexedDB.deleteDatabase('__userscript_furtrack_tags');
}

export class TagDB {
  private constructor(private db: IDBDatabase) {}

  static open(): Promise<TagDB> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const r = window.indexedDB.open('Furtrack');
      r.addEventListener('error', _e => reject(r));
      r.addEventListener('success', _e => resolve(r.result as IDBDatabase));
    }).then(db => new TagDB(db));
  }

  private _tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const s = this.db.transaction('tags', mode).objectStore('tags');
    return reqToPromise(fn(s));
  }

  get(name: string): Promise<Entry> {
    return this._tx('readonly', s => s.get(name));
  }
}

// vim: ts=2 sw=2 sts=2 et
