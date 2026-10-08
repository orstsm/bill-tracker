import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelegramReminder } from '../src/lib/telegramReminders.js';
import handler from '../api/cron.js';

const now = new Date(2026, 9, 7, 12);
const bill = (id, overrides = {}) => ({
  id, user_id: 'owner', biller: 'UnionBank', month: 'October 2026',
  due_date: '12 - Current', status: 'Unpaid', amount: 11532.08, ...overrides,
});
const sub = (id, overrides = {}) => ({
  id, user_id: 'owner', name: 'ChatGPT', amount: 1100, status: 'Active',
  renewal_date: new Date(2026, 9, 10).toISOString(), cycle: 'Monthly', ...overrides,
});
const build = (bills, subscriptions = []) => buildTelegramReminder({ bills, subscriptions, now });

test('screenshot: zero recurring placeholders and paid bills do not enter counts or messages', () => {
  const result = build([
    bill('bpi-zero', { biller: 'BPI', amount: 0 }),
    bill('ub-zero', { amount: '0.00' }),
    bill('paid', { status: 'Paid' }),
    bill('outstanding'),
  ], [sub('chatgpt')]);
  assert.deepEqual(result.dueBills.map(b => b.id), ['outstanding']);
  assert.match(result.message, /Action Required: 1 Bill Due Soon!/);
  assert.match(result.message, /₱11,532.08/);
  assert.match(result.message, /1 Subscription Renewing Soon!/);
  assert.doesNotMatch(result.message, /BPI|₱0.00/);
});

test('saved partial balance is used, independent accounts remain, identical IDs occur once', () => {
  const partial = bill('partial', { status: 'Partially Paid', amount: 532.08 });
  const result = build([partial, partial, bill('other-account'), bill('settled', { status: 'Paid' })]);
  assert.equal(result.dueBills.length, 2);
  assert.match(result.message, /₱532.08/);
  assert.match(result.message, /₱11,532.08/);
});

test('paid status always wins; zero, negative, invalid and sub-cent amounts are ineligible', () => {
  assert.equal(build([
    bill('paid', { status: ' paid ' }),
    ...[0, '0.00', -10, null, undefined, 'bad', Infinity, 0.001]
      .map((amount, i) => bill(String(i), { amount })),
  ]).message, null);
});

test('paying one cycle does not suppress another cycle of the same biller', () => {
  const result = build([
    bill('september', { month: 'September 2026', status: 'Paid' }),
    bill('october'), bill('november', { month: 'November 2026' }),
  ]);
  assert.deepEqual(result.dueBills.map(b => b.id), ['october']);
});

test('subscription eligibility stays independent of bills', () => {
  const active = sub('active');
  const result = build([bill('paid', { status: 'Paid' })], [
    active, active, sub('cancelled', { status: 'Cancelled' }),
    sub('disabled', { status: 'Disabled' }), sub('unscheduled', { renewal_date: null }),
    sub('invalid', { renewal_date: 'bad' }),
  ]);
  assert.equal(result.dueSubs.length, 1);
  assert.doesNotMatch(result.message, /Action Required|---/);
  assert.match(result.message, /Renews in 3 days \(Monthly\)/);
  assert.equal(build([], [sub('off', { status: 'Cancelled' })]).message, null);
});

test('existing overdue, seven-day bill and five-day subscription windows are preserved', () => {
  const result = build([
    bill('overdue', { due_date: '6 - Current' }),
    bill('today', { due_date: '7 - Current' }),
    bill('seven', { due_date: '14 - Current' }),
    bill('eight', { due_date: '15 - Current' }),
  ], [
    sub('five', { renewal_date: new Date(2026, 9, 12).toISOString() }),
    sub('six', { renewal_date: new Date(2026, 9, 13).toISOString() }),
  ]);
  assert.deepEqual(result.dueBills.map(b => b.id), ['overdue', 'today', 'seven']);
  assert.deepEqual(result.dueSubs.map(s => s.id), ['five']);
});

test('scheduled handler reads fresh owner data on every run and skips delivery after payment', async () => {
  const keys = {
    CRON_SECRET: 'test-secret', VITE_SUPABASE_URL: 'https://reminder-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key', OWNER_USER_ID: 'owner',
    TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: 'test-chat',
  };
  const previous = Object.fromEntries(Object.keys(keys).map(k => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, keys);
  let saved = [bill('live', { month: 'January 2020' })];
  let reads = 0;
  let sends = 0;
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'api.telegram.org') {
      sends++;
      assert.match(JSON.parse(options.body).text, /1 Bill Due Soon!/);
      return new Response('{"ok":true}', { status: 200 });
    }
    assert.equal(url.hostname, 'reminder-test.supabase.co');
    assert.equal(url.searchParams.get('user_id'), 'eq.owner');
    assert.equal(options.cache, 'no-store');
    if (url.pathname.endsWith('/bills')) {
      reads++;
      assert.equal(url.searchParams.get('status'), 'neq.Paid');
      assert.equal(url.searchParams.get('amount'), 'gt.0');
      // Even if the transport returns an ineligible row, the builder rejects it.
      return new Response(JSON.stringify(saved), { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };
  const run = async () => {
    const res = {
      setHeader() {}, status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await handler({ method: 'GET', headers: { authorization: 'Bearer test-secret' } }, res);
    assert.equal(res.code, 200);
    return res;
  };
  try {
    await run();
    saved = [bill('live', { month: 'January 2020', status: 'Paid' })];
    await run();
    saved = [bill('live', { month: 'January 2020', amount: 0 })];
    await run();
    assert.equal(reads, 3);
    assert.equal(sends, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[k]; else process.env[k] = value;
    }
  }
});
