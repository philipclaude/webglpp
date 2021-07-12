#ifndef WEBGLPP_WEBGLPP_H_
#define WEBGLPP_WEBGLPP_H_

#include "websockets.h"

#include <memory>
#include <vector>
#include <stdio.h>

// so you can do things like gl::ARRAY_BUFFER
namespace gl
{
  static const int ARRAY_BUFFER = 0;
  static const int ELEMENT_ARRAY_BUFFER = 1;
  static const int TEXTURE_BUFFER = 2;
  static const int STATIC_DRAW = 3;
  static const int FLOAT = 4;
}

class ElementBuffer;
class TextureBuffer;

class BufferObject {

public:

  template<typename T>
  void write( const T* data , int nbytes ) {
    data_.clear();
    bytes_per_elem_ = sizeof(T);
    printf("writing data with size %lu\n",bytes_per_elem_);
    char* x = (char*)data;
    int nelem = nbytes / bytes_per_elem_;
    printf("there are %lu elements\n",nelem);
    for (int i = 0; i < nbytes; i++) {
      data_ += x[i];
    }
    printf("%s with %d bytes\n",data_.c_str(),data_.size());
  }

  int nbytes() const { return data_.size(); }


private:
  int bytes_per_elem_;
  std::string data_;
};

class ArrayBuffer : public BufferObject {

};

class VertexArrayObject {

private:
  std::vector<BufferObject*> vbo_;
};

class WebGLpp : public websockets::Server {
public:
  WebGLpp( int port ) :
    websockets::Server(port)
  {}

  int createBuffer() {
    int idx = vbo_.size();
    vbo_.push_back( std::make_shared<BufferObject>() );
    return idx;
  }
  int createVertexArray();

  void bindBuffer( int type , int buffer ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_ = (ArrayBuffer*)vbo_[buffer].get();
    }
    else {
      printf("unimplemented buffer type\n");
    }
  }
  void bindTexture( int type , int texture );

  template<typename T>
  void bufferData( int type , const T* data , int nbytes ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_->write<T>(data,nbytes);
    }
    else {
      printf("unimplemented buffer type\n");
    }
  }

  void bindVertexArray( int vao );
  void vertexAttribPointer( int index , int stride , int type );

private:
  std::vector< std::shared_ptr<VertexArrayObject> >  vao_;
  std::vector< std::shared_ptr<BufferObject> > vbo_;

  VertexArrayObject* bound_vao_;
  ArrayBuffer*   bound_array_buffer_;
  ElementBuffer* bound_element_buffer_;
  TextureBuffer* bound_texture_buffer_;
};

#endif
