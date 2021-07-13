set(SOURCES crypto.cpp websockets.cpp webglpp.cpp )
add_library( webglpp_src OBJECT ${SOURCES} )

add_library( webglpp_shared SHARED $<TARGET_OBJECTS:webglpp_src> )
set_target_properties( webglpp_shared PROPERTIES OUTPUT_NAME webglpp CLEAN_DIRECT_OUTPUT 1 )

add_library( webglpp_static SHARED $<TARGET_OBJECTS:webglpp_src> )
set_target_properties( webglpp_static PROPERTIES OUTPUT_NAME webglpp CLEAN_DIRECT_OUTPUT 1 )

if (WIN32)
  target_link_libraries( webglpp_shared ws2_32 )
endif()
