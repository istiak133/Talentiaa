import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  opacity: number;
}

interface AnimatedBackgroundProps {
  variant?: 'mesh' | 'aurora' | 'dots';
  particleCount?: number;
  color?: string;
  speed?: number;
  connectDistance?: number;
  style?: React.CSSProperties;
}

export default function AnimatedBackground({
  variant = 'mesh',
  particleCount = 60,
  color = '0, 113, 227',
  speed = 0.4,
  connectDistance = 140,
  style,
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.parentElement?.clientWidth || window.innerWidth;
      h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.5 + 0.15,
      }));
    };

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    initParticles();
    window.addEventListener('resize', () => { resize(); initParticles(); });
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      time += 0.003;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Mouse repel effect
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.015;
          p.vx += dx * force;
          p.vy += dy * force;
        }

        // Dampen velocity
        p.vx *= 0.998;
        p.vy *= 0.998;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.fill();
      }

      // Draw connections
      if (variant === 'mesh' || variant === 'dots') {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectDistance) {
              const opacity = (1 - dist / connectDistance) * 0.15;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(${color}, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        // Mouse connections
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${color}, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Aurora blobs (background glow)
      if (variant === 'aurora' || variant === 'mesh') {
        const drawBlob = (cx: number, cy: number, r: number, c: string, o: number) => {
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          gradient.addColorStop(0, `rgba(${c}, ${o})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        };
        drawBlob(w * 0.2 + Math.sin(time) * 40, h * 0.3 + Math.cos(time * 0.7) * 30, 250, color, 0.04);
        drawBlob(w * 0.75 + Math.cos(time * 0.5) * 50, h * 0.6 + Math.sin(time * 0.8) * 40, 300, '94, 92, 230', 0.03);
        drawBlob(w * 0.5 + Math.sin(time * 1.2) * 30, h * 0.15 + Math.cos(time) * 20, 200, '191, 90, 242', 0.025);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [variant, particleCount, color, speed, connectDistance]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
