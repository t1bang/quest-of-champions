// Screenshots of the 3D room from given spots, for checking a change by eye.
//   node tools/room-shots.mjs <out-dir> name:x,z,yawDeg[,pitch] ...      (the site must be served: ARCADE_URL, default http://127.0.0.1:8377)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [out, ...spots] = process.argv.slice(2), base = process.env.ARCADE_URL || 'http://127.0.0.1:8377';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.route(/supabase\.co|youtube|ytimg|googleapis|gstatic|\/api\//, r => r.abort());
await page.goto(base + '/?solo=1', { waitUntil: 'domcontentloaded' });
try { await page.waitForFunction(() => window.__P, null, { timeout: 25000 }); } catch (e) { console.log('NOT READY', errors.slice(0, 8).join('\n')); await browser.close(); process.exit(1); }
await page.evaluate(() => { for (const id of ['gate', 'panel']) { const e = document.getElementById(id); if (e) e.hidden = true; } });
await page.waitForTimeout(6000);
for (const s of spots) {
  const [name, rest] = s.split(':'), [px, pz, yaw, pitch] = rest.split(',').map(Number);
  await page.evaluate(([px, pz, yaw, pitch]) => { const P = window.__P; P.x = px; P.z = pz; P.yaw = yaw * Math.PI / 180; P.pitch = pitch || 0; for (const id of ['gate', 'panel', 'hint']) { const e = document.getElementById(id); if (e) e.hidden = true; } }, [px, pz, yaw, pitch]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.jpg`, quality: 80, type: 'jpeg' });
}
console.log(errors.length ? 'ERRORS\n' + [...new Set(errors)].slice(0, 12).join('\n') : 'no page errors');
await browser.close();
