import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  categories: any[] = [];

  ngOnInit(): void {
    this.categories = [
      {
        categoryImage: 'gift-box.svg.png',
        categoryName: 'Gifts Box',
        categoryItemsNumber: 30,
      },
      {
        categoryImage: 'home.svg fill.png',
        categoryName: 'Home &<br>Living Gifts',
        categoryItemsNumber: 25,
      },
      {
        categoryImage: 'jewelry.svg.png',
        categoryName: 'Jewelry &<br>Accessories',
        categoryItemsNumber: 15,
      },
      {
        categoryImage: 'garment.svg.png',
        categoryName: 'Garment<br>Care',
        categoryItemsNumber: 5,
      },
      {
        categoryImage: 'office.svg.png',
        categoryName: 'Office &<br>Stationery',
        categoryItemsNumber: 30,
      },
    ];
  }
}
