import { log } from './logging';
import { StubCache, File } from './cache';

export const seedCache = async (stubCache: StubCache) => {
  const dbIndex = await stubCache.get(':index');
  const needsUpdate = (newfile: File) => {
    for (const f of dbIndex?.files ?? []) {
      if (f.name === newfile.name) {
        return f.path !== newfile.path && f.time < newfile.time;
      }
    }
    return true;
  };
  log('db index', dbIndex);

  const t = Math.floor(new Date().getTime() / 1000 / 3600);
  const base = 'https://storage.googleapis.com/furtrack-tags-seed/tags';
  const index = await (await fetch(`${base}/index.json?t=${t}`)).json();
  log('cloud index', index);
  for (const file of index.files) {
    if (!needsUpdate(file)) {
      continue;
    }

    log(`downloading seed ${file.name} from ${file.path}`);
    const src = file.name;
    const r = await fetch(`${base}/${file.path}`);
    const { stubs, nostubs } = await r.json();

    // Replace data.
    const deleted = await stubCache.yeetSrc(file.name);
    log(`yeeted cache from ${file.name}: ${deleted} entries`);

    await stubCache.seedPut(function* () {
      for (const name of Object.keys(stubs)) {
        yield { name, stub: stubs[name], src };
      }
      for (const name of nostubs) {
        yield { name, stub: '', src };
      }
    }());
    log(`seeded cache: ${file.name}: ${Object.keys(stubs).length} stubs, ${nostubs.length} nostubs`);
  }
  await stubCache.put({
    name: ':index',
    stub: '',
    src: '',
    files: index.files,
  });
  log('seeding completed');
};

// vim: ts=2 sw=2 sts=2 et
