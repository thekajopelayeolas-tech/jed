import * as THREE from 'three';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  spawn(x, y, z, colour, count = 10) {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: colour });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(x + Math.random() * 0.5, y + Math.random() * 0.5, z + Math.random() * 0.5);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 1.0 });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.add(p.velocity);
        p.velocity.y -= 0.005; // Gravity
        p.mesh.scale.setScalar(p.life); // Shrink over time
      }
    }
  }
}