import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodProductsApi } from '../../entities/food-product/api/food-products.api';
import { MealsApi } from '../../entities/meal/api/meals.api';
import { UserProfileApi } from '../../entities/user-profile/api/user-profile.api';
import { AiApi } from '../../entities/ai/api/ai.api';
import { UserService } from '../../core/auth/user.service';
import { UserRoleEnum } from '../../core/model/user-role-enum';
import { FoodProduct } from '../../entities/food-product/model/food-product.model';
import { Meal } from '../../entities/meal/model/meal.model';
import type { UserProfile } from '../../entities/user-profile/model/user-profile.model';
import { FEMALE_NORMS, MALE_NORMS, NutrientNorms } from '../../shared/nutrient-norms';
import { CountUpDirective } from '../../shared/count-up.directive';

type ActiveTab = 'products' | 'meals';
type ProductEditorMode = 'create' | 'edit';
type ProductSortMode = 'alphabet-asc' | 'alphabet-desc';
type ProductCategoryFilter = 'all' | string;
type ProductCategoryOption = { value: ProductCategoryFilter; label: string };
type MealEditorMode = 'create' | 'edit';
type EditableIngredient = { foodProductId: number; grams: number };

@Component({
  selector: 'app-food-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, CountUpDirective],
  templateUrl: './food-page.component.html',
})
export class FoodPageComponent {
  private readonly foodProductsApi = inject(FoodProductsApi);
  private readonly mealsApi = inject(MealsApi);
  private readonly userProfileApi = inject(UserProfileApi);
  private readonly aiApi = inject(AiApi);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly isPremium = this.userService.hasRole(UserRoleEnum.PREMIUM_USER);
  protected readonly isAutofilling = signal(false);
  protected readonly autofillError = signal('');

  // ─── Tab ───────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<ActiveTab>('products');

  // ─── Collapsible state ─────────────────────────────────────────────────────
  protected productMicroOpen = signal(false);
  protected mealMicroOpen = signal(false);

  protected setTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'meals' && this.meals().length === 0 && !this.isMealsLoading()) {
      this.loadMeals();
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────────
  protected readonly products = signal<FoodProduct[]>([]);
  protected readonly isProductsLoading = signal(false);
  protected readonly isProductSubmitting = signal(false);
  protected readonly isProductDetailsLoading = signal(false);
  protected readonly productError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly editorMode = signal<ProductEditorMode>('create');
  protected readonly sortMode = signal<ProductSortMode>('alphabet-asc');
  protected readonly categoryFilter = signal<ProductCategoryFilter>('all');
  protected readonly selectedProduct = signal<FoodProduct | null>(null);
  protected readonly selectedProductId = computed(() => this.selectedProduct()?.id ?? null);

  protected readonly categoryOptions = computed<ProductCategoryOption[]>(() => {
    const categories = new Map<string, string>();
    for (const p of this.products()) {
      const norm = this.normalizeCategory(p.category);
      const display = p.category?.trim();
      if (!norm || !display || categories.has(norm)) continue;
      categories.set(norm, display);
    }
    const options = Array.from(categories.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
    return [{ value: 'all', label: 'All categories' }, ...options];
  });

  protected readonly sortedProducts = computed(() => {
    const filtered =
      this.categoryFilter() === 'all'
        ? this.products()
        : this.products().filter(
            (p) =>
              this.normalizeCategory(p.category) ===
              this.normalizeCategory(this.categoryFilter()),
          );
    return [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return this.sortMode() === 'alphabet-asc' ? cmp : cmp * -1;
    });
  });

  protected readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    category: ['', [Validators.required]],
    grams: [100, [Validators.required, Validators.min(0.0001)]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
    carbohydrates: [0, [Validators.required, Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0)]],
    photoUrl: [''],
    sodiumMg: [null as number | null, [Validators.min(0)]],
    potassiumMg: [null as number | null, [Validators.min(0)]],
    magnesiumMg: [null as number | null, [Validators.min(0)]],
    ironMg: [null as number | null, [Validators.min(0)]],
    calciumMg: [null as number | null, [Validators.min(0)]],
    zincMg: [null as number | null, [Validators.min(0)]],
    vitaminAMcg: [null as number | null, [Validators.min(0)]],
    vitaminCMg: [null as number | null, [Validators.min(0)]],
    vitaminDMcg: [null as number | null, [Validators.min(0)]],
    vitaminEMg: [null as number | null, [Validators.min(0)]],
    vitaminKMcg: [null as number | null, [Validators.min(0)]],
    vitaminB1Mg: [null as number | null, [Validators.min(0)]],
    vitaminB2Mg: [null as number | null, [Validators.min(0)]],
    vitaminB6Mg: [null as number | null, [Validators.min(0)]],
    vitaminB9Mcg: [null as number | null, [Validators.min(0)]],
    vitaminB12Mcg: [null as number | null, [Validators.min(0)]],
  });

  protected readonly userProfile = signal<UserProfile | null>(null);
  protected readonly norms = computed<NutrientNorms>(() =>
    this.userProfile()?.gender === 'FEMALE' ? FEMALE_NORMS : MALE_NORMS,
  );

  protected readonly mealMicroRows = computed(() => {
    const meal = this.selectedMeal();
    const n = this.norms();
    if (!meal) return [];
    const pct = (v: number | null | undefined, norm: number) =>
      v != null && norm > 0 ? Math.min(Math.round((v / norm) * 100), 100) : 0;
    const over = (v: number | null | undefined, norm: number) =>
      v != null && norm > 0 && v / norm > 1;
    const rows: { label: string; unit: string; value: number; norm: number; pct: number; over: boolean }[] = [
      { label: 'Na · Sodium',     unit: 'mg',  value: meal.sodiumMgPerServing    ?? 0, norm: n.sodiumMg,    pct: pct(meal.sodiumMgPerServing, n.sodiumMg),    over: over(meal.sodiumMgPerServing, n.sodiumMg) },
      { label: 'K · Potassium',   unit: 'mg',  value: meal.potassiumMgPerServing  ?? 0, norm: n.potassiumMg, pct: pct(meal.potassiumMgPerServing, n.potassiumMg), over: over(meal.potassiumMgPerServing, n.potassiumMg) },
      { label: 'Mg · Magnesium',  unit: 'mg',  value: meal.magnesiumMgPerServing  ?? 0, norm: n.magnesiumMg, pct: pct(meal.magnesiumMgPerServing, n.magnesiumMg), over: over(meal.magnesiumMgPerServing, n.magnesiumMg) },
      { label: 'Fe · Iron',       unit: 'mg',  value: meal.ironMgPerServing       ?? 0, norm: n.ironMg,      pct: pct(meal.ironMgPerServing, n.ironMg),           over: over(meal.ironMgPerServing, n.ironMg) },
      { label: 'Ca · Calcium',    unit: 'mg',  value: meal.calciumMgPerServing    ?? 0, norm: n.calciumMg,   pct: pct(meal.calciumMgPerServing, n.calciumMg),     over: over(meal.calciumMgPerServing, n.calciumMg) },
      { label: 'Zn · Zinc',       unit: 'mg',  value: meal.zincMgPerServing       ?? 0, norm: n.zincMg,      pct: pct(meal.zincMgPerServing, n.zincMg),           over: over(meal.zincMgPerServing, n.zincMg) },
      { label: 'Vit A',           unit: 'mcg', value: meal.vitaminAMcgPerServing  ?? 0, norm: n.vitaminAMcg, pct: pct(meal.vitaminAMcgPerServing, n.vitaminAMcg), over: over(meal.vitaminAMcgPerServing, n.vitaminAMcg) },
      { label: 'Vit C',           unit: 'mg',  value: meal.vitaminCMgPerServing   ?? 0, norm: n.vitaminCMg,  pct: pct(meal.vitaminCMgPerServing, n.vitaminCMg),   over: over(meal.vitaminCMgPerServing, n.vitaminCMg) },
      { label: 'Vit D',           unit: 'mcg', value: meal.vitaminDMcgPerServing  ?? 0, norm: n.vitaminDMcg, pct: pct(meal.vitaminDMcgPerServing, n.vitaminDMcg), over: over(meal.vitaminDMcgPerServing, n.vitaminDMcg) },
      { label: 'Vit E',           unit: 'mg',  value: meal.vitaminEMgPerServing   ?? 0, norm: n.vitaminEMg,  pct: pct(meal.vitaminEMgPerServing, n.vitaminEMg),   over: over(meal.vitaminEMgPerServing, n.vitaminEMg) },
      { label: 'Vit K',           unit: 'mcg', value: meal.vitaminKMcgPerServing  ?? 0, norm: n.vitaminKMcg, pct: pct(meal.vitaminKMcgPerServing, n.vitaminKMcg), over: over(meal.vitaminKMcgPerServing, n.vitaminKMcg) },
      { label: 'B1 (Thiamine)',   unit: 'mg',  value: meal.vitaminB1MgPerServing  ?? 0, norm: n.vitaminB1Mg, pct: pct(meal.vitaminB1MgPerServing, n.vitaminB1Mg), over: over(meal.vitaminB1MgPerServing, n.vitaminB1Mg) },
      { label: 'B2 (Riboflavin)', unit: 'mg',  value: meal.vitaminB2MgPerServing  ?? 0, norm: n.vitaminB2Mg, pct: pct(meal.vitaminB2MgPerServing, n.vitaminB2Mg), over: over(meal.vitaminB2MgPerServing, n.vitaminB2Mg) },
      { label: 'B6',              unit: 'mg',  value: meal.vitaminB6MgPerServing  ?? 0, norm: n.vitaminB6Mg, pct: pct(meal.vitaminB6MgPerServing, n.vitaminB6Mg), over: over(meal.vitaminB6MgPerServing, n.vitaminB6Mg) },
      { label: 'B9 (Folate)',     unit: 'mcg', value: meal.vitaminB9McgPerServing ?? 0, norm: n.vitaminB9Mcg,pct: pct(meal.vitaminB9McgPerServing, n.vitaminB9Mcg),over: over(meal.vitaminB9McgPerServing, n.vitaminB9Mcg) },
      { label: 'B12',             unit: 'mcg', value: meal.vitaminB12McgPerServing?? 0, norm: n.vitaminB12Mcg,pct: pct(meal.vitaminB12McgPerServing, n.vitaminB12Mcg),over: over(meal.vitaminB12McgPerServing, n.vitaminB12Mcg) },
    ];
    return rows.filter((r) => r.value > 0);
  });

  constructor() {
    this.loadProducts();
    this.userProfileApi.readCurrentUserProfile().subscribe({
      next: (p) => this.userProfile.set(p),
      error: () => {},
    });
  }

  protected autofillProduct() {
    const name = this.productForm.controls.name.value?.trim();
    if (!name) {
      this.autofillError.set('Enter a product name first.');
      return;
    }
    this.isAutofilling.set(true);
    this.autofillError.set('');
    this.aiApi.autofill(name).subscribe({
      next: (res) => {
        this.productForm.patchValue({
          calories: res.calories ?? 0,
          protein: res.protein ?? 0,
          fat: res.fat ?? 0,
          carbohydrates: res.carbohydrates ?? 0,
          sodiumMg: res.sodiumMg ?? null,
          potassiumMg: res.potassiumMg ?? null,
          magnesiumMg: res.magnesiumMg ?? null,
          ironMg: res.ironMg ?? null,
          calciumMg: res.calciumMg ?? null,
          zincMg: res.zincMg ?? null,
          vitaminAMcg: res.vitaminAMcg ?? null,
          vitaminCMg: res.vitaminCMg ?? null,
          vitaminDMcg: res.vitaminDMcg ?? null,
          vitaminEMg: res.vitaminEMg ?? null,
          vitaminKMcg: res.vitaminKMcg ?? null,
          vitaminB1Mg: res.vitaminB1Mg ?? null,
          vitaminB2Mg: res.vitaminB2Mg ?? null,
          vitaminB6Mg: res.vitaminB6Mg ?? null,
          vitaminB9Mcg: res.vitaminB9Mcg ?? null,
          vitaminB12Mcg: res.vitaminB12Mcg ?? null,
        });
        this.isAutofilling.set(false);
      },
      error: () => {
        this.autofillError.set('AI autofill failed. Fill values manually.');
        this.isAutofilling.set(false);
      },
    });
  }

  protected updateSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  protected updateSortMode(value: string) {
    this.sortMode.set(value as ProductSortMode);
  }

  protected updateCategoryFilter(value: string) {
    this.categoryFilter.set(value === 'all' ? 'all' : this.normalizeCategory(value));
  }

  protected loadProducts() {
    this.isProductsLoading.set(true);
    this.productError.set('');
    this.foodProductsApi
      .readFoodProducts(this.searchTerm())
      .pipe(finalize(() => this.isProductsLoading.set(false)))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          const available = new Set(
            products.map((p) => this.normalizeCategory(p.category)).filter((c) => c.length > 0),
          );
          if (
            this.categoryFilter() !== 'all' &&
            !available.has(this.normalizeCategory(this.categoryFilter()))
          ) {
            this.categoryFilter.set('all');
          }
          const selId = this.selectedProductId();
          if (selId && !products.some((p) => p.id === selId)) {
            this.startCreateProductMode();
          }
        },
        error: (err) => {
          this.productError.set(err?.error?.message ?? 'Unable to load food products.');
        },
      });
  }

  protected selectProduct(productId: number) {
    this.isProductDetailsLoading.set(true);
    this.productError.set('');
    this.foodProductsApi
      .readFoodProduct(productId)
      .pipe(finalize(() => this.isProductDetailsLoading.set(false)))
      .subscribe({
        next: (product) => {
          this.editorMode.set('edit');
          this.selectedProduct.set(product);
          this.productForm.reset({
            name: product.name,
            category: product.category,
            grams: product.grams,
            calories: product.calories,
            protein: product.protein,
            fat: product.fat,
            carbohydrates: product.carbohydrates,
            price: product.price,
            photoUrl: product.photoUrl ?? '',
            sodiumMg: product.sodiumMg ?? null,
            potassiumMg: product.potassiumMg ?? null,
            magnesiumMg: product.magnesiumMg ?? null,
            ironMg: product.ironMg ?? null,
            calciumMg: product.calciumMg ?? null,
            zincMg: product.zincMg ?? null,
            vitaminAMcg: product.vitaminAMcg ?? null,
            vitaminCMg: product.vitaminCMg ?? null,
            vitaminDMcg: product.vitaminDMcg ?? null,
            vitaminEMg: product.vitaminEMg ?? null,
            vitaminKMcg: product.vitaminKMcg ?? null,
            vitaminB1Mg: product.vitaminB1Mg ?? null,
            vitaminB2Mg: product.vitaminB2Mg ?? null,
            vitaminB6Mg: product.vitaminB6Mg ?? null,
            vitaminB9Mcg: product.vitaminB9Mcg ?? null,
            vitaminB12Mcg: product.vitaminB12Mcg ?? null,
          });
        },
        error: (err) => {
          this.productError.set(err?.error?.message ?? 'Unable to load product details.');
        },
      });
  }

  protected startCreateProductMode() {
    this.editorMode.set('create');
    this.selectedProduct.set(null);
    this.productForm.reset({
      name: '',
      category: '',
      grams: 100,
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      price: 0,
      photoUrl: '',
      sodiumMg: null,
      potassiumMg: null,
      magnesiumMg: null,
      ironMg: null,
      calciumMg: null,
      zincMg: null,
      vitaminAMcg: null,
      vitaminCMg: null,
      vitaminDMcg: null,
      vitaminEMg: null,
      vitaminKMcg: null,
      vitaminB1Mg: null,
      vitaminB2Mg: null,
      vitaminB6Mg: null,
      vitaminB9Mcg: null,
      vitaminB12Mcg: null,
    });
  }

  protected saveFoodProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.isProductSubmitting.set(true);
    this.productError.set('');
    const req$ =
      this.editorMode() === 'create'
        ? this.foodProductsApi.createFoodProduct(this.productForm.getRawValue())
        : this.foodProductsApi.updateFoodProduct(
            this.selectedProductId()!,
            this.productForm.getRawValue(),
          );
    req$.pipe(finalize(() => this.isProductSubmitting.set(false))).subscribe({
      next: (product) => {
        this.loadProducts();
        this.selectProduct(product.id);
      },
      error: (err) => {
        this.productError.set(
          err?.error?.message ??
            (this.editorMode() === 'create'
              ? 'Unable to create food product.'
              : 'Unable to update food product.'),
        );
      },
    });
  }

  protected deleteFoodProduct() {
    if (!this.selectedProductId()) return;
    this.isProductSubmitting.set(true);
    this.productError.set('');
    this.foodProductsApi
      .deleteFoodProduct(this.selectedProductId()!)
      .pipe(finalize(() => this.isProductSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.startCreateProductMode();
          this.loadProducts();
        },
        error: (err) => {
          this.productError.set(err?.error?.message ?? 'Unable to delete food product.');
        },
      });
  }

  private normalizeCategory(category: string | null | undefined) {
    return category?.trim().toLocaleLowerCase() ?? '';
  }

  // ─── Meals ─────────────────────────────────────────────────────────────────
  protected readonly meals = signal<Meal[]>([]);
  protected readonly isMealsLoading = signal(false);
  protected readonly isMealSubmitting = signal(false);
  protected readonly isMealDetailsLoading = signal(false);
  protected readonly mealError = signal('');
  protected readonly mealEditorMode = signal<MealEditorMode>('create');
  protected readonly selectedMeal = signal<Meal | null>(null);
  protected readonly selectedMealId = computed(() => this.selectedMeal()?.id ?? null);

  protected readonly mealIngredients = signal<EditableIngredient[]>([]);

  protected readonly mealForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    servings: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly ingredientForm = this.formBuilder.nonNullable.group({
    foodProductId: [null as number | null, [Validators.required]],
    grams: [100, [Validators.required, Validators.min(0.0001)]],
  });

  protected readonly ingredientRows = computed(() =>
    this.mealIngredients().map((ing) => {
      const p = this.products().find((prod) => prod.id === ing.foodProductId);
      if (!p) {
        return { ...ing, name: 'Unknown product', calories: 0, protein: 0, fat: 0, carbohydrates: 0, price: 0 };
      }
      const factor = ing.grams / p.grams;
      return {
        ...ing,
        name: p.name,
        calories: p.calories * factor,
        protein: p.protein * factor,
        fat: p.fat * factor,
        carbohydrates: p.carbohydrates * factor,
        price: p.price * factor,
      };
    }),
  );

  protected readonly mealTotals = computed(() =>
    this.ingredientRows().reduce(
      (acc, row) => ({
        grams: acc.grams + row.grams,
        calories: acc.calories + row.calories,
        protein: acc.protein + row.protein,
        fat: acc.fat + row.fat,
        carbohydrates: acc.carbohydrates + row.carbohydrates,
        price: acc.price + row.price,
      }),
      { grams: 0, calories: 0, protein: 0, fat: 0, carbohydrates: 0, price: 0 },
    ),
  );

  protected readonly mealPerServing = computed(() => {
    const servings = Math.max(this.mealForm.getRawValue().servings ?? 1, 1);
    const t = this.mealTotals();
    return {
      grams: t.grams / servings,
      calories: t.calories / servings,
      protein: t.protein / servings,
      fat: t.fat / servings,
      carbohydrates: t.carbohydrates / servings,
      price: t.price / servings,
    };
  });

  protected loadMeals() {
    this.isMealsLoading.set(true);
    this.mealError.set('');
    this.mealsApi
      .readMeals()
      .pipe(finalize(() => this.isMealsLoading.set(false)))
      .subscribe({
        next: (meals) => this.meals.set(meals),
        error: (err) => {
          this.mealError.set(err?.error?.message ?? 'Unable to load meals.');
        },
      });
  }

  protected selectMeal(mealId: number) {
    this.isMealDetailsLoading.set(true);
    this.mealError.set('');
    this.mealsApi
      .readMeal(mealId)
      .pipe(finalize(() => this.isMealDetailsLoading.set(false)))
      .subscribe({
        next: (meal) => {
          this.mealEditorMode.set('edit');
          this.selectedMeal.set(meal);
          this.mealForm.reset({ name: meal.name, servings: meal.servings });
          this.mealIngredients.set(
            meal.ingredients.map((ing) => ({
              foodProductId: ing.foodProductId,
              grams: ing.grams,
            })),
          );
        },
        error: (err) => {
          this.mealError.set(err?.error?.message ?? 'Unable to load meal details.');
        },
      });
  }

  protected startCreateMealMode() {
    this.mealEditorMode.set('create');
    this.selectedMeal.set(null);
    this.mealForm.reset({ name: '', servings: 1 });
    this.mealIngredients.set([]);
    this.ingredientForm.reset({ foodProductId: null, grams: 100 });
  }

  protected addIngredient() {
    if (this.ingredientForm.invalid) {
      this.ingredientForm.markAllAsTouched();
      return;
    }
    const raw = this.ingredientForm.getRawValue();
    // HTML select returns string values — coerce to number
    const foodProductId = raw.foodProductId != null ? Number(raw.foodProductId) : null;
    if (foodProductId == null || isNaN(foodProductId)) return;
    this.mealIngredients.update((list) => [...list, { foodProductId, grams: raw.grams }]);
    this.ingredientForm.reset({ foodProductId: null, grams: 100 });
  }

  protected removeIngredient(index: number) {
    this.mealIngredients.update((list) => list.filter((_, i) => i !== index));
  }

  protected saveMeal() {
    if (this.mealForm.invalid) {
      this.mealForm.markAllAsTouched();
      return;
    }
    if (this.mealIngredients().length === 0) {
      this.mealError.set('Add at least one ingredient.');
      return;
    }
    this.isMealSubmitting.set(true);
    this.mealError.set('');
    const { name, servings } = this.mealForm.getRawValue();
    const payload = {
      name,
      servings,
      ingredients: this.mealIngredients().map((ing) => ({
        foodProductId: ing.foodProductId,
        grams: ing.grams,
      })),
    };
    const req$ =
      this.mealEditorMode() === 'create'
        ? this.mealsApi.createMeal(payload)
        : this.mealsApi.updateMeal(this.selectedMealId()!, payload);
    req$.pipe(finalize(() => this.isMealSubmitting.set(false))).subscribe({
      next: (meal) => {
        this.loadMeals();
        this.selectMeal(meal.id);
      },
      error: (err) => {
        this.mealError.set(
          err?.error?.message ??
            (this.mealEditorMode() === 'create' ? 'Unable to create meal.' : 'Unable to update meal.'),
        );
      },
    });
  }

  protected deleteMeal() {
    if (!this.selectedMealId()) return;
    this.isMealSubmitting.set(true);
    this.mealError.set('');
    this.mealsApi
      .deleteMeal(this.selectedMealId()!)
      .pipe(finalize(() => this.isMealSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.startCreateMealMode();
          this.loadMeals();
        },
        error: (err) => {
          this.mealError.set(err?.error?.message ?? 'Unable to delete meal.');
        },
      });
  }
}
