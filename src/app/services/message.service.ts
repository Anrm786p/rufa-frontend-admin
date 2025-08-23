import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class SharedMessageService {
  constructor(private messageService: MessageService) {}

  showMessage(
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) {
    this.messageService.add({
      severity: type,
      summary: title,
      detail: message,
      life: 3000,
      styleClass: `custom-toast ${type}`,
    });
  }
}
