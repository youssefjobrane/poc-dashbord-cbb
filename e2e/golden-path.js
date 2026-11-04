// Golden-path check for the running dev server (npm start), driven by playwright-cli:
//   playwright-cli open http://localhost:4200 && playwright-cli run-code --filename e2e/golden-path.js
async (page) => {
  const base = 'http://localhost:4200';
  const log = [];
  const check = (name, ok, got) => log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` (got: ${JSON.stringify(got)})`}`);
  const kpi = (i) => page.locator('app-kpi-strip .kpi').nth(i).locator('.value');
  const idle = () => page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 });
  // wait for the loading phase triggered by the last action to start, then to finish
  const settle = async () => {
    await page.waitForSelector('[aria-busy="true"]', { timeout: 1500 }).catch(() => undefined);
    await idle();
  };

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`${base}/pilotage`);
  await idle();
  check('actifs = 881', (await kpi(0).textContent())?.trim() === '881', await kpi(0).textContent());
  check('questions = 6 892', (await kpi(2).textContent())?.replace(/\s/g, ' ').trim() === '6 892', await kpi(2).textContent());
  check('taux = 58,7 %', (await kpi(1).textContent())?.replace(/\s/g, ' ').trim() === '58,7 %', await kpi(1).textContent());
  const period = (await page.locator('.period').textContent())?.replace(/\s+/g, ' ').trim();
  check('period label', period === 'Période du 01/10 au 21/10 · comparée au 01/09 → 21/09 (même nombre de jours)', period);

  // department bar click -> global filter, skeleton while loading, recalculated KPIs
  await page.locator('app-dept-bars button', { hasText: 'Crédits' }).click();
  await page.waitForSelector('app-kpi-strip [aria-busy="true"]', { timeout: 1500 }).catch(() => undefined);
  check('skeleton shown while loading', (await page.locator('app-kpi-strip [aria-busy="true"]').count()) > 0, 0);
  check('no stale value during load', (await page.locator('app-kpi-strip .value').count()) === 0, await page.locator('app-kpi-strip .value').count());
  await settle();
  check('Crédits actifs = 91', (await kpi(0).textContent())?.trim() === '91', await kpi(0).textContent());
  check('dept select = Crédits', (await page.locator('select.dept').inputValue()) === '3', await page.locator('select.dept').inputValue());

  // rapid granularity changes: only the last request wins
  for (const g of ['Jour', 'Mois', 'Jour', 'Semaine']) await page.locator('.seg button', { hasText: g }).click();
  await settle();
  const sub = (await page.locator('app-activity-chart .card-sub').textContent())?.trim();
  check('last granularity wins', sub === 'Crédits · par semaine', sub);

  // KPI card switches the evolution metric
  await page.locator('app-kpi-strip .kpi').nth(2).click();
  await settle();
  const title = (await page.locator('app-activity-chart .card-title').textContent())?.trim();
  check('kpi click switches chart', title === 'Évolution — Questions posées', title);

  // filters persist across pages
  await page.locator('nav a', { hasText: 'Métiers' }).click();
  await settle();
  check('dept kept on Métiers', (await page.locator('app-dept-table tr.sel td').first().textContent())?.trim() === 'Crédits & engagements', await page.locator('app-dept-table tr.sel td').first().textContent());
  const total = (await page.locator('app-dept-table tfoot td').nth(2).textContent())?.trim();
  check('table total actifs = 881', total === '881', total);

  // month change
  await page.locator('select.month').selectOption('2026-09');
  await settle();
  const p2 = (await page.locator('.period').textContent())?.replace(/\s+/g, ' ').trim();
  check('september period', p2?.startsWith('Période du 01/09 au 30/09 · comparée au 01/08 → 30/08') ?? false, p2);

  // document detail
  await page.locator('app-top-documents li button').first().click();
  await page.waitForSelector('dialog[open] h3', { timeout: 15000 });
  check('document dialog', (await page.locator('dialog[open] h3').textContent())?.length > 0, '');
  await page.keyboard.press('Escape');

  // reset
  await page.locator('button.reset').click();
  await settle();
  check('reset dept', (await page.locator('select.dept').inputValue()) === '', await page.locator('select.dept').inputValue());
  check('reset month', (await page.locator('select.month').inputValue()) === '2026-10', await page.locator('select.month').inputValue());

  // simulated error + retry
  await page.goto(`${base}/pilotage?fail=kpis,alerts`);
  await page.waitForSelector('app-alerts-card [role="alert"]', { timeout: 15000 });
  check('error state shown', (await page.locator('app-alerts-card [role="alert"]').count()) === 1, 0);
  await page.locator('app-alerts-card button', { hasText: 'Réessayer' }).click();
  await settle();
  check('retry recovers', (await page.locator('app-alerts-card li').count()) === 4, await page.locator('app-alerts-card li').count());

  return log.join('\n');
}
