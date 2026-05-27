import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountUpDirective } from '../../shared/count-up.directive';
import { FoodProductsApi } from '../../entities/food-product/api/food-products.api';
import type { FoodProduct } from '../../entities/food-product/model/food-product.model';
import { MealPlansApi } from '../../entities/meal-plan/api/meal-plans.api';
import type { MealPlan } from '../../entities/meal-plan/model/meal-plan.model';
import { MealsApi } from '../../entities/meal/api/meals.api';
import type { Meal } from '../../entities/meal/model/meal.model';
import { ShoppingListApi } from '../../entities/shopping-list/api/shopping-list.api';
import type { ShoppingListItem } from '../../entities/shopping-list/model/shopping-list-item.model';

type RawItem = {
  id: number; name: string; grams: number;
  cal100: number; p100: number; f100: number; c100: number; pr100: number;
};

@Component({
  selector: 'app-finances-page',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, CountUpDirective],
  templateUrl: './finances-page.component.html',
})
export class FinancesPageComponent {
  private readonly mealPlansApi = inject(MealPlansApi);
  private readonly mealsApi = inject(MealsApi);
  private readonly foodProductsApi = inject(FoodProductsApi);
  private readonly shoppingListApi = inject(ShoppingListApi);
  private readonly fb = inject(FormBuilder);

  protected readonly activeTab = signal<'shopping' | 'fridge' | 'summary'>('shopping');
  protected readonly addTab = signal<'product' | 'meal' | 'plan'>('product');

  // ── Value analysis ────────────────────────────────────────────────────────────
  protected readonly compareSource = signal<'products' | 'meals' | 'plans'>('products');
  protected readonly compareMetric = signal<'kcal' | 'protein' | 'fat' | 'carbs'>('kcal');

  protected readonly compareMetricPillLeft = computed(() => {
    const m: Record<string, string> = {
      kcal: '2px', protein: 'calc(25% + 2px)', fat: 'calc(50% + 2px)', carbs: 'calc(75% + 2px)',
    };
    return m[this.compareMetric()];
  });

  protected readonly compareSourcePillLeft = computed(() => {
    const m: Record<string, string> = {
      products: '2px', meals: 'calc(33.33% + 2px)', plans: 'calc(66.67% + 2px)',
    };
    return m[this.compareSource()];
  });

  protected readonly rankedItems = computed(() => {
    const metric = this.compareMetric();
    const source = this.compareSource();

    const rows: Array<{ name: string; tag: string | null; price: number; kcal: number; protein: number; fat: number; carbs: number }> = [];

    if (source === 'products') {
      for (const p of this.foodProducts()) {
        if (p.price <= 0 || p.grams <= 0) continue;
        rows.push({ name: p.name, tag: p.category || null, price: p.price / p.grams * 100,
          kcal: p.calories, protein: p.protein, fat: p.fat, carbs: p.carbohydrates });
      }
    } else if (source === 'meals') {
      for (const m of this.meals()) {
        if ((m.pricePerServing ?? 0) <= 0) continue;
        rows.push({ name: m.name, tag: `${m.servings} srv`, price: m.pricePerServing,
          kcal: m.caloriesPerServing, protein: m.proteinPerServing, fat: m.fatPerServing, carbs: m.carbohydratesPerServing });
      }
    } else {
      for (const p of this.plans()) {
        if (p.totalPrice <= 0 || p.numberOfDays <= 0) continue;
        const d = p.numberOfDays;
        rows.push({ name: p.name, tag: `${d}d`, price: p.totalPrice / d,
          kcal: p.totalCalories / d, protein: p.totalProtein / d, fat: p.totalFat / d, carbs: p.totalCarbohydrates / d });
      }
    }

    const val = (r: typeof rows[0]) =>
      r.price > 0 ? (metric === 'kcal' ? r.kcal : metric === 'protein' ? r.protein : metric === 'fat' ? r.fat : r.carbs) / r.price : 0;

    const enriched = rows.map(r => ({ ...r, valuePerEuro: val(r) }))
      .filter(r => r.valuePerEuro > 0)
      .sort((a, b) => b.valuePerEuro - a.valuePerEuro)
      .slice(0, 10);

    const maxVal = enriched[0]?.valuePerEuro ?? 1;
    return enriched.map((r, i) => ({ ...r, rank: i + 1, barPct: (r.valuePerEuro / maxVal) * 100 }));
  });

  protected readonly microLeaders = computed(() => {
    const products = this.foodProducts().filter(p => p.price > 0 && p.grams > 0);
    const defs: Array<{ label: string; unit: string; extract: (p: FoodProduct) => number | null | undefined }> = [
      { label: 'Calcium',   unit: 'mg',  extract: p => p.calciumMg },
      { label: 'Iron',      unit: 'mg',  extract: p => p.ironMg },
      { label: 'Potassium', unit: 'mg',  extract: p => p.potassiumMg },
      { label: 'Magnesium', unit: 'mg',  extract: p => p.magnesiumMg },
      { label: 'Zinc',      unit: 'mg',  extract: p => p.zincMg },
      { label: 'Vitamin C', unit: 'mg',  extract: p => p.vitaminCMg },
      { label: 'Vitamin D', unit: 'mcg', extract: p => p.vitaminDMcg },
      { label: 'Vitamin A', unit: 'mcg', extract: p => p.vitaminAMcg },
      { label: 'B12',       unit: 'mcg', extract: p => p.vitaminB12Mcg },
    ];
    return defs
      .map(def => {
        const list = products
          .map(p => { const v = def.extract(p); return v != null && v > 0 ? { name: p.name, per100g: +v.toFixed(2), perEuro: v * p.grams / 100 / p.price } : null; })
          .filter((x): x is { name: string; per100g: number; perEuro: number } => x !== null)
          .sort((a, b) => b.perEuro - a.perEuro);
        return list.length ? { label: def.label, unit: def.unit, best: list[0], count: list.length } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  protected readonly plans = signal<MealPlan[]>([]);
  protected readonly meals = signal<Meal[]>([]);
  protected readonly foodProducts = signal<FoodProduct[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal('');

  // ── Shopping list (backend-persisted) ─────────────────────────────────────────
  protected readonly cart = signal<ShoppingListItem[]>([]);
  protected readonly isCartLoading = signal(false);

  protected readonly cartTotals = computed(() => {
    const items = this.cart();
    const sum = (fn: (i: ShoppingListItem) => number) => items.reduce((s, i) => s + fn(i), 0);
    return {
      calories: sum((i) => (i.grams * i.caloriesPer100g) / 100),
      protein:  sum((i) => (i.grams * i.proteinPer100g) / 100),
      fat:      sum((i) => (i.grams * i.fatPer100g) / 100),
      carbs:    sum((i) => (i.grams * i.carbsPer100g) / 100),
      price:    sum((i) => (i.grams * i.pricePer100g) / 100),
      itemCount: items.length,
    };
  });

  // ── Fridge (uses in_fridge flag from food products) ───────────────────────────
  protected readonly fridge = computed(() => this.foodProducts().filter(p => p.inFridge));
  protected readonly notInFridgeProducts = computed(() => this.foodProducts().filter(p => !p.inFridge));

  protected readonly fridgeNutrition = computed(() =>
    this.fridge().reduce(
      (acc, p) => {
        const g = (p.fridgeGrams ?? 0) / 100;
        return {
          calories: acc.calories + p.calories * g,
          protein:  acc.protein  + p.protein * g,
          fat:      acc.fat      + p.fat * g,
          carbs:    acc.carbs    + p.carbohydrates * g,
        };
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    ),
  );

  // ── Add-to-cart forms ─────────────────────────────────────────────────────────
  protected readonly addProductForm = this.fb.nonNullable.group({
    foodProductId: [null as number | null, Validators.required],
    grams: [100, [Validators.required, Validators.min(0.1)]],
    considerFridge: [false],
  });

  protected readonly addMealForm = this.fb.nonNullable.group({
    mealId: [null as number | null, Validators.required],
    portions: [1, [Validators.required, Validators.min(0.1)]],
    considerFridge: [false],
  });

  protected readonly addPlanForm = this.fb.nonNullable.group({
    planId: [null as number | null, Validators.required],
    considerFridge: [false],
  });

  protected readonly addFridgeForm = this.fb.nonNullable.group({
    foodProductId: [null as number | null, Validators.required],
    fridgeGrams: [100, [Validators.required, Validators.min(0.1)]],
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  protected readonly planSummaries = computed(() => {
    const plans = this.plans();
    if (plans.length === 0) return [];
    const maxCal = Math.max(...plans.map((p) => p.totalCalories), 1);
    const maxPrice = Math.max(...plans.map((p) => p.totalPrice), 1);
    return plans.map((plan) => {
      const calE = plan.totalProtein * 4;
      const fatE = plan.totalFat * 9;
      const cE = plan.totalCarbohydrates * 4;
      const totalE = calE + fatE + cE || 1;
      return {
        plan,
        caloriePct: (plan.totalCalories / maxCal) * 100,
        pricePct: (plan.totalPrice / maxPrice) * 100,
        proteinEPct: (calE / totalE) * 100,
        fatEPct: (fatE / totalE) * 100,
        carbsEPct: (cE / totalE) * 100,
        calPerDay: plan.numberOfDays > 0 ? plan.totalCalories / plan.numberOfDays : 0,
        pricePerDay: plan.numberOfDays > 0 ? plan.totalPrice / plan.numberOfDays : 0,
      };
    });
  });

  protected readonly summaryStats = computed(() => {
    const plans = this.plans();
    const totalSpent = plans.reduce((s, p) => s + p.totalPrice, 0);
    const totalKcal = plans.reduce((s, p) => s + p.totalCalories, 0);
    const totalDays = plans.reduce((s, p) => s + p.numberOfDays, 0);
    return {
      totalSpent,
      totalKcal,
      avgKcalDay: totalDays > 0 ? Math.round(totalKcal / totalDays) : 0,
    };
  });

  constructor() {
    this.isLoading.set(true);
    this.mealPlansApi.readMealPlans().subscribe({
      next: (plans) => { this.plans.set(plans); this.isLoading.set(false); },
      error: () => { this.error.set('Unable to load meal plans.'); this.isLoading.set(false); },
    });
    this.mealsApi.readMeals().subscribe({ next: (m) => this.meals.set(m), error: () => {} });
    this.foodProductsApi.readFoodProducts().subscribe({ next: (fp) => this.foodProducts.set(fp), error: () => {} });
    this.loadShoppingList();
  }

  protected setTab(tab: 'shopping' | 'fridge' | 'summary') {
    this.activeTab.set(tab);
  }

  protected setAddTab(tab: 'product' | 'meal' | 'plan') {
    this.addTab.set(tab);
  }

  // ── Shopping list CRUD (backend) ──────────────────────────────────────────────
  protected loadShoppingList() {
    this.isCartLoading.set(true);
    this.shoppingListApi.readAll().subscribe({
      next: (items) => { this.cart.set(items); this.isCartLoading.set(false); },
      error: () => this.isCartLoading.set(false),
    });
  }

  protected addProductToCart() {
    const { foodProductId, grams, considerFridge } = this.addProductForm.getRawValue();
    if (!foodProductId || grams <= 0) return;
    const p = this.foodProducts().find((fp) => fp.id === Number(foodProductId));
    if (!p || p.grams <= 0) return;
    this.mergeIntoCart(
      [{ id: p.id, name: p.name, grams,
         cal100: p.calories, p100: p.protein, f100: p.fat, c100: p.carbohydrates,
         pr100: p.price / p.grams * 100 }],
      considerFridge,
    );
    this.addProductForm.patchValue({ grams: 100 });
  }

  protected addMealToCart() {
    const { mealId, portions, considerFridge } = this.addMealForm.getRawValue();
    if (!mealId || portions <= 0) return;
    const meal = this.meals().find((m) => m.id === Number(mealId));
    if (!meal || meal.servings <= 0) return;
    const ratio = portions / meal.servings;
    const raws: RawItem[] = meal.ingredients.map((ing) => {
      const b = ing.grams > 0 ? 100 / ing.grams : 0;
      return {
        id: ing.foodProductId, name: ing.foodProductName, grams: ing.grams * ratio,
        cal100: ing.calories * b, p100: ing.protein * b, f100: ing.fat * b,
        c100: ing.carbohydrates * b, pr100: ing.price * b,
      };
    });
    this.mergeIntoCart(raws, considerFridge);
    this.addMealForm.patchValue({ portions: 1 });
  }

  protected addPlanToCart() {
    const { planId, considerFridge } = this.addPlanForm.getRawValue();
    if (!planId) return;
    const plan = this.plans().find((p) => p.id === Number(planId));
    if (!plan) return;
    const raws: RawItem[] = [];
    for (const day of plan.days ?? []) {
      for (const entry of day.entries ?? []) {
        if (entry.entryType === 'FOOD_PRODUCT' && entry.foodProductId != null && entry.grams != null && entry.grams > 0) {
          const b = 100 / entry.grams;
          raws.push({
            id: entry.foodProductId, name: entry.foodProductName ?? 'Unknown',
            grams: entry.grams,
            cal100: entry.calories * b, p100: entry.protein * b, f100: entry.fat * b,
            c100: entry.carbohydrates * b, pr100: entry.price * b,
          });
        } else if (entry.entryType === 'MEAL' && entry.mealId != null && entry.portions != null && entry.portions > 0) {
          const meal = this.meals().find((m) => m.id === Number(entry.mealId));
          if (meal && meal.servings > 0 && meal.ingredients?.length) {
            const ratio = entry.portions / meal.servings;
            for (const ing of meal.ingredients) {
              if (ing.grams <= 0) continue;
              const b = 100 / ing.grams;
              raws.push({
                id: ing.foodProductId, name: ing.foodProductName, grams: ing.grams * ratio,
                cal100: ing.calories * b, p100: ing.protein * b, f100: ing.fat * b,
                c100: ing.carbohydrates * b, pr100: ing.price * b,
              });
            }
          }
        }
      }
    }
    this.mergeIntoCart(raws, considerFridge);
  }

  private mergeIntoCart(raws: RawItem[], considerFridge: boolean) {
    const fridgeMap = new Map(this.fridge().map(p => [p.id, p.fridgeGrams ?? 0]));
    const rawMap = new Map<number, RawItem>();
    for (const r of raws) {
      const ex = rawMap.get(r.id);
      if (ex) ex.grams += r.grams;
      else rawMap.set(r.id, { ...r });
    }

    const current = [...this.cart()];
    const toAdd: RawItem[] = [];

    for (const [id, raw] of rawMap.entries()) {
      if (considerFridge && fridgeMap.has(id)) {
        raw.grams = Math.max(0, raw.grams - (fridgeMap.get(id) ?? 0));
      }
      if (raw.grams <= 0) continue;
      const existing = current.find((c) => c.foodProductId === id);
      if (existing) {
        // update existing via API
        const newGrams = existing.grams + raw.grams;
        this.shoppingListApi.updateItem(existing.id, {
          foodProductId: existing.foodProductId,
          foodProductName: existing.foodProductName,
          grams: newGrams,
          caloriesPer100g: existing.caloriesPer100g,
          proteinPer100g: existing.proteinPer100g,
          fatPer100g: existing.fatPer100g,
          carbsPer100g: existing.carbsPer100g,
          pricePer100g: existing.pricePer100g,
        }).subscribe({ next: () => this.loadShoppingList() });
      } else {
        toAdd.push(raw);
      }
    }

    for (const raw of toAdd) {
      this.shoppingListApi.addItem({
        foodProductId: raw.id,
        foodProductName: raw.name,
        grams: raw.grams,
        caloriesPer100g: raw.cal100,
        proteinPer100g: raw.p100,
        fatPer100g: raw.f100,
        carbsPer100g: raw.c100,
        pricePer100g: raw.pr100,
      }).subscribe({ next: () => this.loadShoppingList() });
    }
  }

  protected removeFromCart(item: ShoppingListItem) {
    this.shoppingListApi.deleteItem(item.id).subscribe({ next: () => this.loadShoppingList() });
  }

  protected updateCartGrams(item: ShoppingListItem, grams: number) {
    if (grams <= 0) { this.removeFromCart(item); return; }
    this.shoppingListApi.updateItem(item.id, {
      foodProductId: item.foodProductId,
      foodProductName: item.foodProductName,
      grams,
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g,
      fatPer100g: item.fatPer100g,
      carbsPer100g: item.carbsPer100g,
      pricePer100g: item.pricePer100g,
    }).subscribe({ next: () => this.loadShoppingList() });
  }

  protected clearCart() {
    if (confirm('Clear the entire shopping cart?')) {
      this.shoppingListApi.clearAll().subscribe({ next: () => this.cart.set([]) });
    }
  }

  protected addToFridge() {
    const { foodProductId, fridgeGrams } = this.addFridgeForm.getRawValue();
    if (!foodProductId || fridgeGrams <= 0) return;
    const p = this.foodProducts().find(fp => fp.id === Number(foodProductId));
    if (!p || p.inFridge) return;
    this.foodProductsApi.setFridgeStatus(p.id, true, fridgeGrams).subscribe({
      next: (updated) => {
        this.foodProducts.update(list => list.map(fp => fp.id === updated.id ? updated : fp));
      },
    });
    this.addFridgeForm.reset({ foodProductId: null, fridgeGrams: 100 });
  }

  // ── Fridge — toggle via food-products API ─────────────────────────────────────
  protected toggleFridge(product: FoodProduct) {
    const newStatus = !product.inFridge;
    this.foodProductsApi.setFridgeStatus(product.id, newStatus).subscribe({
      next: (updated) => {
        this.foodProducts.update(list => list.map(p => p.id === updated.id ? updated : p));
      },
    });
  }

  protected updateFridgeGrams(product: FoodProduct, grams: number) {
    if (grams <= 0) { this.toggleFridge(product); return; }
    this.foodProductsApi.setFridgeStatus(product.id, true, grams).subscribe({
      next: (updated) => {
        this.foodProducts.update(list => list.map(p => p.id === updated.id ? updated : p));
      },
    });
  }

  protected round(n: number): number {
    return Math.round(n);
  }
}
