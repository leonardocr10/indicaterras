import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent, AdminTopMenuComponent, BottomNavigationComponent } from './components';

@Component({
  selector: 'mobile-layout',
  standalone: true,
  imports: [RouterOutlet, BottomNavigationComponent],
  template: `
    <div class="mobile-layout">
      <router-outlet />
      <bottom-navigation />
    </div>
  `,
})
export class MobileLayoutComponent {}

@Component({
  selector: 'admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminTopMenuComponent],
  template: `
    <section class="admin-page">
      <admin-sidebar />
      <div class="admin-layout-main">
        <admin-top-menu />
        <router-outlet />
      </div>
    </section>
  `,
})
export class AdminLayoutComponent {}
