/** The archive's ray/sphere renderer, with React-safe resource ownership. */
const vertex = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 vUv; uniform sampler2D dayMap; uniform sampler2D nightMap; uniform float rotation;
const float PI=3.141592653589793;
void main(){
 vec2 p=vUv/0.91; float r2=dot(p,p); float rr=sqrt(r2);
 if(r2>1.0){float halo=exp(-(rr-1.0)*45.0)*.46; if(rr>1.085)discard;gl_FragColor=vec4(.035,.38,1.,halo);return;}
 vec3 n=vec3(p,sqrt(1.-r2)); float c=cos(rotation),s=sin(rotation);
 vec3 world=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
 vec2 uv=vec2(atan(world.z,world.x)/(2.*PI)+.5,asin(clamp(world.y,-1.,1.))/PI+.5);
 vec3 day=texture2D(dayMap,uv).rgb; vec3 night=texture2D(nightMap,uv).rgb;
 vec3 light=normalize(vec3(-.7,.55,.8)); float sun=dot(n,light);
 float daylight=smoothstep(-.1,.58,sun);
 vec3 oceanTint=vec3(.035,.16,.37); float sea=1.-smoothstep(.03,.16,day.r-day.b*.35);
 vec3 col=mix(day*.52,day*.57+oceanTint*.25,sea)*(.18+max(sun,0.)*.82);
 col+=night*vec3(1.,.81,.52)*(1.-daylight)*1.9; col+=vec3(.008,.04,.10);
 float rim=pow(1.-n.z,3.2); col+=vec3(.03,.34,.9)*rim*.85;
 float spec=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),62.);
 col+=vec3(.65,.84,1.)*spec*.36;
 float glass=pow(max(dot(n,normalize(vec3(-.4,.7,.6))),0.),95.);
 col+=vec3(.75,.9,1.)*glass*.38; gl_FragColor=vec4(col,1.);
}`;

export function createEarthEngine(
  canvas: HTMLCanvasElement,
  isPaused: () => boolean,
  onStatus: (status: "ready" | "restoring" | "unavailable") => void,
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  let disposed = false;
  let frame = 0;
  let last = 0;
  let angle = -0.58;
  let contextGeneration = 0;
  let observer: ResizeObserver | null = null;
  let release: (() => void) | null = null;

  const fallback = () => {
    if (disposed) return;
    canvas.dataset.renderer = "fallback";
    onStatus("unavailable");
  };

  async function start() {
    const generation = contextGeneration;
    if (!gl || disposed) {
      fallback();
      return;
    }
    release?.();
    release = null;
    const textures: WebGLTexture[] = [];
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    release = () => {
      observer?.disconnect();
      observer = null;
      textures.forEach((texture) => gl.deleteTexture(texture));
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
    if (!program || !buffer) throw new Error("WebGL allocation failed");
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("WebGL shader allocation failed");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("WebGL shader compile failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("WebGL link failed");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    // Decode both files first, then upload sequentially: activeTexture is shared GL state.
    const maps = await Promise.all(
      ["earth-day.webp", "earth-night.webp"].map(async (name) => {
        const image = new Image();
        image.src = `/core/${name}`;
        await image.decode();
        return image;
      }),
    );
    if (disposed || gl.isContextLost() || generation !== contextGeneration) return;
    maps.forEach((image, unit) => {
      const texture = gl.createTexture();
      if (!texture) throw new Error("WebGL texture allocation failed");
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    });
    gl.uniform1i(gl.getUniformLocation(program, "dayMap"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "nightMap"), 1);
    const rotation = gl.getUniformLocation(program, "rotation");
    const resize = () => {
      const size = Math.max(
        1,
        Math.min(
          1300,
          Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2)),
        ),
      );
      canvas.width = canvas.height = size;
      gl.viewport(0, 0, size, size);
    };
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    last = 0;
    function draw(time: number) {
      if (disposed || !gl || gl.isContextLost()) return;
      if (!document.hidden) {
        const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
        if (!isPaused()) angle += dt * 0.1;
        gl.uniform1f(rotation, angle);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        canvas.dataset.angle = angle.toFixed(4);
      }
      last = time;
      frame = requestAnimationFrame(draw);
    }
    canvas.dataset.renderer = "webgl";
    onStatus("ready");
    frame = requestAnimationFrame(draw);
  }
  const lost = (event: Event) => {
    event.preventDefault();
    contextGeneration += 1;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    observer = null;
    // The browser invalidates GL objects on context loss. Deleting those
    // handles after restoration would address objects from another context.
    release = null;
    if (!disposed) onStatus("restoring");
  };
  const restored = () => {
    void start().catch(fallback);
  };
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  void start().catch(fallback);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    release?.();
  };
}
