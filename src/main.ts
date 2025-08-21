
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LoaderService } from './app/services/loader.service';
import { loaderInterceptor } from './app/interceptors/loader.interceptor';


const loaderService = new LoaderService();

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loaderInterceptor]))
  ]
});
