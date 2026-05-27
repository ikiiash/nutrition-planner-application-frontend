import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { AddPlanEntryRequest } from '../model/add-plan-entry.request';
import type { CreateMealPlanRequest } from '../model/create-meal-plan.request';
import type { MealPlan, PlanEntry } from '../model/meal-plan.model';
import type { UpdateMealPlanRequest } from '../model/update-meal-plan.request';

@Injectable({ providedIn: 'root' })
export class MealPlansApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/meal-plans`;

  readMealPlans(): Observable<MealPlan[]> {
    return this.http.get<MealPlan[]>(this.baseUrl);
  }

  createMealPlan(req: CreateMealPlanRequest): Observable<MealPlan> {
    return this.http.post<MealPlan>(this.baseUrl, req);
  }

  readMealPlan(id: number): Observable<MealPlan> {
    return this.http.get<MealPlan>(`${this.baseUrl}/${id}`);
  }

  updateMealPlan(id: number, req: UpdateMealPlanRequest): Observable<MealPlan> {
    return this.http.put<MealPlan>(`${this.baseUrl}/${id}`, req);
  }

  deleteMealPlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  activateMealPlan(id: number): Observable<MealPlan> {
    return this.http.put<MealPlan>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivateMealPlan(id: number): Observable<MealPlan> {
    return this.http.put<MealPlan>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  deductFridge(id: number): Observable<MealPlan> {
    return this.http.post<MealPlan>(`${this.baseUrl}/${id}/deduct-fridge`, {});
  }

  addPlanEntry(mealPlanId: number, dayId: number, req: AddPlanEntryRequest): Observable<PlanEntry> {
    return this.http.post<PlanEntry>(`${this.baseUrl}/${mealPlanId}/days/${dayId}/entries`, req);
  }

  removePlanEntry(mealPlanId: number, dayId: number, entryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${mealPlanId}/days/${dayId}/entries/${entryId}`);
  }
}
