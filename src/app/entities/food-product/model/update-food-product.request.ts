export interface UpdateFoodProductRequest {
  name: string;
  category: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  price: number;
  photoUrl?: string | null;
  sodiumMg?: number | null;
  potassiumMg?: number | null;
  magnesiumMg?: number | null;
  ironMg?: number | null;
  calciumMg?: number | null;
  zincMg?: number | null;
  vitaminAMcg?: number | null;
  vitaminCMg?: number | null;
  vitaminDMcg?: number | null;
  vitaminEMg?: number | null;
  vitaminKMcg?: number | null;
  vitaminB1Mg?: number | null;
  vitaminB2Mg?: number | null;
  vitaminB6Mg?: number | null;
  vitaminB9Mcg?: number | null;
  vitaminB12Mcg?: number | null;
}
