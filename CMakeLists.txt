cmake_minimum_required(VERSION 3.0)

# this allows setting the version number
if (POLICY CMP0048)
    cmake_policy(SET CMP0048 NEW)
endif()

# PkgConfig is used by many Finds/*.cmake
find_package(PkgConfig)

# setup libraries and build type
include(cmake/setup.cmake)
include(cmake/compiler.cmake)
project(webglpp)

if (POLICY CMP0077)
    cmake_policy(SET CMP0077 NEW)
endif()

# avro requires the c++11 standard
set(CMAKE_CXX_STANDARD 11)

# compiler flags
include(cmake/flags.cmake)

# RPATH (where executables find the .so / DLLs)
# - Enables RPATH support for MACOSX
# - Makes RPATH of dynamic libraries and executable point to the directory
#   where libraries are installed.
set(CMAKE_MACOSX_RPATH 1)
set(CMAKE_INSTALL_RPATH "${CMAKE_INSTALL_PREFIX}/lib")
set(CMAKE_INSTALL_NAME_DIR "${CMAKE_INSTALL_PREFIX}/lib")

add_definitions( -DGLIBCXX_USE_CXX11_ABI=0 )

# build the sources and executables
include_directories(src)
add_subdirectory(src)
add_subdirectory(examples)
