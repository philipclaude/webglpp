#include "webglpp.h"

#include <iostream>
#include <vector>
#include <math.h>

void add_json_field( std::string& J , const std::string& name , const int& i , bool end=false) {
  J += "\u0022" + name + "\u0022:" + std::to_string(i);
  if (end) J += "}";
  else J += ",";
}

void
add_json_field( std::string& J , const std::string& name , const std::string& s , bool end=false) {
  J += "\u0022" + name + "\u0022:\u0022" + s + "\u0022";
  if (end) J += "}";
  else J += ",";
}

template<typename T>
void
add_json_field( std::string& J , const std::string& name , const std::vector<T>& x , bool end=false) {
  J += "\u0022" + name + "\u0022:[";
  if (x.size() == 0)
    J += "]";
  else {
    for (int k = 0; k < (int)x.size(); k++) {
      J += std::to_string(x[k]);
      if (k < int(x.size())-1) J += ",";
      else J += "]";
    }
  }
  if (end) J += "}";
  else J += ",";
}

void
WebGLpp::send() {

  std::string message = "{ \"buffers\": [";
  for (int i = 0; i < (int)buffers_.size(); i++) {

    const BufferObject& buffer = *buffers_[i].get();

    // retrieve the data
    std::string J = "{";
    if (buffer.type() == typeid(float).name()) {
      std::vector<float> x = buffer.Float32Array();
      add_json_field(J,"data",x);
      add_json_field(J,"type","Float32Array");
    }
    else if (buffer.type() == typeid(unsigned short).name()) {
      std::vector<unsigned short> x = buffer.Uint16Array();
      add_json_field(J,"data",x);
      add_json_field(J,"type","Uint16Array");
    }
    else if (buffer.type() == typeid(unsigned int).name()) {
      std::vector<unsigned int> x = buffer.Uint32Array();
      add_json_field(J,"data",x);
      add_json_field(J,"type","Uint32Array");
    }
    else {
      ERROR("unimplemented buffer type");
    }
    add_json_field(J,"tag",buffer.tag());
    add_json_field(J,"index",i);
    add_json_field(J,"target",target_name(buffer.target()),true);

    message += J;
    if (i < (int)buffers_.size()-1) message += ",";
    else message += "]}";
  }
  add_message( message );

  // at the end we write the data to the client
  write();
}
