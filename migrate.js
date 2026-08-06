import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node migrate.js <your-login-email> <your-login-password>");
  process.exit(1);
}

const email = args[0];
const password = args[1];

function parseCSVLine(text) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

async function run() {
  console.log("Authenticating as", email, "...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log("Authenticated! User ID:", userId);

  // 1. Migrate Recurring Bills
  const recurringCsvPath = '/Users/orestes/Downloads/Bill Tracker - RecurringBills.csv';
  if (fs.existsSync(recurringCsvPath)) {
    console.log("Migrating Recurring Bills...");
    const lines = fs.readFileSync(recurringCsvPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    const headers = parseCSVLine(lines[0]);
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 2) continue;
      
      const biller = cols[1];
      if (!biller) continue;

      const { error } = await supabase.from('recurring_bills').insert({
        biller: biller,
        statement_date: cols[3] || null,
        due_date: cols[4] || null,
        channel: cols[6] || null,
        user_id: userId
      });

      if (error) console.error(`Error inserting ${biller}:`, error.message);
    }
    console.log("Recurring Bills migrated!");
  } else {
    console.log("No RecurringBills.csv found, skipping.");
  }

  // 2. Migrate Bills & Withdrawals
  const billsCsvPath = '/Users/orestes/Downloads/Bill Tracker - Bills.csv';
  if (fs.existsSync(billsCsvPath)) {
    console.log("Migrating Bills & Withdrawals...");
    const lines = fs.readFileSync(billsCsvPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 2) continue;
      
      const biller = cols[1];
      if (!biller) continue;

      const month = cols[2];
      const statementDate = cols[3] || null;
      const dueDate = cols[4] || null;
      let amountStr = cols[5] || '0';
      amountStr = amountStr.replace(/,/g, ''); // remove commas like "41,479.90"
      const amount = parseFloat(amountStr) || 0;
      const status = cols[6] || 'Unpaid';
      const paidDateRaw = cols[7] || null;
      const channel = cols[8] || null;
      const isFinal = cols[9] === 'TRUE';
      const finalDateRaw = cols[10] || null;

      if (biller.toLowerCase() === 'withdrew') {
        const { error } = await supabase.from('withdrawals').insert({
          month: month,
          amount: amount,
          reason: channel || 'Cash', // v1 stores reason in channel for withdrawals
          date: paidDateRaw ? new Date(paidDateRaw).toISOString() : new Date().toISOString(),
          user_id: userId
        });
        if (error) console.error(`Error inserting withdrawal ${month}:`, error.message);
      } else {
        const { error } = await supabase.from('bills').insert({
          biller: biller,
          month: month,
          statement_date: statementDate,
          due_date: dueDate,
          amount: amount,
          status: status,
          paid_date: paidDateRaw ? new Date(paidDateRaw).toISOString() : null,
          channel: channel,
          is_final: isFinal,
          final_date: finalDateRaw ? new Date(finalDateRaw).toISOString() : null,
          user_id: userId
        });
        if (error) console.error(`Error inserting bill ${biller} for ${month}:`, error.message);
      }
    }
    console.log("Bills & Withdrawals migrated!");
  } else {
    console.log("No Bills.csv found, skipping.");
  }

  console.log("Migration complete!");
}

run();
