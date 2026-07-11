import * as THREE from 'three';

export function createMessageBubble(parent: THREE.Object3D, text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(0.8, 0.4, 1);
  sprite.position.set(0, 2.6, 0);
  parent.add(sprite);
  sprite.visible = false; // 默认隐藏

  return sprite;
}
