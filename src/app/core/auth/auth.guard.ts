import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserService } from './user.service';
import { Router } from '@angular/router';
import { UserRoleEnum } from '../model/user-role-enum';

export const isLoggedIn: CanActivateFn = async () => {
  const userService = inject(UserService);
  const user = await userService.tryLogin();

  if (user) {
    return true;
  }

  userService.login();
  return false;
};

export const isPremiumUser: CanActivateFn = async () => {
  const userService = inject(UserService);
  const router = inject(Router);
  const user = await userService.tryLogin();

  if (!user) {
    userService.login();
    return false;
  }

  if (user.roles.includes(UserRoleEnum.PREMIUM_USER)) {
    return true;
  }

  return router.createUrlTree(['/meal-plan']);
};
