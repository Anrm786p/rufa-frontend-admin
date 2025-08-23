import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    RippleModule,
    SelectButtonModule,
    DropdownModule,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent {
  @Input() title: string = 'Table';
  @Input() data: any[] = [];
  @Input() columns: { field: string; header: string; isImage?: boolean }[] = [];
  @Input() showActions: boolean = false;
  @Input() showAddButton: boolean = true; // allows suppressing add button separately
  @Input() filters: {
    categories?: any[];
    subcategories?: any[];
    enableSearch?: boolean;
  } = {
    enableSearch: true,
  };

  dropdownCategories: any[] = [];
  dropdownSubcategories: any[] = [];

  @Output() onSearch = new EventEmitter<string>();
  @Output() onCategoryFilter = new EventEmitter<string>();
  @Output() onSubcategoryFilter = new EventEmitter<string>();
  @Output() onAdd = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onPage = new EventEmitter<{ page: number; rows: number }>();

  searchText: string = '';
  selectedCategory: string = '';
  selectedSubcategory: string = '';
  searchTimeout: any;

  // Pagination
  @Input() totalRecords: number = 0;
  @Input() rows: number = 20;
  @Input() lazy: boolean = false;

  search() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.onSearch.emit(this.searchText);
    }, 300);
  }

  // Method to get nested property values (e.g., "category.name")
  getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return '';

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && current[key] !== undefined && current[key] !== null) {
        current = current[key];
      } else {
        return '';
      }
    }

    return current;
  }

  pageChange(e: any) {
    this.onPage.emit({ page: e.page + 1, rows: e.rows });
  }
}
