#include "webglpp.h"

#include <cstdlib>

#define ORDER 3

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

  // add a p = 2 field for triangles1-0 (vao 0, triangle patch 0)
  int order = ORDER;
  #if ORDER == 0
  std::vector<float> f = {0,1};
  #elif ORDER == 1
  std::vector<float> f = {
    0 , 0.5 , 1.0 , 0.5 , 1.0 , 0.0
  };
  #elif ORDER == 2
  std::vector<float> f = {
    0.0 , 0.0 , 0.0 , 0.5 , 0.5 , 0.5 , // t0
    1.0 , 1.0 , 1.0 , 0.5 , 0.5 , 0.5   // t1
  };
  #elif ORDER == 3

  std::vector<float> f = {

    0.0 , 0.1 , 0.2 , 0.3 , 0.4 , 0.5 , 0.6 , 0.7 , 0.8 , 0.9,
    0.5 , 0.3 , 0.2 , 0.1 , 0.8 , 0.7 , 0.6 , 0.9 , 0.2 , 0.0
  };

  #else
  #error "unsupported solution order"
  #endif

  int field_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , field_buffer );
  gl.bufferData( gl::ARRAY_BUFFER , f.data() , sizeof(float) * f.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "field_order=" + std::to_string(order) + "_tri0-0"); // field for triangle patch 0, vao 0

  // send it to the browser that has an actual WebGL context
  gl.send();

  return 0;
}
