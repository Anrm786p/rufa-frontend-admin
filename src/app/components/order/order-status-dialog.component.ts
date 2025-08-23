import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { OrderStatus } from '../../services/orders.service';

@Component({
  selector: 'app-order-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    InputTextModule,
    DialogModule,
    ButtonModule,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '420px' }"
      [contentStyle]="{ background: '#ffffff' }"
      [maskStyle]="{ background: 'rgba(15,23,42,0.55)' }"
      header="Update Status"
      (onHide)="cancel()"
      styleClass="order-dialog"
    >
      <div class="field" style="margin-bottom:1rem;">
        <label class="label">Status</label>
        <p-dropdown
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          [(ngModel)]="status"
        ></p-dropdown>
      </div>
      <div class="field" style="margin-bottom:1rem;">
        <label class="label"
          >Tracking ID
          <span *ngIf="status === 'shipped'" style="color:#ef4444"
            >*</span
          ></label
        >
        <input
          pInputText
          type="text"
          [(ngModel)]="trackingId"
          placeholder="Optional unless shipped"
        />
      </div>
      <div
        *ngIf="error"
        style="color:#b91c1c; font-size:.75rem; margin-bottom:.5rem;"
      >
        {{ error }}
      </div>
      <div
        class="flex"
        style="display:flex; justify-content:flex-end; gap:.5rem;"
      >
        <button
          pButton
          label="Cancel"
          class="p-button-text"
          (click)="cancel()"
        ></button>
        <button
          pButton
          label="Update"
          (click)="submit()"
          [disabled]="submitting"
        ></button>
      </div>
    </p-dialog>
  `,
})
export class OrderStatusDialogComponent {
  @Input() canComplete: boolean = false; // super admin flag
  @Output() confirmed = new EventEmitter<{
    status: OrderStatus;
    trackingId?: string | null;
  }>();
  @Output() closed = new EventEmitter<void>();

  visible = false;
  submitting = false;
  status: OrderStatus | '' = '';
  currentStatus: OrderStatus | '' = '';
  trackingId = '';
  error = '';

  statusOptions: { label: string; value: OrderStatus; disabled?: boolean }[] =
    [];

  private transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['processing', 'cancelled'],
    processing: ['pending', 'shipped', 'cancelled'],
    shipped: ['delivered', 'returned'],
    delivered: ['completed'],
    returned: [],
    cancelled: ['pending', 'processing'], // cancelled can reopen
    completed: [],
  };

  private buildOptions(current: OrderStatus | '') {
    const norm = (current || '').toString().trim().toLowerCase();
    if (!norm) {
      this.statusOptions = [];
      return;
    }
    const key = norm as OrderStatus;
    let allowed = [key, ...(this.transitions[key] || [])].map(
      (s) => s.toLowerCase() as OrderStatus
    );
    allowed = Array.from(new Set(allowed));
    this.statusOptions = allowed.map((v) => ({
      label:
        this.ucfirst(v) +
        (v === 'completed' && !this.canComplete ? ' (restricted)' : ''),
      value: v,
      disabled: v === 'completed' && !this.canComplete,
    }));
    this.status = key; // default to current status so patch can send it if desired
  }

  private ucfirst(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  open(current: OrderStatus | '', trackingId?: string | null) {
    this.currentStatus = (current || '')
      .toString()
      .trim()
      .toLowerCase() as OrderStatus;
    this.trackingId = trackingId || '';
    this.error = '';
    this.buildOptions(this.currentStatus);
    this.visible = true;
  }

  submit() {
    this.error = '';
    if (!this.status) {
      this.error = 'No transition available';
      return;
    }
    if (this.status === 'shipped' && !this.trackingId.trim()) {
      this.error = 'Tracking ID required for shipped';
      return;
    }
    if (this.status === 'completed' && !this.canComplete) {
      this.error = 'You cannot set status to completed';
      return;
    }
    this.submitting = true;
    this.confirmed.emit({
      status: this.status as OrderStatus,
      trackingId: this.trackingId.trim() || undefined,
    });
  }

  cancel() {
    this.visible = false;
    this.closed.emit();
  }
}
