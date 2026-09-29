export type TemplateNote = {
  label: string;
  // [light, deep] — drives the generated note image and admin swatches.
  colors: [string, string];
  // Strengths for the pct_0h, pct_1h, pct_2h, pct_6h, pct_12h stages.
  pcts: [number, number, number, number, number];
};

export type NoteTemplate = {
  id: string;
  name: string;
  description: string;
  stageLabels: [string, string, string, string, string];
  // Suggested theme-editor timeline labels (25/50/75/100% ticks).
  tickLabels: [string, string, string, string];
  notes: TemplateNote[];
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "fragrance",
    name: "Fragrance",
    description:
      "A classic eau de parfum pyramid: bright citrus and spice top notes flash off first, florals carry the heart, and woods, vanilla and amber dominate the dry-down.",
    stageLabels: ["Opening", "1 hour", "2 hours", "6 hours", "12 hours"],
    tickLabels: ["1H", "2H", "6H", "12H"],
    notes: [
      { label: "Bergamot", colors: ["#E8D44D", "#7E9A2E"], pcts: [90, 60, 25, 5, 0] },
      { label: "Pink Pepper", colors: ["#E88A9B", "#8E2C3E"], pcts: [70, 45, 20, 5, 0] },
      { label: "Lavender", colors: ["#C3AEE0", "#5E4390"], pcts: [45, 70, 55, 25, 10] },
      { label: "Rose", colors: ["#F4B3C2", "#A82450"], pcts: [30, 65, 70, 40, 15] },
      { label: "Jasmine", colors: ["#FBF6E4", "#D9BC68"], pcts: [25, 60, 70, 35, 15] },
      { label: "Sandalwood", colors: ["#DDBA92", "#7E5030"], pcts: [5, 15, 35, 70, 75] },
      { label: "Vanilla", colors: ["#F6E7C8", "#B8864A"], pcts: [5, 15, 30, 65, 80] },
      { label: "Amber", colors: ["#F2B055", "#8A3E0C"], pcts: [5, 10, 30, 70, 85] },
    ],
  },
  {
    id: "coffee",
    name: "Coffee",
    description:
      "Built on the SCA Coffee Taster's Flavor Wheel: florals and citrus acidity lead the aroma and first sip, sweetness builds mid-palate, and cocoa and roast carry the finish.",
    stageLabels: ["Aroma", "First sip", "Mid-palate", "Finish", "Aftertaste"],
    tickLabels: ["First sip", "Body", "Finish", "Aftertaste"],
    notes: [
      { label: "Jasmine", colors: ["#FBF6E4", "#D9BC68"], pcts: [80, 50, 25, 10, 5] },
      { label: "Lemon", colors: ["#FFF3A0", "#D9A700"], pcts: [55, 80, 40, 15, 5] },
      { label: "Blueberry", colors: ["#8C9EE0", "#2A2463"], pcts: [40, 65, 55, 25, 10] },
      { label: "Brown Sugar", colors: ["#E0AA72", "#7E4E22"], pcts: [20, 45, 65, 50, 30] },
      { label: "Hazelnut", colors: ["#D0AC84", "#634225"], pcts: [10, 25, 50, 55, 45] },
      { label: "Dark Chocolate", colors: ["#8A5A40", "#24120A"], pcts: [10, 20, 45, 70, 70] },
      { label: "Roasted", colors: ["#9A7658", "#30221A"], pcts: [15, 15, 30, 55, 65] },
    ],
  },
  {
    id: "wine",
    name: "Wine",
    description:
      "A full-bodied red, using families from the Wine Aroma Wheel: dark fruit and violet on the nose, pepper on the attack, then oak, vanilla and tobacco through a long finish.",
    stageLabels: ["Nose", "Attack", "Mid-palate", "Finish", "Length"],
    tickLabels: ["Attack", "Mid-palate", "Finish", "Length"],
    notes: [
      { label: "Blackcurrant", colors: ["#6A3470", "#180820"], pcts: [70, 65, 50, 30, 15] },
      { label: "Cherry", colors: ["#DE4058", "#620C1A"], pcts: [65, 70, 45, 20, 10] },
      { label: "Plum", colors: ["#9A5898", "#34143A"], pcts: [40, 55, 60, 35, 15] },
      { label: "Violet", colors: ["#B39BDB", "#4C3280"], pcts: [55, 35, 20, 10, 5] },
      { label: "Black Pepper", colors: ["#7A7A7A", "#181818"], pcts: [25, 40, 50, 30, 15] },
      { label: "Vanilla", colors: ["#F6E7C8", "#B8864A"], pcts: [20, 30, 40, 45, 35] },
      { label: "Oak", colors: ["#BA9064", "#54341A"], pcts: [15, 25, 40, 60, 55] },
      { label: "Tobacco", colors: ["#A47648", "#422812"], pcts: [10, 15, 30, 55, 65] },
    ],
  },
  {
    id: "cosmetics",
    name: "Cosmetics",
    description:
      "A hydrating face serum's key ingredients over a day of wear: water-based actives work first, while barrier-building lipids and ceramides keep working for hours.",
    stageLabels: ["Application", "1 hour", "2 hours", "6 hours", "12 hours"],
    tickLabels: ["1H", "2H", "6H", "12H"],
    notes: [
      { label: "Hyaluronic Acid", colors: ["#DDF3FB", "#5DA8CC"], pcts: [90, 70, 45, 20, 10] },
      { label: "Aloe Vera", colors: ["#D0EAAA", "#4E8A2E"], pcts: [80, 55, 30, 10, 5] },
      { label: "Vitamin C", colors: ["#FFD98A", "#E47A10"], pcts: [60, 70, 55, 30, 15] },
      { label: "Niacinamide", colors: ["#F6F6F6", "#9EACB6"], pcts: [30, 45, 55, 55, 45] },
      { label: "Squalane", colors: ["#F6F2DA", "#BCAF68"], pcts: [50, 55, 45, 30, 20] },
      { label: "Ceramides", colors: ["#FCE8DE", "#CC9278"], pcts: [20, 35, 50, 65, 70] },
      { label: "Shea Butter", colors: ["#F7EAD0", "#BE9858"], pcts: [40, 50, 50, 55, 50] },
      { label: "Rosehip Oil", colors: ["#F6AC7C", "#A83C14"], pcts: [35, 45, 45, 40, 30] },
    ],
  },
  {
    id: "tea",
    name: "Tea",
    description:
      "An oolong brewed gongfu-style across several steeps: grassy and floral notes open, honey and stone fruit peak in the middle steeps, and mineral and woody depth carry the late steeps.",
    stageLabels: ["Dry leaf", "1st steep", "2nd steep", "3rd steep", "Late steeps"],
    tickLabels: ["Steep 1", "Steep 2", "Steep 3", "Steep 4+"],
    notes: [
      { label: "Orchid", colors: ["#F6DEF0", "#A8589A"], pcts: [70, 80, 60, 35, 15] },
      { label: "Fresh Grass", colors: ["#C2E09A", "#426C22"], pcts: [50, 60, 35, 15, 5] },
      { label: "Honey", colors: ["#F9D272", "#B07614"], pcts: [30, 45, 65, 50, 25] },
      { label: "Apricot", colors: ["#FCC08A", "#CC5E16"], pcts: [20, 40, 60, 45, 20] },
      { label: "Toasted Rice", colors: ["#E6C89A", "#8C5E2C"], pcts: [45, 30, 40, 50, 40] },
      { label: "Mineral", colors: ["#CCD2D8", "#5E6872"], pcts: [10, 20, 35, 55, 70] },
      { label: "Woody", colors: ["#AA8462", "#442E1C"], pcts: [15, 15, 25, 45, 60] },
    ],
  },
  {
    id: "whiskey",
    name: "Whiskey & Spirits",
    description:
      "A sherry- and bourbon-cask single malt with a touch of peat: honey, vanilla and citrus on the nose, then dried fruit and spice, and a long finish of oak and smoke.",
    stageLabels: ["Nose", "Palate", "Development", "Finish", "Long finish"],
    tickLabels: ["Palate", "Development", "Finish", "Long finish"],
    notes: [
      { label: "Honey", colors: ["#F9D272", "#B07614"], pcts: [70, 60, 40, 20, 10] },
      { label: "Vanilla", colors: ["#F6E7C8", "#B8864A"], pcts: [60, 55, 45, 30, 15] },
      { label: "Orange Peel", colors: ["#FFBE6A", "#D46412"], pcts: [55, 45, 25, 10, 5] },
      { label: "Dried Fruit", colors: ["#AA5656", "#401418"], pcts: [40, 55, 60, 40, 20] },
      { label: "Baking Spice", colors: ["#D8965A", "#6E340E"], pcts: [25, 45, 60, 45, 25] },
      { label: "Toffee", colors: ["#D29658", "#623610"], pcts: [30, 40, 55, 50, 35] },
      { label: "Oak", colors: ["#BA9064", "#54341A"], pcts: [20, 30, 45, 65, 60] },
      { label: "Peat Smoke", colors: ["#9AA0A6", "#262A2E"], pcts: [35, 40, 50, 65, 75] },
    ],
  },
  {
    id: "chocolate",
    name: "Chocolate",
    description:
      "A single-origin dark chocolate tasted as it melts: red fruit and citrus brighten the first melt, caramel and nuts round out the middle, and earthy cocoa lingers.",
    stageLabels: ["Aroma", "First melt", "Mid-melt", "Finish", "Aftertaste"],
    tickLabels: ["First melt", "Mid-melt", "Finish", "Aftertaste"],
    notes: [
      { label: "Cocoa", colors: ["#8A5A40", "#24120A"], pcts: [70, 60, 60, 55, 45] },
      { label: "Red Berry", colors: ["#E86078", "#7A1028"], pcts: [45, 65, 50, 25, 10] },
      { label: "Citrus", colors: ["#FFD87A", "#D98410"], pcts: [35, 55, 35, 15, 5] },
      { label: "Floral", colors: ["#F6DEF0", "#A8589A"], pcts: [50, 40, 25, 10, 5] },
      { label: "Caramel", colors: ["#E6AE66", "#8A4E16"], pcts: [15, 35, 60, 50, 30] },
      { label: "Roasted Nut", colors: ["#D0AC84", "#634225"], pcts: [15, 25, 45, 55, 45] },
      { label: "Earthy", colors: ["#9A846E", "#362A1E"], pcts: [10, 15, 30, 50, 60] },
      { label: "Vanilla", colors: ["#F6E7C8", "#B8864A"], pcts: [20, 30, 40, 40, 35] },
    ],
  },
];

export function findTemplate(id: unknown): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}
