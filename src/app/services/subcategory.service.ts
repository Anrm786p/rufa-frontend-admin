import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, switchMap, forkJoin } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Category, CategoryService } from './category.service';

interface SubcategoryResponse {
  id: string;
  name: string;
  image: string;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory extends SubcategoryResponse {
  imageUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubcategoryService {
  private baseUrl = `${environment.apiUrl}/subcategories`;
  private assetUrl = `${environment.apiUrl.replace(
    '/api',
    ''
  )}/assets/subcategories`;

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService
  ) {}

  private transformSubcategory(subcategory: SubcategoryResponse): Subcategory {
    return {
      ...subcategory,
      imageUrl: `${this.assetUrl}/${subcategory.image}`,
    };
  }

  getSubcategories(): Observable<Subcategory[]> {
    return forkJoin({
      subcategories: this.http.get<SubcategoryResponse[]>(this.baseUrl),
      categories: this.categoryService.getCategories(),
    }).pipe(
      map(({ subcategories, categories }) => {
        // Create a map of categories for quick lookup
        const categoryMap = new Map<string, Category>();
        categories.forEach((category) =>
          categoryMap.set(category.id, category)
        );

        // Transform subcategories and add category information
        return subcategories.map((subcategory) => {
          const category = categoryMap.get(subcategory.categoryId);
          return this.transformSubcategory({
            ...subcategory,
            category: category,
          });
        });
      })
    );
  }

  addSubcategory(formData: FormData): Observable<Subcategory> {
    return this.http.post<SubcategoryResponse>(this.baseUrl, formData).pipe(
      switchMap((subcategory) => {
        // Fetch the category information for the newly created subcategory
        return this.categoryService.getCategories().pipe(
          map((categories) => {
            const category = categories.find(
              (cat) => cat.id === subcategory.categoryId
            );
            return this.transformSubcategory({
              ...subcategory,
              category: category,
            });
          })
        );
      })
    );
  }

  deleteSubcategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  updateSubcategory(id: string, formData: FormData): Observable<Subcategory> {
    return this.http
      .put<SubcategoryResponse>(`${this.baseUrl}/${id}`, formData)
      .pipe(
        switchMap((subcategory) => {
          // Fetch the category information for the updated subcategory
          return this.categoryService.getCategories().pipe(
            map((categories) => {
              const category = categories.find(
                (cat) => cat.id === subcategory.categoryId
              );
              return this.transformSubcategory({
                ...subcategory,
                category: category,
              });
            })
          );
        })
      );
  }

  getSubcategoriesByCategory(categoryId: string): Observable<Subcategory[]> {
    return this.http
      .get<SubcategoryResponse[]>(
        `${environment.apiUrl}/subcategories/by-category/${categoryId}`
      )
      .pipe(map((list) => list.map((item) => this.transformSubcategory(item))));
  }
}
