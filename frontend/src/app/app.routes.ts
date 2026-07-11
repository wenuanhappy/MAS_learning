import { Routes } from '@angular/router';
import { SceneComponent } from './scene/scene';
import { WorkflowRunnerComponent } from './workflow-runner/workflow-runner';
import { HideSeekComponent } from './hide-seek/hide-seek';
import {LoginComponent} from './login/login.component';
import {UserCenterComponent} from './user-center/user-center.component';
import {UserRegisterComponent} from './user-register/user-register.component';
import {AgentEditorComponent} from './editor/editor';
import {WorkflowListComponent} from './workflow-list/workflow-list';
import {TemplateListComponent} from './template-list/template-list';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'editor', component: AgentEditorComponent, canActivate: [authGuard] },
  { path: 'workflows', component: WorkflowListComponent, canActivate: [authGuard] },
  { path: 'templates', component: TemplateListComponent, canActivate: [authGuard] },
  { path: 'scene', component: WorkflowRunnerComponent, canActivate: [authGuard] },
  { path: 'scene3d', component: SceneComponent, canActivate: [authGuard] },
  { path: 'hide-seek', component: HideSeekComponent, canActivate: [authGuard] },
  { path: 'user_center', component: UserCenterComponent, canActivate: [authGuard] },
  { path: 'user_register', component: UserRegisterComponent }
];

