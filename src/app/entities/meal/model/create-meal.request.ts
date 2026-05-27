export interface MealIngredientRequest {
  foodProductId: number;
  grams: number;
}

export interface CreateMealRequest {
  name: string;
  servings: number;
  ingredients: MealIngredientRequest[];
}
