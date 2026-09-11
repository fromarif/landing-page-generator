// See docs/bglines.md before changing this.

const VERT = `
attribute vec3 position;
uniform mat4 projectionMatrix;
uniform float time, scroll, speed, segments, intensity, bend;
void main() {
  vec4 pos = vec4(position, 1.);
  float t = time * speed;

  float phase = (pos.y - scroll / (947. / 2000.)) * (segments * 0.001);
  float func1 = cos(phase) * (1. + intensity * cos(t));
  float func2 = sin(phase) * (1. + intensity * sin(t));
  pos.x += mix(func1, func2, (pos.x + 10.) / 20. * sin(t));

  float coordY = scroll / 2896. + (1000. - pos.x) / 2000. * 947. / 2896.;
  float k2 = 2. - smoothstep(0., 10., abs(pos.x));
  pos.y += sin(coordY * 24. + t) * bend * k2;

  gl_Position = projectionMatrix * pos;
}`;

const FRAG = `
precision mediump float;
uniform vec4 color;
void main() { gl_FragColor = color; }`;

type Options = {
  color: [number, number, number, number];
  position: number;
  speed: number;
  lines: number;
  density: number;
  scale: number;
  segments: number;
  intensity: number;
  bend: number;
};

type Instance = { destroy: () => void };

let instances: Instance[] = [];

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function ortho(l: number, r: number, b: number, t: number, n: number, f: number) {
  return new Float32Array([
    2 / (r - l), 0, 0, 0,
    0, 2 / (t - b), 0, 0,
    0, 0, -2 / (f - n), 0,
    -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1,
  ]);
}

function readOptions(el: HTMLElement): Options {
  const num = (key: string, fallback: number) =>
    el.dataset[key] === undefined ? fallback : Number(el.dataset[key]);
  const raw = el.dataset.bglinesColor;
  const color = raw
    ? (raw.split(',').map(Number) as [number, number, number, number])
    : ([0.05, 0.05, 0.05, 0.18] as [number, number, number, number]);

  return {
    color,
    position: num('bglinesPosition', 0.3),
    speed: num('bglinesSpeed', 0.7),
    lines: num('bglinesLines', 20),
    density: num('bglinesDensity', 30),
    scale: num('bglinesScale', 15),
    segments: num('bglinesSegments', 2),
    intensity: num('bglinesIntensity', 10),
    bend: num('bglinesBend', 90),
  };
}

export function initBgLines() {
  document.querySelectorAll<HTMLElement>('[data-bglines]').forEach((host) => {
    const canvas = host.querySelector('canvas');
    const gl = canvas?.getContext('webgl', { antialias: true, alpha: true });
    if (!canvas || !gl) return;

    const o = readOptions(host);
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!program || !vs || !fs) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const verts: number[] = [];
    const perLine = 401;
    for (let i = -(o.lines / 2); i < o.lines / 2; i += 1) {
      for (let x = -200; x <= 200; x += 1) verts.push(x, i * o.density, -30);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 3, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform4fv(u('color'), o.color);
    gl.uniform1f(u('speed'), o.speed);
    gl.uniform1f(u('segments'), o.segments);
    gl.uniform1f(u('intensity'), o.intensity);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let time = 0;
    let bend = 0;
    let lastScroll = window.scrollY;
    let lastFrame = performance.now();
    let frameId = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };

    const draw = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      const w = canvas.clientWidth;
      const left = -w / o.scale - (w * o.position) / 10;
      const right = w / o.scale - (w * o.position) / 10;
      gl.uniformMatrix4fv(u('projectionMatrix'), false, ortho(left, right, -1000, 1000, 1, 100));
      gl.uniform1f(u('time'), time);
      gl.uniform1f(u('scroll'), window.scrollY);
      gl.uniform1f(u('bend'), bend);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < o.lines; i += 1) {
        gl.drawArrays(gl.LINE_STRIP, i * perLine, perLine);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      time += dt;

      // The repo samples a render target it never fills, so the bend is dead
      // there. Drive it from scroll speed instead: straight at rest, bowed while
      // the page is moving.
      const velocity = Math.abs(window.scrollY - lastScroll) / Math.max(dt, 0.001);
      lastScroll = window.scrollY;
      const target = Math.min(velocity / 2000, 1) * o.bend;
      bend += (target - bend) * Math.min(dt * 4, 1);

      draw();
      frameId = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frameId && !reduced()) {
        lastFrame = performance.now();
        frameId = requestAnimationFrame(frame);
      } else if (!visible && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    observer.observe(host);

    window.addEventListener('resize', resize);
    resize();

    if (reduced()) {
      draw();
    } else {
      frameId = requestAnimationFrame(frame);
    }

    instances.push({
      destroy() {
        if (frameId) cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener('resize', resize);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    });
  });
}

export function destroyBgLines() {
  instances.forEach((instance) => instance.destroy());
  instances = [];
}
