#include "webglpp.h"

#include "json.hpp"

#include <iostream>

void
WebGLpp::send() {

  std::vector<nlohmann::json> jbuffers;
  for (int i = 0; i < buffers_.size(); i++) {

    const BufferObject& buffer = *buffers_[i].get();

    // retrieve the data
    nlohmann::json jbuffer;
    if (buffer.type() == typeid(float).name()) {
      std::vector<float> x = buffer.Float32Array();
      jbuffer["data"] = x;
      jbuffer["type"] = "Float32Array";
    }
    else if (buffer.type() == typeid(unsigned short).name()) {
      std::vector<unsigned short> x = buffer.Uint16Array();
      jbuffer["data"] = x;
      jbuffer["type"] = "Uint16Array";
    }
    else if (buffer.type() == typeid(unsigned int).name()) {
      std::vector<unsigned int> x = buffer.Uint32Array();
      jbuffer["data"] = x;
      jbuffer["type"] = "Uint16Array"; // still call it Uint16
    }
    else {
      ERROR("unimplemented buffer type");
    }
    jbuffer["tag"]    = buffer.tag();
    jbuffer["index"]  = i;
    jbuffer["target"] = target_name(buffer.target());

    std::cout << jbuffer.dump() << std::endl;

    jbuffers.push_back(jbuffer);
  }

  // wrap up the buffer objects into a json
  nlohmann::json jmsg;
  jmsg["buffers"] = jbuffers;
  add_message( jmsg.dump() );

  // at the end we write the data to the client
  write();
}
