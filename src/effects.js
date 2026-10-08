const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Effects {
  constructor() {
    this.particles = [];
    this.labels = [];
    this.shake = 0;
  }
  clear() {
    this.particles = [];
    this.labels = [];
    this.shake = 0;
  }
  burst(x, y, color, points) {
    if (!reducedMotion) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.PI * 2 * i / 10;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * 45,
          vy: Math.sin(angle) * 45,
          life: 450,
          color
        });
      }
    }
    if (points) this.labels.push({
      x,
      y: y - 15,
      text: `+${points}`,
      life: 800
    });
  }
  hit() {
    if (!reducedMotion) this.shake = 220;
  }
  update(dt) {
    this.shake = Math.max(0, this.shake - dt);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
    }
    for (const label of this.labels) {
      label.life -= dt;
      if (!reducedMotion) label.y -= dt * .025;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    this.labels = this.labels.filter(p => p.life > 0);
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 450;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    ctx.lineWidth = 3;
    for (const label of this.labels) {
      ctx.globalAlpha = Math.min(1, label.life / 200);
      ctx.strokeStyle = '#193b4e';
      ctx.fillStyle = '#fff5cf';
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.restore();
  }
}
