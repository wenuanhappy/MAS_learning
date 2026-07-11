import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Agent, AgentOptions } from '../models/agent';
import { createMessageBubble } from '../utils/bubble';

export class AgentService {
  agents: Agent[] = [];
  mixers: THREE.AnimationMixer[] = [];
  currentAgentIndex = 0;
  private historyQueue: any[] = [];
  private currentHistoryIndex = 0;
  private historyTimer: number | undefined;
  private waitingForMove = false;
  private currentMovingAgent?: Agent;
  private messageDuration = 3000;
  onMessageCallback?: (from: string, to: string | null, message: string) => void;
  constructor(private scene: THREE.Scene) {}

  private createNameTag(object: THREE.Object3D, role: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(role, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 2.2, 0); // 调整到头顶
    object.add(sprite);
  }

  async createAgent(opts: AgentOptions): Promise<Agent> {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(opts.modelPath, (gltf) => {
        const model = gltf.scene;
        model.position.copy(opts.position);
        model.scale.set(1, 1, 1);
        this.scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        let walkAction: THREE.AnimationAction | undefined = undefined;
        if (gltf.animations.length > 0) {
          walkAction = mixer.clipAction(gltf.animations[0]);
        }
        this.mixers.push(mixer);

        const agent = new Agent(opts.name, opts.role, model, mixer, walkAction)

        agent.message = opts.message;
        agent.messageBubble = createMessageBubble(model, opts.message || '');
        this.createNameTag(model, opts.role);

        this.agents.push(agent);

        resolve(agent);
      });
    });
  }

  update(delta: number, speed: number) {
    this.mixers.forEach((m) => m.update(delta));
    if (this.agents.length === 0) return;
    const agent = this.currentMovingAgent;
    if (!agent || !this.waitingForMove) return;
    const reached = agent.move(delta, speed);
    if (reached) {
      this.waitingForMove = false;
      // 到达目标后显示气泡
      if (agent.messageBubble)
        agent.messageBubble.visible = true;
      setTimeout(() => {
        if (agent.messageBubble)
          agent.messageBubble.visible = false;
        this.currentHistoryIndex++;
        this.showNextHistory();
      }, this.messageDuration);

    }

  }
  getAgentsWithinDistance(threshold: number): [Agent, Agent][] {
    const closePairs: [Agent, Agent][] = [];
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const distance = this.agents[i].model.position.distanceTo(this.agents[j].model.position);
        if (distance < threshold) closePairs.push([this.agents[i], this.agents[j]]);
      }
    }
    return closePairs;
  }

  playHistory(history: any[], messageDuration = 2000) {

    this.historyQueue = history;
    this.currentHistoryIndex = 0;
    this.messageDuration = messageDuration;

    this.showNextHistory();
  }

  private currentMessageEntry?: any;

  private showNextHistory() {

    if (this.currentHistoryIndex >= this.historyQueue.length) return;

    const entry = this.historyQueue[this.currentHistoryIndex];
    this.currentMessageEntry = entry;

    const fromAgent = this.agents.find(a => a.name.toLowerCase() === entry.from);
    const toAgent = this.agents.find(a => a.name.toLowerCase() === entry.to);

    if (!fromAgent) return;

    fromAgent.setMessage(entry.message);

    if (this.onMessageCallback) {
      this.onMessageCallback(entry.from, entry.to || null, entry.message);
    }

    if (toAgent) {

      const direction = new THREE.Vector3()
        .subVectors(fromAgent.model.position, toAgent.model.position)
        .normalize();
      const stopDistance = 2.0;
      const targetPosition = toAgent.model.position.clone()
        .add(direction.multiplyScalar(stopDistance));

      fromAgent.setTarget(targetPosition);

      this.waitingForMove = true;
      this.currentMovingAgent = fromAgent;

    } else {

      // 没有目标直接显示气泡并下一条
      if (fromAgent.messageBubble)
        fromAgent.messageBubble.visible = true;
      setTimeout(() => {
        if (fromAgent.messageBubble)
          fromAgent.messageBubble.visible = false;
        this.currentHistoryIndex++;
        this.showNextHistory();
      }, this.messageDuration);

    }

  }
  addHistoryEntry(entry: any) {
    this.historyQueue.push(entry);
    if (this.historyQueue.length === 1) {
      this.currentHistoryIndex = 0;
      this.showNextHistory();
    } else if (!this.waitingForMove && this.currentHistoryIndex >= this.historyQueue.length - 1) {
      this.showNextHistory();
    }
  }

  stopHistory() {
    if (this.historyTimer) {
      clearTimeout(this.historyTimer);
      this.historyTimer = undefined;
    }
    this.historyQueue = [];
    this.currentHistoryIndex = 0;
  }
}


