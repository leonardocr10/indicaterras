import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent],
  template: `<router-outlet /><toast-outlet />`,
})
export class App {}
