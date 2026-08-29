import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './toast-outlet';
import { InstallPromptComponent } from './install-prompt';
import { UpdatePromptComponent } from './update-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, InstallPromptComponent, UpdatePromptComponent],
  template: `<router-outlet /><toast-outlet /><install-prompt /><update-prompt />`,
})
export class App {}
