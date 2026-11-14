import { PRODUCT_MAP, type Product } from "./products";

/**
 * Product options (modifiers), kept as data so the checkout page and the server use the same rules.
 *
 * - A GROUP is a question: "Sweetness", "Ice", "Milk", "Extras".
 *   select "one"  = choose exactly one (a default is always selected)
 *   select "many" = choose any, up to `max`
 * - A CHOICE can add to the price (`price`, THB, default 0).
 * - Which groups a product gets is decided in `groupsFor()` — edit the lists there to change the menu.
 *
 * A selection is stored as "<group>:<choice>" ids, and only choices that differ from the default are kept,
 * so staff only see what the customer actually changed.
 */

export interface OptionChoice {
  id: string;
  label: string;
  /** extra THB for this choice (default 0) */
  price?: number;
}

export interface OptionGroup {
  id: string;
  label: string;
  select: "one" | "many";
  /** for "one": the choice that applies when the customer doesn't change anything */
  default?: string;
  /** for "many": most choices allowed */
  max?: number;
  choices: OptionChoice[];
}

export const GROUPS: Record<string, OptionGroup> = {
  sweetness: {
    id: "sweetness",
    label: "Sweetness",
    select: "one",
    default: "normal",
    choices: [
      { id: "normal", label: "Normal" },
      { id: "less", label: "Less sweet" },
      { id: "half", label: "Half sweet" },
      { id: "none", label: "No sugar" },
    ],
  },
  ice: {
    id: "ice",
    label: "Ice",
    select: "one",
    default: "normal",
    choices: [
      { id: "normal", label: "Normal ice" },
      { id: "less", label: "Less ice" },
      { id: "none", label: "No ice" },
    ],
  },
  milk: {
    id: "milk",
    label: "Milk",
    select: "one",
    default: "regular",
    choices: [
      { id: "regular", label: "Regular milk" },
      { id: "oat", label: "Oat milk" }, // set a price here to charge for it, e.g. { price: 10 }
    ],
  },
  extras: {
    id: "extras",
    label: "Extras",
    select: "many",
    max: 2,
    choices: [{ id: "shot", label: "Extra shot" }],
  },
  serving: {
    id: "serving",
    label: "Serving",
    select: "one",
    default: "asis",
    choices: [
      { id: "asis", label: "As is" },
      { id: "warm", label: "Warm it up" },
    ],
  },
};

const SWEET_COLD_BREWS = new Set(["cb-salted", "cb-vanilla", "cb-orange", "cb-coconut"]);
const MILKY = new Set(["es-flatwhite", "es-mocha", "tea-matcha", "tea-thai", "nc-choco", "nc-strawberry"]);

/** Which option groups apply to a product. */
export function groupsFor(p: Product): OptionGroup[] {
  if (p.category === "bakery") return [GROUPS.serving];
  const ids: string[] = [];
  const sweet = ["latte", "tea", "noncoffee"].includes(p.category) || SWEET_COLD_BREWS.has(p.id);
  if (sweet && p.id !== "nc-sky") ids.push("sweetness");
  if (p.style === "iced" || p.style === "frappe") ids.push("ice");
  if (p.category === "latte" || MILKY.has(p.id)) ids.push("milk");
  if (p.category === "latte" || p.category === "espresso") ids.push("extras");
  return ids.map((id) => GROUPS[id]);
}

export const optionId = (group: string, choice: string) => `${group}:${choice}`;

/** The choice currently selected in a single-choice group (explicit pick, else the default). */
export function selectedIn(group: OptionGroup, ids: string[]): string[] {
  const mine = ids.filter((i) => i.startsWith(group.id + ":")).map((i) => i.slice(group.id.length + 1));
  if (group.select === "one") return [mine[0] ?? group.default!];
  return mine;
}

/** Tap a choice: returns the new list of explicit (non-default) ids. */
export function toggleChoice(group: OptionGroup, ids: string[], choiceId: string): string[] {
  const rest = ids.filter((i) => !i.startsWith(group.id + ":"));
  const mine = ids.filter((i) => i.startsWith(group.id + ":"));
  const id = optionId(group.id, choiceId);
  if (group.select === "one") return choiceId === group.default ? rest : [...rest, id];
  if (mine.includes(id)) return [...rest, ...mine.filter((i) => i !== id)];
  if (mine.length >= (group.max ?? Infinity)) return ids; // at the limit
  return [...rest, ...mine, id];
}

export type OptionResult = { ok: true; labels: string[]; extra: number; ids: string[] } | { ok: false; error: string };

/** Check a selection against the product's rules, and work out its labels and price. */
export function resolveOptions(productId: string, ids: unknown): OptionResult {
  const product = PRODUCT_MAP.get(productId);
  if (!product) return { ok: false, error: "Unknown product." };
  if (ids === undefined || ids === null) return { ok: true, labels: [], extra: 0, ids: [] };
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) return { ok: false, error: "Invalid options." };

  const groups = groupsFor(product);
  const clean: string[] = [];
  const labels: string[] = [];
  let extra = 0;
  for (const group of groups) {
    const mine = [...new Set((ids as string[]).filter((i) => i.startsWith(group.id + ":")))];
    if (group.select === "one" && mine.length > 1) return { ok: false, error: `Choose one ${group.label.toLowerCase()}.` };
    if (group.select === "many" && mine.length > (group.max ?? Infinity)) return { ok: false, error: `Too many ${group.label.toLowerCase()}.` };
    for (const id of mine) {
      const choice = group.choices.find((c) => group.id + ":" + c.id === id);
      if (!choice) return { ok: false, error: "Invalid option." };
      if (group.select === "one" && choice.id === group.default) continue; // default = nothing to tell staff
      clean.push(id);
      labels.push(choice.label);
      extra += choice.price ?? 0;
    }
  }
  // anything that matched no group of this product is invalid
  const known = new Set((ids as string[]).filter((i) => groups.some((g) => i.startsWith(g.id + ":"))));
  if (known.size !== new Set(ids as string[]).size) return { ok: false, error: "That option isn't available for this item." };
  return { ok: true, labels, extra, ids: clean };
}

/** Plain-English summary of the explicit choices, e.g. "Less sweet, No ice". */
export function summarize(productId: string, ids: string[]): string {
  const r = resolveOptions(productId, ids);
  return r.ok ? r.labels.join(", ") : "";
}
