import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { FoodPageReuseStrategy } from './core/food-page-reuse-strategy';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeSk from '@angular/common/locales/sk';
import { registerLocaleData } from '@angular/common';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { authInterceptor } from './core/auth/auth-interceptor';

registerLocaleData(localeSk, 'sk');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'sk' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
    provideOAuthClient(),
    { provide: RouteReuseStrategy, useClass: FoodPageReuseStrategy },
    provideTranslateService({
      defaultLanguage: 'sk',
      lang: 'sk',
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
    }),
  ],
};
