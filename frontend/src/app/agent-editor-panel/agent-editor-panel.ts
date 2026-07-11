import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-agent-editor-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-editor-panel.html',
  styleUrl: './agent-editor-panel.css'
})
export class AgentEditorPanelComponent implements OnChanges {
  @Input() visible = false;
  @Input() agent: any = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  editedPrompt: string = '';
  editedContext: string = '';
  editedRole: string = '';
  
  // 结构化上下文显示
  taskGoal: string = '';
  conversationHistory: string = '';
  hasStructuredContext = false;

  ngOnChanges(changes: SimpleChanges) {
    if (this.agent) {
      // 从 agent 对象获取 prompt
      this.editedPrompt = this.agent.prompt || this.agent.message || '';
      this.editedRole = this.agent.role || this.agent.name || '';
      
      // 处理 context（可能是字符串或对象）
      if (this.agent.context) {
        if (typeof this.agent.context === 'string') {
          this.editedContext = this.agent.context;
          this.hasStructuredContext = false;
        } else {
          // 对象格式：{ task_goal, conversation_history, full_prompt }
          this.taskGoal = this.agent.context.task_goal || '';
          this.conversationHistory = this.agent.context.conversation_history || '';
          this.editedContext = this.agent.context.full_prompt || '';
          this.hasStructuredContext = true;
        }
      } else {
        this.editedContext = '';
        this.hasStructuredContext = false;
      }
    }
  }

  onSave() {
    const updatedData = {
      name: this.agent?.name,
      role: this.editedRole,
      prompt: this.editedPrompt,
      context: this.editedContext
    };
    
    this.save.emit(updatedData);
  }

  onClose() {
    this.close.emit();
  }
}
