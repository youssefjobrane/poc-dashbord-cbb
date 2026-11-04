import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { mockApiInterceptor } from './core/mock-api/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Remove mockApiInterceptor to call a real /api/dashboard backend.
    provideHttpClient(withFetch(), withInterceptors([mockApiInterceptor])),
  ],
};
