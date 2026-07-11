import { Component, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';
import { ApiService } from '../services/api.service';

interface Obstacle {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  w: number;
  d: number;
  name: string;
}

interface HidingSpot {
  position: THREE.Vector3;
  name: string;
  mesh: THREE.Mesh;
}

interface HiderState {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  isMoving: boolean;
  hidden: boolean;
  found: boolean;
  movesLeft: number;
  bobPhase: number;
  name: string;
}

@Component({
  selector: 'app-hide-seek',
  standalone: true,
  templateUrl: './hide-seek.html',
  styleUrl: './hide-seek.css',
  imports: [Sidebar, CommonModule, FormsModule]
})
export class HideSeekComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logContainer') logContainer!: ElementRef<HTMLDivElement>;

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  // World
  private worldSize = 30;
  private obstacles: Obstacle[] = [];
  private hidingSpots: HidingSpot[] = [];

  // Agents
  private hiders: HiderState[] = [];
  private seekerMesh!: THREE.Group;
  private seekerPos = new THREE.Vector3(0, 0, 0);
  private seekerTargetPos = new THREE.Vector3(0, 0, 0);
  private seekerIsMoving = false;
  private moveSpeed = 4;

  // Game config
  hiderCount = 3;
  shareInfo = false;

  // Game state
  gameStarted = false;
  gameFinished = false;
  isRunning = false;
  logMessages: { text: string; type: 'info' | 'hider' | 'seeker' | 'success' | 'warning' }[] = [];
  searchHistory: { spot: string; result: string; analysis: string }[] = [];
  round = 0;
  foundCount = 0;

  // Statistics for learning
  statsEnabled = true;
  stats: {
    withSharing: { games: number; totalRounds: number; avgRounds: number };
    withoutSharing: { games: number; totalRounds: number; avgRounds: number };
  } = {
    withSharing: { games: 0, totalRounds: 0, avgRounds: 0 },
    withoutSharing: { games: 0, totalRounds: 0, avgRounds: 0 }
  };
  showInfoPanel = true;
  currentAnalysis = '';
  // Timer for auto-collapsing the info panel

  // Hider abilities
  private hiderMovesPerGame = 3;
  private hiderPerceptionRange = 8;

  // Vision
  private visionCone!: THREE.Mesh;
  private visionRange = 15;
  private visionAngle = 30; // degrees, half-angle
  private seekerFacing = new THREE.Vector3(-1, 0, 0);
  private raycaster = new THREE.Raycaster();
  private obstacleMeshes: THREE.Mesh[] = [];
  private wallMeshes: THREE.Mesh[] = [];
  lastVisibleObjects: string[] = [];

  // Animation
  private seekerBobPhase = Math.PI;
  private keysPressed = new Set<string>();
  private cameraMoveSpeed = 10;

  // Hider colors
  private hiderColors = [0x42a5f5, 0x66bb6a, 0xab47bc, 0xffa726, 0x26c6da];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private api: ApiService) {}

  ngAfterViewInit() {
    this.initScene();
    this.buildWorld();
    this.createSeeker();
    this.createVisionCone();
    this.animate();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.keysPressed.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keysPressed.delete(e.key.toLowerCase()));

    // Auto-collapse info panel after 3 seconds
    setTimeout(() => {
      this.showInfoPanel = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(8, 20, 20);
    this.camera.lookAt(10, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50;

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.8, 30);
    pointLight1.position.set(-8, 5, -8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff7043, 0.6, 30);
    pointLight2.position.set(8, 5, 8);
    this.scene.add(pointLight2);
  }

  private buildWorld() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid on ground
    const gridHelper = new THREE.GridHelper(this.worldSize, 30, 0x3d3d5c, 0x3d3d5c);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Walls (boundary)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d3d5c, roughness: 0.7 });
    const wallH = 2;
    const half = this.worldSize / 2;
    const wallConfigs = [
      { w: this.worldSize, h: wallH, d: 0.3, x: 0, z: -half },
      { w: this.worldSize, h: wallH, d: 0.3, x: 0, z: half },
      { w: 0.3, h: wallH, d: this.worldSize, x: -half, z: 0 },
      { w: 0.3, h: wallH, d: this.worldSize, x: half, z: 0 },
    ];
    wallConfigs.forEach(c => {
      const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(c.x, c.h / 2, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);
    });

    // Obstacles
    const obstacleDefs = [
      { x: -6, z: -4, w: 3, h: 2.5, d: 2, color: 0x5c6bc0, name: '蓝色仓库' },
      { x: 5, z: 6, w: 2.5, h: 3, d: 3, color: 0x7e57c2, name: '紫色建筑' },
      { x: -3, z: 7, w: 4, h: 1.8, d: 2, color: 0x26a69a, name: '绿色矮墙' },
      { x: 8, z: -5, w: 2, h: 2, d: 4, color: 0xef5350, name: '红色围墙' },
      { x: -9, z: 3, r: 1.2, h: 3, color: 0x78909c, name: '灰色柱子', isCylinder: true },
      { x: 6, z: -9, r: 1, h: 2.5, color: 0x8d6e63, name: '棕色柱子', isCylinder: true },
      { x: 2, z: -2, w: 4, h: 2, d: 0.4, color: 0x546e7a, name: 'L型墙A' },
      { x: 3.8, z: -1, w: 0.4, h: 2, d: 2, color: 0x546e7a, name: 'L型墙B' },
      { x: -4, z: -9, w: 1.5, h: 1.2, d: 1.5, color: 0xa1887f, name: '木箱A' },
      { x: 9, z: 2, w: 1.5, h: 1.2, d: 1.5, color: 0xa1887f, name: '木箱B' },
      { x: -8, z: -7, w: 1.5, h: 1.2, d: 1.5, color: 0xbcaaa4, name: '木箱C' },
    ];

    obstacleDefs.forEach(def => {
      let geo: THREE.BufferGeometry;
      if ((def as any).isCylinder) {
        geo = new THREE.CylinderGeometry((def as any).r, (def as any).r, def.h, 16);
      } else {
        geo = new THREE.BoxGeometry(def.w, def.h, def.d);
      }
      const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6, metalness: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(def.x, def.h / 2, def.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      this.obstacles.push({
        mesh,
        x: def.x,
        z: def.z,
        w: (def as any).isCylinder ? (def as any).r * 2 : (def.w || 0),
        d: (def as any).isCylinder ? (def as any).r * 2 : (def.d || 0),
        name: def.name
      });
      this.obstacleMeshes.push(mesh);
    });

    // Hiding spots
    const hidingSpotDefs = [
      { x: -7, z: -5, name: '蓝色仓库后方' },
      { x: 6, z: 7.5, name: '紫色建筑旁' },
      { x: -5, z: 8, name: '绿色矮墙后' },
      { x: 9.5, z: -5, name: '红色围墙角落' },
      { x: -10, z: 4, name: '灰色柱子后' },
      { x: 7, z: -10, name: '棕色柱子旁' },
      { x: 4.5, z: -2.5, name: 'L型墙角' },
      { x: -4.5, z: -10, name: '木箱A后方' },
      { x: 10, z: 2.5, name: '木箱B后方' },
      { x: -9, z: -8, name: '木箱C旁' },
    ];

    hidingSpotDefs.forEach(def => {
      const markerGeo = new THREE.RingGeometry(0.4, 0.6, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(def.x, 0.02, def.z);
      this.scene.add(marker);

      this.hidingSpots.push({
        position: new THREE.Vector3(def.x, 0, def.z),
        name: def.name,
        mesh: marker
      });
    });
  }

  private createSeeker() {
    this.seekerMesh = this.createAgentMesh(0xef5350, '搜');
    this.seekerMesh.position.set(12, 0, 0);
    this.seekerPos.copy(this.seekerMesh.position);
    this.seekerTargetPos.copy(this.seekerPos);
    this.scene.add(this.seekerMesh);
  }

  private createHiders() {
    // Remove existing hiders
    for (const h of this.hiders) {
      this.scene.remove(h.mesh);
    }
    this.hiders = [];

    const startPositions = [
      new THREE.Vector3(-12, 0, 0),
      new THREE.Vector3(-12, 0, 4),
      new THREE.Vector3(-12, 0, -4),
      new THREE.Vector3(-12, 0, 8),
      new THREE.Vector3(-12, 0, -8),
    ];

    for (let i = 0; i < this.hiderCount; i++) {
      const color = this.hiderColors[i % this.hiderColors.length];
      const label = `${i + 1}`;
      const mesh = this.createAgentMesh(color, label);
      const startPos = startPositions[i % startPositions.length];
      mesh.position.copy(startPos);

      this.hiders.push({
        mesh,
        pos: startPos.clone(),
        targetPos: startPos.clone(),
        isMoving: false,
        hidden: false,
        found: false,
        movesLeft: this.hiderMovesPerGame,
        bobPhase: i * Math.PI * 0.5,
        name: `躲藏者${i + 1}`
      });

      this.scene.add(mesh);
    }
  }

  private createAgentMesh(color: number, label: string): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.55, 0.3);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.55, 0.3);
    group.add(rightEye);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = 2.2;
    sprite.scale.set(0.8, 0.8, 1);
    group.add(sprite);

    return group;
  }

  // === Vision System ===
  private createVisionCone() {
    this.updateVisionConeGeometry();
  }

  private updateVisionConeGeometry() {
    if (this.visionCone) {
      this.scene.remove(this.visionCone);
      this.visionCone.geometry.dispose();
      (this.visionCone.material as THREE.Material).dispose();
    }

    const halfAngle = THREE.MathUtils.degToRad(this.visionAngle);
    const segments = 32;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 0; i <= segments; i++) {
      const a = -halfAngle + (2 * halfAngle * i) / segments;
      const x = Math.sin(a) * this.visionRange;
      const y = -Math.cos(a) * this.visionRange;
      shape.lineTo(x, y);
    }
    shape.lineTo(0, 0);

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.visionCone = new THREE.Mesh(geo, mat);
    this.visionCone.position.y = 0.03;
    this.scene.add(this.visionCone);
  }

  private updateVisionCone() {
    if (!this.visionCone) return;
    const pos = this.seekerMesh.position;
    this.visionCone.position.set(pos.x, 0.03, pos.z);

    const yawAngle = Math.atan2(this.seekerFacing.x, this.seekerFacing.z);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);
    this.visionCone.quaternion.copy(qY.multiply(qX));
  }

  private computeVisibleObjects(): string[] {
    const visible: string[] = [];
    const seekerPos2D = new THREE.Vector2(this.seekerPos.x, this.seekerPos.z);
    const facing2D = new THREE.Vector2(this.seekerFacing.x, this.seekerFacing.z).normalize();
    const halfAngleRad = THREE.MathUtils.degToRad(this.visionAngle);

    // Check each hiding spot
    for (const spot of this.hidingSpots) {
      const spotPos2D = new THREE.Vector2(spot.position.x, spot.position.z);
      const toSpot = spotPos2D.clone().sub(seekerPos2D);
      const dist = toSpot.length();
      if (dist > this.visionRange) continue;
      const angle = Math.acos(THREE.MathUtils.clamp(toSpot.normalize().dot(facing2D), -1, 1));
      if (angle > halfAngleRad) continue;
      if (this.hasLineOfSight(this.seekerPos, spot.position)) {
        visible.push(spot.name);
      }
    }

    // Check each hider
    for (const hider of this.hiders) {
      if (hider.found) continue;
      const hiderPos2D = new THREE.Vector2(hider.pos.x, hider.pos.z);
      const toHider = hiderPos2D.clone().sub(seekerPos2D);
      const hiderDist = toHider.length();
      if (hiderDist > this.visionRange) continue;
      const hiderAngle = Math.acos(THREE.MathUtils.clamp(toHider.normalize().dot(facing2D), -1, 1));
      if (hiderAngle <= halfAngleRad && this.hasLineOfSight(this.seekerPos, hider.pos)) {
        visible.push(hider.name);
      }
    }

    // Check visible obstacles
    for (const obs of this.obstacles) {
      const obsPos2D = new THREE.Vector2(obs.x, obs.z);
      const toObs = obsPos2D.clone().sub(seekerPos2D);
      const dist = toObs.length();
      if (dist > this.visionRange) continue;
      const angle = Math.acos(THREE.MathUtils.clamp(toObs.normalize().dot(facing2D), -1, 1));
      if (angle <= halfAngleRad) {
        visible.push(obs.name);
      }
    }

    return visible;
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const origin = new THREE.Vector3(from.x, 1, from.z);
    const target = new THREE.Vector3(to.x, 1, to.z);
    const direction = target.clone().sub(origin);
    const distance = direction.length();
    direction.normalize();

    this.raycaster.set(origin, direction);
    this.raycaster.far = distance;

    const allBlockers = [...this.obstacleMeshes, ...this.wallMeshes];
    const intersections = this.raycaster.intersectObjects(allBlockers, false);

    if (intersections.length > 0 && intersections[0].distance < distance - 0.5) {
      return false;
    }
    return true;
  }

  // === Game Logic ===
  async startGame() {
    this.gameStarted = true;
    this.gameFinished = false;
    this.round = 0;
    this.foundCount = 0;
    this.logMessages = [];
    this.searchHistory = [];

    // Create hiders
    this.createHiders();

    // Reset seeker
    this.moveAgentTo(this.seekerMesh, new THREE.Vector3(12, 0, 0), true);
    this.seekerPos.set(12, 0, 0);
    this.seekerTargetPos.copy(this.seekerPos);
    this.seekerIsMoving = false;
    this.seekerFacing.set(-1, 0, 0);

    this.addLog(`游戏开始！${this.hiderCount}名躲藏者正在选择躲藏点...`, 'info');
    if (this.shareInfo) {
      this.addLog('信息共享：开启（躲藏者之间可以共享搜索者位置信息）', 'info');
    } else {
      this.addLog('信息共享：关闭（躲藏者之间无法共享信息）', 'info');
    }

    // Phase 1: Each hider chooses a spot
    await this.delay(500);
    for (const hider of this.hiders) {
      const hideResult = await this.callHiderAgent(hider);
      if (hideResult) {
        this.addLog(`${hider.name}选择了: ${hideResult.spot_name}`, 'hider');
        this.addLog(`理由: ${hideResult.reason}`, 'hider');
        const spot = this.hidingSpots.find(s => s.name === hideResult.spot_name) || this.hidingSpots[0];
        hider.targetPos.copy(spot.position);
        hider.isMoving = true;
        await this.waitForHiderMovement(hider);
        hider.hidden = true;
      }
    }
    this.addLog('所有躲藏者已藏好！搜索者开始搜索...', 'info');

    // Phase 2: Seeker searches
    this.isRunning = true;
    this.cdr.detectChanges();

    while (!this.gameFinished && this.round < 20) {
      this.round++;
      this.addLog(`--- 第 ${this.round} 轮搜索 ---`, 'info');

      const seekResult = await this.callSeekerAgent();
      if (seekResult) {
        const action = seekResult.action || 'move';

        if (action === 'look') {
          const lookDir = seekResult.look_direction;
          if (lookDir) {
            this.seekerFacing.set(lookDir.x || 0, 0, lookDir.z || 0).normalize();
            if (this.seekerFacing.length() < 0.01) this.seekerFacing.set(-1, 0, 0);
            this.seekerMesh.lookAt(
              this.seekerPos.x + this.seekerFacing.x,
              this.seekerPos.y,
              this.seekerPos.z + this.seekerFacing.z
            );
          }
          this.addLog(`搜索者转向观察: (${this.seekerFacing.x.toFixed(1)}, ${this.seekerFacing.z.toFixed(1)})`, 'seeker');
          this.addLog(`分析: ${seekResult.analysis}`, 'seeker');

          const visibleNow = this.computeVisibleObjects();
          this.lastVisibleObjects = visibleNow;
          const visionInfo = visibleNow.length > 0 ? `视野内可见: ${visibleNow.join('、')}` : '视野内没有发现躲避点或躲藏者';
          this.addLog(visionInfo, 'seeker');

          // Check if any hider is visible
          const foundHider = this.checkVisibleHiders(visibleNow);
          if (foundHider) {
            this.onHiderFound(foundHider, '视线发现', seekResult.analysis || '');
          } else {
            this.searchHistory.push({ spot: `转向(${this.seekerFacing.x.toFixed(1)},${this.seekerFacing.z.toFixed(1)})`, result: '未发现', analysis: seekResult.analysis || '' });
          }
        } else {
          // Move action
          this.addLog(`搜索者决定前往: ${seekResult.target_spot}`, 'seeker');
          this.addLog(`分析: ${seekResult.analysis}`, 'seeker');

          const spot = this.hidingSpots.find(s => s.name === seekResult.target_spot) || this.hidingSpots[0];
          this.seekerTargetPos.copy(spot.position);
          this.seekerIsMoving = true;
          await this.waitForMovement();

          this.seekerFacing.subVectors(spot.position, this.seekerPos).normalize();
          this.seekerFacing.y = 0;
          if (this.seekerFacing.length() < 0.01) {
            this.seekerFacing.set(-1, 0, 0);
          }

          const visibleNow = this.computeVisibleObjects();
          this.lastVisibleObjects = visibleNow;
          const visionInfo = visibleNow.length > 0 ? `视野内可见: ${visibleNow.join('、')}` : '视野内没有发现躲避点或躲藏者';
          this.addLog(visionInfo, 'seeker');

          // Check if seeker arrived at a hider's spot
          const foundHider = this.checkArrivalFound(seekResult);
          if (foundHider) {
            this.onHiderFound(foundHider, seekResult.target_spot, seekResult.analysis || '');
          } else {
            // Also check if any hider is visible
            const visibleHider = this.checkVisibleHiders(visibleNow);
            if (visibleHider) {
              this.onHiderFound(visibleHider, '视线发现', seekResult.analysis || '');
            } else {
              this.searchHistory.push({ spot: seekResult.target_spot, result: '未发现', analysis: seekResult.analysis || '' });
              this.addLog(`${seekResult.target_spot} 没有找到，继续搜索...`, 'warning');
            }
          }
        }
      }

      // After seeker's turn, give each unfound hider a chance to perceive and move
      if (!this.gameFinished) {
        for (const hider of this.hiders) {
          if (hider.found || hider.movesLeft <= 0) continue;
          await this.hiderPerceptionAndMove(hider);
          if (this.gameFinished) break;
        }
      }

      await this.delay(500);
    }

    if (!this.gameFinished) {
      this.addLog(`搜索次数用尽！找到${this.foundCount}/${this.hiderCount}名躲藏者`, 'hider');
      this.gameFinished = true;
      this.updateStats();
    }

    // Game end analysis
    this.generateGameEndAnalysis();

    this.isRunning = false;
    this.cdr.detectChanges();
  }

  private checkVisibleHiders(visibleObjects: string[]): HiderState | null {
    for (const hider of this.hiders) {
      if (hider.found) continue;
      if (visibleObjects.includes(hider.name)) {
        return hider;
      }
    }
    return null;
  }

  private checkArrivalFound(seekResult: any): HiderState | null {
    const targetSpot = this.hidingSpots.find(s => s.name === seekResult.target_spot);
    if (!targetSpot) return null;
    for (const hider of this.hiders) {
      if (hider.found) continue;
      if (hider.pos.distanceTo(targetSpot.position) < 2) {
        return hider;
      }
    }
    return null;
  }

  private onHiderFound(hider: HiderState, spotName: string, analysis: string) {
    hider.found = true;
    this.foundCount++;
    this.searchHistory.push({ spot: spotName, result: `找到${hider.name}！`, analysis });
    this.addLog(`找到了${hider.name}！`, 'success');
    this.highlightFound(hider);

    if (this.foundCount >= this.hiderCount) {
      this.gameFinished = true;
      this.addLog(`所有躲藏者都被找到了！共用了${this.round}轮`, 'success');
      this.updateStats();
    }
  }

  private updateStats() {
    if (!this.statsEnabled) return;
    const key = this.shareInfo ? 'withSharing' : 'withoutSharing';
    this.stats[key].games++;
    this.stats[key].totalRounds += this.round;
    this.stats[key].avgRounds = Math.round(this.stats[key].totalRounds / this.stats[key].games * 10) / 10;
  }

  resetStats() {
    this.stats = {
      withSharing: { games: 0, totalRounds: 0, avgRounds: 0 },
      withoutSharing: { games: 0, totalRounds: 0, avgRounds: 0 }
    };
  }

  private generateGameEndAnalysis() {
    const foundAll = this.foundCount >= this.hiderCount;
    const sharingText = this.shareInfo ? '开启' : '关闭';
    let analysis = '';

    if (foundAll) {
      analysis = `本局信息共享${sharingText}，搜索者用了${this.round}轮找到所有躲藏者。`;
      if (this.shareInfo) {
        analysis += ' 躲藏者之间可以互相传递警告，理论上可以更早察觉搜索者靠近。';
      } else {
        analysis += ' 躲藏者只能依靠自身感知，可能错过队友发现的危险信号。';
      }
    } else {
      analysis = `本局信息共享${sharingText}，搜索次数用尽后仍找到${this.foundCount}/${this.hiderCount}名躲藏者。`;
      if (!this.shareInfo) {
        analysis += ' 如果开启信息共享，未被发现的躲藏者可能通过队友警告提前移动。';
      }
    }

    // Compare with opposite mode stats if available
    const oppositeKey = this.shareInfo ? 'withoutSharing' : 'withSharing';
    const currentKey = this.shareInfo ? 'withSharing' : 'withoutSharing';
    if (this.stats[oppositeKey].games > 0) {
      const diff = this.stats[currentKey].avgRounds - this.stats[oppositeKey].avgRounds;
      if (Math.abs(diff) > 0.5) {
        const better = diff > 0 ? '信息共享开启' : '信息共享关闭';
        analysis += ` 目前统计：${better}时躲藏者平均存活更久。`;
      }
    }

    this.currentAnalysis = analysis;
  }

  private async callHiderAgent(hider: HiderState): Promise<any> {
    // Find spots already occupied by other hiders
    const occupiedSpots = this.hiders
      .filter(h => h !== hider && h.hidden)
      .map(h => {
        const spot = this.hidingSpots.find(s => s.position.distanceTo(h.pos) < 2);
        return spot ? spot.name : null;
      })
      .filter((n): n is string => n !== null);

    const availableSpots = this.hidingSpots.filter(s => !occupiedSpots.includes(s.name));
    const spotList = availableSpots.map(s => s.name).join('、');
    const occupiedText = occupiedSpots.length > 0 ? occupiedSpots.join('、') : '无';
    const obstacleList = this.obstacles.map(o => `${o.name}(位置:${o.x.toFixed(0)},${o.z.toFixed(0)})`).join('、');

    const prompt = `你是躲猫猫游戏中的${hider.name}。你需要从以下躲避点中选择一个来躲藏。

场景中的障碍物: ${obstacleList}
可选的躲避点: ${spotList}
已被其他躲藏者占据的躲避点: ${occupiedText}
搜索者会从位置(12,0)开始搜索。
请选择一个你认为最不容易被发现的躲避点。注意不能选择已被占据的位置。

请用以下JSON格式回复（不要其他内容）:
{"spot_name": "躲避点名称", "reason": "选择理由"}`;

    try {
      const res: any = await firstValueFrom(this.http.post(this.api.pyApiUrl('/hide_seek_action'), {
        role: 'hider',
        prompt
      }));
      const content = res.reply || res.content || '';
      const parsed = this.parseJson(content);
      // Validate: if LLM chose an occupied spot, fallback to a random available one
      if (parsed && occupiedSpots.includes(parsed.spot_name)) {
        const fallback = availableSpots[Math.floor(Math.random() * availableSpots.length)];
        return { spot_name: fallback?.name || this.hidingSpots[0].name, reason: '原选择已被占据，随机选择' };
      }
      return parsed;
    } catch (e) {
      console.error('Hider agent error', e);
      const spot = availableSpots[Math.floor(Math.random() * availableSpots.length)];
      return { spot_name: spot?.name || this.hidingSpots[0].name, reason: '随机选择' };
    }
  }

  private async hiderPerceptionAndMove(hider: HiderState) {
    // Hider perceives seeker if within range
    const distToSeeker = hider.pos.distanceTo(this.seekerPos);
    let perceptionInfo = '';
    if (distToSeeker <= this.hiderPerceptionRange) {
      const dx = this.seekerPos.x - hider.pos.x;
      const dz = this.seekerPos.z - hider.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const dirX = (dx / dist).toFixed(1);
      const dirZ = (dz / dist).toFixed(1);
      perceptionInfo = `感知到搜索者在${distToSeeker.toFixed(1)}米外，方向(${dirX},${dirZ})，搜索者面朝(${this.seekerFacing.x.toFixed(1)},${this.seekerFacing.z.toFixed(1)})`;
      this.addLog(`${hider.name}感知到搜索者距离${distToSeeker.toFixed(1)}米`, 'hider');
    } else {
      perceptionInfo = '未感知到搜索者（距离超出感知范围）';
    }

    // Shared info from other hiders
    let sharedInfo = '';
    if (this.shareInfo) {
      const otherHidersNearSeeker = this.hiders.filter(h =>
        h !== hider && !h.found && h.pos.distanceTo(this.seekerPos) <= this.hiderPerceptionRange
      );
      if (otherHidersNearSeeker.length > 0) {
        const alerts = otherHidersNearSeeker.map(h => {
          const d = h.pos.distanceTo(this.seekerPos).toFixed(1);
          return `${h.name}(位置:${h.pos.x.toFixed(0)},${h.pos.z.toFixed(0)})报告: 搜索者距其${d}米`;
        });
        sharedInfo = `\n队友警告: ${alerts.join('；')}`;
        this.addLog(`${hider.name}收到队友警告: ${alerts.join('；')}`, 'hider');
      }
    }

    const moveResult = await this.callHiderMoveAgent(hider, perceptionInfo, sharedInfo);
    if (moveResult && moveResult.action === 'move' && moveResult.target_spot) {
      const targetSpot = this.hidingSpots.find(s => s.name === moveResult.target_spot);
      // Check: not current position and not occupied by another hider
      const isOccupied = this.hiders.some(h =>
        h !== hider && !h.found && h.pos.distanceTo(targetSpot!.position) < 2
      );
      if (targetSpot && targetSpot.position.distanceTo(hider.pos) >= 2 && !isOccupied) {
        hider.movesLeft--;
        this.addLog(`${hider.name}决定移动到: ${moveResult.target_spot}`, 'hider');
        this.addLog(`理由: ${moveResult.reason}`, 'hider');
        hider.targetPos.copy(targetSpot.position);
        hider.isMoving = true;
        await this.waitForHiderMovement(hider);
        this.addLog(`${hider.name}已移动（剩余${hider.movesLeft}次移动机会）`, 'hider');
      }
    } else {
      this.addLog(`${hider.name}选择原地不动`, 'hider');
      if (moveResult && moveResult.reason) {
        this.addLog(`理由: ${moveResult.reason}`, 'hider');
      }
    }
  }

  private async callHiderMoveAgent(hider: HiderState, perceptionInfo: string, sharedInfo: string): Promise<any> {
    const currentSpot = this.hidingSpots.find(s => s.position.distanceTo(hider.pos) < 2);
    const currentSpotName = currentSpot ? currentSpot.name : '未知';

    // Find spots occupied by other hiders
    const occupiedSpots = this.hiders
      .filter(h => h !== hider && !h.found)
      .map(h => {
        const spot = this.hidingSpots.find(s => s.position.distanceTo(h.pos) < 2);
        return spot ? spot.name : null;
      })
      .filter((n): n is string => n !== null);

    const moveableSpots = this.hidingSpots.filter(s =>
      s.position.distanceTo(hider.pos) >= 2 && !occupiedSpots.includes(s.name)
    );
    const spotList = moveableSpots.map(s => s.name).join('、');
    const occupiedText = occupiedSpots.length > 0 ? occupiedSpots.join('、') : '无';
    const obstacleList = this.obstacles.map(o => `${o.name}(位置:${o.x.toFixed(0)},${o.z.toFixed(0)})`).join('、');
    const hiderX = hider.pos.x.toFixed(1);
    const hiderZ = hider.pos.z.toFixed(1);

    const prompt = `你是躲猫猫游戏中的${hider.name}。搜索者正在寻找你们。

你的位置: (${hiderX}, ${hiderZ})
你当前所在的躲避点: ${currentSpotName}
感知信息: ${perceptionInfo}${sharedInfo}
剩余移动次数: ${hider.movesLeft}
场景中的障碍物: ${obstacleList}
可移动到的躲避点（不包含当前位置和已被占据的位置）: ${spotList}
已被其他躲藏者占据的躲避点: ${occupiedText}

你需要决定是否移动到另一个躲避点。

决策原则：
- 如果你感知到搜索者正在靠近（距离8米以内），强烈建议移动到远离搜索者的躲避点
- 如果收到队友的警告信息，说明搜索者正在附近活动，你应该尽快移动到更安全的位置
- 如果没有感知到搜索者也没有收到警告，可以保持不动以节省移动次数
- 移动有风险——如果搜索者在你移动时看到你，你会被发现
- 注意：不能移动到当前所在位置或已被占据的位置

请用以下JSON格式回复（不要其他内容）:
如果选择移动: {"action": "move", "target_spot": "躲避点名称", "reason": "移动理由"}
如果选择不动: {"action": "stay", "reason": "不动理由"}`;

    try {
      const res: any = await firstValueFrom(this.http.post(this.api.pyApiUrl('/hide_seek_action'), {
        role: 'hider',
        prompt
      }));
      const content = res.reply || res.content || '';
      return this.parseJson(content);
    } catch (e) {
      console.error('Hider move agent error', e);
      return { action: 'stay', reason: '决策失败' };
    }
  }

  private async callSeekerAgent(): Promise<any> {
    const spotList = this.hidingSpots.map(s => s.name).join('、');
    const obstacleList = this.obstacles.map(o => `${o.name}(位置:${o.x.toFixed(0)},${o.z.toFixed(0)})`).join('、');
    const seekerX = this.seekerPos.x.toFixed(1);
    const seekerZ = this.seekerPos.z.toFixed(1);

    let historyText = '无';
    if (this.searchHistory.length > 0) {
      historyText = this.searchHistory.map((h, i) =>
        `第${i + 1}轮: 搜索了"${h.spot}" → ${h.result}${h.analysis ? '，分析: ' + h.analysis : ''}`
      ).join('\n');
    }

    const visibleNow = this.computeVisibleObjects();
    const visionText = visibleNow.length > 0
      ? `当前视野内可见: ${visibleNow.join('、')}`
      : '当前视野内没有发现躲避点或躲藏者';

    const searchedSpotNames = this.searchHistory.map(h => h.spot);
    const unsearchedSpots = this.hidingSpots.filter(s => !searchedSpotNames.includes(s.name)).map(s => s.name);
    const unsearchedText = unsearchedSpots.length > 0 ? unsearchedSpots.join('、') : '所有躲避点都已搜索过';

    // Calculate distances to unsearched spots for smarter strategy
    const unsearchedWithDist = this.hidingSpots
      .filter(s => !searchedSpotNames.includes(s.name))
      .map(s => ({ name: s.name, dist: this.seekerPos.distanceTo(s.position) }))
      .sort((a, b) => a.dist - b.dist);
    const nearestUnsearched = unsearchedWithDist.length > 0 ? unsearchedWithDist[0].name : '无';

    const foundCount = this.foundCount;
    const remainingHiders = this.hiderCount - foundCount;

    const prompt = `你是一个躲猫猫游戏中的搜索者。你有有限的视野：前方${this.visionAngle * 2}度、${this.visionRange}米范围内可以看到物体，但障碍物会遮挡视线。你当前看不到视野外的物体。

场景中共有${this.hiderCount}名躲藏者，已找到${foundCount}名，还剩${remainingHiders}名。
场景中的障碍物: ${obstacleList}
所有可能的躲避点: ${spotList}
你当前的位置: (${seekerX}, ${seekerZ})
你面朝的方向: (${this.seekerFacing.x.toFixed(1)}, ${this.seekerFacing.z.toFixed(1)})
${visionText}

你的搜索历史:
${historyText}

尚未搜索的躲避点: ${unsearchedText}
距离最近的未搜索躲避点: ${nearestUnsearched}

重要策略：
- 优先搜索尚未搜索过的躲避点，特别是距离你最近的: ${nearestUnsearched}
- 如果视野内发现了躲藏者，直接前往该位置
- 不要重复搜索已经确认没有躲藏者的位置（除非有新线索）
- 转向观察只在可能发现新目标时使用，不要浪费轮次

每轮你可以选择以下两种行动之一：
1. 移动到某个躲避点附近搜索
2. 原地转向观察某个方向（不移动，只改变面朝方向来扩大视野）

请用以下JSON格式回复（不要其他内容）:

如果选择移动:
{"action": "move", "target_spot": "躲避点名称", "analysis": "你的分析", "found": false}

如果选择转向观察:
{"action": "look", "look_direction": {"x": 方向x分量, "z": 方向z分量}, "analysis": "你的分析"}

注意: found字段只有在目标躲避点确实是躲藏者所在位置时才为true。look_direction是一个单位向量，表示你想面朝的方向。`;

    try {
      const res: any = await firstValueFrom(this.http.post(this.api.pyApiUrl('/hide_seek_action'), {
        role: 'seeker',
        prompt
      }));
      const content = res.reply || res.content || '';
      return this.parseJson(content);
    } catch (e) {
      console.error('Seeker agent error', e);
      const spot = unsearchedSpots.length > 0
        ? this.hidingSpots.find(s => s.name === unsearchedSpots[0])!
        : this.hidingSpots[0];
      return { action: 'move', target_spot: spot.name, analysis: '随机搜索', found: false };
    }
  }

  private parseJson(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    return null;
  }

  private highlightFound(hider: HiderState) {
    const light = new THREE.PointLight(0xffff00, 2, 15);
    light.position.copy(hider.pos);
    light.position.y = 3;
    this.scene.add(light);

    const hiderBody = hider.mesh.children[0] as THREE.Mesh;
    const mat = hiderBody.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0xffff00);
    mat.emissiveIntensity = 0.8;
  }

  private moveAgentTo(mesh: THREE.Group, pos: THREE.Vector3, instant: boolean = false) {
    if (instant) {
      mesh.position.copy(pos);
    }
  }

  private waitForMovement(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (!this.seekerIsMoving) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  private waitForHiderMovement(hider: HiderState): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (!hider.isMoving) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  private addLog(text: string, type: 'info' | 'hider' | 'seeker' | 'success' | 'warning') {
    this.logMessages = [...this.logMessages, { text, type }];
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.logContainer) {
        const el = this.logContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === Animation ===
  private animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.controls.update();

    // WASD camera movement
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keysPressed.has('w')) moveDir.add(forward);
    if (this.keysPressed.has('s')) moveDir.sub(forward);
    if (this.keysPressed.has('a')) moveDir.sub(right);
    if (this.keysPressed.has('d')) moveDir.add(right);

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(this.cameraMoveSpeed * delta);
      this.camera.position.add(moveDir);
      this.controls.target.add(moveDir);
    }

    // Move hiders
    for (const hider of this.hiders) {
      if (hider.isMoving) {
        const dir = new THREE.Vector3().subVectors(hider.targetPos, hider.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.1) {
          hider.mesh.position.copy(hider.targetPos);
          hider.pos.copy(hider.targetPos);
          hider.isMoving = false;
        } else {
          dir.normalize().multiplyScalar(this.moveSpeed * delta);
          hider.mesh.position.add(dir);
          hider.pos.copy(hider.mesh.position);
        }
      } else {
        hider.bobPhase += delta * 3;
        hider.mesh.position.y = Math.sin(hider.bobPhase) * 0.05;
      }
    }

    // Move seeker
    if (this.seekerIsMoving) {
      const dir = new THREE.Vector3().subVectors(this.seekerTargetPos, this.seekerMesh.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.1) {
        this.seekerMesh.position.copy(this.seekerTargetPos);
        this.seekerPos.copy(this.seekerTargetPos);
        this.seekerIsMoving = false;
      } else {
        dir.normalize().multiplyScalar(this.moveSpeed * delta);
        this.seekerMesh.position.add(dir);
        this.seekerPos.copy(this.seekerMesh.position);
        this.seekerMesh.lookAt(this.seekerTargetPos.x, this.seekerMesh.position.y, this.seekerTargetPos.z);
        this.seekerFacing.subVectors(this.seekerTargetPos, this.seekerMesh.position).normalize();
        this.seekerFacing.y = 0;
      }
    } else {
      this.seekerBobPhase += delta * 3;
      this.seekerMesh.position.y = Math.sin(this.seekerBobPhase) * 0.05;
    }

    // Update vision cone
    this.updateVisionCone();

    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  resetGame() {
    this.gameStarted = false;
    this.gameFinished = false;
    this.isRunning = false;
    this.round = 0;
    this.foundCount = 0;
    this.logMessages = [];
    this.searchHistory = [];
    this.seekerIsMoving = false;

    // Remove hiders
    for (const h of this.hiders) {
      this.scene.remove(h.mesh);
    }
    this.hiders = [];

    // Reset seeker
    this.moveAgentTo(this.seekerMesh, new THREE.Vector3(12, 0, 0), true);
    this.seekerPos.set(12, 0, 0);
    this.seekerTargetPos.copy(this.seekerPos);

    this.cdr.detectChanges();
  }
}
