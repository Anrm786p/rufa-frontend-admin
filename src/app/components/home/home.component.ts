import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  DashboardReport,
  DashboardBucket,
  SalesStatEntry,
} from '../../services/dashboard.service';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  loading = true;
  error: string | null = null;
  report!: DashboardReport;

  bucketsOrder: { key: keyof DashboardReport; label: string }[] = [
    { key: 'last7Days', label: 'Last 7 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'previousMonth', label: 'Previous Month' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'allTime', label: 'All Time' },
  ];
  topTypes: ('products' | 'categories' | 'subcategories')[] = [
    'products',
    'categories',
    'subcategories',
  ];

  constructor(private dashboard: DashboardService) {}

  ngOnInit(): void {
    this.dashboard.getReport().subscribe({
      next: (r) => {
        this.report = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = 'Failed to load dashboard';
        console.error(e);
        this.loading = false;
      },
    });
  }

  formatCurrency(n: number) {
    return (n ?? 0).toLocaleString('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    });
  }
  formatNumber(n: number) {
    return (n ?? 0).toLocaleString();
  }
  bucket(key: keyof DashboardReport): DashboardBucket {
    return (this.report as any)[key];
  }
  hasTops(): boolean {
    return !!this.report?.tops && !this.report.tops.error;
  }
  topEntries(
    scope: 'allTime' | 'last45Days' | 'top3',
    type: 'products' | 'categories' | 'subcategories'
  ): SalesStatEntry[] {
    if (!this.hasTops()) return [];
    return (this.report.tops as any)[scope]?.[type] || [];
  }
}
