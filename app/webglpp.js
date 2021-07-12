function compileShader(gl, shaderSource, type) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw "Unable to compile " + (type === gl.VERTEX_SHADER ? 'vertex': 'fragment') + " shader: " + error;
  }
  return shader;
}

function compileProgram( gl , vertexShaderSource , fragmentShaderSource ) {

  let vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw "Unable to compile the shader program: " + gl.getProgramInfoLog(program);
  }
  gl.useProgram(program);
  return program;
}

function WebGLpp( url , canvasID , vertexShaderSource , fragmentShaderSource ) {

  this.canvas     = document.getElementById(canvasID);
  this.textCanvas = document.getElementById('text');
  this.meshes = new Array();
  this.colormap = 'giraffe';
  this.vertexNumbers   = false;
  this.triangleNumbers = false;
  this.initGL(vertexShaderSource,fragmentShaderSource);

  // setup the callbacks for both canvases (webgl and text)
  this.dragging = false;
  let webgl = this;
  this.canvas.addEventListener( 'mousemove' ,  function(event) { mouseMove(event,webgl); } );
  this.canvas.addEventListener( 'mousedown' ,  function(event) { mouseDown(event,webgl); } );
  this.canvas.addEventListener( 'mouseup' ,    function(event) { mouseUp(event,webgl); } );
  this.canvas.addEventListener( 'mousewheel' , function(event) { mouseWheel(event,webgl);} );
  this.textCanvas.addEventListener( 'mousemove' ,  function(event) { mouseMove(event,webgl); } );
  this.textCanvas.addEventListener( 'mousedown' ,  function(event) { mouseDown(event,webgl); } );
  this.textCanvas.addEventListener( 'mouseup' ,    function(event) { mouseUp(event,webgl); } );
  this.textCanvas.addEventListener( 'mousewheel' , function(event) { mouseWheel(event,webgl);} );
  document.addEventListener('contextmenu' , event => event.preventDefault() );

  this.buffers = {};
}

WebGLpp.prototype.connect = function(addr) {

  let websocket = window['MozWebSocket'] ? window['MozWebSocket'] : window['WebSocket'];

  let ws = new websocket(addr);
  ws.onopen  = function(evt) { console.log('connection opened'); }
  ws.onclose = function(evt) { console.log('connection closed'); }
  ws.onmessage = function(evt) {

    let message = JSON.parse(evt.data);
    let buffers = message['buffers'];
    console.log(buffers);

    console.log('unpacking ' + buffers.length + 'buffers' );
    for (let i = 0; i < buffers.length; i++) {

      let buffer = buffers[i];
      let data = buffer['data'];
      let targ = buffer['target'];
      let type = buffer['type'];
      let tag  = buffer['tag'];
      let indx = buffer['index'];

      this.addBuffer(data,targ,type,tag,indx);
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
    gl.bindBuffer( gl.ARRAY_BUFFER , 0 );
  }
  else if (type == "Uint16Array") {
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(data) , gl.STATIC_DRAW );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , 0 );
  }
  else {
    console.log('unknown buffer type' + type);
    return;
  }

  this.buffers[buffer] = { 'tag': tag };
}

WebGLpp.prototype.initGL = function(vertexShaderSource,fragmentShaderSource) {

  // initialize the webgl context
  this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('experimental-webgl');
  this.gl.viewport(0,0,this.canvas.width, this.canvas.height);

  // create the shader program and save the attribute locations
  this.program = compileProgram( this.gl , vertexShaderSource , fragmentShaderSource );
}


function avroWebGL(webglpp) {

  this.gl     = webglpp.gl;
  this.canvas = webglpp.canvas;

  this.parseBuffers(webglpp.buffers);

  // setup the view (camera) and perspective matrices
  this.eye    = vec3.fromValues(0,0,-2);
  this.center = vec3.create();
  this.viewMatrix = mat4.create();
  mat4.lookAt( this.viewMatrix, this.eye, this.center , vec3.fromValues(0,1,0) );

  this.perspectiveMatrix = mat4.create()
  mat4.perspective( this.perspectiveMatrix, Math.PI/4.0, this.canvas.width/this.canvas.height, 0.1, 1000.0 );
}

avroWebGL.prototype.parseBuffers = function(buffers) {

  console.log('parsing ' + buffers.length + ' buffers' );

  // split up the buffer information into coordinates, triangle indices, edge indices, normals, colors, etc.
  let nb_vao = 0;
  for (let i = 0; i < buffers.length; i++) {

    // avro will have tagged a buffer with the convention name-index where index is the index of the vao
    const tag = buffers[i].tag;
    const s = tag.split("-");
    idx = Uint16(s[1]);
    if (idx > nb_vao) nb_vao = idx;
  }
  console.log('creating ' + nb_vao + 'meshes');

}

avroWebGL.prototype.setup = function( gl , mesh , colormap ) {

  this.a_Position = this.gl.getAttribLocation(this.program,'a_Position');
  this.a_Color    = this.gl.getAttribLocation(this.program,'a_Color');
  this.a_Normal   = this.gl.getAttribLocation(this.program,'a_Normal');
  this.gl.enableVertexAttribArray(this.a_Position);

  // save the uniform locations
  this.u_ModelMatrix       = this.gl.getUniformLocation(this.program,'u_ModelMatrix');
  this.u_ViewMatrix        = this.gl.getUniformLocation(this.program,'u_ViewMatrix');
  this.u_PerspectiveMatrix = this.gl.getUniformLocation(this.program,'u_PerspectiveMatrix');
  this.u_NormalMatrix      = this.gl.getUniformLocation(this.program,'u_NormalMatrix');
  this.u_edges = this.gl.getUniformLocation(this.program,'u_edges');
  this.u_alpha = this.gl.getUniformLocation(this.program,'u_alpha');
  this.u_field = this.gl.getUniformLocation(this.program,'u_field');
  this.u_color = this.gl.getUniformLocation(this.program,'u_color');
}

/*
Visualizer.prototype.addMesh = function(mesh,twod,scale = true,flipy = false) {

  setupBuffers(this.gl,mesh,this.colormap);

  mesh.alpha = 1.0;
  mesh.modelMatrix = mat4.create();
  this.meshes.push(mesh);
}

Visualizer.prototype.draw = function() {

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

  // compute the transformation matrix from camera -> screen
  const w = textCanvas.width;
  const h = textCanvas.height;

  let Mcs = mat4.fromValues(
      w/2 , 0 , 0 , 0 ,  // first column
      0 , -h/2 , 0 , 0 , // second column
      0 , 0 , 1 , 0 ,    // third column
      w/2 , h/2 , 0 , 1  // fourth column
  );
  mat4.multiply( Mcs , Mcs , this.perspectiveMatrix );
  mat4.multiply( Mcs , Mcs , this.viewMatrix );

  for (let i = 0; i < this.meshes.length; i++) {

    const mesh = this.meshes[i];

    gl.uniform1f( this.u_alpha , mesh.alpha );
    gl.uniformMatrix4fv( this.u_ModelMatrix , false , mesh.modelMatrix );

    // bind the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(this.a_Position, 3 , gl.FLOAT, false, 0, 0);

    // bind the normal buffer
    if (mesh.normals != undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
      gl.vertexAttribPointer(this.a_Normal, 3 , gl.FLOAT, false, 0, 0);
    }

    // enable the color attribute of this mesh (if needed)
    if (mesh.colors != undefined) {
      gl.bindBuffer( gl.ARRAY_BUFFER , mesh.colorBuffer );
      gl.vertexAttribPointer(this.a_Color, 3 , gl.FLOAT , false, 0, 0);
    }

    // draw the triangles in the model
    if (mesh.fields != undefined && mesh.fields.active != undefined)
      gl.uniform1i( this.u_field , 1 );
    else
      gl.uniform1i(this.u_field,-1);
    gl.uniform3fv( this.u_color , vec3.fromValues(0.5,0.5,0.5) );
    gl.uniform1i( this.u_edges , -1 );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , mesh.triangleBuffer );
    gl.drawElements( gl.TRIANGLES , mesh.nb_draw_triangles , gl.UNSIGNED_SHORT , 0 );

    // draw the edges
    gl.uniform1i( this.u_edges , 1 );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , mesh.edgeBuffer );
    gl.drawElements( gl.LINES , mesh.nb_draw_edges , gl.UNSIGNED_SHORT , 0 );


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

  }
}
*/
