import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FoodProduct } from '../model/food-product.model';
import { CreateFoodProductRequest } from '../model/create-food-product.request';
import { UpdateFoodProductRequest } from '../model/update-food-product.request';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FoodProductsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/food-products`;

  readFoodProducts(name?: string) {
    let params = new HttpParams();
    if (name?.trim()) {
      params = params.set('name', name.trim());
    }

    return this.http.get<FoodProduct[]>(this.baseUrl, { params });
  }

  readFoodProduct(foodProductId: number) {
    return this.http.get<FoodProduct>(`${this.baseUrl}/${foodProductId}`);
  }

  createFoodProduct(payload: CreateFoodProductRequest) {
    return this.http.post<FoodProduct>(this.baseUrl, payload);
  }

  updateFoodProduct(foodProductId: number, payload: UpdateFoodProductRequest) {
    return this.http.put<FoodProduct>(`${this.baseUrl}/${foodProductId}`, payload);
  }

  deleteFoodProduct(foodProductId: number) {
    return this.http.delete<void>(`${this.baseUrl}/${foodProductId}`);
  }

  setFridgeStatus(foodProductId: number, inFridge: boolean, fridgeGrams?: number | null) {
    return this.http.patch<FoodProduct>(`${this.baseUrl}/${foodProductId}/fridge`, { inFridge, fridgeGrams });
  }
}
