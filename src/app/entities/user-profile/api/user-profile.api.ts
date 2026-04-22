import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserProfile } from '../model/user-profile.model';
import { UpdateUserProfileRequest } from '../model/update-user-profile.request';

@Injectable({
  providedIn: 'root',
})
export class UserProfileApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/user-profile/me`;

  readCurrentUserProfile() {
    return this.http.get<UserProfile>(this.baseUrl);
  }

  updateCurrentUserProfile(payload: UpdateUserProfileRequest) {
    return this.http.put<UserProfile>(this.baseUrl, payload);
  }
}
