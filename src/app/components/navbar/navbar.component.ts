import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  favourite_number: number = 3;

  cart_number: number = 2;

  login_service = inject(LoginService);
  private auth = inject(AuthService);

  makeLogin() {
    console.log('login clicked');

    this.login_service.openLogin();
  }

  logout() {
    this.auth.logout();
  }
}
