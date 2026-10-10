const puppeteer = require('puppeteer');
const fs = require('fs');

const TOKEN = fs.readFileSync('/tmp/auth_token.txt', 'utf8').trim();
const APP_URL = 'http://localhost:5173/';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 850 }
  });

  const page = await browser.newPage();

  // Set auth token in localStorage before page loads
  await page.evaluateOnNewDocument((token) => {
    window.localStorage.setItem('base44_access_token', token);
    window.localStorage.setItem('token', token);
  }, TOKEN);

  console.log('Navigating to app...');
  await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(3000);

  // Check if we need to click "View sample" or "Open sample data"
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
  });
  console.log('Buttons found:', JSON.stringify(buttons));

  // Click sample button if it exists
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sampleBtn = btns.find(b => b.textContent.includes('sample') || b.textContent.includes('Sample') || b.textContent.includes('Open sample'));
    if (sampleBtn) { sampleBtn.click(); return sampleBtn.textContent.trim(); }
    return null;
  });
  console.log('Clicked:', clicked);
  await sleep(6000);

  // Check what's on the page
  const hasTable = await page.evaluate(() => !!document.querySelector('table'));
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Has table:', hasTable);
  console.log('Body text preview:', bodyText.substring(0, 200));

  // Screenshot 1: Main dashboard overview
  console.log('Taking screenshot 1: Dashboard overview');
  await page.screenshot({ path: '/tmp/screenshot1.png' });

  // Screenshot 2: Click on a flagged payment to open detail dialog
  const rowClicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    // Find a row with a risk badge (not "clear")
    for (const row of rows) {
      const text = row.textContent.toLowerCase();
      if (text.includes('duplicate') || text.includes('unusual')) {
        row.click();
        return row.textContent.substring(0, 60);
      }
    }
    // Fall back to first row
    if (rows[0]) { rows[0].click(); return rows[0].textContent.substring(0, 60); }
    return null;
  });
  console.log('Clicked row:', rowClicked);
  await sleep(5000); // Wait for dialog and AI review

  console.log('Taking screenshot 2: Payment detail dialog');
  await page.screenshot({ path: '/tmp/screenshot2.png' });

  // Close dialog
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[aria-label="Close"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg'));
    if (closeBtn) closeBtn.click();
  });
  await sleep(1500);

  // Screenshot 3: Click "Review flagged" filter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const flaggedBtn = btns.find(b => b.textContent.toLowerCase().includes('review flagged'));
    if (flaggedBtn) flaggedBtn.click();
  });
  await sleep(2000);

  console.log('Taking screenshot 3: Flagged filter view');
  await page.screenshot({ path: '/tmp/screenshot3.png' });

  await browser.close();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });