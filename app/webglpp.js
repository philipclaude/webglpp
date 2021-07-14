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

      console.log(evt.data);

      let message = JSON.parse(evt.data);
      let buffers = message['buffers'];

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
    buffer.type = gl.FLOAT;
  }
  else if (type == "Uint16Array") {
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(data) , gl.STATIC_DRAW );
    buffer.type = gl.UNSIGNED_SHORT;
  }
  else if (type == "Uint32Array") {
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint32Array(data) , gl.STATIC_DRAW );
    buffer.type = gl.UNSIGNED_INT
  }
  else {
    console.log('unknown buffer type' + type);
    return;
  }

  buffer.nb  = data.length;
  buffer.tag = tag;
  this.buffers.push(buffer);
  buffer.data = data;
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
  let gl = this.gl;
  let buffers = webglpp.buffers;

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

  let have_fields = false;
  for (let i = 0; i < buffers.length; i++) {

    const tag = buffers[i].tag;
    const s = tag.split("-");
    idx = parseInt(s[1]);

    const name = s[0];
    if (name.indexOf('coordinates') !== -1) {
      this.vao[idx].points = buffers[i];
      this.vao[idx].points.nb_indices = buffers[i].nb;
    }
    else if (name.indexOf('edges') !== -1) {
      const j = this.vao[idx].edges.length;
      this.vao[idx].edges.push(buffers[i]);
      this.vao[idx].edges[j].nb_indices = buffers[i].nb;

    }
    else if (name.indexOf('triangles') !== -1) {
      const j = this.vao[idx].triangles.length;
      this.vao[idx].triangles.push(buffers[i]);
      this.vao[idx].triangles[j].nb_indices = buffers[i].nb;
      this.vao[idx].triangles[j].field = undefined; // fields should be added after triangles
    }
    else if (name.indexOf('scalar') !== -1) {
      // creating scalar attribute
      this.vao[idx].scalar = buffers[i];
    }
    else if (name.indexOf('field') !== -1) {

      // we have some fields to plot: hope that the coordinates are duplicated
      // TODO (way to check this?)
      have_fields = true;

      // determine which triangles these are for
      let idx_tri = name.indexOf('tri');
      const j = parseInt(name[idx_tri+3]);
      let idx_order = name.indexOf('order=');
      let order = parseInt(name[idx_order+6]);

      console.log('creating texture for vao index ' + idx + ' triangles ' + j, 'order = ',order);

      const max_texture_size = this.gl.getParameter( this.gl.MAX_TEXTURE_SIZE );
      console.log('max texture dimension = ',max_texture_size,'requesting',buffers[i].data.length);

      // determine an appropriate texture size
      let data = buffers[i].data;

      // first find the next power of 2 greater than data.length
      let n = 1;
      while (n < data.length) {
        n *= 2;
      }

      // pad data with zeros
      const N = data.length;
      for (let i = N; i < n; i++)
        data.push(0.0);

      // now determine an appropriate width and height
      let w = data.length;
      let h = 1;
      while (w > max_texture_size) {
        w = w/2;
        h = h*2;
      }
      console.log('using a width of',w,'and a height of',h);

      // create a texture to hold the data
      let texture = this.gl.createTexture();
      this.gl.bindTexture( this.gl.TEXTURE_2D , texture );

      texture.width  = w;
      texture.height = h;

      const level = 0;
      const internalFormat = gl.R32F;
      const width = w;
      const height = h;
      const border = 0;
      const type = gl.FLOAT;
      const alignment = 1;

      gl.pixelStorei( gl.UNPACK_ALIGNMENT , alignment );
      gl.texImage2D( gl.TEXTURE_2D , level , internalFormat , width , height , border , gl.RED , type , new Float32Array(data) );

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      texture.order = order;
      texture.nb_basis = (order+1)*(order+2)/2;
      this.vao[idx].triangles[j].field = texture;
    }
    else {
      console.log('unknown primitive type');
    }
  }

  // if we have some fields, we need to set up a vertex attribute for each triangle number
  if (have_fields) {

    // loop through the triangles of each vao
    for (let i = 0; i < this.vao.length; i++) {
      let vertex_numbers = [];
      let parameters = [];
      for (let j = 0; j < this.vao[i].triangles.length; j++) {
        for (let k = 0; k < this.vao[i].triangles[j].nb_indices/3; k++) {
          for (let d = 0; d < 3; d++)
            vertex_numbers.push(k);

          // it would be convenient if we had geometry shaders so this doesn't need to be uploaded to the GPU!
          parameters.push(0.0); parameters.push(0.0);
          parameters.push(1.0); parameters.push(0.0);
          parameters.push(0.0); parameters.push(1.0);
        }
      }
      console.assert( parameters.length/2 == this.vao[i].points.nb_indices/3 );

      this.vao[i].numbers = this.gl.createBuffer();
      this.gl.bindBuffer( this.gl.ARRAY_BUFFER , this.vao[i].numbers );
      this.gl.bufferData( this.gl.ARRAY_BUFFER , new Float32Array(vertex_numbers) , this.gl.STATIC_DRAW );

      this.vao[i].parameters = this.gl.createBuffer();
      this.gl.bindBuffer( this.gl.ARRAY_BUFFER , this.vao[i].parameters );
      this.gl.bufferData( this.gl.ARRAY_BUFFER , new Float32Array(parameters) , this.gl.STATIC_DRAW );

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

  // initialize the texture for the colormap
  let gl = this.gl;
  let texture = this.gl.createTexture();
  this.gl.bindTexture( this.gl.TEXTURE_2D , texture );

  const data = new Float32Array(colormap['bwr']);
  const level = 0;
  const internalFormat = gl.RGB32F;
  const width = data.length/3;
  const height = 1;
  const border = 0;
  const type = gl.FLOAT;
  const alignment = 1;

  gl.pixelStorei( gl.UNPACK_ALIGNMENT , alignment );
  gl.texImage2D( gl.TEXTURE_2D , level , internalFormat , width , height , border , gl.RGB , type , data );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  this.colormap_texture = texture;
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
  gl.enable(this.gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(2, 3);

  // set the camera and perspective matrices (which may have changed)
  gl.uniformMatrix4fv( this.u_ViewMatrix , false , this.viewMatrix );
  gl.uniformMatrix4fv( this.u_PerspectiveMatrix , false , this.perspectiveMatrix );
  gl.uniformMatrix4fv( this.u_ModelMatrix , false , this.modelMatrix );

  // activate the texture and set the uniform
  gl.activeTexture( gl.TEXTURE0 + 0 );
  gl.bindTexture( gl.TEXTURE_2D , this.colormap_texture );
  gl.uniform1i(gl.getUniformLocation(this.program, 'u_colormap'),0);

  for (let i = 0; i < this.vao.length; i++) {

    // activate the appropriate texture if there are any fields associated with a particular patch of triangles
    this.vao[i].draw( this.gl , this.program );
  }
}


function VertexArrayObject() {
  this.triangles  = [];
  this.edges      = [];
  this.points     = undefined;
  this.colors     = undefined;
  this.normals    = undefined;
  this.scalar     = undefined; // scalar attribute
  this.numbers    = undefined;
  this.parameters = undefined;
}

VertexArrayObject.prototype.draw = function(gl,program) {

  // todo pass in different triangle/edge/point shaders
  gl.bindBuffer( gl.ARRAY_BUFFER , this.points );
  const a_Position = gl.getAttribLocation(program,'a_Position');
  gl.vertexAttribPointer( a_Position , 3 , gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  if (this.parameters != undefined) {
    gl.bindBuffer( gl.ARRAY_BUFFER , this.parameters );
    const a_Param = gl.getAttribLocation(program,'a_Param');
    gl.vertexAttribPointer( a_Param , 2 , gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Param);
  }

  // option to enable scalar attribute
  if (this.scalar != undefined) {
    gl.bindBuffer( gl.ARRAY_BUFFER , this.scalar );
    const a_Scalar = gl.getAttribLocation(program,'a_Scalar');
    gl.vertexAttribPointer( a_Scalar , 1 , gl.FLOAT , false , 0 , 0 );
    gl.enableVertexAttribArray(a_Scalar);
  }

  // option to enable triangle numbers (needed to determine which triangle each fragment is in)
  // I really wish GLSL 300 would give gl_PrimitiveID
  // In any case, the interpolation of v_Number is turned off (via 'flat' specifier) so the
  // triangle number we obtain is exact (floats that represent integers should be represented exactly)
  if (this.numbers != undefined) {
    gl.bindBuffer( gl.ARRAY_BUFFER , this.numbers );
    const a_Number = gl.getAttribLocation(program,'a_Number');
    gl.vertexAttribPointer( a_Number , 1 , gl.FLOAT , false , 0 , 0 );
    gl.enableVertexAttribArray(a_Number);
  }

  // draw the triangles
  gl.uniform1i( program.u_edges , -1 );
  for (let i = 0; i < this.triangles.length; i++) {

    gl.uniform1i(gl.getUniformLocation(program,'u_nb_basis'),-1 );
    if (this.triangles[i].field != undefined) {
      // activate the texture and set the uniform
      gl.activeTexture( gl.TEXTURE1 ); // field always in texture unit 1
      gl.bindTexture( gl.TEXTURE_2D , this.triangles[i].field );
      gl.uniform1i(gl.getUniformLocation(program, 'u_field'),1);

      // tell the shader the width and height of this texture
      const w = this.triangles[i].field.width;
      const h = this.triangles[i].field.height;

      gl.uniform1i( gl.getUniformLocation(program,'u_twidth'),w);
      gl.uniform1i( gl.getUniformLocation(program,'u_theight'),h);

      // tell the shader how many basis functions there are for the field
      gl.uniform1i(gl.getUniformLocation(program,'u_nb_basis'),this.triangles[i].field.nb_basis );
    }

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.triangles[i] );
    gl.drawElements( gl.TRIANGLES , this.triangles[i].nb_indices , this.triangles[i].type , 0 );
  }

  // draw the edges
  gl.uniform1i( program.u_edges , 1 );
  for (let i = 0; i < this.edges.length; i++) {
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.edges[i] );
    gl.drawElements( gl.LINES , this.edges[i].nb_indices , this.edges[i].type , 0 );
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
