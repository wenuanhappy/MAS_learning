import * as THREE from 'three';

export interface AgentOptions {
  name: string;
  role: string;
  modelPath: string;
  position: THREE.Vector3;
  message?: string;
}

export class Agent {
  name: string;
  role: string;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  target?: THREE.Vector3;
  message?: string;
  walkAction?: THREE.AnimationAction;
  messageBubble?: THREE.Sprite;
  
  // 可编辑的属性
  prompt?: string;
  context?: any;  // 可以是字符串或对象（包含 task_goal, conversation_history, full_prompt）

  constructor(name: string, role: string, model: THREE.Object3D, mixer: THREE.AnimationMixer, walkAction?: THREE.AnimationAction) {
    this.name = name;
    this.role = role;
    this.model = model;
    this.mixer = mixer;
    this.walkAction = walkAction;
  }

  setTarget(target: THREE.Vector3) {
    this.target = target.clone();
    if(this.walkAction){
      this.walkAction.play();
    }
  }


  stop() {
    if (this.walkAction) this.walkAction.paused = true; // 停止动画
    this.target = undefined;
  }
  move(delta: number, speed: number) {
    if (!this.target) {
      // 停止动画
      if (this.walkAction && this.walkAction.isRunning()) {
        this.walkAction.paused = true;
      }
      return false;
    }

    const dir = new THREE.Vector3().subVectors(this.target, this.model.position);
    const dist = dir.length();

    if (dist < 0.05) {
      // 到达目标，停止动画
      this.stop();
      return true;
    }

    // 移动中，播放动画
    if (this.walkAction && !this.walkAction.isRunning()) {
      this.walkAction.reset();
      this.walkAction.play();
    }

    dir.normalize();
    this.model.position.add(dir.multiplyScalar(speed * delta));

    const lookTarget = this.target.clone();
    lookTarget.y = this.model.position.y;
    this.model.lookAt(lookTarget);

    return false;
  }


  setMessage(msg: string) {
    this.message = msg;
    if (this.messageBubble) {
      // @ts-ignore
      const canvas = this.messageBubble.material.map.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('...', canvas.width / 2, canvas.height / 2);

      (this.messageBubble.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
  }
}
