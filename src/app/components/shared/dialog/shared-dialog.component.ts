import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-shared-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <p-dialog
      [header]="title"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '60vw', maxWidth: '800px' }"
      [contentStyle]="{ overflow: 'auto' }"
      (onHide)="onClose()"
    >
      <div class="dialog-content">
        <ng-content></ng-content>
      </div>

      <div class="p-dialog-footer">
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="onCancel()"
        >
          {{ cancelLabel || 'Cancel' }}
        </button>
        <button
          *ngIf="showSubmit"
          type="button"
          [class]="'btn btn-success ' + (isSubmitDisabled ? 'disabled' : '')"
          [disabled]="isSubmitDisabled"
          (click)="onSubmit()"
        >
          {{ submitLabel }}
        </button>
      </div>
    </p-dialog>
  `,
  styleUrls: ['./shared-dialog.component.css'],
})
export class SharedDialogComponent {
  @Input() title: string = '';
  @Input() visible: boolean = false;
  @Input() submitLabel: string = 'Submit';
  @Input() cancelLabel: string = 'Cancel';
  @Input() showSubmit: boolean = true;
  @Input() submitType: 'button' | 'submit' = 'submit';
  @Input() isSubmitDisabled: boolean = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.cancel.emit();
  }

  onSubmit() {
    this.submit.emit();
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.cancel.emit();
  }
}
