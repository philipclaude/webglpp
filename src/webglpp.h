#ifndef WEBGLPP_WEBGLPP_H_
#define WEBGLPP_WEBGLPP_H_

#include "websockets.h"

#include <bitset>

#include <memory>
#include <vector>
#include <stdio.h>
#include <cassert>

#include <iostream>

// so you can do things like gl::ARRAY_BUFFER
namespace gl
{
  static const int ARRAY_BUFFER = 0;
  static const int ELEMENT_ARRAY_BUFFER = 1;
  static const int TEXTURE_BUFFER = 2;
  static const int STATIC_DRAW = 3;
}

#define ERROR(msg) printf("%s (line %d of file %s\n",msg,__LINE__,__FILE__);

class BufferObject {

public:

  template<typename T>
  void write( const T* data , int nbytes ) {
    bytes_per_elem_ = sizeof(T);
    bytes_.resize(nbytes);
    const char* x = (const char*)data;
    for (int i = 0; i < nbytes; i++) {
      bytes_[i] = x[i];
    }

    // assign the type
    type_ = typeid(T).name();
  }

  int nbytes() const { return bytes_.size(); }

  template<typename T>
  void get( std::vector<T>& data ) const {
    int nelem = bytes_.size() / bytes_per_elem_;
    data.resize(nelem);
    printf("nbytes per elem = %d, nelem = %d\n",bytes_per_elem_,nelem);
    for (int i = 0; i < nelem; i++) {
      data[i] = *reinterpret_cast<const T*>(&bytes_[i*bytes_per_elem_]);
    }
  }

  void set_tag( const std::string& name ) {
    tag_ = name;
  }

  void set_target( int target ) {
    target_ = target;
  }

  std::vector<float> Float32Array() const {
    assert( type_ == typeid(float).name() );
    std::vector<float> data;
    get(data);
    return data;
  }

  std::vector<unsigned short> Uint16Array() const {
    assert( type_ == typeid(unsigned short).name() );
    std::vector<unsigned short> data;
    get(data);
    return data;
  }

  std::vector<unsigned int> Uint32Array() const {
    assert( type_ == typeid(unsigned int).name() );
    std::vector<unsigned int> data;
    get(data);
    return data;
  }

  const std::string& type() const { return type_; }
  const std::string& tag() const { return tag_; }
  int target() const { return target_; }

private:
  int bytes_per_elem_;
  std::vector<unsigned char> bytes_;
  std::string tag_;
  std::string type_;
  int target_;
};


class WebGLpp : public websockets::Server {
public:
  WebGLpp( int port ) :
    websockets::Server(port)
  {}

  int createBuffer() {
    int idx = buffers_.size();
    buffers_.push_back( std::make_shared<BufferObject>() );
    return idx;
  }
  int createVertexArray();

  void bindBuffer( int type , int buffer ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_ = buffers_[buffer].get();
    }
    else if (type == gl::ELEMENT_ARRAY_BUFFER) {
      bound_element_buffer_ = buffers_[buffer].get();
    }
    else {
      ERROR("unimplemented buffer type");
    }
  }
  void bindTexture( int type , int texture );

  template<typename T>
  void bufferData( int type , const T* data , int nbytes ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_->write<T>(data,nbytes);
    }
    else if (type == gl::ELEMENT_ARRAY_BUFFER) {
      bound_element_buffer_->write<T>(data,nbytes);
    }
    else {
      ERROR("unimplemented buffer type");
    }
  }

  // this is not in the WebGL spec, but is needed so users can know which buffers they want to use to draw stuff in the browser
  // it operates within the same model as GL - you need to bind a buffer in order to tag it
  void tagBuffer( int type , const std::string& name ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_->set_tag(name);
      bound_array_buffer_->set_target(type);
    }
    else if (type == gl::ELEMENT_ARRAY_BUFFER) {
      bound_element_buffer_->set_tag(name);
      bound_element_buffer_->set_target(type);
    }
    else {
      ERROR("unimplemented buffer type");
    }
  }

  // get functions
  // these are internally needed to retrieve the data that will be sent to the client
  template<typename T>
  void getBufferData( int type , std::vector<T>& data ) {
    if (type == gl::ARRAY_BUFFER) {
      bound_array_buffer_->get<T>(data);
    }
    else {
      ERROR("unimplemented buffer type");
    }
  }

  std::string
  target_name( int type ) {
    if      (type == gl::ARRAY_BUFFER) return "ARRAY_BUFFER";
    else if (type == gl::ELEMENT_ARRAY_BUFFER) return "ELEMENT_ARRAY_BUFFER";
    else ERROR("unimplemented buffer type");
    return "";
  }

  void send();

private:
  std::vector< std::shared_ptr<BufferObject> > buffers_;

  BufferObject* bound_array_buffer_;
  BufferObject* bound_element_buffer_;
  BufferObject* bound_texture_buffer_;
};

#endif
