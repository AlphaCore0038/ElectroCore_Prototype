export function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}
