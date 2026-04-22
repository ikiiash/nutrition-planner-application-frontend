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
}
