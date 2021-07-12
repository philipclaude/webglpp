#ifndef WEBSOCKETS_H_
#define WEBSOCKETS_H_

#include <string>
#include <vector>

namespace websockets
{

class Server {
public:
  Server( int port ) :
    port_(port)
  {}

  void write();

  void add_message( const std::string& msg ) {
    messages_.push_back(msg);
  }

private:
  int port_;
  std::vector<std::string> messages_;
};

} // websockets

#endif
