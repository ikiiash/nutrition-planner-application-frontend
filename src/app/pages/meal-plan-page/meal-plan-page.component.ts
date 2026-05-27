import { CurrencyPipe, DecimalPipe, LowerCasePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MealPlansApi } from '../../entities/meal-plan/api/meal-plans.api';
import type { AddPlanEntryRequest } from '../../entities/meal-plan/model/add-plan-entry.request';
import type { MealPlan, MealTypeEnum, PlanDay, PlanEntry } from '../../entities/meal-plan/model/meal-plan.model';
import { FoodProductsApi } from '../../entities/food-product/api/food-products.api';
import { MealsApi } from '../../entities/meal/api/meals.api';
import { UserProfileApi } from '../../entities/user-profile/api/user-profile.api';
import type { FoodProduct } from '../../entities/food-product/model/food-product.model';
import type { Meal } from '../../entities/meal/model/meal.model';
import type { UserProfile } from '../../entities/user-profile/model/user-profile.model';
import { FEMALE_NORMS, MALE_NORMS, NUTRIENT_LABELS, NutrientNorms } from '../../shared/nutrient-norms';
import { CountUpDirective } from '../../shared/count-up.directive';

type EditorMode = 'create' | 'edit';

type AddEntryFormGroup = FormGroup<{
  entryType: FormControl<'MEAL' | 'FOOD_PRODUCT'>;
  mealId: FormControl<number | null>;
  portions: FormControl<number>;
  foodProductId: FormControl<number | null>;
  grams: FormControl<number>;
}>;

const FRIDGE_KEY = 'np_fridge_v1';
const DEDUCTIONS_KEY = 'np_plan_deductions_v1';

const MEAL_TYPES: MealTypeEnum[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const MEAL_TYPE_LABELS: Record<MealTypeEnum, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

@Component({
  selector: 'app-meal-plan-page',
  imports: [ReactiveFormsModule, DecimalPipe, CurrencyPipe, LowerCasePipe, NgClass, CountUpDirective, RouterLink],
  templateUrl: './meal-plan-page.component.html',
})
export class MealPlanPageComponent {
  private readonly mealPlansApi = inject(MealPlansApi);
  private readonly foodProductsApi = inject(FoodProductsApi);
  private readonly mealsApi = inject(MealsApi);
  private readonly userProfileApi = inject(UserProfileApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly mealTypes = MEAL_TYPES;
  protected readonly mealTypeLabels = MEAL_TYPE_LABELS;

  // ─── Plans list ────────────────────────────────────────────────────────────
  protected readonly plans = signal<MealPlan[]>([]);
  protected readonly isPlansLoading = signal(false);
  protected readonly planError = signal('');
  protected readonly editorMode = signal<EditorMode>('create');
  protected readonly selectedPlan = signal<MealPlan | null>(null);
  protected readonly selectedPlanId = computed(() => this.selectedPlan()?.id ?? null);

  // ─── Day navigation ────────────────────────────────────────────────────────
  protected readonly selectedDayIndex = signal(0);
  protected readonly currentDay = computed<PlanDay | null>(() => {
    const plan = this.selectedPlan();
    if (!plan) return null;
    return plan.days[this.selectedDayIndex()] ?? null;
  });

  // ─── Add-entry forms (one per meal type) ───────────────────────────────────
  protected readonly addEntryForms: Record<MealTypeEnum, AddEntryFormGroup> = {
    BREAKFAST: this.makeEntryForm(),
    LUNCH: this.makeEntryForm(),
    DINNER: this.makeEntryForm(),
    SNACK: this.makeEntryForm(),
  };

  private makeEntryForm(): AddEntryFormGroup {
    return this.formBuilder.nonNullable.group({
      entryType: ['MEAL' as 'MEAL' | 'FOOD_PRODUCT'],
      mealId: [null as number | null],
      portions: [1, [Validators.min(0.0001)]],
      foodProductId: [null as number | null],
      grams: [100, [Validators.min(0.0001)]],
    }) as AddEntryFormGroup;
  }

  // ─── Supporting data ───────────────────────────────────────────────────────
  protected readonly meals = signal<Meal[]>([]);
  protected readonly foodProducts = signal<FoodProduct[]>([]);
  protected readonly userProfile = signal<UserProfile | null>(null);
  protected readonly isEntrySubmitting = signal<Partial<Record<MealTypeEnum, boolean>>>({});

  // ─── Plan form ─────────────────────────────────────────────────────────────
  protected readonly planForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    numberOfDays: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
  });
  protected readonly isPlanSubmitting = signal(false);
  protected readonly isActivating = signal(false);

  // ─── Active plan / today tracking ─────────────────────────────────────────
  protected readonly todayDayIndex = computed<number | null>(() => {
    const plan = this.selectedPlan();
    if (!plan) return null;
    return this.calcTodayDayIndex(plan);
  });

  // ─── UI state ──────────────────────────────────────────────────────────────
  protected dayMicroOpen = signal(false);
  protected planMicroOpen = signal(false);
  protected showNewPlanForm = signal(false);

  // Slot accent colors
  protected readonly slotColors: Record<MealTypeEnum, { color: string; soft: string }> = {
    BREAKFAST: { color: 'var(--slot-breakfast)', soft: 'rgba(232,177,74,.15)' },
    LUNCH:     { color: 'var(--slot-lunch)',     soft: 'rgba(201,106,58,.12)' },
    DINNER:    { color: 'var(--slot-dinner)',    soft: 'rgba(138,91,160,.12)' },
    SNACK:     { color: 'var(--slot-snack)',     soft: 'rgba(79,169,164,.12)' },
  };

  constructor() {
    this.loadPlans();
    this.userProfileApi.readCurrentUserProfile().subscribe({
      next: (profile) => this.userProfile.set(profile),
      error: () => {},
    });
  }

  // ─── Plan operations ───────────────────────────────────────────────────────
  protected loadPlans() {
    this.isPlansLoading.set(true);
    this.planError.set('');
    this.mealPlansApi
      .readMealPlans()
      .pipe(finalize(() => this.isPlansLoading.set(false)))
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.performFridgeDeductions(plans);
        },
        error: (err) => this.planError.set(err?.error?.message ?? 'Unable to load meal plans.'),
      });
  }

  protected toggleActivePlan(plan: MealPlan, event: Event) {
    event.stopPropagation();
    this.isActivating.set(true);
    this.planError.set('');
    const req$ = plan.isActive
      ? this.mealPlansApi.deactivateMealPlan(plan.id)
      : this.mealPlansApi.activateMealPlan(plan.id);
    req$
      .pipe(finalize(() => this.isActivating.set(false)))
      .subscribe({
        next: (updated) => {
          this.loadPlans();
          if (this.selectedPlanId() === plan.id) {
            this.selectedPlan.set(updated);
            const todayIdx = this.calcTodayDayIndex(updated);
            this.selectedDayIndex.set(todayIdx ?? 0);
          }
        },
        error: (err) => this.planError.set(err?.error?.message ?? 'Unable to update plan status.'),
      });
  }

  protected selectPlan(plan: MealPlan) {
    this.editorMode.set('edit');
    this.selectedPlan.set(plan);
    const todayIdx = this.calcTodayDayIndex(plan);
    this.selectedDayIndex.set(todayIdx ?? 0);
    this.planError.set('');
    if (this.meals().length === 0) {
      this.mealsApi.readMeals().subscribe({ next: (m) => this.meals.set(m), error: () => {} });
    }
    if (this.foodProducts().length === 0) {
      this.foodProductsApi
        .readFoodProducts()
        .subscribe({ next: (fp) => this.foodProducts.set(fp), error: () => {} });
    }
  }

  protected startCreateMode() {
    this.editorMode.set('create');
    this.selectedPlan.set(null);
    this.planForm.reset({ name: '', numberOfDays: 7 });
    this.planError.set('');
  }

  protected savePlan() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }
    this.isPlanSubmitting.set(true);
    this.planError.set('');
    const { name, numberOfDays } = this.planForm.getRawValue();
    const startDate =
      this.editorMode() === 'edit' && this.selectedPlan()?.startDate
        ? this.selectedPlan()!.startDate
        : new Date().toISOString().substring(0, 10);

    const req$ =
      this.editorMode() === 'create'
        ? this.mealPlansApi.createMealPlan({ name, startDate, numberOfDays })
        : this.mealPlansApi.updateMealPlan(this.selectedPlanId()!, { name, startDate, numberOfDays });

    req$.pipe(finalize(() => this.isPlanSubmitting.set(false))).subscribe({
      next: (plan) => {
        this.loadPlans();
        this.selectPlan(plan);
      },
      error: (err) => this.planError.set(err?.error?.message ?? 'Unable to save meal plan.'),
    });
  }

  protected deletePlan() {
    const id = this.selectedPlanId();
    if (id == null) return;
    if (!confirm('Delete this meal plan?')) return;
    this.isPlanSubmitting.set(true);
    this.planError.set('');
    this.mealPlansApi
      .deleteMealPlan(id)
      .pipe(finalize(() => this.isPlanSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.startCreateMode();
          this.loadPlans();
        },
        error: (err) => this.planError.set(err?.error?.message ?? 'Unable to delete meal plan.'),
      });
  }

  // ─── Day navigation ────────────────────────────────────────────────────────
  protected prevDay() {
    if (this.selectedDayIndex() > 0) {
      this.selectedDayIndex.update((i) => i - 1);
    }
  }

  protected nextDay() {
    const plan = this.selectedPlan();
    if (!plan) return;
    if (this.selectedDayIndex() < plan.days.length - 1) {
      this.selectedDayIndex.update((i) => i + 1);
    }
  }

  // ─── Entry operations ──────────────────────────────────────────────────────
  protected entriesForType(mealType: MealTypeEnum): PlanEntry[] {
    return (this.currentDay()?.entries ?? []).filter((e) => e.mealType === mealType);
  }

  protected addEntry(mealType: MealTypeEnum) {
    const form = this.addEntryForms[mealType];
    const plan = this.selectedPlan();
    const day = this.currentDay();
    if (!plan || !day) return;

    const raw = form.getRawValue();
    const entryType = raw.entryType;
    const mealId = raw.mealId != null ? Number(raw.mealId) : null;
    const foodProductId = raw.foodProductId != null ? Number(raw.foodProductId) : null;

    if (entryType === 'MEAL' && !mealId) {
      form.controls.mealId.setErrors({ required: true });
      return;
    }
    if (entryType === 'FOOD_PRODUCT' && !foodProductId) {
      form.controls.foodProductId.setErrors({ required: true });
      return;
    }

    const req: AddPlanEntryRequest = {
      mealType,
      entryType,
      mealId: entryType === 'MEAL' ? mealId : null,
      portions: entryType === 'MEAL' ? Number(raw.portions) : null,
      foodProductId: entryType === 'FOOD_PRODUCT' ? foodProductId : null,
      grams: entryType === 'FOOD_PRODUCT' ? Number(raw.grams) : null,
    };

    this.isEntrySubmitting.update((s) => ({ ...s, [mealType]: true }));
    this.mealPlansApi
      .addPlanEntry(plan.id, day.id, req)
      .pipe(finalize(() => this.isEntrySubmitting.update((s) => ({ ...s, [mealType]: false }))))
      .subscribe({
        next: () => {
          form.reset({ entryType: 'MEAL', mealId: null, portions: 1, foodProductId: null, grams: 100 });
          this.refreshPlan(plan.id);
        },
        error: (err) => this.planError.set(err?.error?.message ?? 'Unable to add entry.'),
      });
  }

  protected removeEntry(entryId: number) {
    const plan = this.selectedPlan();
    const day = this.currentDay();
    if (!plan || !day) return;
    this.mealPlansApi.removePlanEntry(plan.id, day.id, entryId).subscribe({
      next: () => this.refreshPlan(plan.id),
      error: (err) => this.planError.set(err?.error?.message ?? 'Unable to remove entry.'),
    });
  }

  private refreshPlan(planId: number) {
    this.mealPlansApi.readMealPlan(planId).subscribe({
      next: (plan) => {
        this.selectedPlan.set(plan);
        this.plans.update((list) => list.map((p) => (p.id === plan.id ? plan : p)));
      },
      error: () => {},
    });
  }

  // ─── Computed totals ───────────────────────────────────────────────────────
  protected readonly norms = computed<NutrientNorms>(() =>
    this.userProfile()?.gender === 'FEMALE' ? FEMALE_NORMS : MALE_NORMS,
  );

  protected readonly dailyTotals = computed(() => {
    const day = this.currentDay();
    if (!day) return null;
    return {
      calories: day.dailyCalories,
      protein: day.dailyProtein,
      fat: day.dailyFat,
      carbohydrates: day.dailyCarbohydrates,
      price: day.dailyPrice,
    };
  });

  protected readonly dailyMicroRows = computed(() => {
    const day = this.currentDay();
    const n = this.norms();
    if (!day) return [];
    return this.buildMicroRows([
      ['Na · Sodium',     'mg',  day.dailySodiumMg,    n.sodiumMg],
      ['K · Potassium',   'mg',  day.dailyPotassiumMg, n.potassiumMg],
      ['Mg · Magnesium',  'mg',  day.dailyMagnesiumMg, n.magnesiumMg],
      ['Fe · Iron',       'mg',  day.dailyIronMg,      n.ironMg],
      ['Ca · Calcium',    'mg',  day.dailyCalciumMg,   n.calciumMg],
      ['Zn · Zinc',       'mg',  day.dailyZincMg,      n.zincMg],
      ['Vit A',           'mcg', day.dailyVitaminAMcg, n.vitaminAMcg],
      ['Vit C',           'mg',  day.dailyVitaminCMg,  n.vitaminCMg],
      ['Vit D',           'mcg', day.dailyVitaminDMcg, n.vitaminDMcg],
      ['Vit E',           'mg',  day.dailyVitaminEMg,  n.vitaminEMg],
      ['Vit K',           'mcg', day.dailyVitaminKMcg, n.vitaminKMcg],
      ['B1 (Thiamine)',   'mg',  day.dailyVitaminB1Mg, n.vitaminB1Mg],
      ['B2 (Riboflavin)', 'mg',  day.dailyVitaminB2Mg, n.vitaminB2Mg],
      ['B6',              'mg',  day.dailyVitaminB6Mg, n.vitaminB6Mg],
      ['B9 (Folate)',     'mcg', day.dailyVitaminB9Mcg,n.vitaminB9Mcg],
      ['B12',             'mcg', day.dailyVitaminB12Mcg,n.vitaminB12Mcg],
    ]);
  });

  protected readonly planMicroRows = computed(() => {
    const plan = this.selectedPlan();
    const n = this.norms();
    if (!plan || plan.numberOfDays <= 0) return [];
    const d = plan.numberOfDays;
    return this.buildMicroRows([
      ['Na · Sodium',     'mg',  (plan.totalSodiumMg ?? 0) / d,     n.sodiumMg],
      ['K · Potassium',   'mg',  (plan.totalPotassiumMg ?? 0) / d,  n.potassiumMg],
      ['Mg · Magnesium',  'mg',  (plan.totalMagnesiumMg ?? 0) / d,  n.magnesiumMg],
      ['Fe · Iron',       'mg',  (plan.totalIronMg ?? 0) / d,       n.ironMg],
      ['Ca · Calcium',    'mg',  (plan.totalCalciumMg ?? 0) / d,    n.calciumMg],
      ['Zn · Zinc',       'mg',  (plan.totalZincMg ?? 0) / d,       n.zincMg],
      ['Vit A',           'mcg', (plan.totalVitaminAMcg ?? 0) / d,  n.vitaminAMcg],
      ['Vit C',           'mg',  (plan.totalVitaminCMg ?? 0) / d,   n.vitaminCMg],
      ['Vit D',           'mcg', (plan.totalVitaminDMcg ?? 0) / d,  n.vitaminDMcg],
      ['Vit E',           'mg',  (plan.totalVitaminEMg ?? 0) / d,   n.vitaminEMg],
      ['Vit K',           'mcg', (plan.totalVitaminKMcg ?? 0) / d,  n.vitaminKMcg],
      ['B1 (Thiamine)',   'mg',  (plan.totalVitaminB1Mg ?? 0) / d,  n.vitaminB1Mg],
      ['B2 (Riboflavin)', 'mg',  (plan.totalVitaminB2Mg ?? 0) / d,  n.vitaminB2Mg],
      ['B6',              'mg',  (plan.totalVitaminB6Mg ?? 0) / d,  n.vitaminB6Mg],
      ['B9 (Folate)',     'mcg', (plan.totalVitaminB9Mcg ?? 0) / d, n.vitaminB9Mcg],
      ['B12',             'mcg', (plan.totalVitaminB12Mcg ?? 0) / d,n.vitaminB12Mcg],
    ]);
  });

  protected readonly planTotals = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return null;
    return {
      calories: plan.totalCalories,
      protein: plan.totalProtein,
      fat: plan.totalFat,
      carbohydrates: plan.totalCarbohydrates,
      price: plan.totalPrice,
    };
  });

  protected targetPercent(actual: number, target: number | null | undefined): number {
    if (!target || target <= 0) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  }

  protected rawPercent(actual: number, target: number | null | undefined): number {
    if (!target || target <= 0) return 0;
    return Math.round((actual / target) * 100);
  }

  protected overAmount(actual: number, target: number | null | undefined): number {
    if (!target || target <= 0 || actual <= target) return 0;
    return actual - target;
  }

  protected deltaClass(avg: number, target: number | null | undefined): string {
    if (!target || target <= 0) return '';
    const delta = Math.abs((avg / target - 1) * 100);
    if (delta <= 10) return 'ok';
    if (delta <= 25) return 'warn';
    return 'bad';
  }

  protected deltaPct(avg: number, target: number | null | undefined): string {
    if (!target || target <= 0) return '—';
    const d = ((avg / target) - 1) * 100;
    return (d >= 0 ? '+' : '') + d.toFixed(0) + '%';
  }

  private buildMicroRows(
    data: [string, string, number | null | undefined, number][],
  ): { label: string; unit: string; value: number; norm: number; pct: number; rawPct: number; over: boolean }[] {
    return data.map(([label, unit, v, norm]) => {
      const value = v != null ? (v as number) : 0;
      const raw = norm > 0 ? (value / norm) * 100 : 0;
      return { label, unit, value, norm, pct: Math.min(raw, 100), rawPct: Math.round(raw), over: raw > 100 };
    });
  }

  protected totalCaloriesForType(mealType: MealTypeEnum): number {
    return this.entriesForType(mealType).reduce((sum, e) => sum + (e.calories ?? 0), 0);
  }

  protected entryLabel(entry: PlanEntry): string {
    if (entry.entryType === 'MEAL') {
      return `${entry.mealName ?? 'Meal'} \xd7 ${entry.portions} srv`;
    }
    return `${entry.foodProductName ?? 'Product'} — ${entry.grams} g`;
  }

  private calcTodayDayIndex(plan: MealPlan): number | null {
    if (!plan.isActive || !plan.activatedAt) return null;
    const activatedAt = new Date(plan.activatedAt + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - activatedAt.getTime()) / 86400000);
    return Math.min(Math.max(diffDays, 0), plan.numberOfDays - 1);
  }

  private performFridgeDeductions(plans: MealPlan[]): void {
    const activePlan = plans.find(p => p.isActive);
    if (!activePlan?.activatedAt) return;

    const activatedAt = new Date(activePlan.activatedAt + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysElapsed = Math.floor((today.getTime() - activatedAt.getTime()) / 86400000);

    const deductionState: Record<number, number> = JSON.parse(localStorage.getItem(DEDUCTIONS_KEY) ?? '{}');
    const lastDeducted = deductionState[activePlan.id] ?? 0;

    const daysToDeduct = activePlan.days.filter(
      d => d.dayNumber > lastDeducted && d.dayNumber <= daysElapsed,
    );
    if (daysToDeduct.length === 0) return;

    const mealIds = new Set<number>();
    for (const day of daysToDeduct) {
      for (const entry of day.entries) {
        if (entry.entryType === 'MEAL' && entry.mealId) mealIds.add(entry.mealId);
      }
    }

    const applyDeductions = (mealMap: Map<number, import('../../entities/meal/model/meal.model').Meal>) => {
      const deductions = new Map<number, number>();

      for (const day of daysToDeduct) {
        for (const entry of day.entries) {
          if (entry.entryType === 'FOOD_PRODUCT' && entry.foodProductId && entry.grams) {
            deductions.set(entry.foodProductId, (deductions.get(entry.foodProductId) ?? 0) + entry.grams);
          } else if (entry.entryType === 'MEAL' && entry.mealId) {
            const meal = mealMap.get(entry.mealId);
            if (meal) {
              const servings = meal.servings || 1;
              const portions = entry.portions ?? 1;
              for (const ing of meal.ingredients) {
                const g = (ing.grams * portions) / servings;
                deductions.set(ing.foodProductId, (deductions.get(ing.foodProductId) ?? 0) + g);
              }
            }
          }
        }
      }

      const fridge: Array<{ foodProductId: number; name: string; availableGrams: number }> =
        JSON.parse(localStorage.getItem(FRIDGE_KEY) ?? '[]');
      for (const [fpId, gramsToDeduct] of deductions) {
        const item = fridge.find(f => f.foodProductId === fpId);
        if (item) item.availableGrams = Math.max(0, item.availableGrams - gramsToDeduct);
      }
      localStorage.setItem(FRIDGE_KEY, JSON.stringify(fridge));

      deductionState[activePlan.id] = Math.max(...daysToDeduct.map(d => d.dayNumber));
      localStorage.setItem(DEDUCTIONS_KEY, JSON.stringify(deductionState));
    };

    if (mealIds.size > 0) {
      this.mealsApi.readMeals().subscribe({
        next: meals => applyDeductions(new Map(meals.map(m => [m.id, m]))),
        error: () => applyDeductions(new Map()),
      });
    } else {
      applyDeductions(new Map());
    }
  }
}
