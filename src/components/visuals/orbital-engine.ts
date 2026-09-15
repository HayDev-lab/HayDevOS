// Small WebGL 1 renderer. No textures, external models, post-processing or dependencies.
type Mat = Float32Array;
const identity = (): Mat => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a: Mat,b: Mat): Mat { const out=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out; }
function rotate(x:number,y:number,z:number): Mat {const a=identity(),b=identity(),c=identity();a[5]=a[10]=Math.cos(x);a[6]=Math.sin(x);a[9]=-a[6];b[0]=b[10]=Math.cos(y);b[8]=Math.sin(y);b[2]=-b[8];c[0]=c[5]=Math.cos(z);c[1]=Math.sin(z);c[4]=-c[1];return multiply(multiply(a,b),c);}
function transform(scale:number,x=0,y=0,z=0):Mat {const a=identity();a[0]=a[5]=a[10]=scale;a[12]=x;a[13]=y;a[14]=z;return a;}
function perspective(aspect:number):Mat {const n=.1,f=30,s=1/Math.tan(.38);return new Float32Array([s/aspect,0,0,0,0,s,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function geometry(sphere:boolean,segments:number,tube:number,radius:number){const vertices:number[]=[],indices:number[]=[];for(let u=0;u<=segments;u++){const a=u/segments*Math.PI*2;for(let v=0;v<=tube;v++){const b=v/tube*Math.PI*(sphere?1:2),nx=Math.cos(a)*(sphere?Math.sin(b):Math.cos(b)),ny=sphere?Math.cos(b):Math.sin(b),nz=Math.sin(a)*(sphere?Math.sin(b):Math.cos(b));vertices.push(sphere?nx:Math.cos(a)*(1+radius*Math.cos(b)),sphere?ny:radius*ny,sphere?nz:Math.sin(a)*(1+radius*Math.cos(b)),nx,ny,nz);if(u<segments&&v<tube){const i=u*(tube+1)+v;indices.push(i,i+tube+1,i+1,i+1,i+tube+1,i+tube+2);}}}return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};}
export type OrbitalEngine = { setActive:(index:number)=>void; setScene:(scene:number)=>void; setPaused:(value:boolean)=>void; turn:(delta:number)=>void; reset:()=>void; dispose:()=>void };
export function createOrbitalEngine(canvas:HTMLCanvasElement,onLost:()=>void,onReady:()=>void):OrbitalEngine {
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL unavailable');
 const shaders:WebGLShader[]=[],buffers:WebGLBuffer[]=[];
 const shader=(kind:number,source:string)=>{const s=gl.createShader(kind);if(!s)throw new Error('Shader allocation');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);return s;};
 const program=gl.createProgram();if(!program)throw new Error('Program allocation');
 gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 n;uniform mat4 model;uniform mat4 vp;varying vec3 normal;varying vec3 world;varying vec3 local;void main(){local=p;vec4 w=model*vec4(p,1.);world=w.xyz;normal=normalize(mat3(model)*n);gl_Position=vp*w;}`));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
 varying vec3 normal;varying vec3 world;varying vec3 local;
 uniform vec3 color;uniform float emission;uniform float surface;uniform float phase;
 void main(){
  vec3 N=normalize(normal),V=normalize(vec3(0.,0.,6.)-world),L=normalize(vec3(-3.,4.,5.));
  float light=max(dot(N,L),0.),rim=pow(1.-max(dot(N,V),0.),2.6);
  float spec=pow(max(dot(reflect(-L,N),V),0.),64.);
  vec3 c=color*(.12+light*.55+emission)+vec3(.66,.85,1.)*spec*.85+color*rim*.55;
  float longitude=atan(local.z,local.x)/6.283185+.5;
  if(surface>.5&&surface<1.5){
   float latitude=asin(clamp(normalize(local).y,-1.,1.))/3.14159+.5;
   float gx=abs(fract(longitude*24.)-.5),gy=abs(fract(latitude*14.)-.5);
   float grid=smoothstep(.465,.49,max(gx,gy));
   float scan=pow(max(0.,1.-abs(local.y-sin(phase*.65)*.8)*8.),2.);
   c=vec3(.018,.045,.052)*(light+.3)+color*(grid*(.4+rim)+scan*.65)+vec3(.1,.65,.8)*rim*.6;
  }
  if(surface>1.5&&surface<2.5){
   float sector=fract(longitude*36.);if(sector<.075)discard;
   float packet=pow(max(0.,cos(longitude*6.283185-phase)),18.);
   c=color*(.25+light*.35+packet*1.5+rim*.6)+vec3(.3,.6,.8)*spec;
  }
  if(surface>2.5){
   float sector=fract(longitude*28.);float seam=1.-smoothstep(.02,.05,abs(sector-.5));
   c=vec3(.06,.085,.11)*(.5+light)+vec3(.65,.8,.85)*spec+color*(seam*.8+rim*.15);
  }
  gl_FragColor=vec4(c,1.);
 }`));
 gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);throw new Error('Shader link failed');}
 for(const s of shaders)gl.deleteShader(s);
 gl.useProgram(program);const normal=gl.getAttribLocation(program,'n'),model=gl.getUniformLocation(program,'model'),vp=gl.getUniformLocation(program,'vp'),color=gl.getUniformLocation(program,'color'),emission=gl.getUniformLocation(program,'emission'),surface=gl.getUniformLocation(program,'surface'),phase=gl.getUniformLocation(program,'phase');gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(normal);gl.enable(gl.DEPTH_TEST);
 const constrained=navigator.hardwareConcurrency<=4;
 const mobile=matchMedia('(max-width: 767px)').matches;
 const mesh=(sphere:boolean,thickness:number,small=false)=>{const g=geometry(sphere,small?8:(mobile||constrained)?40:64,small?6:sphere?16:8,thickness),v=gl.createBuffer(),i=gl.createBuffer();if(!v||!i)throw new Error('Buffer allocation');buffers.push(v,i);gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,g.vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.indices,gl.STATIC_DRAW);return {v,i,count:g.indices.length};};
 const ball=mesh(true,0),ring=mesh(false,.014),shell=mesh(false,.18),bead=mesh(true,0,true);
 // Port layouts for every logical scene: CORE (10 nodes), BUILD (6), AUTOMATE (6), PRODUCTS (5).
 const portGeometry=geometry(true,8,6,0);
 const makePorts=(count:number)=>{const portVertices:number[]=[],portIndices:number[]=[];for(let k=0;k<count;k++){const a=k*Math.PI*2/count+Math.PI/2,offset=portVertices.length/6;
  for(let j=0;j<portGeometry.vertices.length;j+=6)portVertices.push(portGeometry.vertices[j]*.035+Math.cos(a)*1.88,portGeometry.vertices[j+1]*.035+Math.sin(a)*1.5,portGeometry.vertices[j+2]*.035,portGeometry.vertices[j+3],portGeometry.vertices[j+4],portGeometry.vertices[j+5]);
  for(const index of portGeometry.indices)portIndices.push(index+offset);}
  const portV=gl.createBuffer(),portI=gl.createBuffer();if(!portV||!portI)throw new Error('Port allocation');buffers.push(portV,portI);gl.bindBuffer(gl.ARRAY_BUFFER,portV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(portVertices),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,portI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(portIndices),gl.STATIC_DRAW);return {v:portV,i:portI,count:portIndices.length};};
 const scenePorts=[makePorts(10),makePorts(6),makePorts(6),makePorts(5)];
 const palette=[[.77,.96,.35],[.35,.8,1],[1,.65,.32],[.75,.52,1]];
 let quality=1,slowFrames=0,hoverX=0,hoverY=0,targetX=0,targetY=0;
 let active=0,scene=0,angle=.4,tilt=.35,clock=0,paused=false,inView=true,disposed=false,raf=0,last=0,frames=0,dragging=false,pointerX=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const draw=(now:number)=>{
  raf=0;if(disposed||!inView||document.hidden)return;
  if(last&&now-last<(mobile?50:33)){raf=requestAnimationFrame(draw);return;}
  const elapsed=now-last;const dt=Math.min(elapsed||0,60);last=now;
  if(elapsed>85&&elapsed<500)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
  if(slowFrames>18&&quality>.65){quality=.65;slowFrames=0;resize();}
  if(!motion.matches){hoverX+=(targetX-hoverX)*.08;hoverY+=(targetY-hoverY)*.08;}if(!paused&&!motion.matches&&!dragging){angle+=dt*.000065;clock+=dt*.001;}
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.031,.039,.035,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(vp,false,multiply(perspective(canvas.width/canvas.height),transform(1,0,0,-6.5)));
  const base=rotate(tilt+hoverY,angle+hoverX,-.28),tint=palette[active%palette.length];gl.uniform1f(phase,clock);
  const paint=(mesh:typeof ball,m:Mat,c:number[],glow:number,material=0)=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.v);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.i);gl.uniformMatrix4fv(model,false,m);gl.uniform3fv(color,c);gl.uniform1f(emission,glow);gl.uniform1f(surface,material);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);};
  paint(ball,multiply(base,transform(.72)),[.22,.84,1.],.1,1);
  const reactor=multiply(base,rotate(1.12,0,.14));
  paint(shell,multiply(reactor,transform(1.03)),tint,.04,3);
  paint(ring,multiply(reactor,transform(.84)),tint,.8,2);
  paint(ring,multiply(reactor,transform(1.25)),[.25,.82,1.],.5,2);
  paint(ring,multiply(reactor,transform(1.31)),tint,.6,2);
  for(let i=0;i<2;i++){
   const orbit=multiply(base,rotate(i*.48+.8,.2,i*.7-.6));
   const radius=1.48+i*.15;
   paint(ring,multiply(orbit,transform(radius)),i===active%2?tint:[.2,.57,.72],.3,2);
   const position=clock*.24+i*Math.PI;
   paint(bead,multiply(orbit,transform(.045,Math.cos(position)*radius,0,Math.sin(position)*radius)),i===active%2?tint:[.25,.85,1.],1.2);
  }
  const nodes=scenePorts[scene];
  paint(nodes,identity(),[.32,.75,.67],.4);
  // One ordered data packet travels across the current node ring.
  const nodeCount=[10,6,6,5][scene];
  const dataPhase=-clock*.22+Math.PI/2;
  paint(bead,transform(.045,Math.cos(dataPhase)*1.88,Math.sin(dataPhase)*1.5,0),tint,1.1);
  const selectedAngle=-active*Math.PI*2/nodeCount+Math.PI/2;
  paint(bead,transform(.065,Math.cos(selectedAngle)*1.88,Math.sin(selectedAngle)*1.5,0),tint,1.1);
  // DOM diagnostics expose actual submitted frames without synchronous GPU readback.
  canvas.dataset.quality=String(quality);canvas.dataset.frames=String(++frames);if(frames===1)onReady();canvas.dataset.rotation=angle.toFixed(3);canvas.dataset.active=String(active);canvas.dataset.scene=String(scene);canvas.dataset.mode=motion.matches?'reduced':paused?'paused':'animated';
  if(!paused&&!motion.matches&&!raf)raf=requestAnimationFrame(draw);
 };
 const request=()=>{if(!raf&&!disposed)raf=requestAnimationFrame(draw);};
 const resize=()=>{const bounds=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,(mobile||constrained)?1:1.25)*quality,scale=Math.min(ratio,900/Math.max(bounds.width,1),720/Math.max(bounds.height,1));canvas.width=Math.max(1,Math.round(bounds.width*scale));canvas.height=Math.max(1,Math.round(bounds.height*scale));request();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const intersection=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView){last=0;request();}else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});intersection.observe(canvas);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=0;request();}};
 const change=()=>{cancelAnimationFrame(raf);raf=0;request();};
 const down=(e:PointerEvent)=>{dragging=true;pointerX=e.clientX;canvas.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent)=>{if(!dragging){if(e.pointerType==='mouse'&&!motion.matches){const b=canvas.getBoundingClientRect();targetX=((e.clientX-b.left)/b.width-.5)*.25;targetY=((e.clientY-b.top)/b.height-.5)*.18;request();}return;}angle+=(e.clientX-pointerX)*.008;pointerX=e.clientX;request();};
 const leave=()=>{targetX=0;targetY=0;};
 const up=()=>{dragging=false;};
 const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;disposed=true;onLost();};
 canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',change);
 resize();
 return {setActive:(value)=>{active=Math.max(0,Math.min([10,6,6,5][scene]-1,value));request();},setScene:(value:number)=>{scene=Math.max(0,Math.min(3,value));active=Math.min(active,[10,6,6,5][scene]-1);request();},setPaused:(value)=>{paused=value;change();},turn:(delta)=>{angle+=delta;request();},reset:()=>{angle=.4;tilt=.35;clock=0;request();},dispose:()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',change);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('webglcontextlost',lost);for(const b of buffers)gl.deleteBuffer(b);gl.deleteProgram(program);}};
}
