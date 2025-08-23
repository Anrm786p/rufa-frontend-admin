import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationDialogService {
  constructor(private confirmationService: ConfirmationService) {}

  static forRoot() {
    return {
      ngModule: ConfirmationDialogService,
      providers: [ConfirmationService],
    };
  }

  confirm(
    message: string,
    header: string = 'Confirm',
    icon: string = 'pi pi-exclamation-triangle'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message,
        header,
        icon,
        accept: () => {
          resolve(true);
        },
        reject: () => {
          resolve(false);
        },
      });
    });
  }
}
