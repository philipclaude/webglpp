#include "websockets.h"
#include "crypto.h"

#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <string>

#ifndef _WIN32
#include <arpa/inet.h>
#include <sys/socket.h>
#include <unistd.h>
#else
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
typedef int socklen_t;
#endif

// opcodes and GUID defined by RFC6455
#define RFC6455_OP_CONTINUE 0x0
#define RFC6455_OP_TEXT     0x1
#define RFC6455_OP_BINARY   0x2
#define RFC6455_OP_CLOSE    0x8
#define RFC6455_GUID "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

namespace websockets
{

int
shakehands(int client_fd , const std::string& request) {

  // GUID defined by RFC6455
  const std::string guid(RFC6455_GUID);
  std::string accept(40,' '); // the accept string should be shorter - just being safe
  unsigned char hash[20];
  int out_len;

  // look for the 'Sec-WebSocket-Key' string
  std::string lookfor = "Sec-WebSocket-Key:";
  int idx0 = request.find(lookfor);
  int idx1 = request.find("\r\n",idx0);

  // extract the key and remove whitespace
  int n = idx1 - (idx0 + lookfor.size());
  std::string key = request.substr(idx0 + lookfor.size(),n);
  const char* ws = " \t\n\r\f\v";
  key.erase( 0 , key.find_first_not_of(ws) );
  //printf("key = %s\n",key.c_str());

  // encode the key + GUID for the handshake response
  std::string key_guid = key + guid;
  SHA1( (unsigned char*) key_guid.c_str() , key_guid.size() , hash );
  out_len = b64_encode_string( (char*)hash , 20 , &accept[0] , accept.size() );
  assert( out_len > 0 );
  accept.resize(out_len); // cut off any extra characters

  // accumulate the handshake response
  std::string response =  "HTTP/1.1 101 Switching Protocols\r\n" \
                          "Upgrade: websocket\r\n" \
                          "Connection: Upgrade\r\n" \
                          "Sec-WebSocket-Accept: " + accept + "\r\n\r\n";

  // send the handshake response back to the client
  return send( client_fd , response.c_str() , response.size() , 0 );
}

std::string
makeframe(const std::string& payload , int opcode) {
  /*
  WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455#section-5.2

  0                   1                   2                   3
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-------+-+-------------+-------------------------------+
 |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 | |1|2|3|       |K|             |                               |
 +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 |     Extended payload length continued, if payload len == 127  |
 + - - - - - - - - - - - - - - - +-------------------------------+
 |                               |Masking-key, if MASK set to 1  |
 +-------------------------------+-------------------------------+
 | Masking-key (continued)       |          Payload Data         |
 +-------------------------------- - - - - - - - - - - - - - - - +
 :                     Payload Data continued ...                :
 + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 |                     Payload Data continued ...                |
 +---------------------------------------------------------------+
 */
  std::string header(2,'\0');
	uint64_t length = payload.size();

  // set the first byte of the header
  // you don't need to write it like this, but I find it clearer to read
  //           FIN | RSV 1   2   3 | opcode | mask (none)
	header[0] = (128 |     0 | 0 | 0 | opcode | 0 );

	if (length <= 125) {
    // the second byte needs to contain the payload length
		header[1] = length & 127;
	}
	else if (length >= 126 && length <= 65535) {
    // for a size between 126 and 65535, the next byte must be 126
    // then we have two more bytes (16-bit integer) representing the length
    header[1] = 126;
    header.resize(4);

    // the next two bytes (16-bit unsigned integer) represent the length
    for (int i = 2; i < 4; i++)
      header[i] = (length >> (16 - (8*(i-1))) & 255); // 255 for 64-bit unsigned int
	}
	else {
    // for more than 65535 bytes, the next byte must be 127,
    // then the next 8 bytes (64-bit unsigned integer) represents the length
    header[1] = 127;
    header.resize(10);
    for (int i = 2; i < 10; i++)
      header[i] = (length >> (64 - (8*(i-1))) & 255); // 255 for 64-bit unsigned int
	}

  // frame = header + payload data
	return header + payload;
}

int
sendmessage( int fd , const std::string& msg , int type ) {
  printf("sending message with %lu bytes\n",msg.size());
  std::string frame = makeframe(msg,type);
  return send(fd,frame.c_str(),frame.size(),0);
}

void
Server::write() {

  struct sockaddr_in server;
  struct sockaddr_in client;
  int server_fd = -1;
  int client_fd = -1;
  int max_clients = 1; // we only want to connect to one client
  std::string request(4096,' '); // this should be plenty for the client request
  socklen_t len = sizeof(struct sockaddr_in);

  // create a socket
  server_fd = socket(AF_INET, SOCK_STREAM, 0);
  if (server_fd < 0) {
    printf("failed to create server socket\n");
    goto cleanup;
  }

  // bind the server to our socket
  server.sin_family      = AF_INET;
  server.sin_addr.s_addr = INADDR_ANY;
  server.sin_port        = htons(port_);
  if (bind(server_fd, (struct sockaddr *)&server, sizeof(server)) < 0) {
		printf("failed to bind server on port %d - try changing the port number\n",port_);
    goto cleanup;
  }

  // listen on the specified port
  listen(server_fd,max_clients);

  // wait for a client to connect to
  while (client_fd < 0) {

    // accept a connection from the client
    client_fd = accept(server_fd, (struct sockaddr*)&client , &len );
    if (client_fd < 0) continue; // no client connected

    // receive the request from the client
    int bytes_received = recv(client_fd,&request[0],request.size(),0);
    if (bytes_received == 0) {
      printf("error receiving handshake from client\n");
      goto cleanup;
    }

    // shake hands with the client
    if (shakehands(client_fd,request) < 0) {
      printf("error sending handshake response to client\n");
      goto cleanup;
    }

    // send the data
    for (int k = 0; k < messages_.size(); k++)
      sendmessage( client_fd , messages_[k] , RFC6455_OP_TEXT );
  }

  cleanup:
  if (client_fd >= 0) close(client_fd);
  if (server_fd >= 0) close(server_fd);
}

} // websockets
