import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LoaderComponent } from './components/loader/loader.component';
import { filter } from 'rxjs';
import { HomeComponent } from './components/home/home.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, HomeComponent, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'shoppingGifts';
  router = inject(Router);
  isLoginPage = false;

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLoginPage = event.url.includes('login');
      });
  }
}
