import { UserGoal } from './user-goal.type';

export interface UpdateUserProfileRequest {
  age: number;
  heightCm: number;
  weightKg: number;
  goal: UserGoal;
}
