import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConditionPanelComponent } from '../condition-panel/condition-panel';
import {Sidebar} from '../sidebar/sidebar';
import {HttpClient} from '@angular/common/http';
import {SharedService} from '../shared';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {ApiService} from '../services/api.service';

interface Node {
  id: string;
  role: string;
  prompt: string;
  x: number;
  y: number;
  isJudge?: boolean;
  isEnd?: boolean;
  conditionOptions?: { name: string; description: string }[];
}

interface ConditionEdge {
  from: string;
  judge_agent: string;
  conditions: { [key: string]: string };
}

@Component({
  selector: 'app-agent-editor',
  standalone: true,
  templateUrl: './editor.html',
  styleUrls: ['./editor.css'],
  imports: [CommonModule, FormsModule, ConditionPanelComponent, Sidebar]
})
export class AgentEditorComponent implements OnInit{

  constructor(
    private http: HttpClient,
    private userService: SharedService,
    private router: Router,
    private api: ApiService
  ) {
  }

  ngOnInit(): void {
    const workflowId =

      localStorage.getItem(

        'currentWorkflowId'

      );

    if (workflowId) {

      this.workflowId =

        Number(workflowId);

    }
    
    // 加载 workflow 名称
    const savedName = localStorage.getItem('currentWorkflowName');
    if (savedName) {
      this.workflowName = savedName;
    }
    
    // 加载模版教育内容
    const savedEducation = localStorage.getItem('templateEducation');
    if (savedEducation) {
      this.templateEducation = savedEducation;
      localStorage.removeItem('templateEducation');
    }
    
    const savedWorkflow =

      localStorage.getItem('currentWorkflow');

    if (!savedWorkflow) return;

    const workflow =

      JSON.parse(savedWorkflow);

    this.nodes = (workflow.nodes || []).map(

      (node: any, index: number) => ({

        ...node,

        x:

          node.x ??

          100 + (index % 4) * 220,

        y:

          node.y ??

          100 + Math.floor(index / 4) * 160

      })

    );

    this.edges =

      workflow.edges || [];

    this.conditionEdges =

      workflow.condition_edges || [];

    console.log('workflow 加载成功');
    }

  nodes: Node[] = [];

  edges: { from: string, to: string }[] = [];

  conditionEdges: ConditionEdge[] = [];

  draggingNode: Node | null = null;

  offsetX = 0;
  offsetY = 0;

  isDragging = false;

  pendingEdgeFrom: Node | null = null;

  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;

  contextMenuNode: Node | null = null;

  editingConditionEdge: ConditionEdge | null = null;

  conditionPanelAnchor: {
    node: Node;
    x: number;
    y: number;
  } | null = null;
  workflowId: number | null = null;

  showJudgePanel = false;

  // ===== 新增：节点表单 =====

  newNodeId = '';

  newNodeRole = '';

  newNodePrompt = '';

  // ===== 判断节点表单 =====

  newConditionName = '';

  newConditionDesc = '';

  conditionOptionsList: { name: string; description: string }[] = [];

  taskGoal: string = '设计一个简单的计算器程序';
  taskBarVisible: boolean = true;
  workflowName: string = '';
  templateEducation: string = '';
  educationBarVisible: boolean = false;
  saveMessage: string = '';
  private saveMessageTimer: any = null;

  get judgeNodes(): Node[] {
    return this.nodes.filter(n => n.isJudge);
  }

  private judgeNodeCounter = 0;

  addConditionOption() {
    const name = this.newConditionName.trim();
    const desc = this.newConditionDesc.trim();
    if (!name) return;
    this.conditionOptionsList.push({ name, description: desc });
    this.newConditionName = '';
    this.newConditionDesc = '';
  }

  removeConditionOption(index: number) {
    this.conditionOptionsList.splice(index, 1);
  }

  generateJudgePrompt(options: { name: string; description: string }[]): string {
    if (options.length === 0) return '请判断结果并输出JSON';
    const conditions = options.map(opt =>
      `\"${opt.name}\"代表：${opt.description}`
    ).join('，');
    return `请根据前序输出判断结果，输出JSON：{${options.map(o => `"\\\"condition\\\":\\"${o.name}\\""`).join(' 或 ')}}，其中${conditions}`;
  }

  // ===== 添加节点 =====

  addNode() {

    const id = this.newNodeId.trim();

    const role = this.newNodeRole.trim();

    const prompt = this.newNodePrompt.trim();

    if (!id || !role) {
      alert('请输入 Node ID 和 Role');
      return;
    }

    // 检查重复 ID
    if (this.nodes.some(n => n.id === id)) {
      alert('Node ID 已存在');
      return;
    }

    // 自动布局
    const index = this.nodes.length;

    const x = 100 + (index % 4) * 220;

    const y = 100 + Math.floor(index / 4) * 140;

    this.nodes.push({
      id,
      role,
      prompt,
      x,
      y
    });

    // 清空输入框
    this.newNodeId = '';
    this.newNodeRole = '';
    this.newNodePrompt = '';
  }

  // ===== 添加判断节点 =====

  addJudgeNode() {

    if (this.conditionOptionsList.length === 0) {
      alert('请至少添加一个条件选项');
      return;
    }

    this.judgeNodeCounter++;

    const id = `judge_${this.judgeNodeCounter}`;

    const role = 'Judge Agent';

    const prompt = this.generateJudgePrompt(this.conditionOptionsList);

    const options = [...this.conditionOptionsList];

    const index = this.nodes.length;

    const x = 100 + (index % 4) * 220;

    const y = 100 + Math.floor(index / 4) * 140;

    this.nodes.push({
      id,
      role,
      prompt,
      x,
      y,
      isJudge: true,
      conditionOptions: options
    });

    this.conditionOptionsList = [];
  }

  // ===== 添加终止节点 =====

  addEndNode() {

    if (this.nodes.some(n => n.isEnd)) {
      alert('已存在终止节点，无需重复添加');
      return;
    }

    const index = this.nodes.length;

    const x = 100 + (index % 4) * 220;

    const y = 100 + Math.floor(index / 4) * 140;

    this.nodes.push({
      id: 'END',
      role: 'End',
      prompt: '',
      x,
      y,
      isEnd: true
    });
  }

// ===== 右键菜单 =====

  onRightClick(event: MouseEvent, node: Node) {

    event.preventDefault();

    event.stopPropagation();

    this.contextMenuVisible = true;

    this.contextMenuX = event.clientX;

    this.contextMenuY = event.clientY;

    this.contextMenuNode = node;
  }

  startAddEdge(type: 'normal' | 'condition') {

    const node = this.contextMenuNode!;

    const rect = document.querySelector('.canvas')!
      .getBoundingClientRect();

    if (type === 'normal') {

      this.pendingEdgeFrom = node;
    }

    if (type === 'condition') {

      if (this.judgeNodes.length === 0) {
        alert('请先添加判断节点（使用工具栏中的"添加判断节点"按钮）');
        this.closeContextMenu();
        return;
      }

      this.editingConditionEdge = {
        from: node.id,
        judge_agent: this.judgeNodes[0].id,
        conditions: {}
      };

      this.conditionPanelAnchor = {
        node,
        x: node.x + rect.left + 160,
        y: node.y + rect.top
      };
    }

    this.closeContextMenu();
  }

  // ===== 点击节点连线 =====

  onNodeClick(node: Node) {

    if (!this.pendingEdgeFrom) return;

    if (node.id === this.pendingEdgeFrom.id) return;

    this.edges.push({
      from: this.pendingEdgeFrom.id,
      to: node.id
    });

    this.pendingEdgeFrom = null;
  }

  // ===== 条件边 =====

  onSaveConditionEdge(edge: ConditionEdge) {

    this.conditionEdges.push(edge);

    this.editingConditionEdge = null;

    this.conditionPanelAnchor = null;
  }

  // ===== 拖拽 =====

  startDrag(event: MouseEvent, node: Node) {

    event.stopPropagation();

    const rect = (
      document.querySelector('.canvas') as HTMLElement
    ).getBoundingClientRect();

    this.isDragging = true;

    this.draggingNode = node;

    this.offsetX =
      event.clientX - rect.left - node.x;

    this.offsetY =
      event.clientY - rect.top - node.y;
  }

  onDrag(event: MouseEvent) {

    if (!this.draggingNode) return;

    const rect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();

    this.draggingNode.x =
      event.clientX - rect.left - this.offsetX;

    this.draggingNode.y =
      event.clientY - rect.top - this.offsetY;
  }

  stopDrag() {

    this.draggingNode = null;

    setTimeout(() => {
      this.isDragging = false;
    }, 0);
  }

  // ===== 删除节点 =====

  deleteNode(node: Node) {

    this.nodes =
      this.nodes.filter(n => n.id !== node.id);

    this.edges =
      this.edges.filter(
        e => e.from !== node.id && e.to !== node.id
      );

    this.conditionEdges =
      this.conditionEdges.filter(
        e => e.from !== node.id
      );

    this.closeContextMenu();
  }

  // ===== 导出 =====

  exportJSON() {

    const workflow = {

      nodes: this.nodes.filter(n => !n.isEnd).map(n => ({
        id: n.id,
        role: n.role,
        prompt: n.prompt
      })),

      entry: (this.nodes.find(n => !n.isEnd))?.id || '',

      edges: this.edges,

      condition_edges: this.conditionEdges
    };

    console.log(workflow);

    localStorage.setItem('agentWorkflow', JSON.stringify(workflow));
    localStorage.setItem('agentContext', this.taskGoal || '设计一个简单的计算器程序');
    this.router.navigate(['/scene']);
  }

  exportJSONFile() {
    const workflow = {
      nodes: this.nodes.filter(n => !n.isEnd).map(n => ({
        id: n.id,
        role: n.role,
        prompt: n.prompt
      })),
      entry: (this.nodes.find(n => !n.isEnd))?.id || '',
      edges: this.edges,
      condition_edges: this.conditionEdges
    };

    const jsonStr = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (this.workflowName || 'workflow') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== 工具函数 =====

  closeContextMenu() {

    this.contextMenuVisible = false;

    this.contextMenuNode = null;
  }

  getNode(id: string) {

    return this.nodes.find(n => n.id === id);
  }

  getX(id: string) {

    return this.getNode(id)?.x ?? 0;
  }

  getY(id: string) {

    return this.getNode(id)?.y ?? 0;
  }

  objectKeys(obj: any): string[] {

    return Object.keys(obj);

  }

  getNodeClass(node: Node): string {
    if (node.isEnd) return 'node end-node';
    if (node.isJudge) return 'node judge-node';
    return 'node';
  }

  getNodeIcon(node: Node): string {
    if (node.isEnd) return '🛑 ';
    if (node.isJudge) return '⚖️ ';
    return '';
  }

  getNodeSuffix(node: Node): string {
    if (node.isEnd) return ' (终止)';
    if (node.isJudge) return ' (判断)';
    return '';
  }

  getConditionPath(from: string, to: string): string {
    const p = this.getEdgePoints(from, to);

    const x1 = p.x1;

    const y1 = p.y1;

    const x2 = p.x2;

    const y2 = p.y2;

    // 控制点
    const cx = (x1 + x2) / 2;

    const cy = Math.min(y1, y2) - 80;

    return `M ${x1} ${y1}
          Q ${cx} ${cy}
            ${x2} ${y2}`;
  }

  getConditionLabelX(from: string, to: string): number {
    const p = this.getEdgePoints(from, to);
    return (p.x1 + p.x2) / 2;
  }

  getConditionLabelY(from: string, to: string): number {
    const p = this.getEdgePoints(from, to);
    return (p.y1 + p.y2) / 2;
  }

  getEdgePoints(from: string, to: string) {

    const fromNode = this.getNode(from);

    const toNode = this.getNode(to);

    if (!fromNode || !toNode) {
      return {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0
      };
    }

    // 节点中心
    const fromCenterX = fromNode.x + 90;
    const fromCenterY = fromNode.y + 60;

    const toCenterX = toNode.x + 90;
    const toCenterY = toNode.y + 60;

    // 向量
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const angle = Math.atan2(dy, dx);

    // 节点半尺寸
    const nodeHalfWidth = 90;
    const nodeHalfHeight = 60;

    // 起点边缘
    const x1 =
      fromCenterX +
      Math.cos(angle) * nodeHalfWidth;

    const y1 =
      fromCenterY +
      Math.sin(angle) * nodeHalfHeight;

    // 终点边缘
    const x2 =
      toCenterX -
      Math.cos(angle) * nodeHalfWidth;

    const y2 =
      toCenterY -
      Math.sin(angle) * nodeHalfHeight;

    return {
      x1,
      y1,
      x2,
      y2
    };
  }

  saveWorkflow() {
    const defaultName = this.workflowId ? this.workflowName : '未命名';
    const inputName = prompt('请输入 Workflow 名称：', defaultName);
    
    if (inputName === null) return; // 用户点击取消
    
    const name = inputName.trim() || '未命名';
    this.workflowName = name;

    const workflow = {
      nodes: this.nodes,
      entry: this.nodes[0]?.id || '',
      edges: this.edges,
      condition_edges: this.conditionEdges
    };

    this.http.post(

      this.api.apiUrl('/workflow/save'),

      {
        id: this.workflowId,
        userId:this.userService.userId,
        name: name,
        workflowJson:
          JSON.stringify(workflow)
      }

    ).subscribe({

      next: (res) => {
        this.showSaveMessage('✅ 保存成功');
        localStorage.setItem('currentWorkflowName', name);
      },
      error: () => {
        this.showSaveMessage('❌ 保存失败');
      }

    });
  }

  showSaveMessage(msg: string) {
    this.saveMessage = msg;
    if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
    this.saveMessageTimer = setTimeout(() => {
      this.saveMessage = '';
    }, 2000);
  }

  loadWorkflow() {

    this.http.get<any>(
      'assets/test.json'
    ).subscribe({

      next: (workflow) => {

        this.nodes = (workflow.nodes || []).map(

          (node: any, index: number) => ({

            ...node,

            x:
              node.x ??
              100 + (index % 4) * 220,

            y:
              node.y ??
              100 + Math.floor(index / 4) * 160
          })
        );

        this.edges =
          workflow.edges || [];

        this.conditionEdges =
          workflow.condition_edges || [];

        console.log('加载成功');
      },

      error: (err) => {

        console.error('加载失败', err);
      }
    });
  }
}
