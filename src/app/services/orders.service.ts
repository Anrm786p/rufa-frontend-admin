import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface OrderItemSummary {
  id: number;
  orderId: number;
  productName: string;
  variationType?: string | null;
  variationValue?: string | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
  purchasePrice: number;
  price: number;
  quantity: number;
  weight?: number | null;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'completed';

export interface OrderListEntry {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  status: OrderStatus;
  isCOD: boolean;
  bill: number;
  codFee: number;
  deliveryFee: number;
  totalBill: number;
  paymentRef?: string | null;
  notes?: string | null;
  trackingId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSummary[];
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  orderId?: number;
}

export interface OrdersResponse {
  data: OrderListEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface OrderDetail extends OrderListEntry {
  customerStats?: { totalCompletedItems: number; totalReturnedItems: number };
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private http: HttpClient) {}

  list(query: OrdersQuery = {}): Observable<OrdersResponse> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '')
        params = params.set(k, String(v));
    });
    return this.http
      .get<OrdersResponse>(`${environment.apiUrl}/orders`, { params })
      .pipe(map((res) => ({ ...res, data: res.data || [] })));
  }

  get(id: string | number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${environment.apiUrl}/orders/${id}`);
  }

  updateStatus(
    id: string | number,
    status: OrderStatus,
    trackingId?: string | null
  ) {
    const body: any = { status };
    if (trackingId) body.trackingId = trackingId;
    return this.http.patch(`${environment.apiUrl}/orders/${id}/status`, body);
  }
}
