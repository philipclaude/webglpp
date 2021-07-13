#include "webglpp.h"

#include <cstdlib>

int
main( int argc , char** argv ) {

  int port;
  if (argc < 2) port = 7681;
  else port = atoi(argv[1]);
  WebGLpp gl(port);

  int vertex_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , vertex_buffer);

  // the coordinates need to be duplicated for field plotting since we need
  // to know which triangle each vertex belongs to in the fragment shader,
  // and we also need to set parametric coordinates for the vertices for the basis evaluation
  // (this is done automatically on the client side for every vao if fields are detected)
  std::vector<float> coordinates = {
    0.0,0.0,0.0, // 0 = t0_0
    1.0,0.0,0.0, // 1 = t0_1
    1.0,1.0,0.0, // 2 = t0_2
    0.0,0.0,0.0, // 3 = t1_0
    1.0,1.0,0.0, // 4 = t1_1
    0.0,1.0,0.0  // 5 = t1_2
  };
  gl.bufferData( gl::ARRAY_BUFFER , coordinates.data() , sizeof(float)*coordinates.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "coordinates-0" );

  std::vector<unsigned short> triangles = { 0,1,2 , 3,4,5 };
  int triangle_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ELEMENT_ARRAY_BUFFER , triangle_buffer );
  gl.bufferData( gl::ELEMENT_ARRAY_BUFFER , triangles.data() , sizeof(unsigned short)*triangles.size() );
  gl.tagBuffer( gl::ELEMENT_ARRAY_BUFFER , "triangles0-0" );

  std::vector<unsigned short> edges = { 0,1 , 0,2 , 1,2 , 3,5 , 4,5 };
  int edge_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ELEMENT_ARRAY_BUFFER , edge_buffer );
  gl.bufferData( gl::ELEMENT_ARRAY_BUFFER , edges.data() , sizeof(unsigned short)*edges.size() );
  gl.tagBuffer( gl::ELEMENT_ARRAY_BUFFER , "edges-0" );

  #if 0
  // add a scalar attribute to coordinates 0 (size = number of vertices)
  std::vector<float> u = {0.5 , 0.5 , 0.5, 0.8 , 0.8 , 0.8 };
  int scalar_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , scalar_buffer );
  gl.bufferData( gl::ARRAY_BUFFER , u.data() , sizeof(float) * u.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "scalar-0" );
  #endif

  // add a p = 2 field for triangles1-0 (vao 0, triangle patch 0)
  #if 1
  std::vector<float> f = {
    0.0 , 0.0 , 0.0 , 0.5 , 0.5 , 0.5 , // t0
    1.0 , 1.0 , 1.0 , 0.5 , 0.5 , 0.5   // t1
  };

  int field_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , field_buffer );
  gl.bufferData( gl::ARRAY_BUFFER , f.data() , sizeof(float) * f.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "field_order=2_tri0-0"); // field, p = 2, for triangle patch 0, vao 0
  #else
  std::vector<float> f = {
    0.0 , 1.0 , 0.0 , 0.0 , 0.5 , 1.0
  };

  int field_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , field_buffer );
  gl.bufferData( gl::ARRAY_BUFFER , f.data() , sizeof(float) * f.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "field_order=1_tri0-0"); // field, p = 2, for triangle patch 0, vao 0
  #endif

  // send it to the browser that has an actual WebGL context
  gl.send();

  return 0;
}
