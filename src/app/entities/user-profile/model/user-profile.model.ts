import { UserGoal } from './user-goal.type';

export interface UserProfile {
  id?: number;
  email?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: UserGoal | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetFat?: number | null;
  targetCarbohydrates?: number | null;
}
