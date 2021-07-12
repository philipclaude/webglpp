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

  std::vector<double> coordinates( 10 * 3 , 1 );
  gl.bufferData( gl::ARRAY_BUFFER , coordinates.data() , sizeof(double)*coordinates.size() );

  //gl.write();

  return 0;
}
