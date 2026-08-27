import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './toast-outlet';
import { InstallPromptComponent } from './install-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, InstallPromptComponent],
  template: `<router-outlet /><toast-outlet /><install-prompt />`,
})
export class App {}
