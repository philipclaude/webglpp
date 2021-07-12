#include "websockets.h"

#include <cstdlib>

std::string
datastring( int n ) {
  std::string s = "\"data\": [";
  for (int i = 0; i < n; i++) {
    s += "0";
    if (i < n-1) s += ",";
  }
  s += "]";
  return s;
}

std::string
meshstring( int n ) {
  return std::string("{\"vertices\": [0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0] , \"triangles\": [0,1,2,0,2,3], ") + datastring(n) + std::string("}");
}

int
main( int argc , char** argv ) {

  websockets::Server server(atoi(argv[1]));

  server.add_message( meshstring(10) );
  server.add_message( meshstring(100) );
  server.add_message( meshstring(1e7) );

  server.write();

  return 0;
}
