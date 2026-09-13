/**
 * TikTok Liked/Favorites — scroll to the bottom
 *
 * WHAT THIS DOES
 * Just scrolls the current tab (e.g. your Liked videos grid) down,
 * repeatedly, until TikTok stops loading new items — so you can see the
 * earliest video you ever liked/favorited. It does NOT click, like,
 * unlike, favorite, or unfavorite anything. Read-only.
 *
 * HOW TO USE
 * 1. Go to your own TikTok profile, open the Liked (or Favorites) tab.
 * 2. Open DevTools (F12) → Console.
 * 3. Paste this whole file, press Enter.
 * 4. It scrolls on its own until it can't find any new videos after
 *    several tries in a row, then logs how many it found and stops.
 * 5. To stop early: window.__ttScrollStop = true
 *
 * MINIMIZED / BACKGROUND TABS
 * Unlike the unlike/unfavorite script, this one never opens a video
 * overlay — it just scrolls the grid page and reads links off it, so
 * there's nothing for TikTok to tear down when the tab is hidden. It
 * automatically waits longer between scrolls while the tab is hidden or
 * minimized (lazy-loading new items can still be slower in the
 * background), so it shouldn't conclude "reached the bottom" too early
 * just because the tab isn't visible. Progress is also saved to
 * localStorage every so often in case you refresh or it gets interrupted.
 */
(function () {
  'use strict';

  const CONFIG = {
    // How far to scroll (px) each step.
    SCROLL_STEP_PX: window.innerHeight * 2.5,
    // How long to wait after each scroll before checking for new items
    // (longer when the tab is hidden/minimized — lazy-loading can be
    // slower in the background, and this avoids stopping too early).
    WAIT_MS: 1500,
    WAIT_HIDDEN_MS: 4000,
    // If nothing new loads after this many scrolls in a row, assume we've
    // hit the bottom and stop.
    MAX_EMPTY_SCROLLS: 6,
    // Log a progress line every this many new items found.
    LOG_EVERY: 25,
    // Save progress to localStorage every this many new items found, in
    // case of a refresh or interruption.
    SAVE_EVERY: 100,
  };

  if (window.__ttScrollRunning) {
    console.warn('[tt-scroll] Already running. Set window.__ttScrollStop = true to stop it first.');
    return;
  }
  window.__ttScrollRunning = true;
  window.__ttScrollStop = false;

  const log = (...args) => console.log('[tt-scroll]', ...args);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function extractVideoId(href) {
    const match = href && href.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  function getVideoAnchors() {
    return [...document.querySelectorAll('a[href*="/video/"]')].filter((a) => extractVideoId(a.getAttribute('href') || ''));
  }

  function describe(anchor) {
    const id = extractVideoId(anchor.getAttribute('href') || '');
    return { id, href: anchor.href };
  }

  const account = location.pathname.split('/')[1] || 'unknown';
  const storageKey = `tt_scroll_results_${account}`;

  async function run() {
    log('Starting. Scrolling down to load every video in this tab...');

    let seen = new Map();
    let emptyScrolls = 0;
    let lastCount = 0;
    let lastSaved = 0;

    for (;;) {
      if (window.__ttScrollStop) {
        log('Stopped manually.');
        break;
      }

      for (const anchor of getVideoAnchors()) {
        const info = describe(anchor);
        if (info.id && !seen.has(info.id)) {
          seen.set(info.id, info);
        }
      }

      if (seen.size > lastCount) {
        if (Math.floor(seen.size / CONFIG.LOG_EVERY) > Math.floor(lastCount / CONFIG.LOG_EVERY)) {
          log(`${seen.size} videos found so far...`);
        }
        if (seen.size - lastSaved >= CONFIG.SAVE_EVERY) {
          localStorage.setItem(storageKey, JSON.stringify([...seen.values()]));
          lastSaved = seen.size;
        }
        lastCount = seen.size;
        emptyScrolls = 0;
      } else {
        emptyScrolls += 1;
      }

      if (emptyScrolls > CONFIG.MAX_EMPTY_SCROLLS) {
        log(`Reached the bottom — no new videos after ${CONFIG.MAX_EMPTY_SCROLLS} scrolls in a row.`);
        break;
      }

      window.scrollBy(0, CONFIG.SCROLL_STEP_PX);
      await sleep(document.hidden ? CONFIG.WAIT_HIDDEN_MS : CONFIG.WAIT_MS);
    }

    const all = [...seen.values()];
    localStorage.setItem(storageKey, JSON.stringify(all));
    log(`Total videos found: ${all.length}.`);
    if (all.length > 0) {
      const earliest = all[all.length - 1];
      log('Earliest (last-loaded) video on this tab:', earliest.href);
      console.log('%cEarliest video link:', 'font-weight:bold', earliest.href);
    }
    window.__ttScrollResults = all;
    log('Full ordered list saved to window.__ttScrollResults (array of {id, href}, newest first) and to localStorage.');
    log(`To re-read it later in this browser: JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))`);
  }

  run().finally(() => {
    window.__ttScrollRunning = false;
  });
})();
