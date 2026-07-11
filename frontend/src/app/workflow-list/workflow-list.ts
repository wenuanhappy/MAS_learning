import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {SharedService} from '../shared';
import {Sidebar} from '../sidebar/sidebar';
import {Router, RouterOutlet} from '@angular/router';
import {ApiService} from '../services/api.service';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './workflow-list.html',
  styleUrls: ['./workflow-list.css']
})
export class WorkflowListComponent implements OnInit {

  workflows: any[] = [];

  constructor(
    private http: HttpClient,
    private userService: SharedService,
    private cdr: ChangeDetectorRef,
    private router:Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.getAllWorkflows();
  }

  getAllWorkflows(){
    const userId = this.userService.userId;

    this.http.get<any>(
      this.api.apiUrl(`/workflow/list/${userId}`)
    ).subscribe({

      next: (res) => {
        this.workflows = [...res.data];

        console.log(this.workflows);

        this.cdr.detectChanges();

      },

      error: (err) => {
        console.error(err);
      }
    });
  }

  loadWorkflow(workflow: any) {
    // 存到 localStorage
    localStorage.setItem(
      'currentWorkflow',
      workflow.workflowJson
    );
    localStorage.setItem(
      'currentWorkflowId',
      workflow.id.toString()
    );
    localStorage.setItem(
      'currentWorkflowName',
      workflow.name || ''
    );
    this.router.navigate(['/editor']);
  }
}
