#ifndef AVRO_LIB_COMMON_CRYPTO_H_
#define AVRO_LIB_COMMON_CRYPTO_H_

#include <cstdint>
#include <cstdlib>

int b64_encode_string(const char *in, int in_len, char *out, int out_size);
unsigned char* SHA1(const unsigned char *d, size_t n, unsigned char *md);

#endif
