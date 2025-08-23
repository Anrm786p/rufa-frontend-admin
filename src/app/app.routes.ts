import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ProductComponent } from './components/product/product.component';
import { HomeComponent } from './components/home/home.component';
import { OrderComponent } from './components/order/order.component';
import { CategoryComponent } from './components/category/category.component';
import { SubcategoryComponent } from './components/subcategory/subcategory.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'products',
    component: ProductComponent,
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    component: OrderComponent,
    canActivate: [authGuard],
  },
  {
    path: 'categories',
    component: CategoryComponent,
    canActivate: [authGuard],
  },
  {
    path: 'subcategories',
    component: SubcategoryComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home' },
];
