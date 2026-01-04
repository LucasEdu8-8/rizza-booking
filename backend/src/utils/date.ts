export function parseDateInput(dateStr: string): Date | null {
  const s = (dateStr ?? "").trim();
  if (!s) return null;

  let y: number;
  let m: number;
  let d: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split("-").map(Number);
    [y, m, d] = parts;
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const parts = s.split("-").map(Number);
    [d, m, y] = parts;
  } else {
    return null;
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }

  return date;
}
