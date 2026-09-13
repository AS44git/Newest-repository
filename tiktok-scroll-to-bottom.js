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
 * just because the tab isn't visible.
 *
 * LAG / CRASHES ON LARGE ACCOUNTS
 * At thousands of items, TikTok's own grid keeps piling thumbnails into
 * the page without cleaning up — that's TikTok's memory/rendering load,
 * not something this script controls, and this script deliberately does
 * NOT try to delete TikTok's own DOM nodes to "fix" it: TikTok's page is
 * a React app, and manually removing nodes React still thinks it owns can
 * make the page itself throw and crash — likely worse than the lag. If
 * the tab gets slow, laggy, or reloads/crashes on its own, that's this
 * limit being hit, and there isn't a clean way around it from a console
 * script.
 *
 * What this script does instead: saves progress to localStorage
 * frequently, and on a fresh run, loads whatever it already found last
 * time and *fast-forwards* (bigger scroll jumps, shorter waits, no
 * bottom-detection) until it catches back up to roughly where it left
 * off, then switches to the normal careful pace to keep finding new
 * items from there. So a crash costs you some re-scrolling time, but not
 * lost progress — just paste the script again and let it catch up.
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
    // While catching back up to a previous run's progress (see
    // "LAG / CRASHES" above), scroll faster and wait less — we don't need
    // to carefully detect anything here, just get back down to where we
    // were. Still respects being hidden/minimized via WAIT_HIDDEN_MS.
    FAST_SCROLL_STEP_PX: window.innerHeight * 8,
    FAST_WAIT_MS: 500,
    // If nothing new loads after this many scrolls in a row (once past
    // the fast-forward phase), assume we've hit the bottom and stop.
    MAX_EMPTY_SCROLLS: 6,
    // Log a progress line every this many new items found.
    LOG_EVERY: 25,
    // Save progress to localStorage every this many new items found, in
    // case of a refresh or interruption.
    SAVE_EVERY: 50,
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
    const prior = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const seen = new Map(prior.map((info) => [info.id, info]));
    const resumeTarget = prior.length;

    if (resumeTarget > 0) {
      log(`Resuming: found ${resumeTarget} videos in a previous run. Fast-forwarding back to that point (no need to re-save these, just catching the scroll position up)...`);
    } else {
      log('Starting. Scrolling down to load every video in this tab...');
    }

    let emptyScrolls = 0;
    let lastCount = seen.size;
    let lastSaved = seen.size;
    let fastForwarding = resumeTarget > 0;

    for (;;) {
      if (window.__ttScrollStop) {
        log('Stopped manually.');
        break;
      }

      const anchors = getVideoAnchors();
      for (const anchor of anchors) {
        const info = describe(anchor);
        if (info.id && !seen.has(info.id)) {
          seen.set(info.id, info);
        }
      }

      if (fastForwarding && anchors.length >= resumeTarget) {
        fastForwarding = false;
        lastCount = seen.size;
        log(`Caught up (~${anchors.length} rendered) — continuing at normal pace from here.`);
      }

      if (!fastForwarding) {
        if (seen.size > lastCount) {
          if (Math.floor(seen.size / CONFIG.LOG_EVERY) > Math.floor(lastCount / CONFIG.LOG_EVERY)) {
            log(`${seen.size} videos found so far...`);
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
      }

      if (seen.size - lastSaved >= CONFIG.SAVE_EVERY) {
        localStorage.setItem(storageKey, JSON.stringify([...seen.values()]));
        lastSaved = seen.size;
      }

      const step = fastForwarding ? CONFIG.FAST_SCROLL_STEP_PX : CONFIG.SCROLL_STEP_PX;
      const wait = document.hidden ? CONFIG.WAIT_HIDDEN_MS : (fastForwarding ? CONFIG.FAST_WAIT_MS : CONFIG.WAIT_MS);

      window.scrollBy(0, step);
      await sleep(wait);
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
