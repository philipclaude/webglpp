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


function Visualizer(canvasID) {
  this.canvas     = document.getElementById(canvasID);
  this.textCanvas = document.getElementById('text');
  this.meshes = new Array();
  this.colormap = 'giraffe';
  this.vertexNumbers   = false;
  this.triangleNumbers = false;
  this.initGL();

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
}

Visualizer.prototype.initGL = function() {

  // initialize the webgl context
  this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
  this.gl.viewport(0,0,this.canvas.width, this.canvas.height);

// use the basic shaders with a uniform in the fragment shader that controls whether the color is black
vertexShaderSource = `
  attribute vec3 a_Position;
  attribute vec3 a_Color;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_PerspectiveMatrix;
  uniform mat4 u_NormalMatrix;

  uniform vec3  u_color;
  uniform int   u_field;

  varying vec3 v_Color;
  varying vec3 v_Normal;

  void main() {
    gl_Position = u_PerspectiveMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position,1.0);

    if (u_field < 0)
      v_Color = u_color;
    else
      v_Color = a_Color;

    v_Normal = mat3(u_NormalMatrix)*a_Normal;
  }`;
fragmentShaderSource = `
  precision highp float;
  uniform int   u_edges;
  uniform float u_alpha;

  varying vec3 v_Color;

  void main() {

    if (u_edges < 0) {
      gl_FragColor = vec4(v_Color,u_alpha);
    }
    else {
      gl_FragColor = vec4(0,0,0,1);
    }
  }`;

  // create the shader program and save the attribute locations
  this.program = compileProgram( this.gl , vertexShaderSource , fragmentShaderSource );
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

  // setup the view (camera) and perspective matrices
  this.eye    = vec3.fromValues(0,0,-2);
  this.center = vec3.create();
  this.viewMatrix = mat4.create();
  mat4.lookAt( this.viewMatrix, this.eye, this.center , vec3.fromValues(0,1,0) );

  this.perspectiveMatrix = mat4.create()
  mat4.perspective( this.perspectiveMatrix, Math.PI/4.0, this.canvas.width/this.canvas.height, 0.1, 1000.0 );
}

let setupBuffers = function( gl , mesh , colormap ) {

  // check if this mesh has a field we want to draw
  if (mesh.fields != undefined) {
    mesh.fields[mesh.fields.active].computeColors(colormap,mesh);
    mesh.colors = mesh.fields[mesh.fields.active].colors;
  }

  // create vertex position buffer
  mesh.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.drawVertices || mesh.vertices), gl.STATIC_DRAW);

  // create triangle index buffer
  mesh.triangleBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , mesh.triangleBuffer );
  gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(mesh.drawTriangles || mesh.triangles) , gl.STATIC_DRAW );

  // create the edge index buffer
  mesh.edgeBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , mesh.edgeBuffer );
  gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(mesh.drawEdges || mesh.edges) , gl.STATIC_DRAW );

  // create vertex normal buffer
  if (mesh.normals != undefined) {
    mesh.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
  }

  // create the vertex color buffer
  if (mesh.colors != undefined) {
    mesh.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.colors) , gl.STATIC_DRAW );
  }

  if (mesh.drawTriangles != undefined)
    mesh.nb_draw_triangles = mesh.drawTriangles.length,
    mesh.nb_draw_edges = mesh.drawEdges.length;
  else
    mesh.nb_draw_triangles = mesh.triangles.length,
    mesh.nb_draw_edges = mesh.edges.length;
}

Visualizer.prototype.addMesh = function(mesh,twod,scale = true,flipy = false) {

  // extract the edges from the mesh
  // precompute the edges
  let edges = new Array();
  let edgeMap = {};

  for (let i = 0; i < mesh.triangles.length/3; i++) {

    for (let j = 0; j < 3; j++) {
      let p    = mesh.triangles[3*i +j      ];
      let q    = mesh.triangles[3*i +(j+1)%3];
      let edge = [ Math.min(p,q) , Math.max(p,q) ];
      let key  = JSON.stringify(edge);

      if (!(key in edgeMap)) {
        edgeMap[key] = edges.length/2;
        edges.push(p);
        edges.push(q);
      }
    }
  }
  mesh.edges = edges;

  if (twod) {
    // convert the vertices to 3d by appending a z-coordinate of 0
    let vertices = new Array();
    for (let i = 0; i < mesh.vertices.length/2; i++)
      vertices.push( mesh.vertices[2*i], mesh.vertices[2*i+1], 0.0 );
    mesh.vertices = vertices;
  }

  // compute the bounding box
  const nb_vertices = mesh.vertices.length/3;
  let xmin = [1e20,1e20,1e20];
  let xmax = [-1e20,-1e20,-1e20];
  let center = [0,0,0];
  for (let i = 0; i < nb_vertices; i++) {
    for (let d = 0; d < 3; d++) {
      const xd = mesh.vertices[3*i+d];
      if (xd < xmin[d]) xmin[d] = xd;
      if (xd > xmax[d]) xmax[d] = xd;
      center[d] += xd;
    }
  }

  // avoid division by zero if the mesh in in 2d
  if (twod) xmin[2] = -0.5, xmax[2] = 0.5;

  for (let d = 0; d < 3; d++)
    center[d] /= nb_vertices;

  if (scale) {

    // scale to be within [-0.5,0.5]^3
    let vertices = new Array( 3*nb_vertices );
    let sign = [1,1,1];
    if (flipy) sign[1] = -1;
    for (let i = 0; i < nb_vertices; i++) {
      for (let d = 0; d < 3; d++)
        mesh.vertices[3*i+d] = sign[d]*(mesh.vertices[3*i+d] - center[d]) / (xmax[d] - xmin[d]);
    }

    xmin = [-0.5,-0.5,-0.5];
    xmax = [ 0.5, 0.5, 0.5];
  }

  // save the bounding box
  mesh.box = { 'min': xmin , 'max': xmax };

  setupBuffers(this.gl,mesh,this.colormap);
  if (mesh.colors != undefined) this.gl.enableVertexAttribArray(this.a_Color);

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

// computes a rotation matrix of a vector (X,Y) on the unit sphere using quaternions
function rotation(X, Y) {
  let X2 = X*X, Y2 = Y*Y,
    q  = 1 + X2 + Y2,
    s  = 1 - X2 - Y2,
    r2 = 1/(q*q), s2 = s*s,
    A = (s2 + 4*(Y2 - X2))*r2,
    B = -8*X*Y*r2,
    C = 4*s*X*r2,
    D = (s2 + 4*(X2 - Y2))*r2,
    E = 4*s*Y*r2,
    F = (s2 - 4*(X2 + Y2))*r2;
  return mat4.fromValues(
    A, B, C, 0,
    B, D, E, 0,
    -C,-E, F, 0,
    0, 0, 0, 1
  );
}

let mouseMove = function(event,webgl) {

  if (!webgl.dragging) return;
  event.preventDefault();
  event = event || window.event;

  // compute the rotatation matrix from the last point on the sphere to the new point
  let T = mat4.create();
  if (webgl.rotating)
    T = rotation( -(event.pageX-webgl.lastX)/webgl.canvas.width , -(event.pageY-webgl.lastY)/webgl.canvas.height );
  else
    mat4.fromTranslation( T ,
      vec3.fromValues( -(event.pageX-webgl.lastX)/webgl.canvas.width ,
                       -(event.pageY-webgl.lastY)/webgl.canvas.height,
                       0.0 ) );

  for (let i = 0; i < webgl.meshes.length; i++)
    mat4.multiply( webgl.meshes[i].modelMatrix , T , webgl.meshes[i].modelMatrix );

  // redraw and set the last state as the new one
  webgl.draw();
  webgl.lastX = event.pageX;
  webgl.lastY = event.pageY;
}

let mouseDown = function(event,webgl) {
  // set that dragging is true and save the last state
  webgl.dragging = true;

  // determine if we are translating or rotating
  if (event.button == 2) webgl.rotating = true; // left button
  else webgl.rotating = false; // middle or right buttons

  webgl.lastX    = event.pageX;
  webgl.lastY    = event.pageY;
}

let mouseUp = function(event,webgl) {
  // dragging is now false
  webgl.dragging = false;
}

let mouseWheel = function(event,webgl) {
  event.preventDefault();

  let scale = 1.0;
  if (event.deltaY > 0) scale = 0.9;
  else if (event.deltaY < 0) scale = 1.1;

  // scale the direction from the model center to the eye
  let direction = vec3.create();
  vec3.subtract( direction , webgl.eye , webgl.center );
  vec3.scaleAndAdd( webgl.eye , webgl.center , direction , scale );

  mat4.lookAt( webgl.viewMatrix , webgl.eye , webgl.center , vec3.fromValues(0,1,0) );
  webgl.draw();
}
