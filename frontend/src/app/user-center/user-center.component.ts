import {Component, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {DatePipe, NgForOf} from '@angular/common';
import {map, Observable} from 'rxjs';
import {SharedService} from '../shared';
import {Sidebar} from '../sidebar/sidebar';

@Component({
  selector: 'app-user-center',
  imports: [
    RouterLink,
    NgForOf,
    DatePipe,
    Sidebar
  ],
  templateUrl: './user-center.component.html',
  styleUrl: './user-center.component.css'
})
export class UserCenterComponent implements OnInit{
  onCircuitClicked(circuitId:number){
    this.route.navigate(['/editor', circuitId]);
  }
  constructor(protected sharedService:SharedService, private http:HttpClient, private route:Router) {
  }

  ngOnInit(): void {
  }
}
