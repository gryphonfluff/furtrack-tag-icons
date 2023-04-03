export type Entry = {
  name: string;
  stub: string;
  src: string;
  files?: File[];
};

export type File = {
  name: string;
  path: string;
  time: number;
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onerror = _e => reject(r);
    r.onsuccess = _e => resolve(r.result);
  });
}

export class StubCache {
  private constructor(private db: IDBDatabase) {}

  static open(): Promise<StubCache> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const r = window.indexedDB.open('__userscript_furtrack_tags', 1);
      r.addEventListener('error', _e => reject(r));
      r.addEventListener('success', _e => resolve(r.result as IDBDatabase));
      r.addEventListener('upgradeneeded', _e => {
        const s = r.result.createObjectStore('tags', { keyPath: 'name' });
        s.createIndex('src', 'src', { unique: false });
        r.transaction?.addEventListener('complete', _e => resolve(r.result ));
      });
    }).then(db => new StubCache(db));
  }

  private _tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const s = this.db.transaction('tags', mode).objectStore('tags');
    return reqToPromise(fn(s));
  }

  get(name: string): Promise<Entry> {
    return this._tx('readonly', s => s.get(name));
  }

  put(v: Entry): Promise<IDBValidKey> {
    return this._tx('readwrite', s => s.put(v));
  }

  bulkPut(it: Iterable<Entry>): Promise<void> {
    return new Promise((resolve, reject) => {
      let success = 0, error = 0, total = 0;
      const complete = () => (error > 0 ? reject : resolve)();
      const errCb = () => {
        error++;
        if (success + error == total) complete();
      };
      const successCb = () => {
        success++;
        if (success + error == total) complete();
      };

      const s = this.db.transaction('tags', 'readwrite').objectStore('tags');
      for (const t of it) {
        const r = s.put(t);
        total++;
        r.onerror = errCb;
        r.onsuccess = successCb;
      }
    });
  }

  yeetSrc(src: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const r = this.db.transaction('tags', 'readwrite').
        objectStore('tags').
        index('src').
        openCursor(IDBKeyRange.only(src));
      r.onerror = _e => reject(r);
      let deleted = 0;
      r.onsuccess = _e => {
        const cursor = r.result;
        if (cursor) {
          deleted++;
          cursor.delete();
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
    });
  }
}

// vim: ts=2 sw=2 sts=2 et
