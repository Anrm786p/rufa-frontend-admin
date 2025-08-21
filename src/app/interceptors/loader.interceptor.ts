import { HttpInterceptorFn, HttpHandlerFn, HttpRequest, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '../services/loader.service';
import { finalize } from 'rxjs/operators';

export const loaderInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {

  const loader_service = inject(LoaderService);

  loader_service.show();
  return next(req).pipe(
    finalize(() => {

      setTimeout(()=>{loader_service.hide()},1000)
      
    
    })
  );
};
