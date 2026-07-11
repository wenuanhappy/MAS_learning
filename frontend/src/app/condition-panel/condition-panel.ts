import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Node {
  id: string;
  role: string;
  x: number;
  y: number;
  isJudge?: boolean;
  conditionOptions?: { name: string; description: string }[];
}

interface ConditionEdge {
  from: string;
  judge_agent: string;
  conditions: { [key: string]: string };
}

@Component({
  selector: 'app-condition-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './condition-panel.html',
  styleUrls: ['./condition-panel.css']
})
export class ConditionPanelComponent {

  @Input() edge!: ConditionEdge;
  @Input() nodes: Node[] = [];

  @Output() save = new EventEmitter<ConditionEdge>();
  @Output() close = new EventEmitter<void>();

  get judgeNodes(): Node[] {
    return this.nodes.filter(n => n.isJudge);
  }

  get selectedJudgeNode(): Node | undefined {
    return this.judgeNodes.find(n => n.id === this.edge.judge_agent);
  }

  get availableConditions(): { name: string; description: string }[] {
    const node = this.selectedJudgeNode;
    if (!node?.conditionOptions) return [];
    return node.conditionOptions.filter(opt => !(opt.name in this.edge.conditions));
  }

  conditionKey = '';
  targetNodeId = '';

  addCondition() {
    if (!this.conditionKey || !this.targetNodeId) return;
    this.edge.conditions[this.conditionKey] = this.targetNodeId;
    this.conditionKey = '';
    this.targetNodeId = '';
  }

  selectCondition(name: string) {
    this.conditionKey = name;
  }

  onJudgeChange() {
    this.edge.conditions = {};
    this.conditionKey = '';
    this.targetNodeId = '';
  }

  removeCondition(key: string) {
    delete this.edge.conditions[key];
  }

  onSave() {
    this.save.emit(this.edge);
  }

  onClose() {
    this.close.emit();
  }

  getNodeName(id: string) {
    return this.nodes.find(n => n.id === id)?.role || id;
  }
}
