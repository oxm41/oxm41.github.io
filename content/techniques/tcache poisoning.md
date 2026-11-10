- goal: change forward pointer (`fd`) of freed chunk in tcache bin so that when malloc again w same size, we can overwrite data in that addr
- reminder again: mallocs goes in first will be the `fd` or forward pointer of later mallocs (check out here [[heap|bins' behavior]])
- so we have to free at least 2 chunks and change `fd` pointer of the latter freed one
- ***note: glibc >= 2.32 introduced "safe-linking" to protect tcache and fastbin `fd` pointers. they are obfuscated via XOR before being stored: `stored_fd = target_addr ^ (chunk_addr >> 12)`. in case we can still read data from freed chunk, to leak heap, we need to leave only one chunk in tcache***
```python
def decrypt_heap(mangled_ptr):
    ptr = mangled_ptr
    ptr ^= (ptr >> 12)
    ptr ^= (ptr >> 24)
    ptr ^= (ptr >> 48)
    return ptr
  
def encrypt_heap(pos, ptr):
    return (pos >> 12) ^ ptr
```