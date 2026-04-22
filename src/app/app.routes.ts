import { Routes } from '@angular/router';
import { PageNotFound } from './core/component/page-not-found/page-not-found';
import { MealPlanPageComponent } from './pages/meal-plan-page/meal-plan-page.component';
import { FoodProductsPageComponent } from './pages/food-products-page/food-products-page.component';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { FinancesPageComponent } from './pages/finances-page/finances-page.component';
import { AiAssistantPageComponent } from './pages/ai-assistant-page/ai-assistant-page.component';
import { isPremiumUser } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'meal-plan', component: MealPlanPageComponent },
  { path: 'profile', component: ProfilePageComponent },
  { path: 'food-products', component: FoodProductsPageComponent },
  { path: 'finances', component: FinancesPageComponent },
  { path: 'ai-assistant', component: AiAssistantPageComponent, canActivate: [isPremiumUser] },
  { path: '', redirectTo: 'meal-plan', pathMatch: 'full' },
  { path: '**', component: PageNotFound },
];
