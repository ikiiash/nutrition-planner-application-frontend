export type MealTypeEnum = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type EntryTypeEnum = 'MEAL' | 'FOOD_PRODUCT';

export interface PlanEntry {
  id: number;
  mealType: MealTypeEnum;
  entryType: EntryTypeEnum;
  mealId?: number;
  mealName?: string;
  portions?: number;
  foodProductId?: number;
  foodProductName?: string;
  grams?: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  price: number;
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

export interface PlanDay {
  id: number;
  dayNumber: number;
  date: string;
  entries: PlanEntry[];
  dailyCalories: number;
  dailyProtein: number;
  dailyFat: number;
  dailyCarbohydrates: number;
  dailyPrice: number;
  dailySodiumMg?: number | null;
  dailyPotassiumMg?: number | null;
  dailyMagnesiumMg?: number | null;
  dailyIronMg?: number | null;
  dailyCalciumMg?: number | null;
  dailyZincMg?: number | null;
  dailyVitaminAMcg?: number | null;
  dailyVitaminCMg?: number | null;
  dailyVitaminDMcg?: number | null;
  dailyVitaminEMg?: number | null;
  dailyVitaminKMcg?: number | null;
  dailyVitaminB1Mg?: number | null;
  dailyVitaminB2Mg?: number | null;
  dailyVitaminB6Mg?: number | null;
  dailyVitaminB9Mcg?: number | null;
  dailyVitaminB12Mcg?: number | null;
}

export interface MealPlan {
  id: number;
  name: string;
  startDate: string;
  numberOfDays: number;
  days: PlanDay[];
  isActive?: boolean;
  activatedAt?: string | null;
  lastDeductedDayNumber?: number;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalPrice: number;
  totalSodiumMg?: number | null;
  totalPotassiumMg?: number | null;
  totalMagnesiumMg?: number | null;
  totalIronMg?: number | null;
  totalCalciumMg?: number | null;
  totalZincMg?: number | null;
  totalVitaminAMcg?: number | null;
  totalVitaminCMg?: number | null;
  totalVitaminDMcg?: number | null;
  totalVitaminEMg?: number | null;
  totalVitaminKMcg?: number | null;
  totalVitaminB1Mg?: number | null;
  totalVitaminB2Mg?: number | null;
  totalVitaminB6Mg?: number | null;
  totalVitaminB9Mcg?: number | null;
  totalVitaminB12Mcg?: number | null;
}
