import { log } from './logging';
import { ThrottlingQueue } from './queue';
import { StubCache, Entry } from './cache';
import { seedCache } from './seeding';
import { genThumbUrl, fetchStub, TagMeta } from './client';

(async function() {
  'use strict';

  log('userscript loaded');

  const stubCache = await StubCache.open();

  // Run async.
  seedCache(stubCache).catch(err => log(`failed to update stub cache: ${err}`));

  const fetchAndCacheStub = async (name: string): Promise<string> => {
    try {
      const stub = await fetchStub(name);
      log(`fetched tag '${name}' stub: ${stub}`);
      await stubCache.put({ name, stub, src: '' });
      return stub;
    } catch (e) {
      log(`failed fetch tag index for ${name}: ${e}`);
      return '';
    }
  };

  // Scans DOM for react component which contains the tagmeta then does active cache updates.
  const scanDom = async () => {
    log('scanning dom for tagmeta');
    const index = document.getElementById('indexpage');
    if (!index) return;

    const entries: Array<Entry> = [];
    const update = (tagmeta: TagMeta) => {
      const { tagName: name, tagUrlStub } = tagmeta;
      // We only care about char tags.
      if (name?.startsWith('1:')) {
        const stub = tagUrlStub ?? '';
        entries.push({ name, stub, src: '' });
      }
    };
    for (const [key, value] of Object.entries(index)) {
      if (key.startsWith('__reactInternalInstance$')) {
        const tagmeta = value?.return?.stateNode?.state?.tagmeta;
        if (tagmeta) {
          update(tagmeta);
          // Maker page.
          if (tagmeta.tagFursuits) {
            for (const t of tagmeta.tagFursuits) {
              update(t);
            }
          }
        }
      }
    }
    await stubCache.bulkPut(entries);
    log(`active stub cache update (${entries.length} entries):`, entries);
  };

  // Our CSS for showing stub thumb image on auto-suggest tags.
  const css = document.styleSheets[0];
  css.insertRule(`
    #fsu .autosuggest-item.character,
    .autosuggest-item.character {
      display: inline-block;
      height: 40px;
      padding: 3px 8px 4px 0;
      line-height: 32px;
    }
  `)
  css.insertRule(`
    #fsu .autosuggest-item.character[data-image],
    .autosuggest-item.character[data-image] {
      background-repeat: no-repeat;
      background-size: 36px 36px;
      background-position: left;
      padding-left: 40px;
    }
  `);

  // Throttling queue for fetching tagmeta when we don't have it anywhere.
  const queue = new ThrottlingQueue(300);
  // Attaches stub urls to autosuggest tags.
  const attachImages = async () => {
    const nodes = document.querySelectorAll<HTMLElement>('.autosuggest-item.character');
    for (const node of nodes.values()) {
      const name = node.innerText;
      const isChanged = () => name !== node.innerText;

      const setThumb = (stub: string) => {
        if (isChanged()) return;
        if (stub) {
          const url = genThumbUrl(stub);
          node.setAttribute('data-image', '1');
          node.style.setProperty('background-image', `url(${url})`);
        } else {
          node.removeAttribute('data-image');
          node.style.removeProperty('background-image');
        }
      };

      const tagName = `1:${name}`;
      const t = await stubCache.get(tagName);
      if (t) {
        setThumb(t.stub);
      } else {
        setThumb('');
        const { cancel } = queue.submit(async () => {
          if (!node.isConnected || isChanged()) {
            log(`node disconnected: ${name}`);
            setThumb('');
            cancel();
            return;
          }
          setThumb(await fetchAndCacheStub(tagName));
        });
      }
    }
  };

  const delayedTrigger = (delay: number, fn: () => void) => {
    let timer: number | null = null;
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        fn();
        timer = null;
      }, delay);
    };
  };

  // Longer delay allowing XHR to finish.
  const urlchangeTrigger = delayedTrigger(500, scanDom);
  window.addEventListener('urlchange', _e => urlchangeTrigger());
  // Immediate trigger upon page load.
  urlchangeTrigger();

  // DOM mutation trigger to attach stub thumb image urls.
  const mutationTrigger = delayedTrigger(100, attachImages);
  const observer = new MutationObserver((mutations, _observer) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutationTrigger();
        break;
      }
    }
  });
  observer.observe(document, {
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });
  // observer.disconnect();
})();

// vim: ts=2 sw=2 sts=2 et
