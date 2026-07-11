import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  public isBarOpen: boolean = false;
  public username: string = "";
  public isLoggedIn: boolean = false;
  public userId: number = 0;
  constructor() {
  }
}
