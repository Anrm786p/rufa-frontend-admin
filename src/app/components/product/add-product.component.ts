import {
  Component,
  Output,
  EventEmitter,
  HostBinding,
  OnInit,
} from '@angular/core';
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
import { SharedMessageService } from '../../services/message.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    FileUploadModule,
    DropdownModule,
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
export class AddProductComponent implements OnInit {
  @Output() productAdded = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();
  displayDialog = false;
  mode: 'create' | 'edit' | 'view' = 'create';
  editingId: string | null = null;
  addProductForm: FormGroup;
  currentProduct: any = null;
  private removedVariationIds: string[] = [];
  variationImageRemoval: { [variationId: string]: Set<string> } = {};
  private variationAllImagesRemoved: { [variationId: string]: boolean } = {};

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
    private subcategoryService: SubcategoryService,
    private messageService: SharedMessageService
  ) {
    this.addProductForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
      subcategoryIds: [[], Validators.required],
      variationType: ['single', Validators.required],
      seoTags: [[], [Validators.required, this.minTagsValidator(2)]],
      variations: this.fb.array([this.createVariationGroup()]),
    });

    // Enforce single variation when variationType is 'single'
    this.addProductForm.get('variationType')?.valueChanges.subscribe((val) => {
      if (val === 'single' && this.variationsArray.length > 1) {
        while (this.variationsArray.length > 1) {
          this.variationsArray.removeAt(this.variationsArray.length - 1);
        }
      }
    });

    // Watch variation name fields for duplicates
    this.addProductForm
      .get('variations')
      ?.valueChanges.subscribe(() => this.applyVariationNameUniqueness());
  }

  ngOnInit() {
    this.loadCategories();
  }

  // Add missing initForm method
  initForm() {
    // Initialize form if needed
    console.log('Form initialized');
  }

  // Add missing debugData method
  debugData() {
    console.log('Categories:', this.categories);
    console.log('Filtered Subcategories:', this.filteredSubcategories);
    console.log('Form Values:', this.addProductForm.value);
  }

  // Variation FormGroup factory
  private createVariationGroup(): FormGroup {
    return this.fb.group(
      {
        id: [''],
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
      },
      { validators: this.priceHierarchyValidator() }
    );
  }

  // Helper methods for price validation errors
  getPriceValidationErrors(index: number) {
    const variation = this.variationsArray.at(index) as FormGroup;
    if (!variation) return {};

    const errors = variation.errors || {};
    return {
      purchasePriceTooHigh: errors['purchasePriceTooHigh'] || false,
      ourPriceTooHigh: errors['ourPriceTooHigh'] || false,
    };
  }

  getPriceErrorMessage(index: number): string {
    const errors = this.getPriceValidationErrors(index);
    const variation = this.variationsArray.at(index) as FormGroup;

    if (!variation) return '';

    const purchasePrice = variation.get('purchasePrice')?.value;
    const ourPrice = variation.get('ourPrice')?.value;
    const marketPrice = variation.get('marketPrice')?.value;

    if (errors.purchasePriceTooHigh) {
      return `Purchase price (${purchasePrice}) must be lower than our price (${ourPrice})`;
    }
    if (errors.ourPriceTooHigh) {
      return `Our price (${ourPrice}) must be lower than market price (${marketPrice})`;
    }
    return '';
  }

  // Check if variation has price hierarchy errors
  hasVariationPriceErrors(index: number): boolean {
    const errors = this.getPriceValidationErrors(index);
    return errors.purchasePriceTooHigh || errors.ourPriceTooHigh;
  }

  // Comprehensive validation method that shows toast messages
  validateFormAndShowErrors(): boolean {
    // Mark all fields as touched to show validation errors
    this.addProductForm.markAllAsTouched();
    this.variationsArray.controls.forEach((control) => {
      control.markAllAsTouched();
    });

    const errors: string[] = [];

    // Check main form fields
    if (this.addProductForm.get('name')?.invalid) {
      errors.push('Product name is required');
    }
    if (this.addProductForm.get('description')?.invalid) {
      errors.push('Product description is required');
    }
    if (this.addProductForm.get('categoryId')?.invalid) {
      errors.push('Category selection is required');
    }
    if (this.addProductForm.get('subcategoryIds')?.invalid) {
      errors.push('At least one subcategory must be selected');
    }

    // SEO Tags validation
    const seoTagsControl = this.addProductForm.get('seoTags');
    if (seoTagsControl?.invalid) {
      if (seoTagsControl.hasError('required')) {
        errors.push('SEO tags are required');
      } else if (seoTagsControl.hasError('minTags')) {
        const minTagsError = seoTagsControl.getError('minTags');
        errors.push(
          `At least ${minTagsError.requiredTags} SEO tags are required (currently ${minTagsError.actualTags})`
        );
      }
    }

    // Check variation requirements
    const variationType = this.addProductForm.get('variationType')?.value;
    const requiredVariations = variationType === 'single' ? 1 : 2;

    if (this.variationsArray.length < requiredVariations) {
      errors.push(
        `${
          variationType === 'single'
            ? 'At least 1 variation'
            : 'At least 2 variations'
        } required for ${variationType} mode`
      );
    }

    // Check each variation
    this.variationsArray.controls.forEach((variation, index) => {
      const variationGroup = variation as FormGroup;
      const variationNumber = index + 1;

      // Required fields
      if (variationGroup.get('name')?.invalid) {
        errors.push(`Variation ${variationNumber}: Name is required`);
      }
      if (variationGroup.get('ourPrice')?.invalid) {
        errors.push(
          `Variation ${variationNumber}: Our price is required and must be greater than 0`
        );
      }
      if (variationGroup.get('marketPrice')?.invalid) {
        errors.push(
          `Variation ${variationNumber}: Market price is required and must be greater than 0`
        );
      }
      if (variationGroup.get('purchasePrice')?.invalid) {
        errors.push(
          `Variation ${variationNumber}: Purchase price is required and must be greater than 0`
        );
      }
      if (variationGroup.get('weight')?.invalid) {
        errors.push(
          `Variation ${variationNumber}: Weight is required and must be greater than 0`
        );
      }

      // Images validation
      const images = variationGroup.get('images')?.value || [];
      const isNewVariation = !variationGroup.get('id')?.value;
      const hasExistingImages =
        this.currentProduct?.variations?.[index]?.processedImages?.length > 0;

      if (isNewVariation && images.length === 0) {
        errors.push(
          `Variation ${variationNumber}: At least 1 image is required`
        );
      } else if (
        this.mode === 'edit' &&
        !hasExistingImages &&
        images.length === 0
      ) {
        errors.push(
          `Variation ${variationNumber}: At least 1 image is required`
        );
      }

      // Price hierarchy validation
      if (this.hasVariationPriceErrors(index)) {
        const priceError = this.getPriceErrorMessage(index);
        errors.push(`Variation ${variationNumber}: ${priceError}`);
      }

      // Duplicate name validation
      if (variationGroup.hasError('duplicate')) {
        errors.push(
          `Variation ${variationNumber}: Name must be unique across all variations`
        );
      }
    });

    // Show errors if any exist
    if (errors.length > 0) {
      const errorMessage =
        errors.length === 1
          ? errors[0]
          : `${errors.length} validation errors found:\n• ${errors.join(
              '\n• '
            )}`;

      this.messageService.showMessage(
        'Validation Error',
        errorMessage,
        'error'
      );
      return false;
    }

    return true;
  }

  get variationsArray(): FormArray {
    return this.addProductForm.get('variations') as FormArray;
  }

  addVariation() {
    if (this.addProductForm.get('variationType')?.value === 'single') return;
    this.variationsArray.push(this.createVariationGroup());
    this.applyVariationNameUniqueness();
  }

  removeVariation(index: number) {
    if (this.variationsArray.length > 1) {
      const grp = this.variationsArray.at(index) as FormGroup;
      const existingId = grp?.get('id')?.value;
      if (this.mode === 'edit' && existingId)
        this.removedVariationIds.push(existingId);
      this.variationsArray.removeAt(index);
      this.applyVariationNameUniqueness();
    }
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        console.log('Categories loaded:', cats);
        this.categories = cats;
        // Call debug after categories load
        setTimeout(() => this.debugData(), 1000);
      },
      error: (e) => console.error('Failed to load categories', e),
    });
  }

  onCategoryChange(categoryId: string) {
    console.log('Category changed to:', categoryId);

    // Reset subcategories
    this.filteredSubcategories = [];
    this.addProductForm.patchValue({ subcategoryIds: [] });

    if (categoryId) {
      this.subcategoryService.getSubcategoriesByCategory(categoryId).subscribe({
        next: (subs) => {
          console.log('Subcategories loaded:', subs);
          this.filteredSubcategories = subs;
        },
        error: (e) => {
          console.error('Failed to load subcategories', e);
          this.filteredSubcategories = [];
        },
      });
    }
  }

  // SEO tags handled by p-chips component
  onVariationFilesSelected(event: any, index: number) {
    const rawFiles: File[] = Array.from(
      event.files || event.target.files || []
    );
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxBytes = 1024 * 1024; // 1 MB
    const accepted: File[] = [];
    for (const f of rawFiles) {
      if (!validTypes.includes(f.type)) {
        console.warn('Rejected file (type):', f.name);
        continue;
      }
      if (f.size > maxBytes) {
        console.warn('Rejected file (size >1MB):', f.name);
        continue;
      }
      accepted.push(f);
    }
    const ctrl = this.variationsArray.at(index).get('images');
    if (!ctrl) return;
    const existing: File[] = ctrl.value || [];
    const combined = [...existing, ...accepted].slice(
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

  private minTagsValidator(min: number) {
    return (control: AbstractControl) => {
      const value = control.value || [];
      return value.length >= min
        ? null
        : { minTags: { requiredTags: min, actualTags: value.length } };
    };
  }

  // Price hierarchy validators
  private priceHierarchyValidator() {
    return (group: AbstractControl) => {
      if (!(group instanceof FormGroup)) return null;

      const purchasePrice = group.get('purchasePrice')?.value;
      const ourPrice = group.get('ourPrice')?.value;
      const marketPrice = group.get('marketPrice')?.value;

      const errors: any = {};

      // All prices must be present to validate hierarchy
      if (purchasePrice != null && ourPrice != null && marketPrice != null) {
        // purchasePrice < ourPrice < marketPrice
        if (purchasePrice >= ourPrice) {
          errors.purchasePriceTooHigh = true;
        }
        if (ourPrice >= marketPrice) {
          errors.ourPriceTooHigh = true;
        }
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  get isFormComplete(): boolean {
    if (!this.addProductForm.valid) return false;
    // In edit mode we allow product update independent of variation validity (variations handled separately)
    if (this.mode === 'edit') return true;
    const vt = this.addProductForm.get('variationType')?.value;
    const need = vt === 'single' ? 1 : 2; // multi create requires at least 2
    if (this.variationsArray.length < need) return false;

    // Check if all variations are valid and have no price hierarchy errors
    return this.variationsArray.controls.every((c, index) => {
      return c.valid && !this.hasVariationPriceErrors(index);
    });
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
      variations: [],
    });
    // Reset variations array to single blank
    while (this.variationsArray.length > 1)
      this.variationsArray.removeAt(this.variationsArray.length - 1);
    if (!this.variationsArray.length)
      this.variationsArray.push(this.createVariationGroup());
    this.applyVariationNameUniqueness();
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
        images: [],
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

    this.applyVariationNameUniqueness();

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

    // Use comprehensive validation with toast messages
    if (!this.validateFormAndShowErrors()) {
      return; // Validation failed, errors shown via toast
    }

    const raw = this.addProductForm.value;
    const formData = new FormData();
    formData.append('name', raw.name);
    formData.append('description', raw.description);
    formData.append('categoryId', raw.categoryId);
    formData.append('subCategoryIds', JSON.stringify(raw.subcategoryIds));
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
          // Auto-close dialog after successful product info save in edit mode
          this.closeDialog();
        },
        error: (err) => console.error('Error updating product info', err),
      });
  }

  updateProductInfo() {
    if (this.mode !== 'edit') return;

    // Mark main form fields as touched for visual feedback
    this.addProductForm.markAllAsTouched();

    const errors: string[] = [];

    // Check required fields
    if (!this.addProductForm.get('name')?.valid) {
      errors.push('Product name is required');
    }
    if (!this.addProductForm.get('description')?.valid) {
      errors.push('Product description is required');
    }
    if (!this.addProductForm.get('categoryId')?.valid) {
      errors.push('Category selection is required');
    }
    if (!this.addProductForm.get('subcategoryIds')?.valid) {
      errors.push('At least one subcategory must be selected');
    }

    // SEO Tags validation
    const seoTagsControl = this.addProductForm.get('seoTags');
    if (seoTagsControl?.invalid) {
      if (seoTagsControl.hasError('required')) {
        errors.push('SEO tags are required');
      } else if (seoTagsControl.hasError('minTags')) {
        const minTagsError = seoTagsControl.getError('minTags');
        errors.push(
          `At least ${minTagsError.requiredTags} SEO tags are required (currently ${minTagsError.actualTags})`
        );
      }
    }

    // Check if there are any changes to save
    if (!this.productInfoDirty) {
      errors.push('No changes detected to save');
    }

    // Show errors if any
    if (errors.length > 0) {
      this.messageService.showMessage(
        'Validation Error',
        errors.join(', '),
        'error'
      );
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
      this.addProductForm.get('categoryId')?.valid &&
      this.addProductForm.get('seoTags')?.valid
    );
  }

  // ---------- Variation Operations (Edit Mode) ----------
  isExistingVariation(index: number): boolean {
    return !!(this.variationsArray.at(index) as FormGroup).get('id')?.value;
  }

  // Helper method to check if images were modified
  private areImagesModified(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;

    // For new variations, images are always considered "modified" since they need to be uploaded
    if (!id) {
      const files: File[] = grp.get('images')?.value || [];
      return files.length > 0;
    }

    // For existing variations, check for actual image changes
    const files: File[] = grp.get('images')?.value || [];
    const removalSet = this.getRemovalSet(index);

    // Check if user selected new images to upload
    const hasNewImagesToUpload = files.length > 0;

    // Check if user marked existing images for removal
    const hasMarkedImagesForRemoval = removalSet.size > 0;
    const hasMarkedAllImagesForRemoval =
      this.variationAllImagesRemoved[id] === true;

    const result =
      hasNewImagesToUpload ||
      hasMarkedImagesForRemoval ||
      hasMarkedAllImagesForRemoval;

    console.log(
      `Image modification check for variation ${index} (ID: ${id}):`,
      {
        hasNewImagesToUpload,
        hasMarkedImagesForRemoval,
        hasMarkedAllImagesForRemoval,
        filesCount: files.length,
        removalSetSize: removalSet.size,
        result,
      }
    );

    return result;
  }

  // Helper method to get save strategy info for UI feedback (optional)
  getSaveStrategy(
    index: number
  ): 'create' | 'put-with-images' | 'patch-text-only' | 'no-changes' {
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;

    if (!id) return 'create';

    const imagesModified = this.areImagesModified(index);
    const textFieldsModified = this.areTextFieldsModified(index);

    if (imagesModified) return 'put-with-images';
    if (textFieldsModified) return 'patch-text-only';
    return 'no-changes';
  }

  // Helper method to check if text fields were modified
  private areTextFieldsModified(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;

    // For new variations, always consider as modified
    if (!id) return true;

    const val = grp.value;
    const original = this.currentProduct?.variations?.[index] || {};
    const textFields = [
      'name',
      'ourPrice',
      'marketPrice',
      'purchasePrice',
      'weight',
    ];

    const changes: any = {};
    textFields.forEach((field) => {
      if (val[field] !== undefined && val[field] !== original[field]) {
        changes[field] = { from: original[field], to: val[field] };
      }
    });

    const isModified = Object.keys(changes).length > 0;

    console.log(
      `Text fields modification check for variation ${index} (ID: ${id}):`,
      {
        isModified,
        changes,
        currentValues: textFields.reduce(
          (acc, field) => ({ ...acc, [field]: val[field] }),
          {}
        ),
        originalValues: textFields.reduce(
          (acc, field) => ({ ...acc, [field]: original[field] }),
          {}
        ),
      }
    );

    return isModified;
  }

  canSaveVariation(index: number): boolean {
    // Always return true - validation errors will be shown via toast messages
    return true;
  }

  private validateVariationAndShowErrors(index: number): boolean {
    const grp = this.variationsArray.at(index) as FormGroup;
    if (!grp) {
      this.messageService.showMessage('Error', 'Invalid variation', 'error');
      return false;
    }

    // Mark all fields as touched for visual feedback
    grp.markAllAsTouched();

    const errors: string[] = [];
    const id = grp.get('id')?.value;
    const fields = [
      { name: 'name', label: 'Variation Name' },
      { name: 'ourPrice', label: 'Our Price' },
      { name: 'marketPrice', label: 'Market Price' },
      { name: 'purchasePrice', label: 'Purchase Price' },
      { name: 'weight', label: 'Weight' },
    ];

    // Check required fields
    fields.forEach((field) => {
      const control = grp.get(field.name);
      if (!control?.valid) {
        if (control?.hasError('required')) {
          errors.push(`${field.label} is required`);
        }
      }
    });

    // Check for price hierarchy errors
    if (this.hasVariationPriceErrors(index)) {
      const purchasePrice = grp.get('purchasePrice')?.value || 0;
      const ourPrice = grp.get('ourPrice')?.value || 0;
      const marketPrice = grp.get('marketPrice')?.value || 0;

      if (purchasePrice >= ourPrice) {
        errors.push('Purchase price must be lower than our price');
      }
      if (ourPrice >= marketPrice) {
        errors.push('Our price must be lower than market price');
      }
    }

    const pendingImages: File[] = grp.get('images')?.value || [];

    if (!id) {
      // New variation needs at least one image
      if (pendingImages.length === 0) {
        errors.push('At least one image is required for new variation');
      }
    } else {
      // Existing variation: check if there are any modifications
      const imagesModified = this.areImagesModified(index);
      const textFieldsModified = this.areTextFieldsModified(index);

      // Special case: if all images removed, must have replacement images
      const variationId = id;
      const allRemoved = this.variationAllImagesRemoved[variationId];
      if (allRemoved && pendingImages.length === 0) {
        errors.push(
          'You must add replacement images if all existing images are removed'
        );
      }

      if (!imagesModified && !textFieldsModified) {
        errors.push('No changes detected to save');
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      this.messageService.showMessage(
        'Validation Error',
        errors.join(', '),
        'error'
      );
      return false;
    }

    return true;
  }

  saveVariation(index: number) {
    if (this.mode !== 'edit') return;

    // Validate and show errors if any
    if (!this.validateVariationAndShowErrors(index)) {
      return;
    }

    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    const val = grp.value;
    const files: File[] = grp.get('images')?.value || [];

    if (!id) {
      // create new variation - always use FormData
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
            // Close dialog after successful new variation creation
            this.closeDialog();
          },
          error: (err) => console.error('Error creating variation', err),
        });
      return;
    }

    // Existing variation update - determine if images were modified
    const original = this.currentProduct?.variations?.[index] || {};
    const removalSet = this.getRemovalSet(index);
    const hasNewImages = files.length > 0;
    const hasRemovedImages =
      removalSet.size > 0 || this.variationAllImagesRemoved[id];
    const imagesModified = hasNewImages || hasRemovedImages;

    // Debug logging
    console.log(`Save variation ${index} decision:`, {
      hasNewImages,
      hasRemovedImages,
      imagesModified,
      filesCount: files.length,
      removalSetSize: removalSet.size,
      allImagesRemoved: this.variationAllImagesRemoved[id],
      strategy: imagesModified ? 'PUT (with images)' : 'PATCH (text only)',
    });

    if (imagesModified) {
      // Images were modified - use PUT with FormData
      const fd = new FormData();

      // Add all fields (not just changed ones) for PUT request
      ['name', 'ourPrice', 'marketPrice', 'purchasePrice', 'weight'].forEach(
        (k) => fd.append(k, val[k])
      );

      // Add new images
      files.forEach((f) => fd.append('images', f));

      // Handle image removals
      if (hasRemovedImages) {
        if (this.variationAllImagesRemoved[id]) {
          // Remove all existing images
          const existing = (
            original.processedImages ||
            original.images ||
            []
          ).map((p: string) => p.split('/').pop() || p);
          fd.append('removeImages', JSON.stringify(existing));
        } else {
          // Remove specific images
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
            console.log('Variation updated with PUT (images modified)');
            this.closeDialog();
          },
          error: (err) =>
            console.error('Error updating variation with images', err),
        });
    } else {
      // Only text fields modified - use PATCH with JSON payload
      const body: any = {};
      const textFields = [
        'name',
        'ourPrice',
        'marketPrice',
        'purchasePrice',
        'weight',
      ];

      // Only include changed fields in PATCH
      textFields.forEach((k) => {
        if (val[k] !== undefined && val[k] !== original[k]) {
          body[k] = val[k];
        }
      });

      // Only proceed if there are actual changes
      if (Object.keys(body).length === 0) {
        console.log('No changes detected - skipping PATCH request');
        return;
      }

      this.http
        .patch(`${environment.apiUrl}/products/variations/${id}`, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        .subscribe({
          next: (resp: any) => {
            this.currentProduct.variations[index] = { ...original, ...resp };
            grp.markAsPristine();
            console.log('Variation updated with PATCH (text fields only)');
            this.closeDialog();
          },
          error: (err) =>
            console.error('Error updating variation text fields', err),
        });
    }
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

  removeExistingVariationImages(index: number) {
    if (this.mode !== 'edit') return;
    const grp = this.variationsArray.at(index) as FormGroup;
    const id = grp.get('id')?.value;
    if (!id) return;
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
      // Close dialog after deleting a new (unsaved) variation
      this.closeDialog();
      return;
    }
    this.http
      .delete(`${environment.apiUrl}/products/variations/${id}`)
      .subscribe({
        next: () => {
          this.variationsArray.removeAt(index);
          this.currentProduct.variations.splice(index, 1);
          // Close dialog after successful deletion of existing variation
          this.closeDialog();
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
    this.applyVariationNameUniqueness();
  }

  persistedVariationCount(): number {
    return (this.currentProduct?.variations || []).filter(
      (v: any) => v && (v.id || v._id || v.variationId)
    ).length;
  }

  private applyVariationNameUniqueness() {
    const namesMap: { [lower: string]: number[] } = {};
    this.variationsArray.controls.forEach((ctrl, idx) => {
      const nameCtrl = (ctrl as FormGroup).get('name');
      const raw = (nameCtrl?.value || '').trim().toLowerCase();
      if (!raw) {
        if (nameCtrl?.hasError('duplicate')) {
          const errs = { ...(nameCtrl.errors || {}) };
          delete errs['duplicate'];
          nameCtrl.setErrors(Object.keys(errs).length ? errs : null);
        }
        return;
      }
      if (!namesMap[raw]) namesMap[raw] = [];
      namesMap[raw].push(idx);
    });

    Object.entries(namesMap).forEach(([_, indices]) => {
      const dup = indices.length > 1;
      indices.forEach((i) => {
        const nameCtrl = (this.variationsArray.at(i) as FormGroup).get('name');
        if (!nameCtrl) return;
        const currentErrors = nameCtrl.errors || {};
        if (dup) {
          nameCtrl.setErrors({ ...currentErrors, duplicate: true });
        } else if (currentErrors['duplicate']) {
          const { duplicate, ...rest } = currentErrors as any;
          nameCtrl.setErrors(Object.keys(rest).length ? rest : null);
        }
      });
    });
  }
}
