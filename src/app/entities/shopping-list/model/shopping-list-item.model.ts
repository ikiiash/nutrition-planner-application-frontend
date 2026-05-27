export interface ShoppingListItem {
  id: number;
  foodProductId: number;
  foodProductName: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  pricePer100g: number;
}

export interface SaveShoppingListItemRequest {
  foodProductId: number;
  foodProductName: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  pricePer100g: number;
}
