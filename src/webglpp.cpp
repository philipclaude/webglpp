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

class ArrayBuffer;
class ElementBuffer;
class TextureBuffer;

class VertexArrayObject;
class BufferObject;

class WebGLpp : public websockets::Server {
public:
  WebGLpp( int port ) :
    websockets::Server(port)
  {}

  static const int ARRAY_BUFFER = 0;
  static const int ELEMENT_ARRAY_BUFFER = 1;
  static const int TEXTURE_BUFFER = 2;
  static const int STATIC_DRAW = 3;
  static const int FLOAT = 4;

  int createBuffer();
  int createVertexArray();

  void bindBuffer( int type , int buffer );
  void bindTexture( int type , int texture );
  void bufferData( int type , void* data );

  void bindVertexArray( int vao );
  void vertexAttribPointer( int index , int stride , int type );

private:
  std::vector<VertexArrayObject*>  vao_;
  std::vector<BufferObject*> vbo_;

  VertexArrayObject* bound_vao_;
  ArrayBuffer*   bound_array_buffer_;
  ElementBuffer* bound_element_buffer_;
  TextureBuffer* bound_texture_buffer_;
};

int
main( int argc , char** argv ) {

  WebGLpp gl(atoi(argv[1]));

  //int vertex_buffer = gl.createBuffer();
  //gl.bindBuffer( gl.ARRAY_BUFFER , vertex_buffer );


  gl.add_message( meshstring(10) );
  gl.add_message( meshstring(100) );
  gl.add_message( meshstring(1e7) );

  gl.write();

  return 0;
}
