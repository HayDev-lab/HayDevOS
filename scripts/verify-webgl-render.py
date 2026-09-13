import os,ctypes as C,json
os.environ['EGL_PLATFORM']='surfaceless';os.environ['LIBGL_ALWAYS_SOFTWARE']='1'
e=C.CDLL('libEGL.so.1');e.eglGetProcAddress.restype=C.c_void_p;e.eglGetProcAddress.argtypes=[C.c_char_p]
def egl(name,rest,args):
 f=getattr(e,name);f.restype=rest;f.argtypes=args;return f
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float
D=egl('eglGetDisplay',P,[P])(None);a=I();b=I();assert egl('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(D,C.byref(a),C.byref(b))
assert egl('eglBindAPI',U,[U])(0x30A0)
attrs=(I*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3025,16,0x3038);cfg=P();num=I();assert egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(D,attrs,C.byref(cfg),1,C.byref(num)) and num.value
frame=json.load(open('.sites-runtime/webgl-qa/frame.json'));w=frame['width'];h=frame['height'];surface=egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(D,cfg,(I*5)(0x3057,w,0x3056,h,0x3038));context=egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])(D,cfg,None,(I*3)(0x3098,2,0x3038));assert egl('eglMakeCurrent',U,[P,P,P,P])(D,surface,surface,context)
def gl(name,rest,args): return C.CFUNCTYPE(rest,*args)(e.eglGetProcAddress(name.encode()))
create=gl('glCreateShader',U,[U]);source=gl('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),P]);compile=gl('glCompileShader',None,[U]);get=gl('glGetShaderiv',None,[U,U,C.POINTER(I)]);log=gl('glGetShaderInfoLog',None,[U,I,P,P]);program=gl('glCreateProgram',U,[])();
for sh in frame['shaders']:
 sid=create(sh['kind']);src=C.c_char_p(sh['source'].encode());source(sid,1,C.byref(src),None);compile(sid);ok=I();get(sid,0x8B81,C.byref(ok));buf=C.create_string_buffer(4096);log(sid,4096,None,buf);assert ok.value,buf.value;gl('glAttachShader',None,[U,U])(program,sid)
gl('glBindAttribLocation',None,[U,U,C.c_char_p])(program,0,b'p');gl('glLinkProgram',None,[U])(program);ok=I();gl('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(ok));assert ok.value
gl('glUseProgram',None,[U])(program);normal=gl('glGetAttribLocation',I,[U,C.c_char_p])(program,b'n');gl('glEnableVertexAttribArray',None,[U])(0);gl('glEnableVertexAttribArray',None,[U])(normal);gl('glEnable',None,[U])(2929);gl('glViewport',None,[I,I,I,I])(0,0,w,h);gl('glClearColor',None,[F,F,F,F])(.031,.039,.035,1);gl('glClear',None,[U])(16384|256)
for draw in frame['draws']:
 ids=(U*2)();gl('glGenBuffers',None,[I,C.POINTER(U)])(2,ids)
 for kind,data,ctype,bid in [(34962,draw['vertices'],F,ids[0]),(34963,draw['indices'],C.c_ushort,ids[1])]:
  arr=(ctype*len(data))(*data);gl('glBindBuffer',None,[U,U])(kind,bid);gl('glBufferData',None,[U,C.c_ssize_t,P,U])(kind,C.sizeof(arr),arr,35044)
 for name,value in draw['uniforms'].items():
  loc=gl('glGetUniformLocation',I,[U,C.c_char_p])(program,name.encode())
  if isinstance(value,list):
   arr=(F*len(value))(*value)
   if len(value)==16:gl('glUniformMatrix4fv',None,[I,I,U,C.POINTER(F)])(loc,1,0,arr)
   else:gl('glUniform3fv',None,[I,I,C.POINTER(F)])(loc,1,arr)
  else:gl('glUniform1f',None,[I,F])(loc,value)
 gl('glVertexAttribPointer',None,[U,I,U,U,I,P])(0,3,5126,0,24,None);gl('glVertexAttribPointer',None,[U,I,U,U,I,P])(normal,3,5126,0,24,P(12));gl('glDrawElements',None,[U,I,U,P])(4,len(draw['indices']),5123,None)
err=gl('glGetError',U,[])();assert err==0,hex(err)
pixels=(C.c_ubyte*(w*h*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,w,h,6408,5121,pixels)
from PIL import Image
im=Image.frombytes('RGBA',(w,h),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);im.save('.sites-runtime/webgl-qa/render.png');distinct=len(set(im.getdata()));assert distinct>100,distinct
print(json.dumps({'shader_compile':'PASS','link':'PASS','GL_error':err,'draw_calls':len(frame['draws']),'distinct_colors':distinct,'renderer':gl('glGetString',C.c_char_p,[U])(7937).decode()}))
