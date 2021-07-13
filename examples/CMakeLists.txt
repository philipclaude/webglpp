add_executable( simple_server simple_server.cpp )
target_link_libraries( simple_server webglpp_shared )

add_executable( scalar scalar.cpp )
target_link_libraries( scalar webglpp_shared )

add_executable( fields fields.cpp )
target_link_libraries( fields webglpp_shared )
