import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SceneComponent} from './scene/scene';
import {AgentEditorComponent} from './editor/editor';
import { CommonModule } from '@angular/common';
import {TopBarComponent} from './top-bar/top-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SceneComponent, AgentEditorComponent, CommonModule, TopBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  mode: 'scene' | 'editor' = 'scene';
}
