import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DashboardRange {
  startDate: string;
  endDate: string;
  timezone: string;
}
export interface DashboardBucket {
  sales: number;
  profit: number;
  orderCount: number;
  productCount: number;
  expense: number;
  netProfit: number;
  range: DashboardRange;
}
export interface SalesStatEntry {
  name: string;
  quantitySold: number;
  ordersCount: number;
  revenue: number;
  profit: number;
  lastSoldAt: string | null;
}
export interface DashboardReport {
  // KPI buckets (updated backend spec): last7Days, thisMonth, previousMonth, thisYear, allTime
  last7Days: DashboardBucket;
  thisMonth: DashboardBucket;
  previousMonth: DashboardBucket;
  thisYear: DashboardBucket;
  allTime: DashboardBucket;
  // Tops: keep last45Days only inside tops for bestseller ranking; allTime renamed from total
  tops?: {
    error?: string;
    allTime?: {
      products: SalesStatEntry[];
      categories: SalesStatEntry[];
      subcategories: SalesStatEntry[];
    };
    last45Days?: {
      products: SalesStatEntry[];
      categories: SalesStatEntry[];
      subcategories: SalesStatEntry[];
      range: DashboardRange;
    };
    top3?: {
      products: SalesStatEntry[];
      categories: SalesStatEntry[];
      subcategories: SalesStatEntry[];
    };
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  getReport(): Observable<DashboardReport> {
    return this.http
      .get<DashboardReport>(`${environment.apiUrl}/dashboard/report`)
      .pipe(map((r) => this.normalize(r)));
  }
  private normalize(report: DashboardReport): DashboardReport {
    // ensure arrays
    const empty: any[] = [];
    const tops = report.tops;
    if (tops && !tops.error) {
      tops.allTime ||= {
        products: empty,
        categories: empty,
        subcategories: empty,
      } as any;
      // last45Days range now comes directly from API inside tops.last45Days (no root last45Days bucket)
      tops.last45Days ||= {
        products: empty,
        categories: empty,
        subcategories: empty,
        range: { startDate: '', endDate: '', timezone: '' },
      } as any;
      tops.top3 ||= {
        products: empty,
        categories: empty,
        subcategories: empty,
      } as any;
      ['products', 'categories', 'subcategories'].forEach((k) => {
        (tops.allTime as any)[k] ||= empty;
        (tops.last45Days as any)[k] ||= empty;
        (tops.top3 as any)[k] ||= empty;
      });
    }
    return report;
  }
}
