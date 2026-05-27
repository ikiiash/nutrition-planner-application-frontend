import { ActivityLevel } from './activity-level.type';
import { Gender } from './gender.type';
import { UserGoal } from './user-goal.type';

export interface UserProfile {
  id?: number;
  email?: string | null;
  nickname?: string | null;
  firstName?: string | null;
  gender?: Gender | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  goal?: UserGoal | null;
  bmr?: number | null;
  tdee?: number | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetFat?: number | null;
  targetCarbohydrates?: number | null;
}
