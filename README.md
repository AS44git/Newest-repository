# TikTok Liked/Favorites Scroller

A read-only browser-console script that scrolls your TikTok Liked (or
Favorites) tab all the way to the bottom, so you can find the earliest
video you ever liked/favorited. It doesn't click, like, unlike, favorite,
or unfavorite anything — it only reads video links off the page as it
scrolls.

## Usage

1. Log into [tiktok.com](https://www.tiktok.com), go to your own profile,
   and open the **Liked** or **Favorites** tab.
2. Open DevTools (`F12`, or `Cmd+Option+I` on Mac) → **Console**.
3. Copy [`tiktok-scroll-to-bottom.js`](./tiktok-scroll-to-bottom.js) and
   paste it into the console, then press Enter.
4. It scrolls on its own, logging progress every 25 videos found, until it
   can't find anything new after several scrolls in a row — then it stops
   and prints the earliest (last-loaded) video's link.
5. To stop early: `window.__ttScrollStop = true`
6. The full list is available afterward as `window.__ttScrollResults`
   (newest → oldest) and is also saved to `localStorage`, so you can
   retrieve it later in the same browser with:
   ```js
   JSON.parse(localStorage.getItem('tt_scroll_results_<your-username>'))
   ```

## Minimized / background tabs

This script only scrolls the grid page — it never opens a video overlay,
so there's nothing for TikTok to close when the tab is hidden (unlike a
script that clicks into each video). It automatically waits longer between
scroll steps while the tab is hidden or minimized, since lazy-loading new
items can be slower in the background, so it shouldn't mistake "still
loading" for "reached the bottom." That said, this hasn't been verified
against TikTok's live page from here — if it seems to stop too early while
minimized, bring the tab into view and re-run; it'll just re-scroll (fast,
since the browser has already loaded everything once) and pick up from
where it left off in practice.

## Disclaimer

Automating interactions with tiktok.com is against its Terms of Service.
This script is read-only (scrolling and reading links) rather than taking
any action on your account, which is a much lower-risk activity than the
unlike/unfavorite scripts, but it's still automated use of the site.
