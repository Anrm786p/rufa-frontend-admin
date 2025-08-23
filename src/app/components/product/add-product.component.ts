import { Component, Output, EventEmitter, HostBinding } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
  AbstractControl,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ChipsModule } from 'primeng/chips';
import { SharedDialogComponent } from '../shared/dialog/shared-dialog.component';
import { CategoryService, Category } from '../../services/category.service';
import {
  SubcategoryService,
  Subcategory,
} from '../../services/subcategory.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    FileUploadModule,
    SelectModule,
    MultiSelectModule,
    TagModule,
    ChipsModule,
    CommonModule,
    SharedDialogComponent,
  ],
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css'],
})
export class AddProductComponent {
  @Output() productAdded = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();
  displayDialog = false;
  mode: 'create' | 'edit' | 'view' = 'create';
  editingId: string | null = null;
  addProductForm: FormGroup;
  currentProduct: any = null; // keeps original product (for view mode images, etc.)
  private removedVariationIds: string[] = []; // track deleted variations in edit mode
  variationImageRemoval: { [variationId: string]: Set<string> } = {}; // track images marked for removal per variation
  private variationAllImagesRemoved: { [variationId: string]: boolean } = {}; // flag when all existing images cleared pending replacement

  categories: Category[] = [];
  subcategories: Subcategory[] = [];
  filteredSubcategories: Subcategory[] = [];

  variationTypeOptions = [
    { label: 'Single', value: 'single' },
    { label: 'Multi', value: 'multi' },
  ];

  maxImagesPerVariation = 3;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private categoryService: CategoryService,
    private subcategoryService: SubcategoryService
  ) {
    this.addProductForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
      subcategoryIds: [[], Validators.required],
      variationType: ['single', Validators.required],
      seoTags: [[]], // now optional
      variations: this.fb.array([this.createVariationGroup()]),
    });
    this.loadCategories();
    // Enforce single variation when variationType is 'single'
    this.addProductForm.get('variationType')?.valueChanges.subscribe((val) => {
      if (val === 'single' && this.variationsArray.length > 1) {
        while (this.variationsArray.length > 1) {
          this.variationsArray.removeAt(this.variationsArray.length - 1);
        }
      }
    });
  }

  // Variation FormGroup factory
  private createVariationGroup(): FormGroup {
    return this.fb.group({
      id: [''], // existing variation id (edit mode)
      name: ['', Validators.required],
      ourPrice: [null, [Validators.required, Validators.min(0)]],
      marketPrice: [null, [Validators.required, Validators.min(0)]],
      purchasePrice: [null, [Validators.required, Validators.min(0)]],
      weight: [null, [Validators.required, Validators.min(0)]],
      images: [
        [],
        [
          Validators.required,
          this.minImagesValidator(1),
          this.maxImagesValidator(this.maxImagesPerVariation),
        ],
      ],
    });
  }

  get variationsArray(): FormArray {
    return this.addProductForm.get('variations') as FormArray;
  }

  addVariation() {
    if (this.addProductForm.get('variationType')?.value === 'single') return; // block in single variation mode
    this.variationsArray.push(this.createVariationGroup());
  }

  removeVariation(index: number) {
    if (this.variationsArray.length > 1) {
      const grp = this.variationsArray.at(index) as FormGroup;
      const existingId = grp?.get('id')?.value;
      if (this.mode === 'edit' && existingId)
        this.removedVariationIds.push(existingId);
      this.variationsArray.removeAt(index);
    }
  }

  onCategoryChange(categoryId: string) {
    this.addProductForm.patchValue({ subcategoryIds: [] });
    if (!categoryId) {
      this.filteredSubcategories = [];
      return;
    }
    this.subcategoryService.getSubcategoriesByCategory(categoryId).subscribe({
      next: (subs: Subcategory[]) => (this.filteredSubcategories = subs),
      error: (err: any) => console.error('Error loading subcategories', err),
    });
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
      error: (err) => console.error('Error loading categories', err),
    });
  }

  // SEO tags handled by p-chips component
  onVariationFilesSelected(event: any, index: number) {
    const files: File[] = Array.from(event.files || event.target.files || []);
    const ctrl = this.variationsArray.at(index).get('images');
    if (!ctrl) return;
    const existing: File[] = ctrl.value || [];
    const combined = [...existing, ...files].slice(
      0,
      this.maxImagesPerVariation
    );
    ctrl.setValue(combined);
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity();
  }

  removeVariationImage(variationIndex: number, imageIndex: number) {
    const ctrl = this.variationsArray.at(variationIndex).get('images');
    if (!ctrl) return;
    const arr = [...(ctrl.value || [])];
    arr.splice(imageIndex, 1);
    ctrl.setValue(arr);
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity();
  }

  // Validators
  private minImagesValidator(min: number) {
    return (control: AbstractControl) => {
      const value = control.value || [];
      return value.length >= min ? null : { minImages: true };
    };
  }

  private maxImagesValidator(max: number) {
    return (control: AbstractControl) => {
      const value = control.value || [];
      return value.length <= max ? null : { maxImages: true };
    };
  }

  get isFormComplete(): boolean {
    if (!this.addProductForm.valid) return false;
    // In edit mode we allow product update independent of variation validity (variations handled separately)
    if (this.mode === 'edit') return true;
    const vt = this.addProductForm.get('variationType')?.value;
    const need = vt === 'single' ? 1 : 2; // multi create requires at least 2
    if (this.variationsArray.length < need) return false;
    return this.variationsArray.controls.every((c) => c.valid);
  }

  openDialog() {
    this.mode = 'create';
    this.editingId = null;
    this.removedVariationIds = [];
    this.addProductForm.reset({
      name: '',
      description: '',
      categoryId: '',
      subcategoryIds: [],
      variationType: 'single',
      seoTags: [],
      variations: [
        /* reset below */
      ],
    });
    // Reset variations array to single blank
    while (this.variationsArray.length > 1)
      this.variationsArray.removeAt(this.variationsArray.length - 1);
    if (!this.variationsArray.length)
      this.variationsArray.push(this.createVariationGroup());
    this.displayDialog = true;
  }

  openDialogView(product: any) {
    this.populateFromProduct(product, 'view');
  }

  openDialogEdit(product: any) {
    this.populateFromProduct(product, 'edit');
  }

  private populateFromProduct(product: any, mode: 'view' | 'edit') {
    this.mode = mode;
    this.currentProduct = product;
    this.editingId = product.id || null;
    this.removedVariationIds = [];
    // Clear variations
    while (this.variationsArray.length) this.variationsArray.removeAt(0);
    const variationType =
      product.variationType ||
      (product.variations?.length > 1 ? 'multi' : 'single');
    (product.variations || []).forEach((v: any) => {
      const g = this.createVariationGroup();
      g.patchValue({
        id: v.id || v._id || v.variationId || '',
        name: v.name || v.variationValue || '',
        ourPrice: v.ourPrice ?? v.price ?? null,
        marketPrice: v.marketPrice ?? null,
        purchasePrice: v.purchasePrice ?? null,
        weight: v.weight ?? null,
        images: [], // can't reconstruct File objects; leave empty
      });
      // If editing and existing images present, relax required/min validators for images
      if (mode === 'edit' && (v.processedImages?.length || v.images?.length)) {
        const imgCtrl = g.get('images');
        if (imgCtrl) {
          imgCtrl.clearValidators();
          imgCtrl.setValidators([
            this.maxImagesValidator(this.maxImagesPerVariation),
          ]); // only enforce max
          imgCtrl.updateValueAndValidity({ emitEvent: false });
        }
      }
      this.variationsArray.push(g);
    });
    if (!this.variationsArray.length)
      this.variationsArray.push(this.createVariationGroup());
    const categoryId =
      product.categoryId || product.category?._id || product.category?.id || '';
    const desiredSubIds: string[] = (product.subcategories || [])
      .map((s: any) => s.id || s._id)
      .filter(Boolean);
    // Patch immediate scalar fields (except subcategoryIds which depend on async load)
    this.addProductForm.patchValue({
      name: product.name || '',
      description: product.description || '',
      categoryId,
      variationType,
      seoTags: product.seoTags || [],
    });
    if (categoryId) {
      // Load subcategories for that category, then patch IDs so they appear selected
      this.subcategoryService.getSubcategoriesByCategory(categoryId).subscribe({
        next: (subs) => {
          this.filteredSubcategories = subs;
          this.addProductForm.patchValue({ subcategoryIds: desiredSubIds });
          if (mode === 'view')
            this.addProductForm.disable({ emitEvent: false });
        },
        error: (err) => {
          console.error('Failed to load subcategories for patch', err);
          // Still attempt to set IDs so user sees something (will be empty list if not loaded)
          this.addProductForm.patchValue({ subcategoryIds: desiredSubIds });
          if (mode === 'view')
            this.addProductForm.disable({ emitEvent: false });
        },
      });
    } else {
      // No category to load; just patch subcategories and disable if needed
      this.addProductForm.patchValue({ subcategoryIds: desiredSubIds });
      if (mode === 'view') this.addProductForm.disable({ emitEvent: false });
    }
    if (mode !== 'view') this.addProductForm.enable({ emitEvent: false });
    this.displayDialog = true;
  }

  @HostBinding('class.view-mode') get isViewMode() {
    return this.mode === 'view';
  }

  closeDialog() {
    this.displayDialog = false;
    // Re-enable form after closing if it was in view mode so future create works
    if (this.mode === 'view') {
      this.addProductForm.enable({ emitEvent: false });
    }
    this.closed.emit();
  }

  addProduct() {
    if (this.mode === 'view') {
      // In view mode the primary button acts as Close
      this.closeDialog();
      return;
    }
    if (this.mode === 'edit' && this.editingId) {
      // In edit mode primary dialog button just closes (updates done via dedicated buttons)
      this.closeDialog();
      return;
    }
    if (!this.isFormComplete) {
      this.addProductForm.markAllAsTouched();
      return;
    }
    const raw = this.addProductForm.value;
    const formData = new FormData();
    formData.append('name', raw.name);
    formData.append('description', raw.description);
    formData.append('categoryId', raw.categoryId);
    formData.append('subCategoryIds', JSON.stringify(raw.subcategoryIds)); // renamed key
    formData.append('variationType', raw.variationType);
    formData.append('seoTags', (raw.seoTags || []).join(','));

    // Variations
    const variationsPayload = raw.variations.map((v: any, idx: number) => {
      const { images, id, ...rest } = v; // rest now has name + price fields
      // append images separately
      (images || []).forEach((file: File, imgIdx: number) => {
        formData.append(`variation_${idx}_image_${imgIdx}`, file);
      });
      if (id) (rest as any).id = id;
      return rest;
    });
    formData.append('variations', JSON.stringify(variationsPayload));
    if (this.removedVariationIds.length) {
      formData.append(
        'removedVariationIds',
        JSON.stringify(this.removedVariationIds)
      );
    }

    this.http.post(`${environment.apiUrl}/products`, formData).subscribe({
      next: (resp) => {
        console.log('Product added successfully', resp);
        try {
          const raw = this.addProductForm.value;
          const categoryName =
            this.categories.find((c) => c.id === raw.categoryId)?.name || '';
          const subcatNames = this.filteredSubcategories
            .filter((sc) => (raw.subcategoryIds || []).includes(sc.id))
            .map((sc) => sc.name)
            .join(', ');
          const firstVariation = raw.variations?.[0];
          const price =
            firstVariation?.ourPrice ?? firstVariation?.marketPrice ?? null;
          const localProduct = {
            name: raw.name,
            category: categoryName,
            subcategoriesDisplay: subcatNames,
            price: price,
            // placeholder image (could be updated after backend returns real image URLs)
            image: '',
          };
          this.productAdded.emit(localProduct);
        } catch (e) {
          console.warn('Could not build local product object', e);
        }
        this.closeDialog();
      },
      error: (err) => {
        console.error('Error adding product', err);
      },
    });
  }

  private updateProduct() {
    const raw = this.addProductForm.value;
    const body: any = {};
    ['name', 'description', 'categoryId', 'variationType'].forEach((f) => {
      if (raw[f] !== undefined && raw[f] !== null) body[f] = raw[f];
    });
    if (raw.subcategoryIds) body.subCategoryIds = raw.subcategoryIds;
    if (raw.seoTags) body.seoTags = raw.seoTags;
    this.http
      .put(`${environment.apiUrl}/products/${this.editingId}`, body)
      .subscribe({
        next: (resp: any) => {
          this.currentProduct = { ...this.currentProduct, ...resp };
        },
        error: (err) => console.error('Error updating product info', err),
      });
  }

  updateProductInfo() {
    if (this.mode !== 'edit') return;
    if (
      !this.addProductForm.get('name')?.valid ||
      !this.addProductForm.get('categoryId')?.valid
    ) {
      this.addProductForm.get('name')?.markAsTouched();
      this.addProductForm.get('categoryId')?.markAsTouched();
      return;
    }
    this.updateProduct();
  }

  get productInfoDirty(): boolean {
    if (this.mode !== 'edit' || !this.currentProduct) return false;
    const fields: any = {
      name: this.addProductForm.get('name')?.value,
      description: this.addProductForm.get('description')?.value,
      categoryId: this.addProductForm.get('categoryId')?.value,
      variationType: this.addProductForm.get('variationType')?.value,
    };
    const subCatsForm = this.addProductForm.get('subcategoryIds')?.value || [];
    const tagsForm = this.addProductForm.get('seoTags')?.value || [];
    const subCatsCurrent =
      this.currentProduct.subCategoryIds ||
      this.currentProduct.subcategoryIds ||
      [];
    const tagsCurrent = this.currentProduct.seoTags || [];
    const arraysEqual = (a: any[], b: any[]) => {
      if (a.length !== b.length) return false;
      const sa = [...a].sort();
      const sb = [...b].sort();
      return sa.every((v, i) => v === sb[i]);
    };
    if (!arraysEqual(subCatsForm, subCatsCurrent)) return true;
    if (!arraysEqual(tagsForm, tagsCurrent)) return true;
    return Object.keys(fields).some(
      (k) => (this.currentProduct as any)[k] !== fields[k]
    );
  }

  canUpdateProductInfo(): boolean {
    return !!(
      this.productInfoDirty &&
      this.addProductForm.get('name')?.valid &&
      this.addProductForm.get('categoryId')?.valid
    );
  }

  // ---------- Variation Operations (Edit Mode) ----------
  isExistingVariation(index: number): boolean {
    return !!(this.variationsArray.at(index) as FormGroup).get('id')?.value;
  }

  canSaveVariationData(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    if (!grp) return false;
    const fields = [
      'name',
      'ourPrice',
      'marketPrice',
      'purchasePrice',
      'weight',
    ];
    if (fields.some((f) => !grp.get(f)?.valid)) return false;
    if (!this.isExistingVariation(index)) return true; // new variation
    return grp.dirty; // existing must be dirty
  }

  // Unified save button logic (handles create + update + images)
  canSaveVariation(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    if (!grp) return false;
    const id = grp.get('id')?.value;
    const fields = [
      'name',
      'ourPrice',
      'marketPrice',
      'purchasePrice',
      'weight',
    ];
    if (fields.some((f) => !grp.get(f)?.valid)) return false;
    const pendingImages: File[] = grp.get('images')?.value || [];
    if (!id) {
      // new variation needs at least one image
      return pendingImages.length > 0;
    }
    // existing variation: allow save if data dirty OR images pending OR removal flagged (with new images provided)
    const variationId = id || `new-${index}`;
    const removalSet = this.getRemovalSet(index);
    const allRemoved = this.variationAllImagesRemoved[variationId];
    if (allRemoved) {
      // must choose replacement images
      if (pendingImages.length === 0) return false;
      return true;
    }
    if (grp.dirty) return true;
    if (pendingImages.length > 0) return true;
    if (removalSet.size > 0 && pendingImages.length > 0) return true;
    return false;
  }

  saveVariation(index: number) {
    if (this.mode !== 'edit') return;
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    const val = grp.value;
    const files: File[] = grp.get('images')?.value || [];
    if (!id) {
      // create new variation
      if (!files.length) return;
      const fd = new FormData();
      fd.append('productId', this.editingId || this.currentProduct?.id);
      ['name', 'ourPrice', 'marketPrice', 'purchasePrice', 'weight'].forEach(
        (k) => fd.append(k, val[k])
      );
      files.forEach((f) => fd.append('images', f));
      this.http
        .post(`${environment.apiUrl}/products/variations`, fd)
        .subscribe({
          next: (resp: any) => {
            grp.patchValue({
              id: resp.id || resp._id || resp.variationId || '',
            });
            grp.get('images')?.reset([]);
            grp.markAsPristine();
            if (!Array.isArray(this.currentProduct.variations))
              this.currentProduct.variations = [];
            this.currentProduct.variations[index] = resp;
          },
          error: (err) => console.error('Error creating variation', err),
        });
      return;
    }
    // existing variation update with optional images changes
    const fd = new FormData();
    const original = this.currentProduct?.variations?.[index] || {};
    ['name', 'ourPrice', 'marketPrice', 'purchasePrice', 'weight'].forEach(
      (k) => {
        if (val[k] !== undefined && val[k] !== original[k])
          fd.append(k, val[k]);
      }
    );
    files.forEach((f) => fd.append('images', f));
    const removalSet = this.getRemovalSet(index);
    if (removalSet.size > 0 || this.variationAllImagesRemoved[id]) {
      // send list of images to remove
      if (this.variationAllImagesRemoved[id]) {
        // ensure removalSet has all previous images
        const existing = (
          original.processedImages ||
          original.images ||
          []
        ).map((p: string) => p.split('/').pop() || p);
        fd.append('removeImages', JSON.stringify(existing));
      } else {
        fd.append('removeImages', JSON.stringify(Array.from(removalSet)));
      }
    }
    this.http
      .put(`${environment.apiUrl}/products/variations/${id}`, fd)
      .subscribe({
        next: (resp: any) => {
          this.currentProduct.variations[index] = { ...original, ...resp };
          grp.get('images')?.reset([]);
          grp.markAsPristine();
          removalSet.clear();
          delete this.variationAllImagesRemoved[id];
          // if response now has images, relax validators again
          if (resp?.processedImages?.length || resp?.images?.length) {
            const imgCtrl = grp.get('images');
            if (imgCtrl) {
              imgCtrl.clearValidators();
              imgCtrl.setValidators([
                this.maxImagesValidator(this.maxImagesPerVariation),
              ]);
              imgCtrl.updateValueAndValidity({ emitEvent: false });
            }
          }
        },
        error: (err) => console.error('Error saving variation', err),
      });
  }

  getRemovalSet(index: number): Set<string> {
    const id =
      (this.variationsArray.at(index) as FormGroup).get('id')?.value ||
      `new-${index}`;
    if (!this.variationImageRemoval[id])
      this.variationImageRemoval[id] = new Set<string>();
    return this.variationImageRemoval[id];
  }

  toggleRemoveExistingImage(index: number, img: string) {
    if (this.mode !== 'edit') return;
    const set = this.getRemovalSet(index);
    const filename = img.split('/').pop() || img;
    if (set.has(filename)) set.delete(filename);
    else set.add(filename);
  }

  isImageMarkedForRemoval(index: number, img: string): boolean {
    const filename = img.split('/').pop() || img;
    return this.getRemovalSet(index).has(filename);
  }

  canSaveVariationImages(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    if (!id) return false; // must exist first
    const pending: File[] = grp.get('images')?.value || [];
    return pending.length > 0 || this.getRemovalSet(index).size > 0;
  }

  saveVariationImages(index: number) {
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    if (!id) return;
    const fd = new FormData();
    const removal = Array.from(this.getRemovalSet(index));
    if (removal.length) fd.append('removeImages', JSON.stringify(removal));
    const pending: File[] = grp.get('images')?.value || [];
    pending.forEach((f) => fd.append('images', f));
    this.http
      .put(`${environment.apiUrl}/products/variations/${id}`, fd)
      .subscribe({
        next: (resp: any) => {
          this.currentProduct.variations[index] = {
            ...this.currentProduct.variations[index],
            ...resp,
          };
          grp.get('images')?.reset([]);
          this.getRemovalSet(index).clear();
        },
        error: (err) => console.error('Error updating variation images', err),
      });
  }

  removeExistingVariationImages(index: number) {
    if (this.mode !== 'edit') return;
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    if (!id) return; // only for existing variations
    const original = this.currentProduct?.variations?.[index] || {};
    const existing = (original.processedImages ||
      original.images ||
      []) as string[];
    if (!existing.length) return;
    const filenames = existing.map((p) => p.split('/').pop() || p);
    const removalSet = this.getRemovalSet(index);
    filenames.forEach((f) => removalSet.add(f));
    this.variationAllImagesRemoved[id] = true;
    // re-apply required/min validators so user must add new images
    const imgCtrl = grp.get('images');
    if (imgCtrl) {
      imgCtrl.clearValidators();
      imgCtrl.setValidators([
        Validators.required,
        this.minImagesValidator(1),
        this.maxImagesValidator(this.maxImagesPerVariation),
      ]);
      imgCtrl.updateValueAndValidity();
    }
  }

  isAllImagesMarkedForRemoval(index: number): boolean {
    const id = (this.variationsArray.at(index) as FormGroup).get('id')?.value;
    if (!id) return false;
    return !!this.variationAllImagesRemoved[id];
  }

  showUploadInput(index: number): boolean {
    if (this.mode === 'view') return false;
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    // New variation always show upload
    if (!id) return true;
    // If all images removed -> show
    if (this.isAllImagesMarkedForRemoval(index)) return true;
    const original = this.currentProduct?.variations?.[index] || {};
    const existing = (original.processedImages ||
      original.images ||
      []) as string[];
    // Hide upload if existing images still present
    return existing.length === 0;
  }

  deleteVariation(index: number) {
    if (this.mode !== 'edit') return;
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    if (!id) {
      this.variationsArray.removeAt(index);
      this.currentProduct.variations.splice(index, 1);
      return;
    }
    this.http
      .delete(`${environment.apiUrl}/products/variations/${id}`)
      .subscribe({
        next: () => {
          this.variationsArray.removeAt(index);
          this.currentProduct.variations.splice(index, 1);
        },
        error: (err) => console.error('Error deleting variation', err),
      });
  }

  addNewVariation() {
    if (this.mode !== 'edit') return;
    if (this.addProductForm.get('variationType')?.value === 'single') return;
    this.variationsArray.push(this.createVariationGroup());
    if (!Array.isArray(this.currentProduct.variations))
      this.currentProduct.variations = [];
    this.currentProduct.variations.push({});
  }

  persistedVariationCount(): number {
    return (this.currentProduct?.variations || []).filter(
      (v: any) => v && (v.id || v._id || v.variationId)
    ).length;
  }
}
