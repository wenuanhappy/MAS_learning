import { Component } from '@angular/core';
import {SharedService} from '../shared';
import {HttpClient} from '@angular/common/http';
import {Router, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    CommonModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  workflowExpanded = true;

  constructor(protected sharedService:SharedService, private http:HttpClient, private route:Router) {
  }
  newWorkflow() {

    localStorage.removeItem(
      'currentWorkflow'
    );
    localStorage.removeItem(
      'currentWorkflowId'
    );
    this.route.navigate(['/editor']);
  }
}
