/** Parse package section selection rules like "Any One", "Any Two", "Any 4", "All", "Complimentary" */
const WORD_COUNTS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export function parseSelection(rule: string): number {
  const s = (rule || "").trim();
  if (!s) return 1;
  if (/^all$/i.test(s)) return 999;
  if (/complimentary/i.test(s)) return 0;

  const digit = s.match(/any\s+(\d+)/i);
  if (digit) return parseInt(digit[1], 10);

  const word = s.match(/any\s+([a-z]+)/i);
  if (word) {
    const n = WORD_COUNTS[word[1].toLowerCase()];
    if (n) return n;
  }

  return 1;
}

export function selectionLimitLabel(rule: string, selected: number, dishCount: number): string {
  const max = Math.min(parseSelection(rule), dishCount || 1);
  if (parseSelection(rule) === 999) return `All included (${dishCount})`;
  if (parseSelection(rule) === 0) return "Complimentary";
  return `${rule} (${selected}/${max})`;
}

export function isSectionComplete(rule: string, selectedCount: number, dishCount: number): boolean {
  const max = parseSelection(rule);
  if (max === 0 || max === 999) return true; // complimentary / all — always "done"
  return selectedCount >= Math.min(max, dishCount || 1);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
