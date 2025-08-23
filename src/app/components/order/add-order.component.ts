import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { SharedDialogComponent } from '../shared/dialog/shared-dialog.component';

@Component({
  selector: 'app-add-order',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    DropdownModule,
    CommonModule,
    SharedDialogComponent,
  ],
  templateUrl: './add-order.component.html',
  styleUrls: ['./add-order.component.css'],
})
export class AddOrderComponent {
  displayDialog: boolean = false;
  addOrderForm: FormGroup;
  statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.addOrderForm = this.fb.group({
      customerName: ['', Validators.required],
      total: ['', Validators.required],
      status: ['', Validators.required],
    });
  }

  openDialog() {
    this.displayDialog = true;
  }

  closeDialog() {
    this.displayDialog = false;
  }

  addOrder() {
    const formValue = this.addOrderForm.value;
    this.http.post(`${environment.apiUrl}/orders`, formValue).subscribe(
      (response) => {
        console.log('Order added successfully', response);
        this.closeDialog();
      },
      (error) => {
        console.error('Error adding order', error);
      }
    );
  }
}
