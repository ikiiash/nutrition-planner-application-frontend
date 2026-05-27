export interface NutrientNorms {
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  ironMg: number;
  calciumMg: number;
  zincMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminEMg: number;
  vitaminKMcg: number;
  vitaminB1Mg: number;
  vitaminB2Mg: number;
  vitaminB6Mg: number;
  vitaminB9Mcg: number;
  vitaminB12Mcg: number;
}

export const MALE_NORMS: NutrientNorms = {
  sodiumMg: 1500,
  potassiumMg: 3500,
  magnesiumMg: 400,
  ironMg: 8,
  calciumMg: 1000,
  zincMg: 11,
  vitaminAMcg: 900,
  vitaminCMg: 90,
  vitaminDMcg: 15,
  vitaminEMg: 15,
  vitaminKMcg: 120,
  vitaminB1Mg: 1.2,
  vitaminB2Mg: 1.3,
  vitaminB6Mg: 1.3,
  vitaminB9Mcg: 400,
  vitaminB12Mcg: 2.4,
};

export const FEMALE_NORMS: NutrientNorms = {
  sodiumMg: 1500,
  potassiumMg: 3500,
  magnesiumMg: 310,
  ironMg: 18,
  calciumMg: 1000,
  zincMg: 11,
  vitaminAMcg: 700,
  vitaminCMg: 75,
  vitaminDMcg: 15,
  vitaminEMg: 15,
  vitaminKMcg: 90,
  vitaminB1Mg: 1.1,
  vitaminB2Mg: 1.1,
  vitaminB6Mg: 1.3,
  vitaminB9Mcg: 400,
  vitaminB12Mcg: 2.4,
};

export const NUTRIENT_LABELS: Record<keyof NutrientNorms, { label: string; unit: string }> = {
  sodiumMg:     { label: 'Na (Sodium)',      unit: 'mg' },
  potassiumMg:  { label: 'K (Potassium)',    unit: 'mg' },
  magnesiumMg:  { label: 'Mg (Magnesium)',   unit: 'mg' },
  ironMg:       { label: 'Fe (Iron)',        unit: 'mg' },
  calciumMg:    { label: 'Ca (Calcium)',     unit: 'mg' },
  zincMg:       { label: 'Zn (Zinc)',        unit: 'mg' },
  vitaminAMcg:  { label: 'Vit A',            unit: 'mcg' },
  vitaminCMg:   { label: 'Vit C',            unit: 'mg' },
  vitaminDMcg:  { label: 'Vit D',            unit: 'mcg' },
  vitaminEMg:   { label: 'Vit E',            unit: 'mg' },
  vitaminKMcg:  { label: 'Vit K',            unit: 'mcg' },
  vitaminB1Mg:  { label: 'B1 (Thiamine)',    unit: 'mg' },
  vitaminB2Mg:  { label: 'B2 (Riboflavin)',  unit: 'mg' },
  vitaminB6Mg:  { label: 'B6',               unit: 'mg' },
  vitaminB9Mcg: { label: 'B9 (Folate)',      unit: 'mcg' },
  vitaminB12Mcg:{ label: 'B12',              unit: 'mcg' },
};
