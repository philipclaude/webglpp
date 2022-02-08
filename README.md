# webglpp

The goal of `WebGLpp` (WebGL for C++) is to provide a WebGL-like interface for computer graphics or computational geometry programs written in `C++`. Instead of using an API like `OpenGL`, `WebGLpp` allows you to create and send buffers to a client (your browser) so as to provide a more lightweight platform-independent solution for visualizing the results of your graphics and geometry programs.

I primarily developed `WebGLpp` for a course called [Geometric Modeling](https://csci422-s22.gitlab.io/home/calendar.html) (Middlebury College, CSCI 0422), which is used by the [flux](https://gitlab.com/csci422-s22/flux-base) library for that course, and has also been integrated into [avro](https://gitlab.com/philipclaude/avro).

`WebGLpp` follows the RFC6455 protocol for connecting to a client via a WebSocket connection, which is how the buffers are sent over. Currently, as soon as a connection is established, the data is sent to the client, and the connection is closed. The biggest TODO would be to keep the connection open and add the ability to receive messages from the browser to provide a more interactive environment.

### dependencies

`WebGLpp` is supported on Unix platforms and also works with MinGW on Windows.

- `git`
- a `C++` compiler
- `CMake`

### quickstart

- download/clone the repository
- in the root, create a build directory
- `cd build`
- `cmake ..`
- `make`

This will build the library as well as three examples. The executables for the examples are located in the `bin` directory, with corresponding source in the `examples` directory.

1. simple server: tests the server connection to a particular port (it will wait until a connection is established). Usage: `bin/simple_server 7681` and then open `app/webglpp.html`. If you change the port number on the command line, you will also have to change the port number in `app/webglpp.html` (sorry, I haven't added a button to do this in a nicer way). You can look at the JavaScript console in your browser for a confirmation that the data was sent over.

2. scalar: sends a simple mesh of a square with an attached scalar field at the vertices of the mesh. Usage `bin/scalar` and then open `app/webglpp.html`

3. fields: send a simple mesh of a square with an attached discontinuous field of arbitrary polynomial order. `WebGLpp` will then render the high-order solution field in a pixel-exact manner. Usage: `bin/fields` and then open `app/webglpp.html`. Note: the field is defined arbitrarily for this example.


### license

See LICENSE.txt for the complete LGPL license.

Copyright © 2022 Philip Claude Caplan

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
