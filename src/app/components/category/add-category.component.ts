import { Component, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { SharedDialogComponent } from '../shared/dialog/shared-dialog.component';
import { CategoryService, Category } from '../../services/category.service';
import { SharedMessageService } from '../../services/message.service';

@Component({
  selector: 'app-add-category',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CommonModule,
    SharedDialogComponent,
    FileUploadModule,
  ],
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.css'],
})
export class AddCategoryComponent {
  @Output() onSave = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();
  displayDialog: boolean = false;
  addCategoryForm: FormGroup;
  selectedImage: File | null = null;
  imageError: string | null = null;
  isEditMode: boolean = false;
  editId: string | null = null;
  currentImageUrl: string | null = null;
  imageLoadError: boolean = false;
  existingCategories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private messageService: SharedMessageService
  ) {
    this.addCategoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(32)]],
      image: [null],
    });
    // preload categories for uniqueness check
    this.loadCategories();
    this.addCategoryForm
      .get('name')
      ?.valueChanges.subscribe(() => this.applyNameUniqueness());

    // Auto Upper Camel Case transformation for category name
    this.addCategoryForm.get('name')?.valueChanges.subscribe((value) => {
      if (value && typeof value === 'string') {
        const transformed = this.toUpperCamelCase(value);
        if (transformed !== value) {
          this.addCategoryForm
            .get('name')
            ?.setValue(transformed, { emitEvent: false });
        }
      }
    });
  }

  // Utility method to convert text to Upper Camel Case (PascalCase)
  private toUpperCamelCase(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.existingCategories = cats;
        this.applyNameUniqueness();
      },
      error: (e) =>
        console.error('Failed to load categories for uniqueness', e),
    });
  }

  private applyNameUniqueness() {
    const ctrl = this.addCategoryForm.get('name');
    if (!ctrl) return;
    const raw = (ctrl.value || '').trim().toLowerCase();
    if (!raw) {
      if (ctrl.hasError('duplicate')) {
        const errs = { ...ctrl.errors };
        delete errs['duplicate'];
        ctrl.setErrors(Object.keys(errs).length ? errs : null);
      }
      return;
    }
    const exists = this.existingCategories.some((c) => {
      if (this.isEditMode && this.editId === c.id) return false; // allow original
      return c.name.trim().toLowerCase() === raw;
    });
    const currentErrors = ctrl.errors || {};
    if (exists) {
      ctrl.setErrors({ ...currentErrors, duplicate: true });
    } else if (currentErrors['duplicate']) {
      const { duplicate, ...rest } = currentErrors as any;
      ctrl.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  openDialog(category?: Category) {
    this.displayDialog = true;
    if (category) {
      this.isEditMode = true;
      this.editId = category.id;
      this.currentImageUrl = category.imageUrl;
      this.imageLoadError = false; // Reset error state
      console.log('Opening edit dialog with image URL:', this.currentImageUrl); // Debug log
      this.addCategoryForm.patchValue({
        name: category.name,
      });
    } else {
      this.isEditMode = false;
      this.editId = null;
      this.currentImageUrl = null;
      this.imageLoadError = false;
    }
  }

  handleImageError(event: ErrorEvent) {
    console.error('Error loading image:', this.currentImageUrl);
    this.imageLoadError = true;
  }

  closeDialog() {
    this.displayDialog = false;
    this.addCategoryForm.reset();
    this.selectedImage = null;
    this.isEditMode = false;
    this.editId = null;
    this.currentImageUrl = null;
  }

  onImageUpload(event: any) {
    this.imageError = null;
    if (event && event.files && event.files.length > 0) {
      const file = event.files[0] as File;
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxBytes = 1024 * 1024; // 1 MB
      if (!validTypes.includes(file.type)) {
        this.imageError = 'Only JPG, JPEG, PNG or WEBP images are allowed';
        return;
      }
      if (file.size > maxBytes) {
        this.imageError = 'Image must be 1MB or smaller';
        return;
      }
      this.selectedImage = file;
      this.addCategoryForm.patchValue({ image: file });
      this.addCategoryForm.markAsDirty();
    }
  }

  isFormValid(): boolean {
    const nameValid = !!this.addCategoryForm.get('name')?.valid;
    const imageValid = this.isEditMode ? true : !!this.selectedImage;
    if (this.imageError) return false;
    return nameValid && imageValid;
  }

  private validateFormAndShowErrors(): boolean {
    // Mark all fields as touched to show validation errors
    this.addCategoryForm.markAllAsTouched();

    const errors: string[] = [];

    // Check name field
    const nameControl = this.addCategoryForm.get('name');
    if (nameControl?.invalid) {
      if (nameControl.hasError('required')) {
        errors.push('Category name is required');
      }
      if (nameControl.hasError('maxlength')) {
        errors.push('Category name cannot be longer than 32 characters');
      }
      if (nameControl.hasError('duplicate')) {
        errors.push('Category name already exists');
      }
    }

    // Check image requirement for new categories
    if (!this.isEditMode && !this.selectedImage) {
      errors.push('Category image is required');
    }

    // Check image validation errors
    if (this.imageError) {
      errors.push(this.imageError);
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

  addCategory() {
    // Validate and show errors if any
    if (!this.validateFormAndShowErrors()) {
      return;
    }

    const formData = new FormData();
    formData.append('name', this.addCategoryForm.get('name')?.value);

    // Only append image if a new one is selected or it's a new category
    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    const request =
      this.isEditMode && this.editId
        ? this.categoryService.updateCategory(this.editId, formData)
        : this.categoryService.addCategory(formData);

    request.subscribe({
      next: (response) => {
        console.log(
          `Category ${this.isEditMode ? 'updated' : 'added'} successfully`,
          response
        );
        this.onSave.emit(response);
        this.closeDialog();
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'adding'} category`,
          error
        );
      },
    });
  }
}
