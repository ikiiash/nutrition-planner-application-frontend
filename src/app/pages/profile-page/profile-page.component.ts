import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserProfileApi } from '../../entities/user-profile/api/user-profile.api';
import { UserProfile } from '../../entities/user-profile/model/user-profile.model';
import { UserGoal } from '../../entities/user-profile/model/user-goal.type';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent {
  private readonly userProfileApi = inject(UserProfileApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly goalOptions: Array<{ value: UserGoal; label: string }> = [
    { value: 'LOSE_WEIGHT', label: 'Lose weight' },
    { value: 'MAINTAIN_WEIGHT', label: 'Maintain weight' },
    { value: 'GAIN_MASS', label: 'Gain mass' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    age: [18, [Validators.required, Validators.min(1)]],
    heightCm: [170, [Validators.required, Validators.min(0.1)]],
    weightKg: [70, [Validators.required, Validators.min(0.1)]],
    goal: ['MAINTAIN_WEIGHT' as UserGoal, [Validators.required]],
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
          this.form.reset({
            age: profile.age ?? 18,
            heightCm: profile.heightCm ?? 170,
            weightKg: profile.weightKg ?? 70,
            goal: (profile.goal as UserGoal | null) ?? 'MAINTAIN_WEIGHT',
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

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.userProfileApi
      .updateCurrentUserProfile(this.form.getRawValue())
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
}
