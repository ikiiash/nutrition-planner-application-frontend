import { ActivityLevel } from './activity-level.type';
import { Gender } from './gender.type';
import { UserGoal } from './user-goal.type';

export interface UpdateUserProfileRequest {
  nickname?: string | null;
  firstName?: string | null;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: UserGoal;
}
