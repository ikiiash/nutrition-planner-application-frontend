import { computed, inject, Injectable, signal } from '@angular/core';
import { OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs';
import { authCodeFlowConfig } from './auth-code-flow.config';
import { UserModel } from '../model/user-model';
import { UserRoleEnum } from '../model/user-role-enum';

interface KeycloakClaims {
  sub: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly oauthService = inject(OAuthService);
  private readonly user = signal<UserModel | undefined>(undefined);

  readonly roles = computed(() => this.user()?.roles ?? []);

  constructor() {
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.setupAutomaticSilentRefresh();
    this.bindAuthEvents();
    void this.initializeAuth();
  }

  getUser() {
    return this.user.asReadonly();
  }

  hasRole(role: UserRoleEnum | `${UserRoleEnum}`) {
    return computed(() => this.roles().includes(role as UserRoleEnum));
  }

  async login() {
    try {
      await this.oauthService.loadDiscoveryDocumentAndLogin();
      this.updateUserFromToken();
      this.clearAuthQueryParams();
    } catch {
      this.user.set(undefined);
    }
  }

  logout() {
    this.oauthService.logOut();
    this.user.set(undefined);
  }

  async tryLogin() {
    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      this.updateUserFromToken();
      this.clearAuthQueryParams();
    } catch {
      this.user.set(undefined);
    }
    return this.user();
  }

  private async initializeAuth() {
    const hasAuthCallback =
      window.location.search.includes('code=') ||
      window.location.search.includes('state=') ||
      window.location.search.includes('iss=');
    const hasStoredToken = this.oauthService.hasValidAccessToken();

    if (!hasAuthCallback && !hasStoredToken) {
      return;
    }

    await this.tryLogin();
  }

  private bindAuthEvents() {
    this.oauthService.events
      .pipe(filter((event: OAuthEvent) => event.type === 'token_received' || event.type === 'session_terminated'))
      .subscribe(() => {
        this.updateUserFromToken();
      });
  }

  private updateUserFromToken() {
    const claims = this.oauthService.getIdentityClaims() as KeycloakClaims | null;
    if (!claims?.sub) {
      this.user.set(undefined);
      return;
    }

    const accessTokenClaims = this.readAccessTokenClaims();

    this.user.set({
      id: claims.sub,
      name: claims.name ?? claims.preferred_username ?? claims.email ?? 'Unknown user',
      email: claims.email,
      username: claims.preferred_username,
      roles: (claims.realm_access?.roles ?? accessTokenClaims?.realm_access?.roles ?? []).filter(this.isKnownRole),
    });
  }

  private readAccessTokenClaims(): KeycloakClaims | null {
    const accessToken = this.oauthService.getAccessToken();
    if (!accessToken) {
      return null;
    }

    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    try {
      const payload = tokenParts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, '=');

      return JSON.parse(window.atob(payload)) as KeycloakClaims;
    } catch {
      return null;
    }
  }

  private clearAuthQueryParams() {
    if (!window.location.search) {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const authKeys = ['code', 'state', 'session_state', 'iss'];
    let hasAuthParams = false;

    for (const key of authKeys) {
      if (queryParams.has(key)) {
        queryParams.delete(key);
        hasAuthParams = true;
      }
    }

    if (!hasAuthParams) {
      return;
    }

    const nextQuery = queryParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }

  private isKnownRole(role: string): role is UserRoleEnum {
    return Object.values(UserRoleEnum).includes(role as UserRoleEnum);
  }
}
