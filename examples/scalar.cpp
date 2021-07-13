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

  std::vector<float> coordinates = {
    0.0,0.0,0.0,
    1.0,0.0,0.0,
    1.0,1.0,0.0,
    0.0,1.0,0.0
  };
  gl.bufferData( gl::ARRAY_BUFFER , coordinates.data() , sizeof(float)*coordinates.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "coordinates-0" );

  std::vector<unsigned short> triangles = { 0,1,2 , 0,2,3 };
  int triangle_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ELEMENT_ARRAY_BUFFER , triangle_buffer );
  gl.bufferData( gl::ELEMENT_ARRAY_BUFFER , triangles.data() , sizeof(unsigned short)*triangles.size() );
  gl.tagBuffer( gl::ELEMENT_ARRAY_BUFFER , "triangles1-0" );

  std::vector<unsigned short> edges = { 0,1 , 0,2 , 1,2 , 2,3 , 3,0 };
  int edge_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ELEMENT_ARRAY_BUFFER , edge_buffer );
  gl.bufferData( gl::ELEMENT_ARRAY_BUFFER , edges.data() , sizeof(unsigned short)*edges.size() );
  gl.tagBuffer( gl::ELEMENT_ARRAY_BUFFER , "edges-0" );

  // we could even create another set of edges for the same mesh (same tag) which gets added as a separate primitive
  #if 0
  std::vector<unsigned short> edges2 = { 1,3 };
  int edge_buffer2 = gl.createBuffer();
  gl.bindBuffer( gl::ELEMENT_ARRAY_BUFFER , edge_buffer2 );
  gl.bufferData( gl::ELEMENT_ARRAY_BUFFER , edges2.data() , sizeof(unsigned short)*edges2.size() );
  gl.tagBuffer( gl::ELEMENT_ARRAY_BUFFER , "edges-0" );
  #endif

  // add a scalar attribute to coordinates 0 (size = number of vertices)
  std::vector<float> u = {0.4 , 0.9 , 0.3 , 0.1};
  int field_buffer = gl.createBuffer();
  gl.bindBuffer( gl::ARRAY_BUFFER , field_buffer );
  gl.bufferData( gl::ARRAY_BUFFER , u.data() , sizeof(float) * u.size() );
  gl.tagBuffer( gl::ARRAY_BUFFER , "scalar-0" );

  // send it to the browser that has an actual WebGL context
  gl.send();

  return 0;
}
