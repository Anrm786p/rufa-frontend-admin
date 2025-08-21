import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../constants/product';
import { CardModule } from 'primeng/card';
import { TableComponent } from '../shared/table/table.component';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [TableComponent],
  providers: [ProductsService],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
})
export class ProductComponent {
  products = [
    {
      name: 'iPhone 14 Pro',
      category: 'Mobiles',
      price: 1200,
      image: 'https://place-hold.it/300x500?text=New Text&italic',
    },
    {
      name: 'Dell XPS 13',
      category: 'Laptops',
      price: 1500,
      image: 'https://place-hold.it/300x500?text=New Text&italic',
    },
    {
      name: 'Sony WH-1000XM5',
      category: 'Headphones',
      price: 400,
      image: 'https://place-hold.it/300x500?text=New Text&italic',
    },
    {
      name: 'Apple Watch Series 8',
      category: 'Smartwatches',
      price: 499,
      image: 'https://place-hold.it/300x500?text=New Text&italic',
    },
  ];
}
