import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

const apiRequestPattern = /(^\/api\/(food-products|user-profile|health)(\/|$))|(^https?:\/\/.+\/api\/(food-products|user-profile|health)(\/|$))/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!apiRequestPattern.test(req.url)) {
    return next(req);
  }

  const accessToken = inject(OAuthService).getAccessToken();
  if (!accessToken) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};
