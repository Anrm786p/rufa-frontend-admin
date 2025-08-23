import { Component, OnInit, ViewChild } from '@angular/core';
import { TableComponent } from '../shared/table/table.component';
import { AddCategoryComponent } from './add-category.component';
import { CategoryService } from '../../services/category.service';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SharedMessageService } from '../../services/message.service';

@Component({
  selector: 'app-category',
  template: `
    <app-table
      [title]="'Categories'"
      [columns]="columns"
      [data]="categories"
      [filters]="filters"
      [showActions]="true"
      (onAdd)="handleAdd()"
      (onEdit)="handleEdit($event)"
      (onDelete)="handleDelete($event)"
    ></app-table>
    <app-add-category
      #addCategoryDialog
      (onSave)="saveCategory($event)"
      (onCancel)="cancel()"
    ></app-add-category>
    <p-confirmDialog
      [style]="{ width: '450px' }"
      [baseZIndex]="10000"
      styleClass="custom-confirm-dialog"
    >
    </p-confirmDialog>
  `,
  standalone: true,
  imports: [TableComponent, AddCategoryComponent, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
  styles: [],
})
export class CategoryComponent implements OnInit {
  @ViewChild('addCategoryDialog') addCategoryDialog!: AddCategoryComponent;

  columns = [
    { field: 'name', header: 'Name' },
    { field: 'imageUrl', header: 'Image', isImage: true },
    { field: 'createdAt', header: 'Created At' },
  ];

  categories: any[] = [];

  filters = {
    enableSearch: false,
  };

  constructor(
    private categoryService: CategoryService,
    private confirmationService: ConfirmationService,
    private messageService: SharedMessageService
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        this.messageService.showMessage(
          'Error',
          'Failed to load categories',
          'error'
        );
      },
    });
  }

  handleAdd() {
    this.addCategoryDialog.openDialog();
  }

  handleEdit(category: any) {
    this.addCategoryDialog.openDialog(category);
  }

  handleDelete(category: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete category "${category.name}"?`,
      header: 'Delete Category',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-success',
      accept: () => {
        this.categoryService.deleteCategory(category.id).subscribe({
          next: () => {
            this.messageService.showMessage(
              'Success',
              'Category deleted successfully',
              'success'
            );
            this.loadCategories();
          },
          error: (error) => {
            this.messageService.showMessage(
              'Error',
              'Failed to delete category',
              'error'
            );
          },
        });
      },
    });
  }

  saveCategory(response: any) {
    const action = this.addCategoryDialog.isEditMode ? 'updated' : 'added';
    this.messageService.showMessage(
      'Success',
      `Category ${action} successfully`,
      'success'
    );
    this.loadCategories(); // Reload the categories list
  }

  cancel() {
    this.addCategoryDialog.closeDialog();
  }
}
