import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserService } from './core/auth/user.service';
import { ThemeService } from './core/theme.service';
import { NgbDropdown, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { InitialsPipe } from './initials-pipe';
import { UserRoleEnum } from './core/model/user-role-enum';
import { NavPillDirective } from './shared/nav-pill.directive';

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
    NavPillDirective,
  ],
  templateUrl: './app.html',
})
export class App {
  private userService = inject(UserService);
  protected themeService = inject(ThemeService);

  protected readonly user = this.userService.getUser();
  protected readonly premiumRole = UserRoleEnum.PREMIUM_USER;
  @ViewChild('mainEl') mainEl!: ElementRef<HTMLElement>;

  protected scrolled = false;
  protected drawerOpen = signal(false);
  protected drawerClosing = signal(false);

  protected closeDrawer() {
    this.drawerClosing.set(true);
    setTimeout(() => {
      this.drawerOpen.set(false);
      this.drawerClosing.set(false);
    }, 220);
  }

  protected onMainScroll(event: Event) {
    this.scrolled = (event.target as HTMLElement).scrollTop > 10;
  }

  protected logout() {
    this.userService.logout();
  }

  protected login() {
    void this.userService.login();
  }

  protected register() {
    void this.userService.register();
  }
}
