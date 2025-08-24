import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { AddProductComponent } from './add-product.component';
import { SharedDialogComponent } from '../shared/dialog/shared-dialog.component';
import { ProductsService, ApiProduct } from '../../services/products.service';
import { CategoryService, Category } from '../../services/category.service';
import {
  SubcategoryService,
  Subcategory,
} from '../../services/subcategory.service';
import { environment } from 'src/environments/environment';
import { SharedMessageService } from '../../services/message.service';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    FormsModule,
    AddProductComponent,
    SharedDialogComponent,
  ],
  providers: [ProductsService],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
})
export class ProductComponent implements OnInit {
  @ViewChild('addProductDialog') addProductDialog!: AddProductComponent;

  products: any[] = [];
  categories: Category[] = [];
  subcategories: Subcategory[] = [];
  categoryOptions: Category[] = [];
  subCategoryOptions: Subcategory[] = [];
  subcategoriesLoading = false;

  page = 1;
  limit = 20;
  total = 0;
  loading = false;

  searchText = '';
  selectedCategoryId: string = '';
  selectedSubCategoryId: string = '';
  deletingIds = new Set<string>();
  showDeleteDialog = false;
  productPendingDelete: any = null;
  deleteInProgress = false;

  constructor(
    private productsService: ProductsService,
    private categoryService: CategoryService,
    private subcategoryService: SubcategoryService,
    private msg: SharedMessageService
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  onPageChange(e: any) {
    this.page = Math.floor(e.first / e.rows) + 1;
    this.limit = e.rows;
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productsService
      .fetchProducts(this.page, this.limit, {
        name: this.searchText || undefined,
        categoryId: this.selectedCategoryId || undefined,
        subCategoryId: this.selectedSubCategoryId || undefined,
      })
      .subscribe({
        next: (res) => {
          const data = (res as any).data || [];
          const pagination = (res as any).pagination || {};
          this.total = pagination.total || data.length;
          this.products = data.map((p: ApiProduct) => this.mapProduct(p));
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.loading = false;
          this.msg.showMessage('Error', 'Failed to load products', 'error');
        },
      });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.categoryOptions = cats;
      },
      error: (e) => console.error('Failed to load categories', e),
    });
  }

  loadSubcategories(categoryId: string) {
    if (!categoryId) {
      this.subcategories = [];
      this.subCategoryOptions = [];
      return;
    }
    this.subcategoriesLoading = true;
    this.subcategoryService.getSubcategoriesByCategory(categoryId).subscribe({
      next: (subs) => {
        this.subcategories = subs;
        this.subCategoryOptions = subs;
        this.subcategoriesLoading = false;
      },
      error: (e) => {
        console.error('Failed to load subcategories', e);
        this.subcategoriesLoading = false;
      },
    });
  }

  private mapProduct(p: ApiProduct) {
    // Build absolute URL: http://localhost:5000/assets/products/<imageId or filename>
    // Accept both absolute URLs & already-correct paths.
    const baseProductAsset = 'http://localhost:5000/assets/products';
    const normalize = (segment: string) => segment.replace(/^\/+/, '');
    const resolveImagePath = (img: string): string => {
      if (!img) return '';
      if (/^https?:\/\//i.test(img)) return img; // already absolute
      // If path already starts with /assets/products or assets/products keep but make absolute
      if (/^\/?assets\/products\//i.test(img)) {
        const cleaned = img.replace(/^\//, '');
        return `http://localhost:5000/${cleaned}`;
      }
      // If it contains a slash but not our target base, assume backend gave relative path under assets/product
      if (img.includes('/')) {
        return `http://localhost:5000/${normalize(img)}`;
      }
      // Treat as bare filename/id
      return `${baseProductAsset}/${normalize(img)}`;
    };
    const categoryName = (p as any).category?.name || (p as any).category || '';
    const subcategoriesDisplay = (p.subcategories || [])
      .map((sc) => (sc as any).name)
      .join(', ');
    const variations = (p.variations || []).map((v) => ({
      ...v,
      processedImages: (v.images || []).map((img: string) =>
        resolveImagePath(img)
      ),
    }));
    const priceDisplay = this.buildPriceDisplay(variations);
    // Prefer product level imageUrl if provided
    let primaryImage = resolveImagePath(
      (p as any).imageUrl || variations[0]?.processedImages[0] || ''
    );
    // Provide a stable unique id for table dataKey & expansion
    const resolvedId =
      (p as any).id ??
      (p as any)._id ??
      (p as any).code ??
      (p as any).productId ??
      (p as any).uuid ??
      (p as any).slug ??
      `${p.name || 'p'}-${Math.random().toString(36).slice(2, 9)}`;
    // Normalize seoTags to array of strings
    let seoTags: string[] = [];
    const rawTags: any = (p as any).seoTags;
    if (Array.isArray(rawTags))
      seoTags = rawTags.map((t) => (t || '').toString());
    else if (typeof rawTags === 'string' && rawTags.trim())
      seoTags = rawTags
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    return {
      id: resolvedId,
      name: p.name,
      description: (p as any).description || '',
      categoryName,
      category: (p as any).category || null,
      categoryId:
        (p as any).category?._id ||
        (p as any).category?.id ||
        (typeof (p as any).category === 'string' ? (p as any).category : ''),
      subcategories: (p as any).subcategories || [],
      subcategoriesDisplay,
      priceDisplay,
      image: primaryImage,
      variationType: p.variationType,
      variations,
      seoTags,
    };
  }

  private buildPriceDisplay(variations: any[]): string {
    if (!variations.length) return '';
    const prices = variations
      .map((v) => v.ourPrice ?? v.marketPrice ?? 0)
      .filter((v) => v !== null && v !== undefined);
    if (!prices.length) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `${min}` : `${min} - ${max}`;
  }

  onSearchChange() {
    // Reset pagination on new search
    this.page = 1;
    this.loadProducts();
  }

  onSearchEnter() {
    this.page = 1;
    this.loadProducts();
  }

  onCategoryChange() {
    this.selectedSubCategoryId = '';
    this.loadSubcategories(this.selectedCategoryId);
    this.page = 1;
    this.loadProducts();
  }

  onSubCategoryChange() {
    this.page = 1;
    this.loadProducts();
  }

  clearFilters() {
    this.searchText = '';
    this.selectedCategoryId = '';
    this.selectedSubCategoryId = '';
    this.subCategoryOptions = [];
    this.page = 1;
    this.loadProducts();
  }

  viewProduct(row: any) {
    // Will open dialog in view mode
    this.addProductDialog.openDialogView(row);
  }

  handleAdd() {
    this.addProductDialog.openDialog();
  }
  handleEdit(row: any) {
    this.addProductDialog.openDialogEdit(row);
  }
  openDeleteDialog(row: any) {
    if (!row?.id) return;
    this.productPendingDelete = row;
    this.showDeleteDialog = true;
  }

  cancelDelete() {
    if (this.deleteInProgress) return; // block closing while in-flight
    this.showDeleteDialog = false;
    this.productPendingDelete = null;
  }

  confirmDelete() {
    const row = this.productPendingDelete;
    if (!row?.id || this.deleteInProgress) return;
    const id = row.id;
    this.deleteInProgress = true;
    this.deletingIds.add(id);
    this.productsService.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter((p) => p.id !== id);
        this.total = Math.max(0, this.total - 1);
        this.deletingIds.delete(id);
        this.deleteInProgress = false;
        this.showDeleteDialog = false;
        this.productPendingDelete = null;
        this.msg.showMessage(
          'Deleted',
          'Product deleted successfully',
          'success'
        );
      },
      error: (err) => {
        console.error('Failed to delete product', err);
        this.deletingIds.delete(id);
        this.deleteInProgress = false;
        this.msg.showMessage('Error', 'Failed to delete product', 'error');
      },
    });
  }

  onProductAdded(_: any) {
    this.loadProducts();
    this.msg.showMessage('Success', 'Product added', 'success');
  }
}
