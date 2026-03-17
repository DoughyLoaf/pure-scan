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
    notable_fact: 'Water filters through layers of volcanic rock for decades before reaching the artesian aquifer. Untouched by humans until you open the cap.',
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
    notable_fact: 'Takes 15 years to filter through layers of glacial sand in the Northern Alps before reaching the source. One of the oldest premium water brands, founded 1826.',
    report_url: 'https://www.evian.com/en_us/water-quality-reports/',
  },
  'volvic': {
    name: 'Volvic',
    source: 'Clairvic Spring, Parc Naturel Regional des Volcans d\'Auvergne, France',
    type: 'Spring',
    ph: 7.0,
    tds_mg_per_liter: 130,
    minerals: { calcium: 12, magnesium: 8, potassium: 6, sodium: 12, silica: 32 },
    filtration: 'Natural volcanic rock filtration through six layers of lava.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Filtered through six distinct layers of volcanic rock in a protected nature reserve in France. The volcanic geology gives it a naturally neutral pH.',
    report_url: 'https://www.volvic.co.uk/our-water',
  },
  'smartwater': {
    name: 'Smartwater',
    source: 'Municipal water sources (varies by location)',
    type: 'Purified',
    ph: 6.7,
    tds_mg_per_liter: 25,
    minerals: { calcium: 2, magnesium: 1, potassium: 3, sodium: 5 },
    filtration: 'Vapor distillation mimicking the hydrological cycle. Electrolytes added for taste: calcium chloride, magnesium chloride, potassium bicarbonate.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by Coca-Cola. Despite the "smart" branding, it starts as municipal tap water — the distillation process strips all natural minerals before electrolytes are re-added.',
    report_url: 'https://www.glaceau.com/smartwater/quality-report',
  },
  'dasani': {
    name: 'Dasani',
    source: 'Municipal water sources (varies by location)',
    type: 'Purified',
    ph: 6.1,
    tds_mg_per_liter: 28,
    minerals: { calcium: 2, magnesium: 1, potassium: 2, sodium: 6 },
    filtration: 'Reverse osmosis purification. Minerals added back: magnesium sulfate, potassium chloride, and sodium chloride (salt).',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by Coca-Cola. Dasani notably adds salt (sodium chloride) to its water after reverse osmosis — something no other major brand does. The acidic pH has drawn criticism from health advocates.',
    report_url: 'https://www.dasani.com/water-quality',
  },
  'aquafina': {
    name: 'Aquafina',
    source: 'Municipal water sources (varies by location)',
    type: 'Purified',
    ph: 6.0,
    tds_mg_per_liter: 2,
    minerals: { calcium: 0, magnesium: 0, potassium: 0, sodium: 0 },
    filtration: 'Purified through PurAqua 7-step HydRO-7 process including reverse osmosis. No minerals added back.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Owned by PepsiCo. With a TDS of just 2 mg/L, Aquafina has virtually zero mineral content — making it essentially mineral-free purified water. One of the most acidic major brands at pH 6.0.',
  },
  'poland spring': {
    name: 'Poland Spring',
    source: 'Multiple natural springs in Maine, USA',
    type: 'Spring',
    ph: 7.2,
    tds_mg_per_liter: 82,
    minerals: { calcium: 8, magnesium: 2, potassium: 1, sodium: 4 },
    filtration: 'Natural spring filtration. Screened for contaminants while retaining natural minerals.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'One of the oldest bottled water brands in the US, dating to 1845. Sources include Poland Spring, Garden Spring, Evergreen Spring, and others across Maine.',
    report_url: 'https://www.polandspring.com/water-quality',
  },
  'essentia': {
    name: 'Essentia Water',
    source: 'Municipal water sources (varies by location)',
    type: 'Alkaline',
    ph: 9.5,
    tds_mg_per_liter: 70,
    minerals: { calcium: 2, magnesium: 1, potassium: 3, sodium: 8 },
    filtration: 'Three-stage purification: microfiltration, activated carbon, reverse osmosis. Then ionization and electrolytes (potassium bicarbonate, sodium bicarbonate, magnesium sulfate, calcium chloride) added.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The only bottled water to be cited in the Physician\'s Desk Reference. Its pH 9.5 is artificially achieved through ionization — not naturally occurring alkalinity. Critics note it starts as municipal tap water.',
    report_url: 'https://essentiawater.com/quality-report',
  },
  'core': {
    name: 'CORE Hydration',
    source: 'Municipal water sources (varies by location)',
    type: 'Purified',
    ph: 7.4,
    tds_mg_per_liter: 63,
    minerals: { calcium: 3, magnesium: 2, potassium: 3, sodium: 5 },
    filtration: 'Reverse osmosis purification. Electrolytes and minerals added to achieve pH 7.4 — matching the natural pH of the human body.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Engineered to match the body\'s natural pH of 7.4. Like most "enhanced" waters, it starts as purified municipal water with minerals added back in a controlled blend.',
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
    notable_fact: 'Despite the aggressive branding, the water quality is genuinely good — natural Austrian alpine spring water with solid mineral content and alkaline pH. Packaged in infinitely recyclable aluminum cans.',
    report_url: 'https://www.liquiddeath.com/pages/water-quality',
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
    notable_fact: 'Certified free of PFAS, microplastics, and forever chemicals. The Ölfus Spring produces over 900,000 cubic meters of water per day — Icelandic Glacial bottles less than 0.1% of the overflow.',
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
    notable_fact: 'One of the most sustainable water brands — certified CarbonNeutral, uses 100% recycled PET bottles, and bottles less than 0.003% of the aquifer\'s daily sustainable yield of 393 million gallons.',
    report_url: 'https://waiakea.com/pages/water-quality',
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
    notable_fact: 'Owned by One Rock Capital Partners (formerly Nestlé). Sources water from multiple springs using "and/or" labeling — meaning the exact spring source may vary by production run.',
  },
  'crystal geyser': {
    name: 'Crystal Geyser',
    source: 'Multiple US spring sources including Olancha, CA and Benton, TN',
    type: 'Spring',
    ph: 6.9,
    tds_mg_per_liter: 95,
    minerals: { calcium: 12, magnesium: 4, potassium: 2, sodium: 8 },
    filtration: 'Double disinfection process. Natural spring filtration with ozone treatment.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'One of the few major brands still independently owned. Uses a proprietary double disinfection process and bottles directly at the source to maintain mineral content.',
  },
  'penta': {
    name: 'Penta',
    source: 'Municipal water source',
    type: 'Purified',
    ph: 5.5,
    tds_mg_per_liter: 0,
    minerals: { calcium: 0, magnesium: 0, potassium: 0, sodium: 0 },
    filtration: '13-hour purification process through a high-pressure spinning chamber. No minerals added.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Claims to be an antioxidant water but has one of the lowest pH levels (5.5) of any bottled water — making it mildly acidic. Zero mineral content means it adds nothing nutritionally to your diet.',
  },
  'voss': {
    name: 'VOSS',
    source: 'Artesian source in Vatnestrøm, Southern Norway',
    type: 'Artesian',
    ph: 6.0,
    tds_mg_per_liter: 44,
    minerals: { calcium: 7, magnesium: 1, potassium: 1, sodium: 7 },
    filtration: 'Naturally filtered through layers of rock in a pristine Norwegian aquifer. Minimal processing.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'Despite premium pricing and luxury positioning, VOSS has a surprisingly low pH of 6.0 — making it mildly acidic. Its very low TDS means minimal mineral content despite its prestigious source.',
  },
  'poland spring origin': {
    name: 'Poland Spring Origin',
    source: 'Spruce Spring, Poland, Maine, USA',
    type: 'Spring',
    ph: 5.8,
    tds_mg_per_liter: 35,
    minerals: { calcium: 4, magnesium: 1, potassium: 1, sodium: 3 },
    filtration: 'Light filtration preserving natural mineral profile from a single spring source.',
    pfas_tested: false,
    microplastics_tested: false,
    notable_fact: 'The "Origin" line sources from a single spring unlike regular Poland Spring. Notably acidic at pH 5.8 for a spring water — one of the more acidic natural spring waters available.',
  },
};

export function findWaterBrand(productName: string, brandName: string): WaterBrand | null {
  const searchStr = `${productName} ${brandName}`.toLowerCase();

  for (const [key, brand] of Object.entries(WATER_DATABASE)) {
    if (searchStr.includes(key) || key.split(' ').every(word => searchStr.includes(word))) {
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

  return null;
}

export function isWaterProduct(productName: string, categories: string): boolean {
  const waterKeywords = ['water', 'agua', 'eau', 'wasser'];
  const waterCategories = ['en:waters', 'en:spring-waters', 'en:mineral-waters',
    'en:natural-mineral-waters', 'en:table-waters', 'en:drinking-waters',
    'en:bottled-waters', 'en:alkaline-waters'];

  const nameLower = productName.toLowerCase();
  const catLower = categories.toLowerCase();

  return waterKeywords.some(k => nameLower.includes(k)) ||
         waterCategories.some(c => catLower.includes(c));
}
