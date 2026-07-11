import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {ApiService} from '../services/api.service';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

@Component({
  selector: 'app-agent-chat-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-chat-dialog.html',
  styleUrl: './agent-chat-dialog.css'
})
export class AgentChatDialogComponent {
  @Input() visible = false;
  @Input() agent: any = null;
  @Output() close = new EventEmitter<void>();

  messages: ChatMessage[] = [];
  inputText: string = '';
  isWaiting = false;

  constructor(private http: HttpClient, private api: ApiService) {}

  ngOnChanges() {
    if (this.visible && this.agent) {
      this.messages = [];
      this.inputText = '';
      const roleName = this.agent.role || this.agent.name || 'Agent';
      this.messages.push({
        role: 'agent',
        content: `你好！我是${roleName}，有什么想了解的吗？`
      });
    }
  }

  async sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isWaiting || !this.agent) return;

    this.messages.push({ role: 'user', content: text });
    this.inputText = '';
    this.isWaiting = true;

    try {
      const res: any = await firstValueFrom(
        this.http.post(this.api.pyApiUrl('/agent_chat'), {
          agent_id: this.agent.name || '',
          agent_role: this.agent.role || '',
          agent_prompt: this.agent.prompt || '',
          agent_context: this.agent.context || {},
          question: text
        })
      );

      this.messages.push({ role: 'agent', content: res.reply || '（无回复）' });
    } catch (err) {
      console.error('Agent 对话失败', err);
      this.messages.push({ role: 'agent', content: '抱歉，连接出现问题，暂时无法回复。' });
    } finally {
      this.isWaiting = false;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onClose() {
    this.messages = [];
    this.inputText = '';
    this.close.emit();
  }
}
