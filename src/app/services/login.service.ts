import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor() { }

  isLoginClicked = new BehaviorSubject(false);

  openLogin() {
    this.isLoginClicked.next(true);
  }

  closeLogin() {
    this.isLoginClicked.next(false);
  }
}
