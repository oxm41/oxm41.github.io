### I. glibc
- glibc, or gnu c lib, shared lib (`libc.so.6`) is runtime lib on linux sys
- providing core APIs, portable code like `malloc`, `printf`, and `syscall`
- acts as the bridge btw user applications and the linux kernel
- allows multiple programs to use the same code in memory, saving resources
- loaded dynamically at runtime = executable files dont include code, but link to it during execution
### II. arena
- arenas, or `malloc_state` structs, administrate a process's heaps
- an arena can administrate multiple heaps simultaneously
- they consist of bins
- new arenas are created via `_int_new_arena()`, initialized w `malloc_init_state()`
- whenever a thread starts and triggers `malloc()`, `main_arena` will be created
- arena layout's visualization:
	- mutex (mutual exclusion): ensure thread safety when multiple threads attempt to allocate memory from same arena simultaneously
	- flags: check if an arena's heap memory is adjacent
![[heap-1.png]]

### III.  malloc chunk
#### 1. malloc
- when call `malloc()`, it ret a **pointer** to a *chunk*
- a heap chunk will have 0x10 heap metadata: 

| 0x0      | 0x00       | prev chunk size   |
| -------- | ---------- | ----------------- |
| **0x8**  | **0x21**   | **chunk size**    |
| **0x10** | **"lolo"** | **chunk content** |

- and 0x1 additional bytes as flags to specify diff things:

| 0x1 | prev in use    | prev chunk is in use                   |
| --- | -------------- | -------------------------------------- |
| **0x2** | **is mmapped**     | **chunk obtained w mmap()**                |
| **0x4** | **non main arena** | **chunk obtained from outside main arena** |
#### 2. top chunk
- exist after a new arena is initialized
- reqs are only served if not available in any bins in same arena
- when top chunk is too small for reqs below `mmap` threshold, `sysmalloc()` will extend the top chunk
- if unsucessful, new heap is allocated and becomes new top chunk, replaces old one
### IV. binning
where stores freed chunks. if reallocated, it will take suitable chunks from bins
#### 1. fast bins
- size range: 0x20 - 0x80 (additional 0x10)
- idx range: 0 - 6
- LIFO
![[heap-2.png]]
#### 2. tcache
- intro in 2.26 libc
- each thread has **own** tcache
```C
typedef struct tcache_perthread_struct {
	uint16_t counts[TCACHE_MAX_BINS]; // num of free chunks currently available in each bin
	tcache_entry *entries[TCACHE_MAX_BINS]; // points to most recently freed chunk of each bin
} tcache_perthread_struct;
```
- debug
```D
pwndbg> tcache
tcache is pointing to: 0x570df170a010 for thread 1
{
  counts = {0 <repeats 64 times>},
  entries = {0x0 <repeats 64 times>}
}
```
- hold **7** chunks at once
- size range: 0x20 - 0x410
- idx value range: 0 - 63
#### 3. unsorted, large, small bins
![[heap-3.png]]
![[heap-4.png]]
![[heap-5.png]]

| idx             | list              | name             | list        | size         |
| --------------- | ----------------- | ---------------- | ----------- | ------------ |
| **0x00**        |                   | **not used**     |             |              |
| **0x01**        | **doubly-linked** | **unsorted bin** | **1 list**  |              |
| **0x02 - 0x3f** | **doubly-linked** | **small bin**    | **62 list** | **<= 0x400** |
| **0x40 - 0x7e** | **doubly-linked** | **large bin**    | **63 list** | **> 0x400**  |
#### 4. behaviors
- note: since bins use LIFO (not unsorted bin, see below ⬇️), so mallocs goes in first will be the `fd` or forward pointer of later mallocs. free a chunk will make it head of bin
- for libc >= 2.41:  if we have one chunk < 0x410 bytes, there will be a chunk w 0x300 (+0x10 meta data) added before malloced one. it is `tcache_perthread struct`
- and if we have one chunk >= 0x410 bytes, and one less than 0x410 bytes (there will be a 0x300 chunk located in between), and free both, that >= 0x410 bytes chunk wont be consolidated in top chunk
- if free more than 7 chunks that in tcache, the 8th (< 0x90) will be in fastbins or in unsorted bins if >= 0x90
![[heap-6.png]]
- if free chunks > 0x410 (+0x10 bytes metadata = 0x420) and not adjacant to top chunk, it will move into unsorted bins, which `fd` pointer points to `main_arena` in libc
![[heap-7.png]]
- if free a chunk (>= 0x410 bytes), which is supposed to be in unsorted bins, physically adjacent to top chunk, it will merge that chunk directly into top chunk (top chunk consolidation)
![[heap-8.png]]
- if free 2 adjacant >= 0x410 byte chunks, they will consolidate into one chunk w size of total bytes, unlink `fd` and `bk` and are added to head of unsorted bin
- if we have many adjacant small/fastbin (?) bins and alloc a chunk w size that unsorted bin doesnt have suitable ones, it will scan fastbins and consolidate all and sort in unsorted bin
- when call `free()`, freed chunk is placed at the head of unsorted bin, but `malloc()` will iterate backward starting from the tail of the list, which is ***FIFO***, not LIFO
### V. flowchart
#### 1. malloc
![[heap-9.png]]
![[heap-10.png]]
#### 2. unsorted bin
![[heap-11.png]]
#### 3. sysmalloc
![[heap-12.png]]
#### 4. free
![[heap-13.png]]
![[heap-14.png]]