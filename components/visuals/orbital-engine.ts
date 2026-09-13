// Small WebGL 1 renderer. No textures, external models, post-processing or dependencies.
type Mat = Float32Array;
const identity = (): Mat => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a: Mat,b: Mat): Mat { const out=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out; }
function rotate(x:number,y:number,z:number): Mat {const a=identity(),b=identity(),c=identity();a[5]=a[10]=Math.cos(x);a[6]=Math.sin(x);a[9]=-a[6];b[0]=b[10]=Math.cos(y);b[8]=Math.sin(y);b[2]=-b[8];c[0]=c[5]=Math.cos(z);c[1]=Math.sin(z);c[4]=-c[1];return multiply(multiply(a,b),c);}
function transform(scale:number,x=0,y=0,z=0):Mat {const a=identity();a[0]=a[5]=a[10]=scale;a[12]=x;a[13]=y;a[14]=z;return a;}
function perspective(aspect:number):Mat {const n=.1,f=30,s=1/Math.tan(.38);return new Float32Array([s/aspect,0,0,0,0,s,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function geometry(sphere:boolean,segments:number,tube:number,radius:number){const vertices:number[]=[],indices:number[]=[];for(let u=0;u<=segments;u++){const a=u/segments*Math.PI*2;for(let v=0;v<=tube;v++){const b=v/tube*Math.PI*(sphere?1:2),nx=Math.cos(a)*(sphere?Math.sin(b):Math.cos(b)),ny=sphere?Math.cos(b):Math.sin(b),nz=Math.sin(a)*(sphere?Math.sin(b):Math.cos(b));vertices.push(sphere?nx:Math.cos(a)*(1+radius*Math.cos(b)),sphere?ny:radius*ny,sphere?nz:Math.sin(a)*(1+radius*Math.cos(b)),nx,ny,nz);if(u<segments&&v<tube){const i=u*(tube+1)+v;indices.push(i,i+tube+1,i+1,i+1,i+tube+1,i+tube+2);}}}return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};}
export type OrbitalEngine = { setActive:(index:number)=>void; setPaused:(value:boolean)=>void; turn:(delta:number)=>void; reset:()=>void; dispose:()=>void };
export function createOrbitalEngine(canvas:HTMLCanvasElement,onLost:()=>void,onReady:()=>void):OrbitalEngine {
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL unavailable');
 const shaders:WebGLShader[]=[],buffers:WebGLBuffer[]=[];
 const shader=(kind:number,source:string)=>{const s=gl.createShader(kind);if(!s)throw new Error('Shader allocation');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);return s;};
 const program=gl.createProgram();if(!program)throw new Error('Program allocation');
 gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 n;uniform mat4 model;uniform mat4 vp;varying vec3 normal;varying vec3 world;void main(){vec4 w=model*vec4(p,1.);world=w.xyz;normal=normalize(mat3(model)*n);gl_Position=vp*w;}`));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 normal;varying vec3 world;uniform vec3 color;uniform float emission;void main(){vec3 N=normalize(normal);vec3 V=normalize(vec3(0.,0.,6.)-world);vec3 L=normalize(vec3(-3.,4.,5.));float light=max(dot(N,L),0.);float rim=pow(1.-max(dot(N,V),0.),3.);float spec=pow(max(dot(reflect(-L,N),V),0.),48.);vec3 c=color*(.16+light*.55+emission)+vec3(.72,.86,.66)*spec*.8+color*rim*.65;gl_FragColor=vec4(c,1.);}`));
 gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);throw new Error('Shader link failed');}
 for(const s of shaders)gl.deleteShader(s);
 gl.useProgram(program);const normal=gl.getAttribLocation(program,'n'),model=gl.getUniformLocation(program,'model'),vp=gl.getUniformLocation(program,'vp'),color=gl.getUniformLocation(program,'color'),emission=gl.getUniformLocation(program,'emission');gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(normal);gl.enable(gl.DEPTH_TEST);
 const mobile=matchMedia('(max-width: 767px)').matches;
 const mesh=(sphere:boolean,thickness:number)=>{const g=geometry(sphere,mobile?48:88,sphere?20:10,thickness),v=gl.createBuffer(),i=gl.createBuffer();if(!v||!i)throw new Error('Buffer allocation');buffers.push(v,i);gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,g.vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.indices,gl.STATIC_DRAW);return {v,i,count:g.indices.length};};
 const ball=mesh(true,0),ring=mesh(false,.027),shell=mesh(false,.095);
 const palette=[[.77,.96,.35],[.35,.8,1],[1,.65,.32],[.75,.52,1]];
 let active=0,angle=.4,tilt=.35,paused=false,inView=true,disposed=false,raf=0,last=0,frames=0,dragging=false,pointerX=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const draw=(now:number)=>{
  raf=0;if(disposed||!inView||document.hidden)return;
  if(last&&now-last<(mobile?50:33)){raf=requestAnimationFrame(draw);return;}
  const dt=Math.min(now-last||0,60);last=now;if(!paused&&!motion.matches&&!dragging)angle+=dt*.00012;
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.031,.039,.035,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(vp,false,multiply(perspective(canvas.width/canvas.height),transform(1,0,0,-6.5)));
  const base=rotate(tilt,angle,-.28),tint=palette[active];
  const paint=(mesh:typeof ball,m:Mat,c:number[],glow:number)=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.v);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.i);gl.uniformMatrix4fv(model,false,m);gl.uniform3fv(color,c);gl.uniform1f(emission,glow);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);};
  paint(ball,multiply(base,transform(.74)),[.15,.21,.15],.03);
  paint(shell,multiply(base,multiply(rotate(.45,0,.25),transform(1.12))),[.23,.29,.22],.07);
  for(let i=0;i<4;i++){
   const orbit=multiply(base,rotate(i*.62+.3,0,i*.65));
   paint(ring,multiply(orbit,transform(1.34+i*.12)),i===active?tint:[.23,.32,.21],i===active?.6:.08);
   const phase=i*1.57+.6;paint(ball,multiply(orbit,transform(i===active?.14:.085,Math.cos(phase)*(1.34+i*.12),0,Math.sin(phase)*(1.34+i*.12))),palette[i],i===active?.5:.12);
  }
  // DOM diagnostics expose actual submitted frames without synchronous GPU readback.
  canvas.dataset.frames=String(++frames);if(frames===1)onReady();canvas.dataset.rotation=angle.toFixed(3);canvas.dataset.active=String(active);canvas.dataset.mode=motion.matches?'reduced':paused?'paused':'animated';
  if(!paused&&!motion.matches)raf=requestAnimationFrame(draw);
 };
 const request=()=>{if(!raf&&!disposed)raf=requestAnimationFrame(draw);};
 const resize=()=>{const bounds=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,mobile?1:1.5),scale=Math.min(ratio,900/Math.max(bounds.width,1),720/Math.max(bounds.height,1));canvas.width=Math.max(1,Math.round(bounds.width*scale));canvas.height=Math.max(1,Math.round(bounds.height*scale));request();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const intersection=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView){last=0;request();}else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});intersection.observe(canvas);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=0;request();}};
 const change=()=>{cancelAnimationFrame(raf);raf=0;request();};
 const down=(e:PointerEvent)=>{dragging=true;pointerX=e.clientX;canvas.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent)=>{if(!dragging)return;angle+=(e.clientX-pointerX)*.008;pointerX=e.clientX;request();};
 const up=()=>{dragging=false;};
 const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;disposed=true;onLost();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',change);
 resize();
 return {setActive:(value)=>{active=Math.max(0,Math.min(3,value));request();},setPaused:(value)=>{paused=value;change();},turn:(delta)=>{angle+=delta;request();},reset:()=>{angle=.4;tilt=.35;request();},dispose:()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',change);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('webglcontextlost',lost);for(const b of buffers)gl.deleteBuffer(b);gl.deleteProgram(program);}};
}
