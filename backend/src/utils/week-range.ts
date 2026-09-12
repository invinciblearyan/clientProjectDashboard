/** Monday 00:00:00.000 through Sunday 23:59:59.999 in the server local timezone. */
export function getCurrentWeekRange(referenceDate = new Date()): { start: Date; end: Date } {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
