import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureUpcomingBills, reconcileBillPlaceholders } from '../src/lib/recurringBills.js';

const template = {
  user_id: 'owner', biller: 'BPI', statement_date: '20 - Previous',
  due_date: '10 - Current', channel: 'Gotyme',
};
const row = (overrides = {}) => ({
  ...template, id: 'existing', month: 'October 2026', amount: 0,
  status: 'Unpaid', is_final: false, ...overrides,
});
const options = (overrides = {}) => ({
  userId: 'owner', month: 'October 2026', recurringBills: [template],
  existingBills: [], ...overrides,
});

// Models the existing UUID primary key and PostgREST DO NOTHING semantics.
function database(initial = []) {
  const rows = new Map(initial.map((bill) => [bill.id, bill]));
  let writes = 0;
  return {
    rows,
    get writes() { return writes; },
    from(table) {
      assert.equal(table, 'bills');
      return {
        async upsert(bills, config) {
          assert.deepEqual(config, { onConflict: 'id', ignoreDuplicates: true });
          writes++;
          await Promise.resolve();
          for (const bill of bills) if (!rows.has(bill.id)) rows.set(bill.id, bill);
          return { error: null };
        },
        select() {
          const filters = [];
          const query = {
            eq(key, value) { filters.push([key, value]); return query; },
            then(resolve) {
              return Promise.resolve({ data: [...rows.values()].filter((bill) => (
                filters.every(([key, value]) => bill[key] === value)
              )), error: null }).then(resolve);
            },
          };
          return query;
        },
      };
    },
  };
}

test('screenshot scenario: retain entered amounts and suppress matching empty duplicates', () => {
  const bills = ['BPI', 'Unionbank', 'MP2', 'BDO'].flatMap((biller, index) => [
    row({ id: `${index}-entered`, biller, amount: [2833.10, 6616, 500, 15000][index] }),
    row({ id: `${index}-blank`, biller }),
  ]);
  const before = structuredClone(bills);
  const result = reconcileBillPlaceholders(bills, ['October 2026']);
  assert.equal(result.length, 4);
  assert.deepEqual(result.map((bill) => bill.amount), [2833.10, 6616, 500, 15000]);
  assert.deepEqual(bills, before, 'raw records must not be changed');
});

test('never suppress entered, paid, or finalized records, even when amounts match', () => {
  const protectedRows = [
    row({ id: 'amount-a', amount: 1200 }), row({ id: 'amount-b', amount: 1200 }),
    row({ id: 'paid', status: 'Paid' }), row({ id: 'final', is_final: true }),
    row({ id: 'paid-date', paid_date: '2026-09-23' }),
    row({ id: 'final-date', final_date: '2026-09-23' }),
  ];
  assert.deepEqual(reconcileBillPlaceholders([...protectedRows, row()], ['October 2026']), protectedRows);
});

test('different accounts, months, schedules, channels and historical rows remain separate', () => {
  const bills = [row(), row({ id: 'channel', channel: 'Other account' }),
    row({ id: 'due', due_date: '25 - Current' }), row({ id: 'statement', statement_date: '5 - Current' }),
    row({ id: 'owner', user_id: 'someone-else' }), row({ id: 'history', month: 'August 2026' }),
    row({ id: 'history-duplicate', month: 'August 2026' })];
  assert.deepEqual(reconcileBillPlaceholders(bills, ['October 2026']), bills);
});

test('all-empty duplicate choice is stable across response order', () => {
  const bills = [row({ id: 'b' }), row({ id: 'a', biller: ' bpi ' })];
  assert.deepEqual(reconcileBillPlaceholders(bills, ['October 2026']).map((b) => b.id), ['a']);
  assert.deepEqual(reconcileBillPlaceholders(bills.toReversed(), ['October 2026']).map((b) => b.id), ['a']);
});

test('concurrent devices with stale empty reads create one bill, even with duplicate templates', async () => {
  const db = database();
  const request = options({ recurringBills: [template, { ...template, biller: ' bpi ' }] });
  const results = await Promise.all(Array.from({ length: 8 }, () => ensureUpcomingBills(db, request)));
  assert.equal(db.rows.size, 1);
  for (const result of results) assert.equal(result.length, 1);
  assert.match([...db.rows.keys()][0], /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('retry after a lost response cannot overwrite the entered amount', async () => {
  const db = database();
  const [bill] = await ensureUpcomingBills(db, options());
  db.rows.set(bill.id, { ...bill, amount: 2833.10, is_final: true });
  const [retried] = await ensureUpcomingBills(db, options());
  assert.equal(retried.amount, 2833.10);
  assert.equal(retried.is_final, true);
  assert.equal(db.rows.size, 1);
});

test('fill a partially generated month without recreating existing random-ID records', async () => {
  const existing = row({ amount: 2833.10 });
  const db = database([existing]);
  const result = await ensureUpcomingBills(db, options({
    existingBills: [existing], recurringBills: [template, { ...template, biller: 'Unionbank' }],
  }));
  assert.equal(result.length, 2);
  assert.deepEqual(result.find((b) => b.biller === 'BPI'), existing);
  await ensureUpcomingBills(db, options({ existingBills: result }));
  assert.equal(db.writes, 1, 'complete month must not write again');
});

test('generation errors are surfaced rather than reported as successful', async () => {
  const error = new Error('offline');
  const client = { from: () => ({ upsert: async () => ({ error }) }) };
  await assert.rejects(ensureUpcomingBills(client, options()), /offline/);
});
