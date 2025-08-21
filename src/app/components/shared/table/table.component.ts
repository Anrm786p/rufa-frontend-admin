import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table',
  imports: [CommonModule, TableModule, CardModule, FormsModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent {
  /** Title of the card */
  @Input() title: string = 'Table';

  /** Array of objects (table rows) */
  @Input() data: any[] = [];

  /** Array of column definitions */
  @Input() columns: { field: string; header: string; isImage?: boolean }[] = [];

  /** Whether to show action column */
  @Input() showActions: boolean = false;
}
