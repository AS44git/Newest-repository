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
loading" for "reached the bottom."

## Lag or the tab crashing/reloading on large accounts

At thousands of items, TikTok's own grid keeps adding thumbnails to the
page without cleaning up after itself — that's TikTok's own memory/
rendering load, not something this script can fix. It deliberately does
**not** try to delete TikTok's DOM nodes to work around this: TikTok's
page is a React app, and forcibly removing nodes React still thinks it
owns can make the page itself throw and crash — likely worse than the lag.

So instead, the script is built to make a crash cheap to recover from:
- Progress saves to `localStorage` every 50 new videos found.
- If you paste the script again after a refresh/crash, it loads what it
  already found and **fast-forwards** (bigger scroll jumps, shorter waits)
  back down to roughly where it left off, then switches back to the normal
  careful pace to keep going from there — so you lose some re-scrolling
  time, but not the videos you already found.

### Making it feel less laggy

Two things the script does:
- Pauses any preview videos TikTok autoplays in the grid on every scroll
  step (these are much heavier on CPU/GPU than static thumbnails; just
  calling `.pause()` is safe, unlike removing DOM nodes).
- Scrolls in smaller steps, so fewer new thumbnails get loaded/rendered
  per batch — smoother, at the cost of taking a bit longer overall.

Things likely to help more, outside what a script can control:
- **Try an Incognito/InPrivate window with extensions disabled.** An ad
  blocker or something like Grammarly re-scanning every new DOM node as
  thousands get added is a common and often bigger source of lag than
  TikTok's own page.
- **Zoom the page out** a couple of notches (`Ctrl` + `-`) — less to paint
  per tile across thousands of tiles adds up.
- **Close other tabs/apps** to free memory, reducing the odds the browser
  reclaims memory by killing the tab.

## No official way to see a total count or reverse the order

Worth setting expectations: TikTok doesn't show a "total videos liked"
count anywhere in its UI, and there's no way to flip the Liked/Favorites
grid to show oldest-first — it always paginates newest-to-oldest. Its
"Download your data" export is also known to truncate Like History for
large accounts. Scrolling to the bottom (what this script automates) is
the only way found so far to answer either question.

## Disclaimer

Automating interactions with tiktok.com is against its Terms of Service.
This script is read-only (scrolling and reading links) rather than taking
any action on your account, which is a much lower-risk activity than the
unlike/unfavorite scripts, but it's still automated use of the site.
