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

  std::vector<float> coordinates( 10 * 3 , 1 );
  for (int i = 0; i < coordinates.size(); i++)
    coordinates[i] = float(i)/coordinates.size();
  gl.bufferData( gl::ARRAY_BUFFER , coordinates.data() , sizeof(float)*coordinates.size() );

  gl.tagBuffer( gl::ARRAY_BUFFER , "coordinates" );

  // send it to the browser that has an actual WebGL context
  gl.send();

  return 0;
}
