import type { EntryTypeEnum, MealTypeEnum } from './meal-plan.model';

export interface AddPlanEntryRequest {
  mealType: MealTypeEnum;
  entryType: EntryTypeEnum;
  mealId?: number | null;
  portions?: number | null;
  foodProductId?: number | null;
  grams?: number | null;
}
