import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule],
  template: `
    <p-confirmDialog
      [style]="{ width: '450px' }"
      [baseZIndex]="10000"
      acceptLabel="Yes"
      rejectLabel="No"
      rejectButtonStyleClass="btn btn-danger"
      acceptButtonStyleClass="btn btn-success"
      [breakpoints]="{ '960px': '75vw', '640px': '100vw' }"
    >
    </p-confirmDialog>
  `,
  styles: [
    `
      ::ng-deep .p-confirm-dialog {
        background-color: white !important;
        border-radius: 6px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      }
      ::ng-deep .p-confirm-dialog-message {
        margin: 0;
        padding: 1rem;
      }
      ::ng-deep .p-dialog-footer {
        padding: 1.5rem;
        border-top: 1px solid #dee2e6;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(private confirmationService: ConfirmationService) {}
}
