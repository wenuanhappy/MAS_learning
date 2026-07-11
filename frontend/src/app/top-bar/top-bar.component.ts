import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {SharedService} from '../shared';

@Component({
  selector: 'app-top-bar',
  imports: [
    RouterLink,
    FormsModule,
  ],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css'
})
export class TopBarComponent {

  openSidebar() {
    this.sharedService.isBarOpen = true;
  }
  constructor(protected sharedService:SharedService) {
  }
}
