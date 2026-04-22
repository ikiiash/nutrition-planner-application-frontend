import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authCodeFlowConfig: AuthConfig = {
  issuer: `${environment.keyCloakUrl}/realms/NUTRITION`,
  redirectUri: `${environment.appUrl}/`,
  clientId: 'nutrition-planner-client',
  scope: 'openid profile email',
  responseType: 'code',
  requireHttps: false,
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: true,
};
