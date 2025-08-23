import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LoaderComponent } from './components/loader/loader.component';
import { filter } from 'rxjs';
import { HomeComponent } from './components/home/home.component';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavbarComponent,
    RouterOutlet,
    LoaderComponent,
    ToastModule,
    CommonModule,
  ],
  template: `
    <p-toast position="top-right"></p-toast>
    <div *ngIf="!isLoginPage">
      <app-navbar></app-navbar>
    </div>
    <div class="main-content">
      <app-loader></app-loader>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      :host ::ng-deep .p-toast {
        z-index: 1000;
      }
      .main-content {
        flex: 1;
        padding: 1rem;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  title = 'shoppingGifts';
  router = inject(Router);
  isLoginPage = false;

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Show navbar for all routes except login
        this.isLoginPage = event.urlAfterRedirects.includes('login');
        console.log(
          'Current route:',
          event.urlAfterRedirects,
          'isLoginPage:',
          this.isLoginPage
        );
      });
  }
}
