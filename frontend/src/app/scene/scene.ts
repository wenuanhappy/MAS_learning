import { Component, ElementRef, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { PMREMGenerator } from 'three';
import { AgentService } from '../services/agent.service';
import { Agent } from '../models/agent';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Sidebar} from '../sidebar/sidebar';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import { AgentEditorPanelComponent } from '../agent-editor-panel/agent-editor-panel';
import { AgentChatDialogComponent } from '../agent-chat-dialog/agent-chat-dialog';
import {ApiService} from '../services/api.service';

export interface ChatEntry {
  from: string;
  to: string | null;
  message: string;
}

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.html',
  styleUrls: ['./scene.css'],
  imports: [Sidebar, CommonModule, AgentEditorPanelComponent, AgentChatDialogComponent]
})
export class SceneComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatLogContainer') chatLogContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('minimapCanvas') minimapCanvasRef!: ElementRef<HTMLCanvasElement>;
  constructor(private http:HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef, private router: Router, private api: ApiService) {
  }

  minimapCtx: CanvasRenderingContext2D | null = null;
  private minimapSize = 200;
  private worldSize = 20;
  private agentColors: { [key: string]: string } = {};
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: PointerLockControls;

  clock = new THREE.Clock();
  agentService!: AgentService;

  speed = 2;
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

  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  moveSpeed = 5;

  workflow: any = null;
  context: string = '';
  currentState: any = null;
  agentInfos: { name: string; role: string; prompt?: string }[] = [];

  // Agent 编辑面板
  showAgentEditor = false;
  selectedAgent: any = null;
  private minimapAgentPositions: { x: number; z: number; agent: Agent }[] = [];

  // Agent 靠近检测 & 对话
  nearbyAgent: Agent | null = null;
  private proximityThreshold = 3.0;
  showAgentChat = false;
  chatAgent: Agent | null = null;

  private workflowLines: THREE.Group = new THREE.Group();

  async ngAfterViewInit() {
    this.initScene();
    this.createRoom();
    this.initControls();

    this.agentService = new AgentService(this.scene);

    this.initMinimap();

    this.workflow = localStorage.getItem('agentWorkflow');
    this.context = localStorage.getItem('agentContext') || '';

    if (this.workflow) {
      this.workflow = JSON.parse(this.workflow);
      localStorage.removeItem('agentWorkflow');
      localStorage.removeItem('agentContext');
      this.agentInfos = this.extractAgentInfosFromWorkflow(this.workflow);
    } else {
      const storedHistory = localStorage.getItem('agentHistory');
      let historyData: { history: any[] };

      if (storedHistory) {
        historyData = { history: JSON.parse(storedHistory) };
        localStorage.removeItem('agentHistory');
      } else {
        historyData = await this.fetchAgentHistoryLocal();
      }

      this.historyData = historyData.history;
      this.agentInfos = this.extractAgentInfos(historyData.history);
    }

    await this.loadAgentsFromInfos(this.agentInfos);
    this.initAgentColors();
    this.animate();
  }

  initMinimap() {
    this.minimapCtx = this.minimapCanvasRef.nativeElement.getContext('2d');
    
    // 添加点击事件监听
    const canvas = this.minimapCanvasRef.nativeElement;
    
    // 确保canvas可以接收点击事件
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.isRunning && !this.isPaused) return; // 运行中不可编辑
      
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // 检查是否点击了某个 agent（半径14px）
      let clickedAgent = null;
      for (const pos of this.minimapAgentPositions) {
        const dx = clickX - pos.x;
        const dy = clickY - pos.z;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 14) { // 增大点击范围到14px
          clickedAgent = pos;
          break;
        }
      }
      
      if (clickedAgent) {
        this.openAgentEditor(clickedAgent.agent);
      }
    });
  }

  initAgentColors() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA'
    ];
    this.agentService.agents.forEach((agent, index) => {
      this.agentColors[agent.name] = colors[index % colors.length];
    });
  }

  updateMinimap() {
    if (!this.minimapCtx) return;

    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const scale = size / this.worldSize;
    const offset = size / 2;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    for (let i = -10; i <= 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(offset + i * scale, 0);
      ctx.lineTo(offset + i * scale, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, offset + i * scale);
      ctx.lineTo(size, offset + i * scale);
      ctx.stroke();
    }

    // 清空并重建 agent 位置数组
    this.minimapAgentPositions = [];

    this.agentService.agents.forEach(agent => {
      const x = agent.model.position.x * scale + offset;
      const z = agent.model.position.z * scale + offset;
      
      // 存储位置用于点击检测
      this.minimapAgentPositions.push({ x, z, agent });

      const color = this.agentColors[agent.name] || '#FFFFFF';

      ctx.beginPath();
      ctx.arc(x, z, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制 role 标签
      if (agent.role) {
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#FFFFFF';
        const roleText = agent.role.length > 8 ? agent.role.substring(0, 7) + '..' : agent.role;
        ctx.fillText(roleText, x, z + 12);
      }

      if (agent.target) {
        const targetX = agent.target.x * scale + offset;
        const targetZ = agent.target.z * scale + offset;

        ctx.beginPath();
        ctx.moveTo(x, z);
        ctx.lineTo(targetX, targetZ);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(targetX, targetZ, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    this.agentService.getAgentsWithinDistance(3).forEach(([a1, a2]) => {
      const x1 = a1.model.position.x * scale + offset;
      const z1 = a1.model.position.z * scale + offset;
      const x2 = a2.model.position.x * scale + offset;
      const z2 = a2.model.position.z * scale + offset;

      ctx.beginPath();
      ctx.moveTo(x1, z1);
      ctx.lineTo(x2, z2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  goBackToEditor() {
    if (this.isRunning) {
      if (confirm('正在运行中，确定要返回编辑器吗？')) {
        this.isRunning = false;
        this.isPaused = false;
        this.isStepMode = false;
        this.isThinking = false;
        this.thinkingAgent = null;
        this.agentService.stopHistory();
      } else {
        return;
      }
    }
    this.router.navigate(['/editor']);
  }

  // Agent 编辑面板方法
  openAgentEditor(agent: Agent) {
    this.selectedAgent = agent;
    this.showAgentEditor = true;
    
    // 强制触发变更检测
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }

  closeAgentEditor() {
    this.showAgentEditor = false;
    this.selectedAgent = null;
  }

  saveAgentEdits(data: any) {
    if (!this.selectedAgent) return;

    const agentName = data.name || this.selectedAgent.name;

    // 更新 agent 的属性
    if (data.role) {
      this.selectedAgent.role = data.role;
    }
    
    // 更新 prompt（用于下次执行）
    if (data.prompt) {
      this.selectedAgent.prompt = data.prompt;
    }
    
    // 更新 context
    if (data.context !== undefined) {
      this.selectedAgent.context = data.context;
    }

    console.log(`✅ 已更新 Agent [${agentName}] 的状态:`, data);
    
    this.closeAgentEditor();
  }

  // 从后端返回的数据更新 agent 上下文
  private updateAgentContexts(agentContexts: { [key: string]: any }) {
    for (const [agentId, ctx] of Object.entries(agentContexts)) {
      const agent = this.agentService.agents.find(a => a.name === agentId);
      if (agent) {
        // 更新 agent 的上下文信息
        agent.prompt = ctx.original_prompt || agent.prompt;
        agent.context = {
          task_goal: ctx.task_goal || '',
          conversation_history: ctx.conversation_history || '',
          full_prompt: ctx.full_prompt || ''
        };
        
        console.log(`📥 已更新 Agent [${agentId}] 的上下文`);
      }
    }
  }

  private getAgentInfo(agentId: string): { id: string; role: string } | null {
    if (!agentId || agentId === 'END') return null;
    
    if (this.workflow?.nodes) {
      const node = this.workflow.nodes.find((n: any) => n.id === agentId);
      if (node) {
        return { id: node.id, role: node.role || node.id };
      }
    }
    
    // 从已加载的agent信息中查找
    const info = this.agentInfos.find(a => a.name === agentId);
    if (info) return { id: info.name, role: info.role };
    
    return { id: agentId, role: agentId };
  }

  async runSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.chatLog = [];
    this.historyData = [];

    this.agentService.onMessageCallback = (from: string, to: string | null, message: string) => {
      this.ngZone.run(() => {
        this.chatLog = [...this.chatLog, { from, to, message }];
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.chatLogContainer) {
            const el = this.chatLogContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
          }
        });
      });
    };

    if (this.workflow) {
      await this.runStepByStep();
    } else {
      this.agentService.playHistory(this.historyData);
    }
  }

  async runStepByStep() {
    let state: any = this.currentState;
    const maxSteps = 20;

    for (let i = 0; i < maxSteps; i++) {
      if (this.isPaused) {
        this.pausePromise = new Promise(resolve => {
          this.pauseResolve = resolve;
        });
        await this.pausePromise;
      }

      if (this.isStepMode) {
        this.stepPromise = new Promise(resolve => {
          this.stepResolve = resolve;
        });
        await this.stepPromise;
      }

      // 获取当前要执行的agent信息并显示"正在思考"
      const currentNodeId = state?.current_node || this.workflow?.entry || '';
      const currentAgentInfo = this.getAgentInfo(currentNodeId);
      
      this.ngZone.run(() => {
        this.isThinking = true;
        this.thinkingAgent = currentAgentInfo;
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.chatLogContainer) {
            const el = this.chatLogContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
          }
        });
      });

      const body: any = {
        workflow: this.workflow,
        context: this.context
      };
      
      // 收集所有已编辑的 Agent 状态
      const agentEdits: { [key: string]: { role?: string; prompt?: string; context?: string } } = {};
      this.agentService.agents.forEach(agent => {
        if (agent.prompt || agent.context || agent.role !== agent.name) {
          agentEdits[agent.name] = {
            role: agent.role,
            prompt: agent.prompt,
            context: agent.context
          };
        }
      });
      
      if (Object.keys(agentEdits).length > 0) {
        body.agent_edits = agentEdits;
      }
      
      if (state !== null) {
        body.state = state;
      }

      try {
        const res: any = await firstValueFrom(
          this.http.post(this.api.pyApiUrl('/step'), body)
        );
        
        // 清除思考状态
        this.ngZone.run(() => {
          this.isThinking = false;
          this.thinkingAgent = null;
          this.cdr.detectChanges();
        });
        
        state = res;
        this.currentState = res;

        // 更新 agent 上下文信息（从后端返回的数据）
        if (res.agent_contexts) {
          this.updateAgentContexts(res.agent_contexts);
        }

        if (res.history && res.history.length > 0) {
          const newEntries = res.history.slice(this.historyData.length);
          for (const entry of newEntries) {
            this.historyData.push(entry);
            this.agentService.addHistoryEntry(entry);
          }
        }

        if (res.current_node === 'END') {
          break;
        }
      } catch (err) {
        console.error('step 调用失败', err);
        this.ngZone.run(() => {
          this.isThinking = false;
          this.thinkingAgent = null;
          this.cdr.detectChanges();
        });
        break;
      }
    }
    
    // 循环结束，清除思考状态
    this.ngZone.run(() => {
      this.isThinking = false;
      this.thinkingAgent = null;
      this.isRunning = false;
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

      this.agentService.onMessageCallback = (from: string, to: string | null, message: string) => {
        this.ngZone.run(() => {
          this.chatLog = [...this.chatLog, { from, to, message }];
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.chatLogContainer) {
              const el = this.chatLogContainer.nativeElement;
              el.scrollTop = el.scrollHeight;
            }
          });
        });
      };

      await this.runStepByStep();
    } else if (this.isStepMode && this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
      this.stepPromise = null;
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.loadEXRSkybox('/assets/sky_1.exr');
  }

  loadEXRSkybox(url: string) {
    const loader = new EXRLoader();
    loader.load(url, (texture) => {
      const pmremGenerator = new PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();

      const envMap = pmremGenerator.fromEquirectangular(texture).texture;

      this.scene.background = envMap;
      this.scene.environment = envMap;

      texture.dispose();
      pmremGenerator.dispose();
    });
  }

  createRoom() {
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512;
    gridCanvas.height = 512;
    const gCtx = gridCanvas.getContext('2d')!;

    gCtx.fillStyle = '#1a1a2e';
    gCtx.fillRect(0, 0, 512, 512);

    gCtx.strokeStyle = 'rgba(79, 195, 247, 0.15)';
    gCtx.lineWidth = 1;
    const gridSize = 32;
    for (let i = 0; i <= 512; i += gridSize) {
      gCtx.beginPath();
      gCtx.moveTo(i, 0);
      gCtx.lineTo(i, 512);
      gCtx.stroke();
      gCtx.beginPath();
      gCtx.moveTo(0, i);
      gCtx.lineTo(512, i);
      gCtx.stroke();
    }

    gCtx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
    gCtx.lineWidth = 2;
    const majorGrid = gridSize * 4;
    for (let i = 0; i <= 512; i += majorGrid) {
      gCtx.beginPath();
      gCtx.moveTo(i, 0);
      gCtx.lineTo(i, 512);
      gCtx.stroke();
      gCtx.beginPath();
      gCtx.moveTo(0, i);
      gCtx.lineTo(512, i);
      gCtx.stroke();
    }

    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(4, 4);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({
        map: gridTexture,
        metalness: 0.6,
        roughness: 0.3,
        envMapIntensity: 0.8
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x4fc3f7, 0x2a1a3e, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 2, 25);
    pointLight1.position.set(-8, 4, -8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x81c784, 2, 25);
    pointLight2.position.set(8, 4, 8);
    this.scene.add(pointLight2);

    const centerLight = new THREE.PointLight(0xffa726, 1.5, 15);
    centerLight.position.set(0, 5, 0);
    this.scene.add(centerLight);

    this.scene.add(this.workflowLines);
  }

  async loadAgentsFromHistory(history: any[]) {
    const infos = this.extractAgentInfos(history);
    await this.loadAgentsFromInfos(infos);
  }

  async loadAgentsFromInfos(infos: { name: string; role: string; prompt?: string }[]) {
    const radius = 8;

    for (let i = 0; i < infos.length; i++) {
      const angle = (i / infos.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      await this.agentService.createAgent({
        name: infos[i].name,
        role: infos[i].role,
        position: new THREE.Vector3(x, 0, z),
        message: '',
        modelPath: '/assets/models/walk.glb'
      });

      const createdAgent = this.agentService.agents.find(a => a.name === infos[i].name);
      if (createdAgent && infos[i].prompt) {
        createdAgent.prompt = infos[i].prompt;
        console.log(`✅ Agent [${infos[i].name}] prompt 已设置 (${infos[i].prompt?.substring(0, 30)}...)`);
      }
    }

    this.createWorkflowConnections();
  }

  createWorkflowConnections() {
    while (this.workflowLines.children.length > 0) {
      this.workflowLines.remove(this.workflowLines.children[0]);
    }

    if (!this.workflow) return;

    const agentPositions: { [key: string]: THREE.Vector3 } = {};
    this.agentService.agents.forEach(agent => {
      agentPositions[agent.name] = agent.model.position.clone();
    });

    const edges = this.workflow.edges || [];
    const conditionEdges = this.workflow.condition_edges || [];

    const allEdges: { from: string; to: string; isCondition?: boolean }[] = [];
    edges.forEach((e: any) => allEdges.push({ from: e.from, to: e.to }));
    conditionEdges.forEach((e: any) => {
      if (e.conditions) {
        Object.values(e.conditions).forEach((toId: any) => {
          allEdges.push({ from: e.from, to: toId, isCondition: true });
        });
      }
    });

    for (const edge of allEdges) {
      const fromPos = agentPositions[edge.from];
      const toPos = agentPositions[edge.to];
      if (!fromPos || !toPos) continue;

      const midY = 1.5;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromPos.x, midY, fromPos.z),
        new THREE.Vector3((fromPos.x + toPos.x) / 2, midY + 2, (fromPos.z + toPos.z) / 2),
        new THREE.Vector3(toPos.x, midY, toPos.z)
      );

      const lineColor = edge.isCondition ? 0xffa726 : 0x4fc3f7;
      const points = curve.getPoints(40);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.4
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.workflowLines.add(line);
    }
  }

  extractAgentInfosFromWorkflow(workflow: any): { name: string; role: string; prompt?: string }[] {
    const result: { name: string; role: string; prompt?: string }[] = [];
    if (workflow.nodes) {
      workflow.nodes.forEach((n: any) => {
        if (n.id && n.id !== 'END') {
          result.push({ 
            name: n.id, 
            role: n.role || n.id,
            prompt: n.prompt || ''  // 提取 prompt
          });
        }
      });
    }
    return result;
  }
  async animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.agentService.update(delta, this.speed);

    this.agentService.agents.forEach(a => {
      if (a.messageBubble && a.messageBubble.visible) {
        a.messageBubble.lookAt(this.camera.position);
      }
    });

    const moveDistance = this.moveSpeed * delta;
    if (this.moveForward) this.controls.moveForward(moveDistance);
    if (this.moveBackward) this.controls.moveForward(-moveDistance);
    if (this.moveLeft) this.controls.moveRight(-moveDistance);
    if (this.moveRight) this.controls.moveRight(moveDistance);

    this.controls.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.updateMinimap();

    this.checkProximity();
  }
  initControls() {
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.object);

    this.canvasRef.nativeElement.addEventListener('click', () => this.controls.lock());

    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW': this.moveForward = true; break;
        case 'KeyS': this.moveBackward = true; break;
        case 'KeyA': this.moveLeft = true; break;
        case 'KeyD': this.moveRight = true; break;
        case 'KeyF': this.openAgentChat(); break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW': this.moveForward = false; break;
        case 'KeyS': this.moveBackward = false; break;
        case 'KeyA': this.moveLeft = false; break;
        case 'KeyD': this.moveRight = false; break;
      }
    });
  }
  async fetchAgentHistoryLocal() {
    return firstValueFrom(this.http.get<any>('assets/agent_history.json'));
  }
  extractAgentInfos(history: any[]): { name: string; role: string }[] {
    const map = new Map<string, string>();

    history.forEach(h => {
      if (h.from && h.from !== 'END' && !map.has(h.from)) {
        const role = this.getRoleForAgent(h.from);
        map.set(h.from, role);
      }
      if (h.to && h.to !== 'END' && !map.has(h.to)) {
        const role = this.getRoleForAgent(h.to);
        map.set(h.to, role);
      }
    });

    return Array.from(map.entries()).map(([name, role]) => ({ name, role }));
  }

  private getRoleForAgent(agentId: string): string {
    if (this.workflow?.nodes) {
      const node = this.workflow.nodes.find((n: any) => n.id === agentId);
      if (node?.role) return node.role;
    }
    return agentId;
  }

  checkProximity() {
    if (this.showAgentChat || this.showAgentEditor) {
      this.nearbyAgent = null;
      return;
    }

    const cameraPos = this.camera.position;
    let closest: Agent | null = null;
    let closestDist = Infinity;

    for (const agent of this.agentService.agents) {
      const agentPos = agent.model.position;
      const dx = cameraPos.x - agentPos.x;
      const dz = cameraPos.z - agentPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this.proximityThreshold && dist < closestDist) {
        closest = agent;
        closestDist = dist;
      }
    }

    const prev = this.nearbyAgent;
    this.nearbyAgent = closest;

    if (prev !== closest) {
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    }
  }

  openAgentChat() {
    if (!this.nearbyAgent || this.showAgentChat) return;

    const agent = this.nearbyAgent;
    this.ngZone.run(() => {
      this.chatAgent = agent;
      this.showAgentChat = true;
      this.cdr.detectChanges();
    });
    this.controls.unlock();
  }

  closeAgentChat() {
    this.ngZone.run(() => {
      this.showAgentChat = false;
      this.chatAgent = null;
      this.cdr.detectChanges();
    });
  }
}
