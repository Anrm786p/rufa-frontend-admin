import { Component, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectModule } from 'primeng/select';
import { SharedDialogComponent } from '../shared/dialog/shared-dialog.component';
import { SubcategoryService } from '../../services/subcategory.service';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-add-subcategory',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CommonModule,
    SharedDialogComponent,
    FileUploadModule,
    SelectModule,
  ],
  styles: [
    `
      :host ::ng-deep {
        /* P-Select Trigger/Input */
        .p-select {
          background: white !important;
          border: 1px solid #dee2e6 !important;
          border-radius: 6px !important;
        }

        .p-select-label {
          background: white !important;
          color: #495057 !important;
        }

        /* P-Select Panel/Dropdown - Based on actual DOM structure */
        .p-select-overlay.p-component {
          background: #ffffff !important;
          background-color: #ffffff !important;
          border: 1px solid #dee2e6 !important;
          border-radius: 6px !important;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          margin-top: 2px !important;
          z-index: 9999 !important;
          opacity: 1 !important;
        }

        /* List Container */
        .p-select-list-container {
          background: #ffffff !important;
          background-color: #ffffff !important;
        }

        /* List itself */
        .p-select-list {
          background: #ffffff !important;
          background-color: #ffffff !important;
          margin: 0 !important;
          padding: 0.25rem 0 !important;
        }

        /* P-SelectItem component wrapper */
        p-selectitem {
          background: #ffffff !important;
          background-color: #ffffff !important;
        }

        /* Individual option li elements */
        .p-select-option.p-ripple {
          padding: 0.75rem 1rem !important;
          color: #374151 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border: none !important;
          margin: 0 !important;
          transition: all 0.15s ease !important;
          cursor: pointer !important;
          opacity: 1 !important;
        }

        /* Option text span */
        .p-select-option span {
          background: transparent !important;
          color: inherit !important;
        }

        /* Focused option */
        .p-select-option.p-focus {
          background: #f1f5f9 !important;
          background-color: #f1f5f9 !important;
          background-image: none !important;
          color: #1e293b !important;
        }

        /* Selected option */
        .p-select-option.p-select-option-selected,
        .p-select-option[data-p-highlight='true'] {
          background: #3b82f6 !important;
          background-color: #3b82f6 !important;
          background-image: none !important;
          color: white !important;
        }

        /* Hover state for non-selected options */
        .p-select-option:not(.p-select-option-selected):hover {
          background: #f8fafc !important;
          background-color: #f8fafc !important;
          background-image: none !important;
          color: #1e293b !important;
        }

        /* Force all child elements to have no background images */
        .p-select-overlay *,
        .p-select-list-container *,
        .p-select-list *,
        p-selectitem *,
        .p-select-option * {
          background-image: none !important;
        }

        /* Extra backdrop for overlay */
        .p-select-overlay::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: #ffffff !important;
          z-index: -1 !important;
          border-radius: 6px !important;
        }
      }
    `,
  ],
  template: `
    <app-shared-dialog
      [title]="isEditMode ? 'Edit Subcategory' : 'Add Subcategory'"
      [(visible)]="displayDialog"
      [submitLabel]="isEditMode ? 'Update Subcategory' : 'Add Subcategory'"
      [isSubmitDisabled]="!isFormValid()"
      (cancel)="closeDialog()"
      (submit)="addSubcategory()"
    >
      <form [formGroup]="addSubcategoryForm" (ngSubmit)="addSubcategory()">
        <div class="p-fluid">
          <div class="field">
            <label for="name" class="required">Subcategory Name</label>
            <input
              id="name"
              type="text"
              pInputText
              formControlName="name"
              [ngClass]="{
                'ng-invalid ng-dirty':
                  addSubcategoryForm.get('name')?.invalid &&
                  addSubcategoryForm.get('name')?.touched
              }"
            />
            <small
              class="p-error block"
              *ngIf="
                addSubcategoryForm.get('name')?.invalid &&
                addSubcategoryForm.get('name')?.touched
              "
            >
              Subcategory name is required
            </small>
          </div>

          <div class="field">
            <label for="category" class="required">Category</label>
            <p-select
              id="category"
              [options]="categories"
              formControlName="categoryId"
              optionLabel="name"
              optionValue="id"
              placeholder="Select a category"
              [style]="{ width: '100%' }"
              [ngClass]="{
                'ng-invalid ng-dirty':
                  addSubcategoryForm.get('categoryId')?.invalid &&
                  addSubcategoryForm.get('categoryId')?.touched
              }"
            ></p-select>
            <small
              class="p-error block"
              *ngIf="
                addSubcategoryForm.get('categoryId')?.invalid &&
                addSubcategoryForm.get('categoryId')?.touched
              "
            >
              Category is required
            </small>
          </div>

          <div class="field">
            <label for="image" [class.required]="!isEditMode"
              >Subcategory Image</label
            >
            <div *ngIf="currentImageUrl && !selectedImage" class="mb-2">
              <img
                [src]="currentImageUrl"
                alt="Current subcategory image"
                style="max-width: 200px; max-height: 200px; object-fit: contain;"
                (error)="handleImageError($event)"
                onerror="this.style.display='none'"
              />
              <div *ngIf="imageLoadError" class="text-danger">
                <small>Error loading image. URL: {{ currentImageUrl }}</small>
              </div>
            </div>
            <p-fileUpload
              #fileUpload
              mode="basic"
              [auto]="true"
              [chooseLabel]="isEditMode ? 'Change Image' : 'Choose Image'"
              [maxFileSize]="1000000"
              accept="image/*"
              (onSelect)="onImageUpload($event)"
              [customUpload]="true"
              [ngClass]="{
                'ng-invalid':
                  !selectedImage &&
                  !isEditMode &&
                  addSubcategoryForm.get('image')?.touched
              }"
            >
            </p-fileUpload>
            <small
              class="p-error block"
              *ngIf="
                !selectedImage &&
                !isEditMode &&
                addSubcategoryForm.get('image')?.touched
              "
            >
              Subcategory image is required
            </small>
            <small class="text-success block" *ngIf="selectedImage">
              Selected image: {{ selectedImage.name }}
            </small>
            <small
              class="text-muted block"
              *ngIf="isEditMode && !selectedImage"
            >
              Leave empty to keep the current image
            </small>
          </div>
        </div>
      </form>
    </app-shared-dialog>
  `,
})
export class AddSubcategoryComponent {
  @Output() onSave = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();
  displayDialog: boolean = false;
  addSubcategoryForm: FormGroup;
  selectedImage: File | null = null;
  isEditMode: boolean = false;
  editId: string | null = null;
  currentImageUrl: string | null = null;
  imageLoadError: boolean = false;
  categories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private subcategoryService: SubcategoryService,
    private categoryService: CategoryService
  ) {
    this.addSubcategoryForm = this.fb.group({
      name: ['', Validators.required],
      categoryId: ['', Validators.required],
      image: [null],
    });
    this.loadCategories();
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      },
    });
  }

  openDialog(subcategory?: any) {
    this.displayDialog = true;
    if (subcategory) {
      this.isEditMode = true;
      this.editId = subcategory.id;
      this.currentImageUrl = subcategory.imageUrl;
      this.imageLoadError = false;
      console.log('Opening edit dialog with image URL:', this.currentImageUrl);
      this.addSubcategoryForm.patchValue({
        name: subcategory.name,
        categoryId: subcategory.categoryId,
      });
    } else {
      this.isEditMode = false;
      this.editId = null;
      this.currentImageUrl = null;
      this.imageLoadError = false;
    }
  }

  closeDialog() {
    this.displayDialog = false;
    this.addSubcategoryForm.reset();
    this.selectedImage = null;
    this.isEditMode = false;
    this.editId = null;
    this.currentImageUrl = null;
    this.onCancel.emit();
  }

  onImageUpload(event: any) {
    if (event && event.files && event.files.length > 0) {
      const file = event.files[0];
      this.selectedImage = file;
      this.addSubcategoryForm.patchValue({ image: file });
      this.addSubcategoryForm.markAsDirty();
    }
  }

  handleImageError(_event: Event): void {
    console.error('Error loading image:', this.currentImageUrl);
    this.imageLoadError = true;
  }

  isFormValid(): boolean {
    const nameValid = !!this.addSubcategoryForm.get('name')?.valid;
    const categoryValid = !!this.addSubcategoryForm.get('categoryId')?.valid;
    const imageValid = this.isEditMode ? true : !!this.selectedImage;
    return nameValid && categoryValid && imageValid;
  }

  addSubcategory() {
    Object.keys(this.addSubcategoryForm.controls).forEach((key) => {
      const control = this.addSubcategoryForm.get(key);
      control?.markAsTouched();
    });

    if (
      this.addSubcategoryForm.valid &&
      (this.selectedImage || this.isEditMode)
    ) {
      const formData = new FormData();
      formData.append('name', this.addSubcategoryForm.get('name')?.value);
      formData.append(
        'categoryId',
        this.addSubcategoryForm.get('categoryId')?.value
      );

      if (this.selectedImage) {
        formData.append('image', this.selectedImage);
      }

      const request =
        this.isEditMode && this.editId
          ? this.subcategoryService.updateSubcategory(this.editId, formData)
          : this.subcategoryService.addSubcategory(formData);

      request.subscribe({
        next: (response) => {
          console.log(
            `Subcategory ${this.isEditMode ? 'updated' : 'added'} successfully`,
            response
          );
          this.onSave.emit(response);
          this.closeDialog();
        },
        error: (error) => {
          console.error(
            `Error ${this.isEditMode ? 'updating' : 'adding'} subcategory`,
            error
          );
        },
      });
    }
  }
}
