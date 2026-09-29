/**
 * Dependency-free WebGL 1 renderer adapted from HayDevOS' public orbital scene.
 * It intentionally stays small, pauses off-screen and lowers quality on slower
 * devices so the owner dashboard remains usable on ordinary laptops/phones.
 */

type Mat = Float32Array;

const identity = (): Mat =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function multiply(a: Mat, b: Mat): Mat {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        out[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
      }
    }
  }
  return out;
}

function rotate(x: number, y: number, z: number): Mat {
  const xRotation = identity();
  const yRotation = identity();
  const zRotation = identity();
  xRotation[5] = xRotation[10] = Math.cos(x);
  xRotation[6] = Math.sin(x);
  xRotation[9] = -xRotation[6];
  yRotation[0] = yRotation[10] = Math.cos(y);
  yRotation[8] = Math.sin(y);
  yRotation[2] = -yRotation[8];
  zRotation[0] = zRotation[5] = Math.cos(z);
  zRotation[1] = Math.sin(z);
  zRotation[4] = -zRotation[1];
  return multiply(multiply(xRotation, yRotation), zRotation);
}

function transform(scale: number, x = 0, y = 0, z = 0): Mat {
  const matrix = identity();
  matrix[0] = matrix[5] = matrix[10] = scale;
  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;
  return matrix;
}

function perspective(aspect: number): Mat {
  const near = 0.1;
  const far = 30;
  const scale = 1 / Math.tan(0.38);
  return new Float32Array([
    scale / aspect, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

function geometry(sphere: boolean, segments: number, tube: number, radius: number) {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let u = 0; u <= segments; u += 1) {
    const angle = (u / segments) * Math.PI * 2;
    for (let v = 0; v <= tube; v += 1) {
      const band = (v / tube) * Math.PI * (sphere ? 1 : 2);
      const nx = Math.cos(angle) * (sphere ? Math.sin(band) : Math.cos(band));
      const ny = sphere ? Math.cos(band) : Math.sin(band);
      const nz = Math.sin(angle) * (sphere ? Math.sin(band) : Math.cos(band));
      vertices.push(
        sphere ? nx : Math.cos(angle) * (1 + radius * Math.cos(band)),
        sphere ? ny : radius * ny,
        sphere ? nz : Math.sin(angle) * (1 + radius * Math.cos(band)),
        nx,
        ny,
        nz,
      );

      if (u < segments && v < tube) {
        const point = u * (tube + 1) + v;
        indices.push(
          point,
          point + tube + 1,
          point + 1,
          point + 1,
          point + tube + 1,
          point + tube + 2,
        );
      }
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}

export type OwnerOrbitalEngine = {
  setActive: (index: number) => void;
  dispose: () => void;
};

export function createOwnerOrbitalEngine(
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onReady: () => void,
): OwnerOrbitalEngine {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error("WebGL unavailable");

  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  const compileShader = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader) throw new Error("Shader allocation failed");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
    }
    return shader;
  };

  const program = gl.createProgram();
  if (!program) throw new Error("Program allocation failed");

  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, `
    attribute vec3 p;
    attribute vec3 n;
    uniform mat4 model;
    uniform mat4 vp;
    varying vec3 normal;
    varying vec3 world;
    varying vec3 local;
    void main() {
      local = p;
      vec4 w = model * vec4(p, 1.0);
      world = w.xyz;
      normal = normalize(mat3(model) * n);
      gl_Position = vp * w;
    }
  `));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec3 normal;
    varying vec3 world;
    varying vec3 local;
    uniform vec3 color;
    uniform float emission;
    uniform float surface;
    uniform float phase;
    void main() {
      vec3 N = normalize(normal);
      vec3 V = normalize(vec3(0.0, 0.0, 6.0) - world);
      vec3 L = normalize(vec3(-3.0, 4.0, 5.0));
      float light = max(dot(N, L), 0.0);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
      float spec = pow(max(dot(reflect(-L, N), V), 0.0), 64.0);
      vec3 mixed = color * (0.12 + light * 0.55 + emission)
        + vec3(0.66, 0.85, 1.0) * spec * 0.85
        + color * rim * 0.55;
      float longitude = atan(local.z, local.x) / 6.283185 + 0.5;
      if (surface > 0.5 && surface < 1.5) {
        float latitude = asin(clamp(normalize(local).y, -1.0, 1.0)) / 3.14159 + 0.5;
        float gx = abs(fract(longitude * 24.0) - 0.5);
        float gy = abs(fract(latitude * 14.0) - 0.5);
        float grid = smoothstep(0.465, 0.49, max(gx, gy));
        float scan = pow(max(0.0, 1.0 - abs(local.y - sin(phase * 0.65) * 0.8) * 8.0), 2.0);
        mixed = vec3(0.018, 0.045, 0.052) * (light + 0.3)
          + color * (grid * (0.4 + rim) + scan * 0.65)
          + vec3(0.1, 0.65, 0.8) * rim * 0.6;
      }
      if (surface > 1.5 && surface < 2.5) {
        float sector = fract(longitude * 36.0);
        if (sector < 0.075) discard;
        float packet = pow(max(0.0, cos(longitude * 6.283185 - phase)), 18.0);
        mixed = color * (0.25 + light * 0.35 + packet * 1.5 + rim * 0.6)
          + vec3(0.3, 0.6, 0.8) * spec;
      }
      if (surface > 2.5) {
        float sector = fract(longitude * 28.0);
        float seam = 1.0 - smoothstep(0.02, 0.05, abs(sector - 0.5));
        mixed = vec3(0.06, 0.085, 0.11) * (0.5 + light)
          + vec3(0.65, 0.8, 0.85) * spec
          + color * (seam * 0.8 + rim * 0.15);
      }
      gl_FragColor = vec4(mixed, 1.0);
    }
  `));
  gl.bindAttribLocation(program, 0, "p");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    throw new Error("Shader link failed");
  }
  for (const shader of shaders) gl.deleteShader(shader);

  gl.useProgram(program);
  const normal = gl.getAttribLocation(program, "n");
  const model = gl.getUniformLocation(program, "model");
  const vp = gl.getUniformLocation(program, "vp");
  const color = gl.getUniformLocation(program, "color");
  const emission = gl.getUniformLocation(program, "emission");
  const surface = gl.getUniformLocation(program, "surface");
  const phase = gl.getUniformLocation(program, "phase");
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(normal);
  gl.enable(gl.DEPTH_TEST);

  const constrained = navigator.hardwareConcurrency <= 4;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const makeMesh = (sphere: boolean, thickness: number, small = false) => {
    const data = geometry(
      sphere,
      small ? 8 : mobile || constrained ? 40 : 64,
      small ? 6 : sphere ? 16 : 8,
      thickness,
    );
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vertexBuffer || !indexBuffer) throw new Error("Buffer allocation failed");
    buffers.push(vertexBuffer, indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    return { vertexBuffer, indexBuffer, count: data.indices.length };
  };

  const ball = makeMesh(true, 0);
  const ring = makeMesh(false, 0.014);
  const shell = makeMesh(false, 0.18);

  const palette = [
    [0.77, 0.96, 0.35],
    [0.35, 0.8, 1],
    [1, 0.65, 0.32],
    [0.75, 0.52, 1],
  ];
  let quality = 1;
  let slowFrames = 0;
  let hoverX = 0;
  let hoverY = 0;
  let targetX = 0;
  let targetY = 0;
  let active = 0;
  let angle = 0.4;
  let tilt = 0.35;
  let clock = 0;
  let inView = true;
  let disposed = false;
  let animationFrame = 0;
  let lastFrame = 0;
  let frames = 0;
  let dragging = false;
  let pointerX = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio, mobile || constrained ? 1 : 1.25) * quality;
    const scale = Math.min(
      ratio,
      900 / Math.max(bounds.width, 1),
      720 / Math.max(bounds.height, 1),
    );
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    requestFrame();
  };

  const draw = (now: number) => {
    animationFrame = 0;
    if (disposed || !inView || document.hidden) return;
    if (lastFrame && now - lastFrame < (mobile ? 50 : 33)) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }
    const elapsed = now - lastFrame;
    const delta = Math.min(elapsed || 0, 60);
    lastFrame = now;
    slowFrames = elapsed > 85 && elapsed < 500 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 18 && quality > 0.65) {
      quality = 0.65;
      slowFrames = 0;
      resize();
    }
    if (!reducedMotion.matches) {
      hoverX += (targetX - hoverX) * 0.08;
      hoverY += (targetY - hoverY) * 0.08;
    }
    if (!reducedMotion.matches && !dragging) {
      angle += delta * 0.00018;
      clock += delta * 0.00045;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.031, 0.039, 0.035, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(
      vp,
      false,
      multiply(perspective(canvas.width / canvas.height), transform(1, 0, 0, -5.1)),
    );
    const base = rotate(0, angle + hoverX, 0);
    const tint = palette[active % palette.length];
    gl.uniform1f(phase, clock);

    const paint = (
      mesh: typeof ball,
      matrix: Mat,
      meshColor: number[],
      glow: number,
      material = 0,
    ) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
      gl.uniformMatrix4fv(model, false, matrix);
      gl.uniform3fv(color, meshColor);
      gl.uniform1f(emission, glow);
      gl.uniform1f(surface, material);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    };

    paint(ball, multiply(base, transform(0.72)), [0.22, 0.84, 1], 0.1, 1);
    const reactor = multiply(base, rotate(1.12, 0, 0.14));
    paint(shell, multiply(reactor, transform(1.03)), tint, 0.04, 3);
    paint(ring, multiply(reactor, transform(0.84)), tint, 0.8, 2);
    paint(ring, multiply(reactor, transform(1.25)), [0.25, 0.82, 1], 0.5, 2);
    paint(ring, multiply(reactor, transform(1.31)), tint, 0.6, 2);

    for (let orbitIndex = 0; orbitIndex < 2; orbitIndex += 1) {
      const orbit = multiply(base, rotate(orbitIndex * 0.48 + 0.8, 0.2, orbitIndex * 0.7 - 0.6));
      const radius = 1.48 + orbitIndex * 0.15;
      paint(ring, multiply(orbit, transform(radius)), orbitIndex === active % 2 ? tint : [0.2, 0.57, 0.72], 0.3, 2);
    }

    canvas.dataset.quality = String(quality);
    canvas.dataset.frames = String(++frames);
    canvas.dataset.active = String(active);
    canvas.dataset.mode = reducedMotion.matches ? "reduced" : "animated";
    if (frames === 1) onReady();
    if (!reducedMotion.matches && !animationFrame) {
      animationFrame = requestAnimationFrame(draw);
    }
  };

  function requestFrame() {
    if (!animationFrame && !disposed) animationFrame = requestAnimationFrame(draw);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (inView) {
        lastFrame = 0;
        requestFrame();
      } else {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    },
    { threshold: 0 },
  );
  intersectionObserver.observe(canvas);

  const handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      lastFrame = 0;
      requestFrame();
    }
  };
  const handleMotionChange = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    requestFrame();
  };
  const handlePointerDown = (event: PointerEvent) => {
    dragging = true;
    pointerX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (!dragging) {
      if (event.pointerType === "mouse" && !reducedMotion.matches) {
        const bounds = canvas.getBoundingClientRect();
        targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.25;
        targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.18;
        requestFrame();
      }
      return;
    }
    angle += (event.clientX - pointerX) * 0.008;
    pointerX = event.clientX;
    requestFrame();
  };
  const handlePointerLeave = () => {
    targetX = 0;
    targetY = 0;
  };
  const handlePointerUp = () => {
    dragging = false;
  };
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    disposed = true;
    onLost();
  };

  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", handleMotionChange);
  resize();

  return {
    setActive: (value) => {
      active = Math.max(0, Math.min(5, value));
      requestFrame();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleMotionChange);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
