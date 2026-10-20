import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = resolve(root, '.taste-skill/browser');
mkdirSync(outDir, { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json',
};
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end('Bad request'); }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const pages = readdirSync(root).filter((name) => name.toLowerCase().endsWith('.html')).sort();
const widths = [1440, 768, 390];
const failures = [];
const results = [];
const addFail = (page, width, reason) => failures.push({ page, width, reason });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let current = { path: 'index.html', width: 1440 };
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push({ path: current.path, width: current.width, message: err.message }));

  for (const path of pages) {
    for (const width of widths) {
      current = { path, width };
      await page.setViewportSize({ width, height: width === 390 ? 844 : width === 768 ? 1024 : 900 });
      const url = `${base}/${path.split('/').map(encodeURIComponent).join('/')}`;
      let response;
      try {
        response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(250);
      } catch (err) {
        addFail(path, width, `navigation failed: ${err.message}`);
        continue;
      }
      if (!response || !response.ok()) addFail(path, width, `HTTP ${response?.status() ?? 'no response'}`);

      const info = await page.evaluate(() => {
        const h1s = [...document.querySelectorAll('h1')];
        const h1 = h1s[0];
        const r = h1?.getBoundingClientRect();
        let opacity = 1;
        for (let el = h1; el && el !== document.documentElement; el = el.parentElement) {
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') opacity = 0;
          opacity *= Number(st.opacity || 1);
        }
        return {
          title: document.title,
          h1Count: h1s.length,
          h1Text: h1?.innerText?.trim() || '',
          h1Visible: !!r && r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && opacity > .5,
          h1Top: r ? Math.round(r.top) : null,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          imageCount: document.images.length,
          skipLink: !!document.querySelector('.skip-link'),
          hasSharedCss: [...document.styleSheets].some((s) => (s.href || '').includes('wr-ui.css')),
          bookCards: document.querySelectorAll('a.book-card').length,
        };
      });
      if (!info.title) addFail(path, width, 'missing document title');
      if (info.h1Count !== 1) addFail(path, width, `expected one h1, got ${info.h1Count}`);
      if (!info.h1Visible) addFail(path, width, `h1 not visibly available on first viewport: ${info.h1Text}`);
      if (info.overflow > 1) addFail(path, width, `horizontal overflow by ${info.overflow}px`);
      if (!info.skipLink) addFail(path, width, 'missing skip link');
      if (!info.hasSharedCss) addFail(path, width, 'shared wr-ui.css not loaded');
      if (path === 'index.html' && info.bookCards !== 13) addFail(path, width, `expected 13 native story links, got ${info.bookCards}`);

      const broken = await page.evaluate(async () => {
        const imgs = [...document.images];
        await Promise.all(imgs.map(async (img) => {
          img.loading = 'eager';
          try { await img.decode(); } catch {}
        }));
        return imgs.filter((img) => !img.complete || img.naturalWidth < 1).map((img) => img.getAttribute('src'));
      });
      if (broken.length) addFail(path, width, `broken image(s): ${broken.join(', ')}`);

      if (path === 'index.html') await page.screenshot({ path: join(outDir, `home-${width}.png`), fullPage: false });
      results.push({ path, width, ...info, brokenImages: broken.length });
    }
  }

  // Search, empty state, category filter, and a real story navigation.
  current = { path: 'index.html', width: 1440 };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(200);
  const search = page.locator('#story-search-input');
  if (await search.count() !== 1) addFail('index.html', 1440, 'archive search input missing');
  else {
    await search.fill('Abhinayam');
    await page.waitForTimeout(80);
    let visibleCount = await page.locator('a.book-card:not([hidden])').count();
    if (visibleCount !== 1) addFail('index.html', 1440, `search Abhinayam should show one story, got ${visibleCount}`);
    await search.fill('query-with-no-matching-story-123');
    await page.waitForTimeout(80);
    visibleCount = await page.locator('a.book-card:not([hidden])').count();
    if (visibleCount !== 0) addFail('index.html', 1440, `non-matching query should show zero stories, got ${visibleCount}`);
    if (!(await page.locator('#story-search-empty').isVisible().catch(() => false))) addFail('index.html',1440,'empty search state not shown');
    await search.fill('');
  }
  const romance = page.locator('.filter-link[data-filter="romance"]');
  if (await romance.count() !== 1) addFail('index.html',1440,'romance filter missing');
  else {
    await romance.click();
    await page.waitForTimeout(80);
    const categoryCheck = await page.locator('a.book-card:not([hidden])').evaluateAll((cards) => cards.every((c) => (c.dataset.category || '').split(/\s+/).includes('romance')));
    const visibleCount = await page.locator('a.book-card:not([hidden])').count();
    if (visibleCount < 1 || !categoryCheck) addFail('index.html',1440,'romance filter returned empty or mismatched cards');
  }
  const all = page.locator('.filter-link[data-filter="all"]');
  if (await all.count()) await all.click();
  const first = page.locator('a.book-card').first();
  const firstHref = await first.getAttribute('href');
  if (firstHref !== 'Abhinayam.html') addFail('index.html',1440,`first story destination changed unexpectedly: ${firstHref}`);
  else {
    await Promise.all([page.waitForURL(/Abhinayam\.html$/), first.click()]);
    if ((await page.locator('h1').count()) !== 1) addFail('Abhinayam.html',1440,'story link did not open a page with one h1');
  }

  current = { path: 'Abhinayam.html', width: 390 };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/Abhinayam.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  const reduced = await page.evaluate(() => {
    const h = document.querySelector('h1');
    const r = h?.getBoundingClientRect();
    const style = h ? getComputedStyle(h) : null;
    return !!h && !!r && r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .5;
  });
  if (!reduced) addFail('Abhinayam.html',390,'story title hidden in reduced-motion mode');
  if (pageErrors.length) failures.push(...pageErrors.map(e => ({ page: e.path, width: e.width, reason: `uncaught browser error: ${e.message}` })));

  const summary = {
    generatedAt: new Date().toISOString(), baseUrl: base,
    pages: pages.length, viewportsPerPage: widths, pageViews: results.length,
    interactionTests: ['search match', 'search empty state', 'category filter', 'native story navigation', 'reduced motion'],
    failures, results,
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(`WR BROWSER QA: ${pages.length} pages × ${widths.length} viewports = ${results.length} page views`);
  console.log(`Interaction tests: ${summary.interactionTests.join(', ')}`);
  console.log(`Failures: ${failures.length}`);
  if (failures.length) for (const item of failures) console.log(`FAIL ${item.page} @${item.width ?? '-'}: ${item.reason}`);
  else console.log('PASS: layout, heading visibility, assets, catalogue interactions and reduced motion');
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
  server.close();
}
