import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserProfileApi } from '../../entities/user-profile/api/user-profile.api';
import { UserProfile } from '../../entities/user-profile/model/user-profile.model';
import { UserGoal } from '../../entities/user-profile/model/user-goal.type';
import { Gender } from '../../entities/user-profile/model/gender.type';
import { ActivityLevel } from '../../entities/user-profile/model/activity-level.type';
import { FEMALE_NORMS, MALE_NORMS, NUTRIENT_LABELS, NutrientNorms } from '../../shared/nutrient-norms';
import { CountUpDirective } from '../../shared/count-up.directive';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, DecimalPipe, CountUpDirective],
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent {
  private readonly userProfileApi = inject(UserProfileApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly norms = computed<NutrientNorms>(() =>
    this.profile()?.gender === 'FEMALE' ? FEMALE_NORMS : MALE_NORMS,
  );

  protected readonly normRows = computed(() =>
    (Object.entries(NUTRIENT_LABELS) as [keyof NutrientNorms, { label: string; unit: string }][]).map(
      ([key, meta]) => ({ label: meta.label, unit: meta.unit, norm: this.norms()[key] }),
    ),
  );

  protected readonly normGroups = computed(() => {
    const n = this.norms();
    return [
      {
        title: 'Minerals',
        items: [
          { label: 'Na (Sodium)',    unit: 'mg',  norm: n.sodiumMg },
          { label: 'K (Potassium)',  unit: 'mg',  norm: n.potassiumMg },
          { label: 'Mg (Magnesium)', unit: 'mg',  norm: n.magnesiumMg },
          { label: 'Fe (Iron)',      unit: 'mg',  norm: n.ironMg },
          { label: 'Ca (Calcium)',   unit: 'mg',  norm: n.calciumMg },
          { label: 'Zn (Zinc)',      unit: 'mg',  norm: n.zincMg },
        ],
      },
      {
        title: 'Vitamins',
        items: [
          { label: 'Vit A',   unit: 'mcg', norm: n.vitaminAMcg },
          { label: 'Vit C',   unit: 'mg',  norm: n.vitaminCMg },
          { label: 'Vit D',   unit: 'mcg', norm: n.vitaminDMcg },
          { label: 'Vit E',   unit: 'mg',  norm: n.vitaminEMg },
          { label: 'Vit K',   unit: 'mcg', norm: n.vitaminKMcg },
        ],
      },
      {
        title: 'B-Vitamins',
        items: [
          { label: 'B1 (Thiamine)',   unit: 'mg',  norm: n.vitaminB1Mg },
          { label: 'B2 (Riboflavin)', unit: 'mg',  norm: n.vitaminB2Mg },
          { label: 'B6',              unit: 'mg',  norm: n.vitaminB6Mg },
          { label: 'B9 (Folate)',     unit: 'mcg', norm: n.vitaminB9Mcg },
          { label: 'B12',             unit: 'mcg', norm: n.vitaminB12Mcg },
        ],
      },
    ];
  });

  protected microNormsOpen = signal(false);

  protected readonly genderOptions: Array<{ value: Gender; label: string }> = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
  ];

  protected readonly activityOptions: Array<{ value: ActivityLevel; label: string; description: string }> = [
    { value: 'SEDENTARY', label: 'Sedentary', description: 'Little or no exercise' },
    { value: 'LIGHTLY_ACTIVE', label: 'Lightly active', description: 'Light exercise 1–3 days/week' },
    { value: 'MODERATELY_ACTIVE', label: 'Moderately active', description: 'Moderate exercise 3–5 days/week' },
    { value: 'VERY_ACTIVE', label: 'Very active', description: 'Hard exercise 6–7 days/week' },
    { value: 'EXTRA_ACTIVE', label: 'Extra active', description: 'Very hard exercise or physical job' },
  ];

  protected readonly goalOptions: Array<{ value: UserGoal; label: string }> = [
    { value: 'LOSE_WEIGHT', label: 'Lose weight' },
    { value: 'MAINTAIN_WEIGHT', label: 'Maintain weight' },
    { value: 'GAIN_MASS', label: 'Gain mass' },
  ];

  protected readonly form = this.formBuilder.group({
    nickname: [''],
    firstName: [''],
    gender: [null as Gender | null, [Validators.required]],
    age: [null as number | null, [Validators.required, Validators.min(1), Validators.max(120)]],
    heightCm: [null as number | null, [Validators.required, Validators.min(50), Validators.max(250)]],
    weightKg: [null as number | null, [Validators.required, Validators.min(20), Validators.max(300)]],
    activityLevel: [null as ActivityLevel | null, [Validators.required]],
    goal: [null as UserGoal | null, [Validators.required]],
  });

  constructor() {
    this.loadProfile();
  }

  protected loadProfile() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.userProfileApi
      .readCurrentUserProfile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            nickname: profile.nickname ?? '',
            firstName: profile.firstName ?? '',
            gender: (profile.gender as Gender | null) ?? null,
            age: profile.age ?? null,
            heightCm: profile.heightCm ?? null,
            weightKg: profile.weightKg ?? null,
            activityLevel: (profile.activityLevel as ActivityLevel | null) ?? null,
            goal: (profile.goal as UserGoal | null) ?? null,
          });
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to load user profile.');
        },
      });
  }

  protected saveProfile() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.userProfileApi
      .updateCurrentUserProfile({
        nickname: raw.nickname || null,
        firstName: raw.firstName || null,
        gender: raw.gender!,
        age: raw.age!,
        heightCm: raw.heightCm!,
        weightKg: raw.weightKg!,
        activityLevel: raw.activityLevel!,
        goal: raw.goal!,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to save user profile.');
        },
      });
  }

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }
}
