/** Whole-euro display for charity totals: 2_450_000 cents -> "€24,500". No Intl (Hermes-safe). */
export function formatEuro(cents: number): string {
  const euros = Math.floor(cents / 100);
  const grouped = euros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `€${grouped}`;
}
