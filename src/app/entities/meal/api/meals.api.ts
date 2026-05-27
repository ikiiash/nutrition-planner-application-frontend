import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Meal } from '../model/meal.model';
import { CreateMealRequest } from '../model/create-meal.request';
import { UpdateMealRequest } from '../model/update-meal.request';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MealsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/meals`;

  readMeals() {
    return this.http.get<Meal[]>(this.baseUrl);
  }

  readMeal(mealId: number) {
    return this.http.get<Meal>(`${this.baseUrl}/${mealId}`);
  }

  createMeal(payload: CreateMealRequest) {
    return this.http.post<Meal>(this.baseUrl, payload);
  }

  updateMeal(mealId: number, payload: UpdateMealRequest) {
    return this.http.put<Meal>(`${this.baseUrl}/${mealId}`, payload);
  }

  deleteMeal(mealId: number) {
    return this.http.delete<void>(`${this.baseUrl}/${mealId}`);
  }
}
