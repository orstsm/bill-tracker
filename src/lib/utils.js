export function getCurrentMonthStr() {
  const d = new Date();
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function getNextMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function sortMonthsDescending(monthsArray) {
  return monthsArray.sort((a, b) => {
    let da = a.match(/\d{4}/) ? a : a + " " + new Date().getFullYear();
    let db = b.match(/\d{4}/) ? b : b + " " + new Date().getFullYear();
    return new Date(db) - new Date(da);
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
