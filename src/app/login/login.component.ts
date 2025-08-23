import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    if (this.authService.getToken()) {
      this.router.navigate(['/home']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  login() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          console.log('Login successful:', response); // Debug log
          if (response && response.token && response.name && response.role) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Welcome back, ${response.name}!`,
            });
            this.router.navigate(['/home']);
          } else {
            console.error('Invalid response format:', response); // Debug log
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Invalid response from server',
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Login error:', error); // Debug log
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Login failed',
          });
          this.isLoading = false;
        },
      });
    }
  }
}
