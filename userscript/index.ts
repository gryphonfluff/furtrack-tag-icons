import { log } from './logging';
import { TagDB, removeStubCache } from './cache';
import { genThumbUrl } from './client';

(async function() {
  'use strict';

  log('userscript loaded');

  removeStubCache();
  const tagDB = await TagDB.open();

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
      const t = await tagDB.get(tagName);
      if (t && t.tagThumb != null) {
        setThumb(`${t.tagThumb}`);
      } else {
        setThumb('');
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
