function compileShader(gl, shaderSource, type) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw "unable to compile " + (type === gl.VERTEX_SHADER ? 'vertex': 'fragment') + " shader: " + error;
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
    throw "unable to compile the shader program: " + gl.getProgramInfoLog(program);
  }
  gl.useProgram(program);
  return program;
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
  if (webgl.rotating) {
    let T0 = mat4.create();
    mat4.fromTranslation( T0 , webgl.center );
    let T1 = mat4.create();
    mat4.invert( T1 , T0 );
    let R = rotation( -(event.pageX-webgl.lastX)/webgl.canvas.width , (event.pageY-webgl.lastY)/webgl.canvas.height );

    mat4.multiply( T , R , T1 );
    mat4.multiply( T , T0 , T );
  }
  else {
    mat4.fromTranslation( T ,
      vec3.fromValues(  2*(event.pageX-webgl.lastX)/webgl.canvas.width ,
                       -2*(event.pageY-webgl.lastY)/webgl.canvas.height,
                       0.0 ) );

    // move the center as well
    vec3.transformMat4( webgl.center , webgl.center , T );
  }

//  for (let i = 0; i < webgl.meshes.length; i++)
//    mat4.multiply( webgl.meshes[i].modelMatrix , T , webgl.meshes[i].modelMatrix );
  mat4.multiply( webgl.modelMatrix , T , webgl.modelMatrix );

  // redraw and set the last state as the new one
  webgl.draw();
  webgl.lastX = event.pageX;
  webgl.lastY = event.pageY;
}

let mouseDown = function(event,webgl) {
  // set that dragging is true and save the last state
  webgl.dragging = true;

  // determine if we are translating or rotating
  //if (event.button == 2) webgl.rotating = true; // left button
  //else webgl.rotating = false; // middle or right buttons
  if (event.ctrlKey) webgl.rotating = true;
  else webgl.rotating = false;

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
