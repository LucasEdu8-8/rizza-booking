export function buildSlots(): string[] {
  const slots: string[] = [];
  let h = 8;
  let m = 0;

  // 08:00 -> 17:30 inclusive, 30-min steps
  while (h < 18 || (h === 17 && m <= 30)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m === 60) {
      m = 0;
      h += 1;
    }
  }
  return slots;
}
