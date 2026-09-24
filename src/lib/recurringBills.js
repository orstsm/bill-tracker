// Include the schedule and channel: two accounts with the same provider must
// not be merged just because their names match.
const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export const billIdentity = (bill) => JSON.stringify([
  bill.user_id,
  bill.month,
  bill.biller,
  bill.statement_date,
  bill.due_date,
  bill.channel,
].map(normalize));

const isUntouchedPlaceholder = (bill) => (
  Number(bill.amount) === 0
  && bill.status === 'Unpaid'
  && !bill.is_final
  && !bill.final_date
  && !bill.paid_date
);

// Repair the active/upcoming view without deleting financial records. Never
// hide a paid, finalized, or nonzero bill, even if another record looks similar.
export function reconcileBillPlaceholders(bills, months) {
  const groups = new Map();
  for (const bill of bills) {
    if (!months.includes(bill.month)) continue;
    const key = billIdentity(bill);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(bill);
  }

  const hidden = new Set();
  for (const group of groups.values()) {
    const placeholders = group.filter(isUntouchedPlaceholder);
    const hasEnteredBill = placeholders.length < group.length;
    // Stable choice across queries/devices when every duplicate is still empty.
    placeholders.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const bill of placeholders.slice(hasEnteredBill ? 0 : 1)) hidden.add(bill.id);
  }
  return bills.filter((bill) => !hidden.has(bill.id));
}

async function generatedBillId(bill) {
  const bytes = new TextEncoder().encode(`bill-tracker:recurring:v1:${billIdentity(bill)}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  // UUID v8, backed by the existing bills primary key. No schema change needed.
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = [...digest.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function ensureUpcomingBills(client, { userId, month, recurringBills, existingBills }) {
  const identities = new Set(existingBills.map(billIdentity));
  const missing = [];
  for (const recurring of recurringBills) {
    const bill = {
      user_id: userId,
      month,
      biller: recurring.biller,
      statement_date: recurring.statement_date,
      due_date: recurring.due_date,
      channel: recurring.channel,
      amount: 0,
      status: 'Unpaid',
    };
    const identity = billIdentity(bill);
    if (identities.has(identity)) continue;
    identities.add(identity);
    missing.push({ ...bill, id: await generatedBillId(bill) });
  }

  if (!missing.length) return existingBills;
  // DO NOTHING on conflict, never overwrite an amount with the generated zero.
  const { error } = await client.from('bills').upsert(missing, {
    onConflict: 'id',
    ignoreDuplicates: true,
  });
  if (error) throw error;

  // Read the winning rows, including inserts made by another device/load.
  const { data, error: readError } = await client.from('bills').select('*')
    .eq('user_id', userId).eq('month', month);
  if (readError) throw readError;
  return [...existingBills.filter((bill) => bill.month !== month), ...(data || [])];
}
