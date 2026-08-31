export function getCurrentMonthStr() {
  const d = new Date();
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function getNextMonthStr() {
  const d = new Date();
  d.setDate(1); // Set to 1st to prevent overflow on months with 31 days
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function sortMonthsDescending(monthsArray) {
  const monthOrder = { 'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5, 'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11 };
  return monthsArray.sort((a, b) => {
    let [mA, yA] = a.split(' ');
    let [mB, yB] = b.split(' ');
    yA = parseInt(yA) || new Date().getFullYear();
    yB = parseInt(yB) || new Date().getFullYear();
    
    if (yA !== yB) return yB - yA;
    return monthOrder[mB] - monthOrder[mA];
  });
}

// Logic: due dates like "12 - Current", "5 - Next"
export function parseDueDateLogic(str, billMonthStr) {
  if (!str || String(str).toLowerCase().includes("any")) return null;
  
  let match = String(str).match(/\d+/);
  if (!match) return null;
  
  let day = parseInt(match[0]);
  
  let baseDate = new Date(billMonthStr);
  if (isNaN(baseDate.getTime())) baseDate = new Date();
  
  let month = baseDate.getMonth();
  let year = baseDate.getFullYear();

  const lowerStr = String(str).toLowerCase();
  if (lowerStr.includes("next") || lowerStr.includes("following")) {
    month++;
    if (month > 11) { month = 0; year++; }
  }

  const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
  if (day > maxDaysInMonth) day = maxDaysInMonth;

  return new Date(year, month, day);
}

export function withTimeout(promise, ms = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function getMondaysUntilNextFifth() {
  const now = new Date();
  
  // Find the next 5th of the month
  let nextPayday = new Date(now.getFullYear(), now.getMonth(), 5);
  // If today is past the 5th, the next payday is the 5th of the NEXT month.
  // Wait, if today IS the 5th, maybe we don't count it. Let's say if it's strictly > 5th or >= 5th?
  // Usually if today is the 5th, you get paid today. 
  if (now.getDate() >= 5) {
    nextPayday = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  }

  let count = 0;
  let current = new Date(now);
  current.setHours(0, 0, 0, 0);

  // Count Mondays (where getDay() === 1)
  while (current <= nextPayday) {
    if (current.getDay() === 1) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
