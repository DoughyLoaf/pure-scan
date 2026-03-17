export interface WaterBrand {
  name: string;
  source: string;
  type: 'Spring' | 'Purified' | 'Glacier' | 'Artesian' | 'Alkaline' | 'Volcanic';
  ph: number;
  tds_mg_per_liter: number;
  minerals: {
    calcium: number;
    magnesium: number;
    potassium: number;
    sodium: number;
    silica?: number;
  };
  filtration: string;
  pfas_tested: boolean;
  microplastics_tested: boolean;
  notable_fact: string;
  report_url?: string;
}

export const WATER_DATABASE: Record<string, WaterBrand> = {
  // ── PREMIUM NATURAL ──────────────────────────────────────────────
  'fiji': {
    name: 'FIJI Water',
    source: 'Natural artesian aquifer, Viti Levu, Fiji Islands',
    type: 'Artesian',
    ph: 7.7,
    tds_mg_per_liter: 132,
    minerals: { calcium: 18, magnesium: 15, potassium: 5, sodium: 18, silica: 93 },
    filtration: 'Natural volcanic rock filtration. Nothing added or removed.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Filters through volcanic rock for decades before reaching the aquifer. Untouched until you open the cap — but a 2024 FTC recall flagged elevated manganese in some batches, and a 2025 lawsuit challenges its "natural artesian" marketing due to detected microplastics.',
    report_url: 'https://www.fijiwater.com/water-quality',
  },
  'evian': {
    name: 'Evian',
    source: 'Cachat Spring, French Alps, France',
    type: 'Spring',
    ph: 7.2,
    tds_mg_per_liter: 345,
    minerals: { calcium: 80, magnesium: 26, potassium: 1, sodium: 6 },
    filtration: 'Natural 15-year glacial sand filtration. Nothing added or removed.',
    pfas_tested: true,
    microplastics_tested: false,
    notable_fact: 'Takes 15 years to filter through glacial sand in the Northern Alps. One of the oldest premium water brands, founded 1826. At 80 mg/L of calcium, it has one of the highest natural calcium levels of any major brand.',
    report_url: 'https://www.evian.com/en_us/water-quality-reports/',
  },
  'icelandic glacial': {
    name: 'Icelandic Glacial',
    source: 'Ölfus Spring, Iceland — one of the world\'s largest natural springs',
    type: 'Spring',
    ph: 8.4,
    tds_mg_per_liter: 62,
    minerals: { calcium: 6, magnesium: 2, potassium: 1, sodium: 11 },
    filtration: 'Natural filtration through ancient volcanic lava rock. Nothing added or removed. NSF, FDA, and WHO certified.',
    pfas_tested: true,
    microplastics_tested: true,
    notable_fact: 'Certified free of PFAS, microplastics, and forever chemicals — one of very few brands to publicly confirm this. The Ölfus Spring produces over 900,000 cubic meters per day; Icelandic Glacial bottles less than 0.1% of the overflow.',
    report_url: 'https://icelandicglacial.com/pages/our-water',
  },
  'waiakea': {
    name: 'Waiākea',
    source: 'Mauna Loa Volcano snowmelt and rainfall, Hawaii, USA',
    type: 'Volcanic',
    ph: 7.9,
    tds_mg_per_liter: 118,
    minerals: { calcium: 19, magnesium: 8, potassium: 2, sodium: 11, silica: 38 },
    filtration: 'Natural filtration through 14,000 feet of porous volcanic lava rock. Nothing added or removed.',
    pfas_tested: true,
    microplastics_tested: false,
    notable_fact: 'Certified CarbonNeutral, uses 100% recycled PET bottles, and bottles less than 0.003% of its aquifer\'s 393 million gallon daily yield. One of the most sustainable water brands in the world.',
    report_url: 'https://waiakea.com/pages/water-quality',
  },
  'mountain valley': {
    name: 'Mountain Valley Spring Water',
    source: 'Ouachita Mountains natural spring, Hot Springs, Arkansas — bottled at same source since 1871',
    type: 'Spring',
    ph: 7.5,
    tds_mg_per_liter: 220,
    minerals: { calcium: 67, magnesium: 7, potassium: 1, sodium: 0 },
    filtration: 'Natural 3,500-year filtration through granite-based aquifers and quartz, limestone, and Ordovician marble. Ozonated for safety. Nothing added.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'America\'s most award-winning spring water and completely sodium-free — one of the only major brands with zero sodium. Bottled at the same spring since 1871 and available in glass bottles, eliminating microplastic leaching risk.',
    report_url: 'https://www.mountainvalleyspring.com/water-quality-report',
  },
  'acqua panna': {
    name: 'Acqua Panna',
    source: 'Panna Estate, Apennine Mountains, Tuscany, Italy',
    type: 'Spring',
    ph: 8.0,
    tds_mg_per_liter: 188,
    minerals: { calcium: 31, magnesium: 6, potassium: 2, sodium: 7 },
    filtration: 'Natural 14-year underground filtration through Tuscan sandstone. Nothing added or removed.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The still water of choice in many of the world\'s top-rated restaurants. The spring was owned by the Medici family in the 1500s. Its soft velvety texture comes from passing through sandstone rather than calcium-heavy limestone.',
    report_url: 'https://www.acquapanna.com/us/water-quality',
  },
  'liquid death': {
    name: 'Liquid Death',
    source: 'Natural mountain spring, Austrian Alps',
    type: 'Spring',
    ph: 8.1,
    tds_mg_per_liter: 170,
    minerals: { calcium: 22, magnesium: 8, potassium: 3, sodium: 10 },
    filtration: 'Natural alpine rock filtration. Nothing added or removed.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Despite the death-metal branding, the water quality is genuinely solid — naturally alkaline Austrian alpine spring water with good mineral content. Packaged in infinitely recyclable aluminum cans, making it one of the more sustainable choices.',
    report_url: 'https://www.liquiddeath.com/pages/water-quality',
  },
  'proud source': {
    name: 'Proud Source Water',
    source: 'Mackay Springs, Custer County, Idaho & Waddell Springs, Jackson County, Florida',
    type: 'Spring',
    ph: 8.1,
    tds_mg_per_liter: 160,
    minerals: { calcium: 46, magnesium: 4, potassium: 1, sodium: 5, silica: 10 },
    filtration: 'Natural filtration through ancient volcanic rock (Idaho) and limestone (Florida). Nothing added or removed.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Certified B Corporation. Packaged in 100% infinitely recyclable aluminum with a BPA-free liner. Pledges to never take more than 5% of its spring\'s daily output — one of the most responsible sourcing commitments of any bottled water brand.',
    report_url: 'https://proudsourcewater.com/pages/faq',
  },
  'volvic': {
    name: 'Volvic',
    source: 'Clairvic Spring, Parc Naturel Regional des Volcans d\'Auvergne, France',
    type: 'Spring',
    ph: 7.0,
    tds_mg_per_liter: 130,
    minerals: { calcium: 12, magnesium: 8, potassium: 6, sodium: 12, silica: 32 },
    filtration: 'Natural filtration through six distinct layers of volcanic rock in a protected French nature reserve.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Filtered through six layers of volcanic rock in one of France\'s most protected natural parks. The volcanic geology gives it a naturally neutral pH and a distinctive light, clean taste.',
    report_url: 'https://www.volvic.co.uk/our-water',
  },

  // ── ENHANCED / PURIFIED ───────────────────────────────────────────
  'smartwater': {
    name: 'Smartwater',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Purified',
    ph: 6.7,
    tds_mg_per_liter: 25,
    minerals: { calcium: 2, magnesium: 1, potassium: 3, sodium: 5 },
    filtration: 'Vapor distillation mimicking the natural water cycle. Electrolytes added for taste: calcium chloride, magnesium chloride, potassium bicarbonate.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by Coca-Cola. Despite the "smart" branding, it starts as municipal tap water. Distillation strips all natural minerals before electrolytes are re-added in a controlled blend. Mildly acidic at pH 6.7.',
    report_url: 'https://www.glaceau.com/smartwater/quality-report',
  },
  'dasani': {
    name: 'Dasani',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Purified',
    ph: 6.1,
    tds_mg_per_liter: 28,
    minerals: { calcium: 2, magnesium: 1, potassium: 2, sodium: 6 },
    filtration: 'Reverse osmosis purification. Minerals added back: magnesium sulfate, potassium chloride, and sodium chloride (salt).',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by Coca-Cola. Dasani uniquely adds salt (sodium chloride) back to its water after reverse osmosis — no other major brand does this. One of the most acidic mainstream waters at pH 6.1.',
    report_url: 'https://www.dasani.com/water-quality',
  },
  'aquafina': {
    name: 'Aquafina',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Purified',
    ph: 6.0,
    tds_mg_per_liter: 2,
    minerals: { calcium: 0, magnesium: 0, potassium: 0, sodium: 0 },
    filtration: 'Purified through PepsiCo\'s proprietary 7-step HydRO-7 process including reverse osmosis. No minerals added back.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by PepsiCo. With a TDS of just 2 mg/L, Aquafina contains virtually zero minerals. Among the most acidic major brands at pH 6.0. Essentially mineral-free purified tap water with no nutritional contribution from minerals.',
  },
  'essentia': {
    name: 'Essentia Water',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Alkaline',
    ph: 9.5,
    tds_mg_per_liter: 70,
    minerals: { calcium: 2, magnesium: 1, potassium: 3, sodium: 8 },
    filtration: 'Three-stage purification: microfiltration, activated carbon, reverse osmosis. Then electrolytic ionization and alkaline electrolytes added (potassium bicarbonate, sodium bicarbonate, magnesium sulfate, calcium chloride).',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The only bottled water cited in the Physician\'s Desk Reference after a 2014 clinical study. Its pH 9.5 is artificially achieved via ionization — critics call it "baking soda water" since sodium bicarbonate is the alkalizing agent. Starts as municipal tap water.',
    report_url: 'https://essentiawater.com/quality-report',
  },
  'core': {
    name: 'CORE Hydration',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Purified',
    ph: 7.4,
    tds_mg_per_liter: 63,
    minerals: { calcium: 3, magnesium: 2, potassium: 3, sodium: 5 },
    filtration: 'Reverse osmosis purification. Electrolytes and minerals added to engineer pH 7.4 — matching the body\'s natural blood pH.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Engineered to precisely match the body\'s natural pH of 7.4. Like most "enhanced" waters, it starts as purified municipal water with a controlled mineral blend added. The pH match to human blood is the marketing hook.',
  },
  'nestle pure life': {
    name: 'Nestlé Pure Life',
    source: 'Municipal water or protected well (varies by bottling location)',
    type: 'Purified',
    ph: 7.3,
    tds_mg_per_liter: 35,
    minerals: { calcium: 10, magnesium: 3, potassium: 1, sodium: 5 },
    filtration: 'Multi-barrier purification including reverse osmosis and/or distillation. Minerals added back for taste.',
    pfas_tested: true,
    microplastics_tested: false,
    notable_fact: 'The best-selling bottled water in the US by volume. A 2022 third-party study found Nestlé Pure Life contained significantly more microplastics than other brands. Owned by BlueTriton (formerly Nestlé Waters North America).',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },

  // ── MAINSTREAM SPRING ─────────────────────────────────────────────
  'poland spring': {
    name: 'Poland Spring',
    source: 'Multiple natural springs across Maine, USA (Poland Spring, Garden Spring, Evergreen Spring, and others)',
    type: 'Spring',
    ph: 7.2,
    tds_mg_per_liter: 74,
    minerals: { calcium: 8, magnesium: 2, potassium: 1, sodium: 4 },
    filtration: 'Natural spring filtration. Screened for contaminants while retaining natural mineral profile.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'One of America\'s oldest water brands, dating to 1845. Sources from up to 10 different Maine springs — meaning the exact mineral profile can vary bottle to bottle. Owned by BlueTriton Brands.',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },
  'deer park': {
    name: 'Deer Park',
    source: 'Multiple natural springs across PA, NJ, MD, FL, SC, NY, and ME',
    type: 'Spring',
    ph: 7.5,
    tds_mg_per_liter: 50,
    minerals: { calcium: 7, magnesium: 2, potassium: 1, sodium: 5 },
    filtration: 'Natural spring filtration. Thorough contaminant screening while retaining natural minerals.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Originally from a single famous spring in Deer Park, Maryland that attracted four US Presidents. Now sourced from dozens of springs ranging from Maine to Florida — TDS and mineral content vary significantly by source location.',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },
  'zephyrhills': {
    name: 'Zephyrhills',
    source: 'Multiple natural springs in Florida (3 spring sources)',
    type: 'Spring',
    ph: 7.7,
    tds_mg_per_liter: 118,
    minerals: { calcium: 22, magnesium: 4, potassium: 2, sodium: 8 },
    filtration: 'Natural Florida spring filtration. Minimal processing to retain natural mineral profile.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Florida\'s most popular regional spring water. One reviewer flagged elevated nitrates (up to 2.1 mg/L) in some sources, potentially from agricultural runoff — still within EPA limits but worth noting. Owned by BlueTriton Brands.',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },
  'ice mountain': {
    name: 'Ice Mountain',
    source: 'Multiple natural springs in Michigan and other Midwestern states',
    type: 'Spring',
    ph: 7.4,
    tds_mg_per_liter: 68,
    minerals: { calcium: 10, magnesium: 3, potassium: 1, sodium: 4 },
    filtration: 'Natural spring filtration. Screened for contaminants while retaining spring mineral profile.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The dominant spring water brand in the Midwest. Has been at the center of the Great Lakes water rights controversy — local towns and environmental groups have opposed pumping operations near the headwaters of the White River in Michigan. Owned by BlueTriton.',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },
  'arrowhead': {
    name: 'Arrowhead',
    source: 'Multiple springs across California, Colorado, and other Western US states',
    type: 'Spring',
    ph: 7.5,
    tds_mg_per_liter: 115,
    minerals: { calcium: 14, magnesium: 4, potassium: 2, sodium: 10 },
    filtration: 'Natural spring filtration with ozonation for purification.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The dominant bottled water brand in the Western US. Uses "and/or" sourcing language — the exact spring used for any given bottle may vary. Has faced California drought scrutiny over its use of permits tied to a 1865 water rights claim.',
    report_url: 'https://bluetriton.com/water-quality-reports',
  },
  'crystal geyser': {
    name: 'Crystal Geyser',
    source: 'Multiple US spring sources including Olancha, CA and Benton, TN',
    type: 'Spring',
    ph: 6.9,
    tds_mg_per_liter: 95,
    minerals: { calcium: 12, magnesium: 4, potassium: 2, sodium: 8 },
    filtration: 'Proprietary double disinfection process. Natural spring filtration with ozone treatment.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'One of the few major water brands still independently owned — not part of BlueTriton, Pepsi, or Coca-Cola. Uses a proprietary double disinfection process and bottles directly at the source for freshness. Slightly below neutral pH at 6.9.',
  },
  'poland spring origin': {
    name: 'Poland Spring Origin',
    source: 'Spruce Spring, Pierce Pond Township, Maine, USA',
    type: 'Spring',
    ph: 5.8,
    tds_mg_per_liter: 35,
    minerals: { calcium: 4, magnesium: 1, potassium: 1, sodium: 3 },
    filtration: 'Minimal filtration from a single spring source — unlike regular Poland Spring which blends multiple sources.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The premium single-source line from Poland Spring. Notably acidic at pH 5.8 for a spring water — one of the lowest pH values for any natural spring water on the market. Very low mineral content.',
  },

  // ── PREMIUM IMPORTED ──────────────────────────────────────────────
  'voss': {
    name: 'VOSS',
    source: 'Artesian source in Vatnestrøm, Southern Norway',
    type: 'Artesian',
    ph: 6.0,
    tds_mg_per_liter: 44,
    minerals: { calcium: 7, magnesium: 1, potassium: 1, sodium: 7 },
    filtration: 'Naturally filtered through layers of rock in a Norwegian artesian aquifer. Minimal processing.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Despite premium pricing and luxury positioning, VOSS is mildly acidic at pH 6.0 — one of the most acidic premium brands. Very low TDS means minimal mineral content. The Norwegian origin and distinctive cylindrical bottle are the main differentiators.',
  },

  // ── KIRKLAND / STORE BRAND ─────────────────────────────────────────
  'kirkland': {
    name: 'Kirkland Signature (Costco)',
    source: 'Municipal water (varies by region — Cedar River, CO reported as one source)',
    type: 'Purified',
    ph: 6.0,
    tds_mg_per_liter: 20,
    minerals: { calcium: 2, magnesium: 1, potassium: 1, sodium: 3 },
    filtration: 'Reverse osmosis purification with ozone and UV disinfection. Mineral blend added for taste.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Costco\'s private-label water is purified municipal water — essentially the same process as Aquafina or Dasani but sold at a fraction of the cost. Slightly acidic at pH 6.0. No fluoride added according to product labeling.',
  },

  // ── TRENDING / SUSTAINABLE ────────────────────────────────────────
  'lifewtr': {
    name: 'LIFEWTR',
    source: 'Municipal water sources (varies by bottling location)',
    type: 'Purified',
    ph: 6.9,
    tds_mg_per_liter: 29,
    minerals: { calcium: 1, magnesium: 1, potassium: 2, sodium: 5 },
    filtration: 'Reverse osmosis purification. Magnesium sulfate and potassium bicarbonate added for taste.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by PepsiCo. Despite being "advertised as pH balanced," independent testing found it below neutral at 6.4–6.9 — technically slightly acidic. The rotating artist-label packaging is purely cosmetic and has no effect on the water.',
  },
};

// ── Utility functions ─────────────────────────────────────────────

export function findWaterBrand(productName: string, brandName: string): WaterBrand | null {
  const searchStr = `${productName} ${brandName}`.toLowerCase();

  // Direct key match
  for (const [key, brand] of Object.entries(WATER_DATABASE)) {
    const keyWords = key.split(' ');
    if (keyWords.every(word => searchStr.includes(word))) {
      return brand;
    }
  }

  // Fuzzy match on brand name alone
  const brandLower = brandName.toLowerCase();
  for (const [key, brand] of Object.entries(WATER_DATABASE)) {
    if (brandLower.includes(key) || key.includes(brandLower)) {
      return brand;
    }
  }

  // Fuzzy match on product name alone
  const nameLower = productName.toLowerCase();
  for (const [key, brand] of Object.entries(WATER_DATABASE)) {
    if (nameLower.includes(key) || key.split(' ').some(w => nameLower.includes(w) && w.length > 4)) {
      return brand;
    }
  }

  return null;
}

export function isWaterProduct(productName: string, categories: string): boolean {
  const waterKeywords = ['water', 'agua', 'eau', 'wasser'];
  const waterCategories = [
    'en:waters', 'en:spring-waters', 'en:mineral-waters',
    'en:natural-mineral-waters', 'en:table-waters', 'en:drinking-waters',
    'en:bottled-waters', 'en:alkaline-waters', 'en:artesian-waters',
  ];

  const nameLower = productName.toLowerCase();
  const catLower = categories.toLowerCase();

  return waterKeywords.some(k => nameLower.includes(k)) ||
         waterCategories.some(c => catLower.includes(c));
}

export function getTopWaterBrands(count = 5): WaterBrand[] {
  const topKeys = ['icelandic glacial', 'waiakea', 'mountain valley', 'proud source', 'liquid death', 'fiji', 'evian'];
  return topKeys.slice(0, count).map(k => WATER_DATABASE[k]).filter(Boolean);
}
