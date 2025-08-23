import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { OrderStatusDialogComponent } from './order-status-dialog.component';
import {
  OrdersService,
  OrderListEntry,
  OrderStatus,
} from '../../services/orders.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    DialogModule,
    OrderStatusDialogComponent,
  ],
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.css'],
})
export class OrderComponent implements OnInit {
  columns = [
    { field: 'id', header: 'ID' },
    { field: 'customerName', header: 'Customer' },
    { field: 'customerPhone', header: 'Phone' },
    { field: 'customerCity', header: 'City' },
    { field: 'status', header: 'Status' },
    { field: 'totalBill', header: 'Total' },
    { field: 'isCOD', header: 'COD' },
    { field: 'createdAt', header: 'Created' },
  ];

  orders: OrderListEntry[] = [];
  selectedOrder: OrderListEntry | null = null;
  viewingDetail: any = null;
  viewDialogVisible = false;
  updatingId: number | string | null = null;
  isSuperAdmin = false; // TODO: inject auth/user role and set
  loading = false;
  page = 1;
  rows = 20;
  totalRecords = 0;
  searchName = '';
  searchPhone = '';
  statusFilter: OrderStatus | '' = '';

  statusOptions: { label: string; value: OrderStatus | '' }[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Returned', value: 'returned' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Completed', value: 'completed' },
  ];
  constructor(private ordersService: OrdersService) {}

  ngOnInit(): void {
    // derive super admin role strictly from 'userInfo' stored by AuthService
    try {
      const raw = localStorage.getItem('userInfo');
      if (raw) {
        const parsed = JSON.parse(raw);
        const role = (parsed?.role || '').toString().toLowerCase();
        this.isSuperAdmin = role === 'super_admin';
      }
    } catch {
      // swallow JSON parse errors silently
    }
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.ordersService
      .list({
        page: this.page,
        limit: this.rows,
        customerName: this.searchName || undefined,
        customerPhone: this.searchPhone || undefined,
        status: (this.statusFilter as OrderStatus) || undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders = res.data;
          this.totalRecords = res.total;
          this.loading = false;
        },
        error: (_) => {
          this.loading = false;
        },
      });
  }

  // add functionality removed per current requirements (orders created elsewhere)

  handleEdit(order: any) {
    this.viewingDetail = null;
    this.selectedOrder = order;
    this.viewDialogVisible = true;
    this.ordersService.get(order.id).subscribe((d) => (this.viewingDetail = d));
  }

  handleDelete(order: any) {
    // replaced by status change; open status dialog
    this.openStatusDialog(order);
  }

  onNameEnter() {
    this.page = 1;
    this.fetch();
  }
  onPhoneEnter() {
    this.page = 1;
    this.fetch();
  }
  onPageChange(e: any) {
    // PrimeNG TablePageEvent uses 'first' and 'rows'; derive page number
    if (e && typeof e.first === 'number' && typeof e.rows === 'number') {
      this.rows = e.rows;
      this.page = Math.floor(e.first / e.rows) + 1;
      this.fetch();
    }
  }
  changeStatusFilter(status: OrderStatus | '') {
    this.statusFilter = status;
    this.page = 1;
    this.fetch();
  }
  clearFilters() {
    this.searchName = '';
    this.searchPhone = '';
    this.statusFilter = '';
    this.page = 1;
    this.fetch();
  }

  // Status dialog logic
  @ViewChild('statusDialog') statusDialogComponent: any;
  statusTarget: OrderListEntry | null = null;

  openStatusDialog(order: OrderListEntry) {
    this.statusTarget = order;
    if (this.statusDialogComponent?.open) {
      this.statusDialogComponent.open(order.status, (order as any).trackingId);
    }
  }

  onStatusConfirmed(e: { status: OrderStatus; trackingId?: string | null }) {
    if (!this.statusTarget) return;
    const id = this.statusTarget.id;
    this.updatingId = id;
    this.ordersService.updateStatus(id, e.status, e.trackingId).subscribe({
      next: () => {
        this.updatingId = null;
        this.fetch();
        // auto close the status dialog
        if (this.statusDialogComponent?.cancel) {
          this.statusDialogComponent.cancel();
        } else if (this.statusDialogComponent) {
          this.statusDialogComponent.visible = false;
        }
      },
      error: () => {
        this.updatingId = null;
      },
    });
  }
}
