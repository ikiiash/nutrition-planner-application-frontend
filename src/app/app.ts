import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserService } from './core/auth/user.service';
import { NgbDropdown, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { InitialsPipe } from './initials-pipe';
import { UserRoleEnum } from './core/model/user-role-enum';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    InitialsPipe,
  ],
  templateUrl: './app.html',
})
export class App {
  private userService = inject(UserService);

  protected readonly user = this.userService.getUser();
  protected readonly premiumRole = UserRoleEnum.PREMIUM_USER;

  protected logout() {
    this.userService.logout();
  }

  protected login() {
    this.userService.login();
  }
}
