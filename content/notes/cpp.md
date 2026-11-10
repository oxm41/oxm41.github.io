### 1. vtable
- struct on heap with vtable ptr as first QWORD
![[cpp-1.png]]
- hijack by overwriting vtable![[cpp-2.png]]
### 2. vector
- 3 ptrs on stack: `_M_start` - `_M_finish` - `_M_end_of_storage`
![[cpp-3.png]]![[cpp-4.png]]
- if there isnt enough space, old chunk will be freed and new chunk with double size be allocated
### 3. string
- string struct:
``` C
class imagine_string {
  char *    buffer;     //  ptr point to string characters
  size_t    size;       //  number of characters
  union {
	  char small_buffer[16];
	  size_t    capacity;   //  buffer size
  };
};
```
- ptr on bss
- if str's size < 0x10, no alloc / ~ `small_buffer`
- str's size > `small_buffer` -> double `capacity` (0xf initially) and request suitable chunk, for eg `0xf * 2 = 0x1e`
- `vector<string>` behavior:
	- `small_buffer`: direct buf on heap
	- larger: alloc string chunk and add ptr in vector chunk
	- `push_back` available large chunk will alloc new buf to represent it, not using its real buf
	- `pop_back` will free each created large chunk
### 4. copy
- shallow copy![[cpp-5.png]]
- deep copy
![[cpp-6.png]]
- be careful or return 0 will cause dbf
- use/define the copy constructor/assignment operator