import { Component, OnInit, ViewChild } from '@angular/core';
import { TableComponent } from '../shared/table/table.component';
import { AddSubcategoryComponent } from './add-subcategory.component';
import { SubcategoryService } from '../../services/subcategory.service';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SharedMessageService } from '../../services/message.service';

@Component({
  selector: 'app-subcategory',
  template: `
    <app-table
      [title]="'Subcategories'"
      [columns]="columns"
      [data]="subcategories"
      [filters]="filters"
      [showActions]="true"
      (onAdd)="handleAdd()"
      (onEdit)="handleEdit($event)"
      (onDelete)="handleDelete($event)"
    ></app-table>
    <app-add-subcategory
      #addSubcategoryDialog
      (onSave)="saveSubcategory($event)"
      (onCancel)="cancel()"
    ></app-add-subcategory>
    <p-confirmDialog
      [style]="{ width: '450px' }"
      [baseZIndex]="10000"
      styleClass="custom-confirm-dialog"
    >
    </p-confirmDialog>
  `,
  standalone: true,
  imports: [TableComponent, AddSubcategoryComponent, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
  styles: [],
})
export class SubcategoryComponent implements OnInit {
  @ViewChild('addSubcategoryDialog')
  addSubcategoryDialog!: AddSubcategoryComponent;

  columns = [
    { field: 'name', header: 'Name' },
    { field: 'imageUrl', header: 'Image', isImage: true },
    { field: 'category.name', header: 'Category' },
    { field: 'createdAt', header: 'Created At' },
  ];

  subcategories: any[] = [];

  filters = {
    enableSearch: false,
  };

  constructor(
    private subcategoryService: SubcategoryService,
    private confirmationService: ConfirmationService,
    private messageService: SharedMessageService
  ) {}

  ngOnInit() {
    this.loadSubcategories();
  }

  private loadSubcategories() {
    this.subcategoryService.getSubcategories().subscribe({
      next: (data) => {
        this.subcategories = data;
      },
      error: (error) => {
        this.messageService.showMessage(
          'Error',
          'Failed to load subcategories',
          'error'
        );
      },
    });
  }

  handleAdd() {
    this.addSubcategoryDialog.openDialog();
  }

  handleEdit(subcategory: any) {
    this.addSubcategoryDialog.openDialog(subcategory);
  }

  handleDelete(subcategory: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete subcategory "${subcategory.name}"?`,
      header: 'Delete Subcategory',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-success',
      accept: () => {
        this.subcategoryService.deleteSubcategory(subcategory.id).subscribe({
          next: () => {
            this.messageService.showMessage(
              'Success',
              'Subcategory deleted successfully',
              'success'
            );
            this.loadSubcategories();
          },
          error: (error) => {
            this.messageService.showMessage(
              'Error',
              'Failed to delete subcategory',
              'error'
            );
          },
        });
      },
    });
  }

  saveSubcategory(response: any) {
    const action = this.addSubcategoryDialog.isEditMode ? 'updated' : 'added';
    this.messageService.showMessage(
      'Success',
      `Subcategory ${action} successfully`,
      'success'
    );
    this.loadSubcategories();
  }

  cancel() {
    this.addSubcategoryDialog.closeDialog();
  }
}
