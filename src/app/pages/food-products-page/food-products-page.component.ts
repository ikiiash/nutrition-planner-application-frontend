import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FoodProductsApi } from '../../entities/food-product/api/food-products.api';
import { FoodProduct } from '../../entities/food-product/model/food-product.model';

type ProductEditorMode = 'create' | 'edit';
type ProductSortMode = 'alphabet-asc' | 'alphabet-desc';
type ProductCategoryFilter = 'all' | string;
type ProductCategoryOption = { value: ProductCategoryFilter; label: string };

@Component({
  selector: 'app-food-products-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './food-products-page.component.html',
})
export class FoodProductsPageComponent {
  private readonly foodProductsApi = inject(FoodProductsApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly products = signal<FoodProduct[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isDetailsLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly editorMode = signal<ProductEditorMode>('create');
  protected readonly sortMode = signal<ProductSortMode>('alphabet-asc');
  protected readonly categoryFilter = signal<ProductCategoryFilter>('all');
  protected readonly selectedProduct = signal<FoodProduct | null>(null);
  protected readonly selectedProductId = computed(() => this.selectedProduct()?.id ?? null);

  protected readonly categoryOptions = computed<ProductCategoryOption[]>(() => {
    const categories = new Map<string, string>();

    for (const product of this.products()) {
      const normalizedCategory = this.normalizeCategory(product.category);
      const displayCategory = product.category?.trim();
      if (!normalizedCategory || !displayCategory || categories.has(normalizedCategory)) {
        continue;
      }

      categories.set(normalizedCategory, displayCategory);
    }

    const options = Array.from(categories.entries())
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ value, label }));

    return [{ value: 'all', label: 'All categories' }, ...options];
  });

  protected readonly sortedProducts = computed(() => {
    const filteredProducts =
      this.categoryFilter() === 'all'
        ? this.products()
        : this.products().filter(
            (product) => this.normalizeCategory(product.category) === this.normalizeCategory(this.categoryFilter()),
          );

    const products = [...filteredProducts];
    return products.sort((left, right) => {
      const comparison = left.name.localeCompare(right.name);
      return this.sortMode() === 'alphabet-asc' ? comparison : comparison * -1;
    });
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    category: ['', [Validators.required]],
    grams: [100, [Validators.required, Validators.min(0.0001)]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
    carbohydrates: [0, [Validators.required, Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0)]],
    photoUrl: [''],
  });

  constructor() {
    this.loadProducts();
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
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.foodProductsApi
      .readFoodProducts(this.searchTerm())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (products) => {
          this.products.set(products);

          const availableCategories = new Set(
            products
              .map((product) => this.normalizeCategory(product.category))
              .filter((category) => category.length > 0),
          );

          if (this.categoryFilter() !== 'all' && !availableCategories.has(this.normalizeCategory(this.categoryFilter()))) {
            this.categoryFilter.set('all');
          }

          const selectedProductId = this.selectedProductId();
          if (selectedProductId && !products.some((product) => product.id === selectedProductId)) {
            this.startCreateMode();
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to load food products.');
        },
      });
  }

  protected selectProduct(productId: number) {
    this.isDetailsLoading.set(true);
    this.errorMessage.set('');

    this.foodProductsApi
      .readFoodProduct(productId)
      .pipe(finalize(() => this.isDetailsLoading.set(false)))
      .subscribe({
        next: (product) => {
          this.editorMode.set('edit');
          this.selectedProduct.set(product);
          this.form.reset({
            name: product.name,
            category: product.category,
            grams: product.grams,
            calories: product.calories,
            protein: product.protein,
            fat: product.fat,
            carbohydrates: product.carbohydrates,
            price: product.price,
            photoUrl: product.photoUrl ?? '',
          });
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to load product details.');
        },
      });
  }

  protected startCreateMode() {
    this.editorMode.set('create');
    this.selectedProduct.set(null);
    this.form.reset({
      name: '',
      category: '',
      grams: 100,
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      price: 0,
      photoUrl: '',
    });
  }

  protected saveFoodProduct() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request$ =
      this.editorMode() === 'create'
        ? this.foodProductsApi.createFoodProduct(this.form.getRawValue())
        : this.foodProductsApi.updateFoodProduct(this.selectedProductId()!, this.form.getRawValue());

    request$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (product) => {
        this.loadProducts();
        this.selectProduct(product.id);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.message ??
            (this.editorMode() === 'create' ? 'Unable to create food product.' : 'Unable to update food product.'),
        );
      },
    });
  }

  protected deleteFoodProduct() {
    if (!this.selectedProductId()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.foodProductsApi
      .deleteFoodProduct(this.selectedProductId()!)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.startCreateMode();
          this.loadProducts();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to delete food product.');
        },
      });
  }

  private normalizeCategory(category: string | null | undefined) {
    return category?.trim().toLocaleLowerCase() ?? '';
  }
}
