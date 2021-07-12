function WebGLpp( url , canvasID , vertexShaderSource , fragmentShaderSource ) {

  this.canvas     = document.getElementById(canvasID);
  this.textCanvas = document.getElementById('text');
  this.meshes = new Array();
  this.colormap = 'giraffe';
  this.vertexNumbers   = false;
  this.triangleNumbers = false;
  this.initGL(vertexShaderSource,fragmentShaderSource);

  this.buffers = [];

  let webglpp = this;
  this.connect = function(addr,vis) {

    let websocket = window['MozWebSocket'] ? window['MozWebSocket'] : window['WebSocket'];

    let ws = new websocket(addr);
    ws.onopen  = function(evt) { console.log('connection opened'); }
    ws.onclose = function(evt) { console.log('connection closed'); }
    ws.onmessage = function(evt) {

      let message = JSON.parse(evt.data);
      let buffers = message['buffers'];
      console.log(buffers);

      console.log('unpacking ' + buffers.length + ' buffers' );
      for (let i = 0; i < buffers.length; i++) {

        let buffer = buffers[i];
        let data = buffer['data'];
        let targ = buffer['target'];
        let type = buffer['type'];
        let tag  = buffer['tag'];
        let indx = buffer['index'];

        webglpp.addBuffer(data,targ,type,tag,indx);
      }
      vis.initialize(webglpp);
    }
  }
}

WebGLpp.prototype.addBuffer = function(data,target,type,tag,index) {

  let gl = this.gl;

  let buffer = gl.createBuffer();

  // bind the buffer
  if      (target == "ARRAY_BUFFER")         gl.bindBuffer( gl.ARRAY_BUFFER , buffer);
  else if (target == "ELEMENT_ARRAY_BUFFER") gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , buffer);
  else {
    console.log('unknown buffer target ' + target);
    return;
  }

  if (type == "Float32Array") {
    gl.bufferData( gl.ARRAY_BUFFER , new Float32Array(data) , gl.STATIC_DRAW );
  }
  else if (type == "Uint16Array") {
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(data) , gl.STATIC_DRAW );
  }
  else {
    console.log('unknown buffer type' + type);
    return;
  }

  buffer.nb  = data.length;
  buffer.tag = tag;
  this.buffers.push(buffer);
}

WebGLpp.prototype.initGL = function(vertexShaderSource,fragmentShaderSource) {

  // initialize the webgl context
  this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('experimental-webgl');
  this.gl.viewport(0,0,this.canvas.width, this.canvas.height);

  // create the shader program and save the attribute locations
  this.program = compileProgram( this.gl , vertexShaderSource , fragmentShaderSource );
}

function avroWebGL() {

}

avroWebGL.prototype.initialize = function(webglpp) {

  this.gl = webglpp.gl;
  let buffers = webglpp.buffers;

  console.log(buffers);
  console.log('parsing ' + buffers.length + ' buffers' );

  // split up the buffer information into coordinates, triangle indices, edge indices, normals, colors, etc.
  let nb_vao = 0;
  let ids = new Set();
  for (let i = 0; i < buffers.length; i++) {
    // avro will have tagged a buffer with the convention name-index where index is the index of the vao
    const tag = buffers[i].tag;
    const s = tag.split("-");
    idx = parseInt(s[1]);
    ids.add(idx);
  }
  nb_vao = ids.size;
  console.log('creating ' + nb_vao + ' meshes');

  this.vao = [];
  for (let i = 0; i < nb_vao; i++)
    this.vao.push( new VertexArrayObject() );

  for (let i = 0; i < buffers.length; i++) {

    const tag = buffers[i].tag;
    const s = tag.split("-");
    idx = parseInt(s[1]);

    const name = s[0];
    if (name == 'coordinates') {
      this.vao[idx].points = buffers[i];
      this.vao[idx].points.nb_indices = buffers[i].nb;
    }
    else if (name == 'edges') {
      const j = this.vao[idx].edges.length;
      this.vao[idx].edges.push(buffers[i]);
      this.vao[idx].edges[j].nb_indices = buffers[i].nb;

    }
    else if (name == 'triangles') {
      const j = this.vao[idx].triangles.length;
      this.vao[idx].triangles.push(buffers[i]);
      this.vao[idx].triangles[j].nb_indices = buffers[i].nb;
    }
    else {
      console.log('unknown primitive type');
    }
  }

  this.setup(webglpp);
  this.draw();
}

avroWebGL.prototype.setup = function(webglpp) {

  this.gl      = webglpp.gl;
  this.canvas  = webglpp.canvas;
  this.program = webglpp.program;
  this.textCanvas = webglpp.textCanvas;

  // save the uniform locations
  this.u_ModelMatrix       = this.gl.getUniformLocation(this.program,'u_ModelMatrix');
  this.u_ViewMatrix        = this.gl.getUniformLocation(this.program,'u_ViewMatrix');
  this.u_PerspectiveMatrix = this.gl.getUniformLocation(this.program,'u_PerspectiveMatrix');
  this.u_NormalMatrix      = this.gl.getUniformLocation(this.program,'u_NormalMatrix');

  this.program.u_edges = this.gl.getUniformLocation(this.program,'u_edges');
  this.program.u_alpha = this.gl.getUniformLocation(this.program,'u_alpha');
  this.program.u_field = this.gl.getUniformLocation(this.program,'u_field');
  this.program.u_color = this.gl.getUniformLocation(this.program,'u_color');

  // setup the callbacks for both canvases (webgl and text)
  this.dragging = false;
  this.rotating = false;
  let webgl = this;
  this.canvas.addEventListener( 'mousemove' ,  function(event) { mouseMove(event,webgl); } );
  this.canvas.addEventListener( 'mousedown' ,  function(event) { mouseDown(event,webgl); } );
  this.canvas.addEventListener( 'mouseup' ,    function(event) { mouseUp(event,webgl); } );
  this.canvas.addEventListener( 'mousewheel' , function(event) { mouseWheel(event,webgl);} );
  this.canvas.addEventListener( 'wheel' , function(event) { mouseWheel(event,webgl);} );
  this.textCanvas.addEventListener( 'mousemove' ,  function(event) { mouseMove(event,webgl); } );
  this.textCanvas.addEventListener( 'mousedown' ,  function(event) { mouseDown(event,webgl); } );
  this.textCanvas.addEventListener( 'mouseup' ,    function(event) { mouseUp(event,webgl); } );
  this.textCanvas.addEventListener( 'mousewheel' , function(event) { mouseWheel(event,webgl);} );
  this.textCanvas.addEventListener( 'wheel' , function(event) { mouseWheel(event,webgl);} );
  document.addEventListener('contextmenu' , event => event.preventDefault() );

  // setup the model, view (camera) and perspective matrices
  this.modelMatrix = mat4.create();

  this.eye    = vec3.fromValues(0,0,5);
  this.center = vec3.fromValues(0.5,0.5,0.0);
  this.viewMatrix = mat4.create();
  mat4.lookAt( this.viewMatrix, this.eye, this.center , vec3.fromValues(0,1,0) );

  this.perspectiveMatrix = mat4.create()
  mat4.perspective( this.perspectiveMatrix, Math.PI/4.0, this.canvas.width/this.canvas.height, 0.1, 1000.0 );

}

avroWebGL.prototype.draw = function() {

  // make life easier by dereferencing this.gl
  let gl = this.gl;
  gl.useProgram(this.program);

  // clear the canvas color
  gl.clearColor(1,1,1,1); // white background
  let textCanvas = document.getElementById('text');
  let ctx = textCanvas.getContext('2d');
  ctx.clearRect(0,0,textCanvas.width,textCanvas.height);
  ctx.font = '20px Arial';
  //gl.enable(this.gl.DEPTH_TEST);

  // set the camera and perspective matrices (which may have changed)
  gl.uniformMatrix4fv( this.u_ViewMatrix , false , this.viewMatrix );
  gl.uniformMatrix4fv( this.u_PerspectiveMatrix , false , this.perspectiveMatrix );

  gl.uniformMatrix4fv( this.u_ModelMatrix , false , this.modelMatrix );

  for (let i = 0; i < this.vao.length; i++)
    this.vao[i].draw( this.gl , this.program );
}


function VertexArrayObject() {
  this.triangles = [];
  this.edges     = [];
  this.points    = undefined;
  this.colors    = undefined;
  this.normals   = undefined;
}

VertexArrayObject.prototype.draw = function(gl,program) {
  // todo pass in different triangle/edge/point shaders

  gl.bindBuffer( gl.ARRAY_BUFFER , this.points );
  const a_Position = gl.getAttribLocation(program,'a_Position');
  gl.vertexAttribPointer( a_Position , 3 , gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // if normals, if colors, etc. enable those attributes as well
  // TODO

  // draw the triangles
  gl.uniform1i( program.u_edges , -1 );
  for (let i = 0; i < this.triangles.length; i++) {
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.triangles[i] );
    gl.drawElements( gl.TRIANGLES , this.triangles[i].nb_indices , gl.UNSIGNED_SHORT , 0 );
  }

  // draw the edges
  gl.uniform1i( program.u_edges , 1 );
  for (let i = 0; i < this.edges.length; i++) {
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.edges[i] );
    gl.drawElements( gl.LINES , this.edges[i].nb_indices , gl.UNSIGNED_SHORT , 0 );
  }
}

/*

if (this.vertexNumbers) {

  // transformation from world to screen
  let Mws = mat4.create();
  mat4.multiply( Mws , Mcs , mesh.modelMatrix );

  for (let j = 0; j < mesh.vertices.length/3; j++) {

    let p = vec4.fromValues( mesh.vertices[3*j] , mesh.vertices[3*j+1] , mesh.vertices[3*j+2] , 1 );
    let q = vec4.create();
    vec4.transformMat4( q , p , Mws );

    // divide by w-coordinate (needed because of perspective projection)
    q[0] /= q[3];
    q[1] /= q[3];
    ctx.fillText( j.toString() , q[0] , q[1] );
  }
}

if (this.triangleNumbers) {
  // transformation from world to screen
  let Mws = mat4.create();
  mat4.multiply( Mws , Mcs , mesh.modelMatrix );

  for (let j = 0; j < mesh.triangles.length/3; j++) {

    // compute centroid of triangle
    let c = vec4.create();
    for (let k = 0; k < 3; k++)
    for (let d = 0; d < 3; d++)
      c[d] += mesh.vertices[3*mesh.triangles[3*j+k]+d]/3.0;
    c[3] = 1.0; // homogeneous coordinates

    let q = vec4.create();
    vec4.transformMat4( q , c , Mws );

    // divide by w-coordinate (needed because of perspective projection)
    q[0] /= q[3];
    q[1] /= q[3];
    ctx.fillText( j.toString() , q[0] , q[1] );
  }
}

*/
