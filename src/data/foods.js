// fodmap_grupa: 0=Fruktani, 1=Laktoza, 2=Fruktoza, 3=GOS, 4=Sorbitol, 5=Manitol, ili 'uvek_nisko'
export const FODMAP_GROUPS = [
  { name: 'Fruktani', primer: 'pšenica, luk, beli luk' },
  { name: 'Laktoza', primer: 'mleko, meki sirevi, sladoled' },
  { name: 'Fruktoza — višak', primer: 'med, jabuka, kruška, mango' },
  { name: 'GOS', primer: 'mahunarke, leblebije, sočivo' },
  { name: 'Sorbitol', primer: 'koštičavo voće, pečurke, karfiol' },
  { name: 'Manitol', primer: 'pečurke, karfiol, celer, grašak' },
];

export const CATEGORIES = ['Voće', 'Povrće', 'Žitarice', 'Mlečno', 'Mahunarke', 'Zaslađivači', 'Ostalo'];

export const seedFoods = [
  { id: 'f-psenicni-hleb', naziv: 'Pšenični hleb', kategorija: 'Žitarice', fodmap_grupa: 0, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-beli-luk', naziv: 'Beli luk', kategorija: 'Povrće', fodmap_grupa: 0, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-crni-luk', naziv: 'Crni luk', kategorija: 'Povrće', fodmap_grupa: 0, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-razeni-hleb', naziv: 'Raženi hleb', kategorija: 'Žitarice', fodmap_grupa: 0, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-griz-kus-kus', naziv: 'Griz / kuskus (pšenični)', kategorija: 'Žitarice', fodmap_grupa: 0, portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-kravlje-mleko', naziv: 'Kravlje mleko', kategorija: 'Mlečno', fodmap_grupa: 1, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-jogurt', naziv: 'Jogurt', kategorija: 'Mlečno', fodmap_grupa: 1, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-meki-sir', naziv: 'Meki sir (kravlji)', kategorija: 'Mlečno', fodmap_grupa: 1, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-sladoled', naziv: 'Sladoled (mlečni)', kategorija: 'Mlečno', fodmap_grupa: 1, portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-med', naziv: 'Med', kategorija: 'Zaslađivači', fodmap_grupa: 2, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-jabuka', naziv: 'Jabuka', kategorija: 'Voće', fodmap_grupa: 2, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-kruska', naziv: 'Kruška', kategorija: 'Voće', fodmap_grupa: 2, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-mango', naziv: 'Mango', kategorija: 'Voće', fodmap_grupa: 2, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-lubenica', naziv: 'Lubenica', kategorija: 'Voće', fodmap_grupa: 2, portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-leblebije', naziv: 'Leblebije', kategorija: 'Mahunarke', fodmap_grupa: 3, portion_safe: true, napomena_o_kolicini: '1/4 šolje je uglavnom u redu i tokom eliminacije', custom: false },
  { id: 'f-socivo', naziv: 'Sočivo', kategorija: 'Mahunarke', fodmap_grupa: 3, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-pasulj', naziv: 'Pasulj', kategorija: 'Mahunarke', fodmap_grupa: 3, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-slanutak-konzerva', naziv: 'Slanutak iz konzerve, ceđen', kategorija: 'Mahunarke', fodmap_grupa: 3, portion_safe: true, napomena_o_kolicini: '1/2 šolje, ceđen i ispran, uglavnom je u redu', custom: false },

  { id: 'f-kajsija', naziv: 'Kajsija', kategorija: 'Voće', fodmap_grupa: 4, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-sljiva', naziv: 'Šljiva', kategorija: 'Voće', fodmap_grupa: 4, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-breskva', naziv: 'Breskva', kategorija: 'Voće', fodmap_grupa: 4, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-avokado', naziv: 'Avokado', kategorija: 'Voće', fodmap_grupa: 4, portion_safe: true, napomena_o_kolicini: 'do 1/8 ploda je uglavnom u redu', custom: false },

  { id: 'f-pecurke', naziv: 'Pečurke', kategorija: 'Povrće', fodmap_grupa: 5, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-karfiol', naziv: 'Karfiol', kategorija: 'Povrće', fodmap_grupa: 5, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-celer', naziv: 'Celer', kategorija: 'Povrće', fodmap_grupa: 5, portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-grasak', naziv: 'Grašak', kategorija: 'Povrće', fodmap_grupa: 5, portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-banana', naziv: 'Banana (zrela)', kategorija: 'Voće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-jagode', naziv: 'Jagode', kategorija: 'Voće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-pomorandza', naziv: 'Pomorandža', kategorija: 'Voće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-grozdje', naziv: 'Grožđe', kategorija: 'Voće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-kivi', naziv: 'Kivi', kategorija: 'Voće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-sargarepa', naziv: 'Šargarepa', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-krastavac', naziv: 'Krastavac', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-paprika', naziv: 'Paprika', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-spanac', naziv: 'Spanać', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-krompir', naziv: 'Krompir', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-tikvica', naziv: 'Tikvica', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-paradajz', naziv: 'Paradajz', kategorija: 'Povrće', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-bezlaktozno-mleko', naziv: 'Bezlaktozno mleko', kategorija: 'Mlečno', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-tvrdi-sirevi', naziv: 'Tvrdi sirevi', kategorija: 'Mlečno', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-pirinac', naziv: 'Pirinač', kategorija: 'Žitarice', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-zob', naziv: 'Ovsene pahuljice', kategorija: 'Žitarice', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-heljda', naziv: 'Heljda', kategorija: 'Žitarice', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-bezglutenski-hleb', naziv: 'Bezglutenski hleb', kategorija: 'Žitarice', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },

  { id: 'f-jaja', naziv: 'Jaja', kategorija: 'Ostalo', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-pileci-batak', naziv: 'Piletina', kategorija: 'Ostalo', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-secer', naziv: 'Beli šećer', kategorija: 'Zaslađivači', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
  { id: 'f-javorov-sirup', naziv: 'Javorov sirup', kategorija: 'Zaslađivači', fodmap_grupa: 'uvek_nisko', portion_safe: false, napomena_o_kolicini: null, custom: false },
];
