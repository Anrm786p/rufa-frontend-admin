import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ProductComponent } from './components/product/product.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  //   { path: 'categories', component: AllCategoriesComponent },

  { path: 'home', component: ProductComponent },

  //   { path: 'contact', component: ContactComponent },

  { path: '**', redirectTo: 'home' },
];
