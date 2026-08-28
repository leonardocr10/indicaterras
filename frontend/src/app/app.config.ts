import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { sessionInterceptor } from './services/session.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { FileDropService } from './services/file-drop.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideEnvironmentInitializer(() => inject(FileDropService).start()),
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
