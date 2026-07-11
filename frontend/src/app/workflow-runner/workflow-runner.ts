import { Component, ElementRef, ViewChild, NgZone, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AgentEditorPanelComponent } from '../agent-editor-panel/agent-editor-panel';
import { AgentChatDialogComponent } from '../agent-chat-dialog/agent-chat-dialog';
import { ApiService } from '../services/api.service';

interface AgentNode {
  id: string;
  role: string;
  prompt?: string;
  context?: any;
  x: number;
  y: number;
  color: string;
  isActive: boolean;
}

interface ChatEntry {
  from: string;
  to: string | null;
  message: string;
}

@Component({
  selector: 'app-workflow-runner',
  standalone: true,
  templateUrl: './workflow-runner.html',
  styleUrl: './workflow-runner.css',
  imports: [Sidebar, CommonModule, AgentEditorPanelComponent, AgentChatDialogComponent]
})
export class WorkflowRunnerComponent implements AfterViewInit {
  @ViewChild('runnerCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatLogContainer') chatLogContainer!: ElementRef<HTMLDivElement>;

  private ctx!: CanvasRenderingContext2D;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private animationId: number | null = null;

  // Workflow data
  workflow: any = null;
  context: string = '';
  currentState: any = null;
  agentNodes: AgentNode[] = [];
  private workflowEdges: { from: string; to: string; isCondition?: boolean }[] = [];

  // Colors
  private colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA'
  ];

  // Simulation state
  historyData: any[] = [];
  isRunning = false;
  isPaused = false;
  isStepMode = false;
  stepPromise: Promise<void> | null = null;
  private stepResolve: (() => void) | null = null;
  pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;
  chatLog: ChatEntry[] = [];
  isThinking = false;
  thinkingAgent: { id: string; role: string } | null = null;

  // Agent editor & chat
  showAgentEditor = false;
  selectedAgent: any = null;
  showAgentChat = false;
  chatAgent: any = null;

  // Dragging
  private draggingNode: AgentNode | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Hover
  private hoveredNode: AgentNode | null = null;

  // Pulse animation
  private pulsePhase = 0;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private api: ApiService
  ) {}

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resizeCanvas();

    // Load workflow
    this.workflow = localStorage.getItem('agentWorkflow');
    this.context = localStorage.getItem('agentContext') || '';

    if (this.workflow) {
      this.workflow = JSON.parse(this.workflow);
      localStorage.removeItem('agentWorkflow');
      localStorage.removeItem('agentContext');
      this.buildAgentNodes();
    } else {
      this.loadFromHistory();
    }

    // Events
    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvasRef.nativeElement.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e));
    this.canvasRef.nativeElement.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    this.canvasRef.nativeElement.addEventListener('mouseup', () => this.onMouseUp());
    this.canvasRef.nativeElement.addEventListener('dblclick', (e: MouseEvent) => this.onDoubleClick(e));

    this.startRenderLoop();
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    this.canvasWidth = parent.clientWidth;
    this.canvasHeight = parent.clientHeight;
    canvas.width = this.canvasWidth * window.devicePixelRatio;
    canvas.height = this.canvasHeight * window.devicePixelRatio;
    canvas.style.width = this.canvasWidth + 'px';
    canvas.style.height = this.canvasHeight + 'px';
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  private buildAgentNodes() {
    if (!this.workflow?.nodes) return;

    const nodes = this.workflow.nodes.filter((n: any) => n.id !== 'END');
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;

    this.agentNodes = nodes.map((n: any, i: number) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: n.id,
        role: n.role || n.id,
        prompt: n.prompt || '',
        context: {},
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: this.colorPalette[i % this.colorPalette.length],
        isActive: false
      };
    });

    // Build edges
    this.workflowEdges = [];
    const edges = this.workflow.edges || [];
    const conditionEdges = this.workflow.condition_edges || [];
    edges.forEach((e: any) => this.workflowEdges.push({ from: e.from, to: e.to }));
    conditionEdges.forEach((e: any) => {
      if (e.conditions) {
        Object.values(e.conditions).forEach((toId: any) => {
          this.workflowEdges.push({ from: e.from, to: toId, isCondition: true });
        });
      }
    });
  }

  private async loadFromHistory() {
    const storedHistory = localStorage.getItem('agentHistory');
    let historyData: any[];
    if (storedHistory) {
      historyData = JSON.parse(storedHistory);
      localStorage.removeItem('agentHistory');
    } else {
      historyData = (await firstValueFrom(this.http.get<any>('assets/agent_history.json'))).history;
    }
    this.historyData = historyData;

    // Extract agents from history
    const agentMap = new Map<string, string>();
    historyData.forEach((h: any) => {
      if (h.from && h.from !== 'END' && !agentMap.has(h.from)) agentMap.set(h.from, h.from);
      if (h.to && h.to !== 'END' && !agentMap.has(h.to)) agentMap.set(h.to, h.to);
    });

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;
    let i = 0;
    agentMap.forEach((role, name) => {
      const angle = (i / agentMap.size) * Math.PI * 2 - Math.PI / 2;
      this.agentNodes.push({
        id: name, role, x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: this.colorPalette[i % this.colorPalette.length], isActive: false
      });
      i++;
    });
  }

  // === Rendering ===
  private startRenderLoop() {
    const loop = () => {
      this.pulsePhase += 0.03;
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Edges
    this.renderEdges(ctx);

    // Nodes
    this.agentNodes.forEach(node => this.renderNode(ctx, node));

    // Active indicator
    if (this.isThinking && this.thinkingAgent) {
      const activeNode = this.agentNodes.find(n => n.id === this.thinkingAgent!.id);
      if (activeNode) this.renderActiveIndicator(ctx, activeNode);
    }
  }

  private renderEdges(ctx: CanvasRenderingContext2D) {
    for (const edge of this.workflowEdges) {
      const from = this.agentNodes.find(n => n.id === edge.from);
      const to = this.agentNodes.find(n => n.id === edge.to);
      if (!from || !to) continue;

      const isHighlight = this.isThinking && this.thinkingAgent &&
        (edge.from === this.thinkingAgent.id || edge.to === this.thinkingAgent.id);

      ctx.beginPath();
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 30;
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(midX, midY, to.x, to.y);

      if (edge.isCondition) {
        ctx.strokeStyle = isHighlight ? 'rgba(255, 167, 38, 0.8)' : 'rgba(255, 167, 38, 0.3)';
        ctx.setLineDash([6, 4]);
      } else {
        ctx.strokeStyle = isHighlight ? 'rgba(79, 195, 247, 0.8)' : 'rgba(79, 195, 247, 0.25)';
        ctx.setLineDash([]);
      }
      ctx.lineWidth = isHighlight ? 2.5 : 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow
      const t = 0.85;
      const ax = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
      const ay = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;
      const t2 = 0.84;
      const bx = (1 - t2) * (1 - t2) * from.x + 2 * (1 - t2) * t2 * midX + t2 * t2 * to.x;
      const by = (1 - t2) * (1 - t2) * from.y + 2 * (1 - t2) * t2 * midY + t2 * t2 * to.y;
      const angle = Math.atan2(ay - by, ax - bx);
      const arrowSize = 8;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowSize * Math.cos(angle - Math.PI / 6), ay - arrowSize * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowSize * Math.cos(angle + Math.PI / 6), ay - arrowSize * Math.sin(angle + Math.PI / 6));
      ctx.strokeStyle = isHighlight ? 'rgba(79, 195, 247, 0.8)' : 'rgba(79, 195, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private renderNode(ctx: CanvasRenderingContext2D, node: AgentNode) {
    const nodeRadius = 32;
    const isHovered = this.hoveredNode === node;
    const isActive = this.isThinking && this.thinkingAgent?.id === node.id;

    // Glow
    if (isActive || isHovered) {
      const gradient = ctx.createRadialGradient(node.x, node.y, nodeRadius, node.x, node.y, nodeRadius * 2.5);
      gradient.addColorStop(0, node.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(node.x - nodeRadius * 3, node.y - nodeRadius * 3, nodeRadius * 6, nodeRadius * 6);
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = isActive ? node.color : (isHovered ? node.color + 'cc' : node.color + '66');
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(node.x - 8, node.y - 8, 0, node.x, node.y, nodeRadius);
    gradient.addColorStop(0, node.color + 'dd');
    gradient.addColorStop(1, node.color + '88');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Icon (first letter of role)
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(node.role.charAt(0).toUpperCase(), node.x, node.y);

    // Role label
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isHovered || isActive ? '#fff' : '#aaa';
    const displayRole = node.role.length > 10 ? node.role.substring(0, 9) + '..' : node.role;
    ctx.fillText(displayRole, node.x, node.y + nodeRadius + 8);

    // ID label (smaller)
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(node.id, node.x, node.y + nodeRadius + 24);
  }

  private renderActiveIndicator(ctx: CanvasRenderingContext2D, node: AgentNode) {
    const pulse = Math.sin(this.pulsePhase * 3) * 0.3 + 0.7;
    const nodeRadius = 32;

    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius + 8 + Math.sin(this.pulsePhase * 2) * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 167, 38, ${pulse * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // "Thinking" label
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(255, 167, 38, ${pulse})`;
    ctx.fillText('Thinking...', node.x, node.y - nodeRadius - 12);
  }

  // === Mouse Events ===
  private getNodeAt(mx: number, my: number): AgentNode | null {
    for (let i = this.agentNodes.length - 1; i >= 0; i--) {
      const n = this.agentNodes[i];
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy <= 35 * 35) return n;
    }
    return null;
  }

  private onMouseDown(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = this.getNodeAt(mx, my);
    if (node) {
      this.draggingNode = node;
      this.dragOffsetX = mx - node.x;
      this.dragOffsetY = my - node.y;
    }
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.draggingNode) {
      this.draggingNode.x = mx - this.dragOffsetX;
      this.draggingNode.y = my - this.dragOffsetY;
    }

    const node = this.getNodeAt(mx, my);
    this.hoveredNode = node;
    this.canvasRef.nativeElement.style.cursor = node ? 'pointer' : 'default';
  }

  private onMouseUp() {
    this.draggingNode = null;
  }

  private onDoubleClick(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = this.getNodeAt(mx, my);
    if (node) {
      this.chatAgent = node;
      this.showAgentChat = true;
      this.cdr.detectChanges();
    }
  }

  // === Toolbar Actions ===
  goBackToEditor() {
    if (this.isRunning) {
      if (confirm('正在运行中，确定要返回编辑器吗？')) {
        this.isRunning = false;
        this.isPaused = false;
        this.isStepMode = false;
        this.isThinking = false;
        this.thinkingAgent = null;
      } else {
        return;
      }
    }
    this.router.navigate(['/editor']);
  }

  async runSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.chatLog = [];
    this.historyData = [];

    if (this.workflow) {
      await this.runStepByStep();
    } else {
      // Play history
      for (const entry of this.historyData) {
        this.chatLog = [...this.chatLog, { from: entry.from, to: entry.to || null, message: entry.message }];
        this.cdr.detectChanges();
        this.scrollToBottom();
        await this.delay(800);
      }
      this.isRunning = false;
    }
  }

  async runStepByStep() {
    let state: any = this.currentState;
    const maxSteps = 20;

    for (let i = 0; i < maxSteps; i++) {
      if (this.isPaused) {
        this.pausePromise = new Promise(resolve => { this.pauseResolve = resolve; });
        await this.pausePromise;
      }

      if (this.isStepMode) {
        this.stepPromise = new Promise(resolve => { this.stepResolve = resolve; });
        await this.stepPromise;
      }

      const currentNodeId = state?.current_node || this.workflow?.entry || '';
      const currentAgentInfo = this.getAgentInfo(currentNodeId);

      this.ngZone.run(() => {
        this.isThinking = true;
        this.thinkingAgent = currentAgentInfo;
        // Highlight active node
        this.agentNodes.forEach(n => n.isActive = n.id === currentNodeId);
        this.cdr.detectChanges();
      });

      const body: any = { workflow: this.workflow, context: this.context };

      // Collect agent edits
      const agentEdits: { [key: string]: any } = {};
      this.agentNodes.forEach(n => {
        if (n.prompt || n.context || n.role !== n.id) {
          agentEdits[n.id] = { role: n.role, prompt: n.prompt, context: n.context };
        }
      });
      if (Object.keys(agentEdits).length > 0) body.agent_edits = agentEdits;
      if (state !== null) body.state = state;

      try {
        const res: any = await firstValueFrom(this.http.post(this.api.pyApiUrl('/step'), body));

        this.ngZone.run(() => {
          this.isThinking = false;
          this.thinkingAgent = null;
          this.agentNodes.forEach(n => n.isActive = false);
          this.cdr.detectChanges();
        });

        state = res;
        this.currentState = res;

        if (res.agent_contexts) this.updateAgentContexts(res.agent_contexts);

        if (res.history && res.history.length > 0) {
          const newEntries = res.history.slice(this.historyData.length);
          for (const entry of newEntries) {
            this.historyData.push(entry);
            this.ngZone.run(() => {
              this.chatLog = [...this.chatLog, { from: entry.from, to: entry.to || null, message: entry.message }];
              this.cdr.detectChanges();
              this.scrollToBottom();
            });
          }
        }

        if (res.current_node === 'END') break;
      } catch (err) {
        console.error('step 调用失败', err);
        this.ngZone.run(() => {
          this.isThinking = false;
          this.thinkingAgent = null;
          this.agentNodes.forEach(n => n.isActive = false);
          this.cdr.detectChanges();
        });
        break;
      }
    }

    this.ngZone.run(() => {
      this.isThinking = false;
      this.thinkingAgent = null;
      this.isRunning = false;
      this.agentNodes.forEach(n => n.isActive = false);
      this.cdr.detectChanges();
    });
    this.isPaused = false;
    this.isStepMode = false;
    this.currentState = null;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused && this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
  }

  async runSingleStep() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.isStepMode = true;
      this.chatLog = [];
      this.historyData = [];
      await this.runStepByStep();
    } else if (this.isStepMode && this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
      this.stepPromise = null;
    }
  }

  // === Agent Editor ===
  openAgentEditor(node: AgentNode) {
    this.selectedAgent = node;
    this.showAgentEditor = true;
    this.cdr.detectChanges();
  }

  closeAgentEditor() {
    this.showAgentEditor = false;
    this.selectedAgent = null;
  }

  saveAgentEdits(data: any) {
    if (!this.selectedAgent) return;
    const node = this.selectedAgent as AgentNode;
    if (data.role) node.role = data.role;
    if (data.prompt) node.prompt = data.prompt;
    if (data.context !== undefined) node.context = data.context;
    this.closeAgentEditor();
  }

  // === Agent Chat ===
  closeAgentChat() {
    this.ngZone.run(() => {
      this.showAgentChat = false;
      this.chatAgent = null;
      this.cdr.detectChanges();
    });
  }

  // === Helpers ===
  private getAgentInfo(agentId: string): { id: string; role: string } | null {
    if (!agentId || agentId === 'END') return null;
    if (this.workflow?.nodes) {
      const node = this.workflow.nodes.find((n: any) => n.id === agentId);
      if (node) return { id: node.id, role: node.role || node.id };
    }
    const info = this.agentNodes.find(a => a.id === agentId);
    if (info) return { id: info.id, role: info.role };
    return { id: agentId, role: agentId };
  }

  private updateAgentContexts(agentContexts: { [key: string]: any }) {
    for (const [agentId, ctx] of Object.entries(agentContexts)) {
      const node = this.agentNodes.find(n => n.id === agentId);
      if (node) {
        node.prompt = ctx.original_prompt || node.prompt;
        node.context = {
          task_goal: ctx.task_goal || '',
          conversation_history: ctx.conversation_history || '',
          full_prompt: ctx.full_prompt || ''
        };
      }
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatLogContainer) {
        const el = this.chatLogContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
