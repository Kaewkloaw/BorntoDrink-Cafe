export type Badge = "New" | "Popular" | "Season";

export type CupStyle = "iced" | "hot" | "frappe" | "pastry";

export interface Product {
  id: string;
  name: string;
  /** short English description */
  desc: string;
  category: CategoryId;
  price: number; // THB
  badge?: Badge;
  /** colours for the illustrated cup: [top layer, bottom layer] */
  colors: [string, string];
  style: CupStyle;
  cream?: boolean;
}

export const CATEGORIES = [
  { id: "coldbrew", label: "Cold Brew" },
  { id: "latte", label: "Lattes" },
  { id: "espresso", label: "Espresso" },
  { id: "tea", label: "Teas" },
  { id: "noncoffee", label: "Non-Coffee" },
  { id: "bakery", label: "Bakery" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const PRODUCTS: Product[] = [
  // Cold brew
  { id: "cb-classic", name: "Cold Brew", desc: "Smooth and bold", category: "coldbrew", price: 65, colors: ["#3b1d0f", "#2a140a"], style: "iced" },
  { id: "cb-salted", name: "Salted Caramel Cold Brew", desc: "Salted caramel foam", category: "coldbrew", price: 85, badge: "New", colors: ["#f3e3cc", "#3b1d0f"], style: "iced", cream: true },
  { id: "cb-vanilla", name: "Vanilla Cold Brew", desc: "Sweet vanilla cream", category: "coldbrew", price: 80, badge: "Popular", colors: ["#e9d2b0", "#4a2513"], style: "iced" },
  { id: "cb-orange", name: "Orange Cold Brew", desc: "Cold brew, tonic, orange", category: "coldbrew", price: 85, badge: "Season", colors: ["#d54c15", "#3b1d0f"], style: "iced" },
  { id: "cb-coconut", name: "Coconut Cold Brew", desc: "Coconut milk", category: "coldbrew", price: 80, colors: ["#fbf3e6", "#5a2e17"], style: "iced" },

  // Lattes
  { id: "lt-caffe", name: "Latte", desc: "Espresso and steamed milk", category: "latte", price: 60, badge: "Popular", colors: ["#f6e6cf", "#b07a4f"], style: "hot" },
  { id: "lt-iced", name: "Iced Latte", desc: "Espresso and cold milk", category: "latte", price: 65, colors: ["#e8cfae", "#a0683f"], style: "iced" },
  { id: "lt-pumpkin", name: "Pumpkin Latte", desc: "Pumpkin spice, cream", category: "latte", price: 85, badge: "Season", colors: ["#f9e8d4", "#d98b4a"], style: "iced", cream: true },
  { id: "lt-honey", name: "Honey Oat Latte", desc: "Oat milk and honey", category: "latte", price: 75, badge: "New", colors: ["#f2d9a6", "#b98352"], style: "hot" },
  { id: "lt-caramel", name: "Caramel Macchiato", desc: "Vanilla, espresso, caramel", category: "latte", price: 75, colors: ["#f5e1c0", "#c58b55"], style: "iced" },

  // Espresso
  { id: "es-americano", name: "Americano", desc: "Espresso and hot water", category: "espresso", price: 50, colors: ["#3b1d0f", "#2a140a"], style: "hot" },
  { id: "es-iced-americano", name: "Iced Americano", desc: "Espresso over ice", category: "espresso", price: 55, badge: "Popular", colors: ["#2f170b", "#1f0e06"], style: "iced" },
  { id: "es-flatwhite", name: "Flat White", desc: "Espresso, silky milk", category: "espresso", price: 65, colors: ["#e9cfa9", "#8a5a34"], style: "hot" },
  { id: "es-mocha", name: "Mocha", desc: "Chocolate and espresso", category: "espresso", price: 70, colors: ["#663924", "#3b1d0f"], style: "frappe", cream: true },

  // Tea
  { id: "tea-thai", name: "Thai Milk Tea", desc: "Sweet and creamy", category: "tea", price: 55, badge: "Popular", colors: ["#f0a35e", "#d54c15"], style: "iced" },
  { id: "tea-matcha", name: "Matcha Latte", desc: "Green tea and milk", category: "tea", price: 75, colors: ["#e6efd2", "#7d9a4a"], style: "iced" },
  { id: "tea-butterfly", name: "Blue Lemonade", desc: "Butterfly pea and lemon", category: "tea", price: 60, badge: "New", colors: ["#c7a4e0", "#5468b8"], style: "iced" },
  { id: "tea-peach", name: "Peach Tea", desc: "Oolong and peach", category: "tea", price: 65, colors: ["#f7c59f", "#e09162"], style: "iced" },

  // Non-coffee
  { id: "nc-choco", name: "Chocolate", desc: "Rich cocoa, cream", category: "noncoffee", price: 60, badge: "Popular", colors: ["#7a4429", "#4b2414"], style: "frappe", cream: true },
  { id: "nc-strawberry", name: "Strawberry Milk", desc: "Fresh strawberry", category: "noncoffee", price: 60, colors: ["#fbd3e0", "#e86a92"], style: "iced" },
  { id: "nc-sky", name: "Blue Soda", desc: "Sparkling and lime", category: "noncoffee", price: 55, badge: "Season", colors: ["#d9ecf3", "#8db6c7"], style: "iced" },
  { id: "nc-mango", name: "Mango Smoothie", desc: "Mango and yogurt", category: "noncoffee", price: 70, colors: ["#ffd76a", "#f5a524"], style: "frappe" },

  // Bakery
  { id: "bk-croissant", name: "Croissant", desc: "Buttery, baked daily", category: "bakery", price: 55, badge: "Popular", colors: ["#e8a75a", "#b8732e"], style: "pastry" },
  { id: "bk-muffin", name: "Blueberry Muffin", desc: "Blueberries, crumble top", category: "bakery", price: 50, colors: ["#d9a35f", "#5468b8"], style: "pastry" },
  { id: "bk-cake", name: "Strawberry Cake", desc: "Soft cake, cream", category: "bakery", price: 85, badge: "New", colors: ["#fbf3e6", "#e0405a"], style: "pastry" },
  { id: "bk-pancake", name: "Pancakes", desc: "Honey butter", category: "bakery", price: 75, colors: ["#e7b26a", "#f5a524"], style: "pastry" },
];

export const PRODUCT_MAP = new Map(PRODUCTS.map((p) => [p.id, p]));

/** Grand opening: 10% off the entire order when it contains a drink and a bakery item. */
export function calculatePromotion(lines: { productId: string; qty: number; price?: number }[]) {
  let subtotal = 0;
  let hasDrink = false;
  let hasBakery = false;
  for (const line of lines) {
    const product = PRODUCT_MAP.get(line.productId);
    if (!product || !Number.isFinite(line.qty) || line.qty <= 0) continue;
    subtotal += (line.price ?? product.price) * line.qty;
    if (product.category === "bakery") hasBakery = true;
    else hasDrink = true;
  }
  const discount = hasDrink && hasBakery ? Math.round(subtotal * 10) / 100 : 0;
  return { subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}

export const formatTHB = (n: number) =>
  `฿${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
