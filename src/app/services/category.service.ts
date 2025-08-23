import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

interface CategoryResponse {
  id: string;
  name: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends CategoryResponse {
  imageUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private baseUrl = `${environment.apiUrl}/categories`;
  private assetUrl = `${environment.apiUrl.replace(
    '/api',
    ''
  )}/assets/categories`;

  constructor(private http: HttpClient) {}

  private transformCategory(category: CategoryResponse): Category {
    return {
      ...category,
      imageUrl: `${this.assetUrl}/${category.image}`,
    };
  }

  getCategories(): Observable<Category[]> {
    return this.http
      .get<CategoryResponse[]>(this.baseUrl)
      .pipe(
        map((categories) =>
          categories.map((category) => this.transformCategory(category))
        )
      );
  }

  addCategory(formData: FormData): Observable<Category> {
    return this.http
      .post<CategoryResponse>(this.baseUrl, formData)
      .pipe(map((category) => this.transformCategory(category)));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  updateCategory(id: string, formData: FormData): Observable<Category> {
    return this.http
      .put<CategoryResponse>(`${this.baseUrl}/${id}`, formData)
      .pipe(map((category) => this.transformCategory(category)));
  }
}
