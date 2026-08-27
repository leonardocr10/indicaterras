import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent, BottomNavigationComponent } from './components';
import { InstallPromptComponent } from './install-prompt';

@Component({
  selector: 'mobile-layout',
  standalone: true,
  imports: [RouterOutlet, BottomNavigationComponent, InstallPromptComponent],
  template: `
    <div class="mobile-layout">
      <router-outlet />
      <bottom-navigation />
      <install-prompt />
    </div>
  `,
})
export class MobileLayoutComponent {}

@Component({
  selector: 'admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent],
  template: `
    <section class="admin-page">
      <admin-sidebar />
      <div class="admin-layout-main">
        <router-outlet />
      </div>
    </section>
  `,
})
export class AdminLayoutComponent {}
