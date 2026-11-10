- we modify `bk` ptr of a freed chunk in largebin or unsorted bin with a target addr
## 1. unsorted bin
- with unsorted bin, if we malloc again, it will occur partial unlink, in which:
```C
unsorted_chunks (av)->bk = bck;
bck->fd = unsorted_chunks (av); //main_arena
```
- and overwrite that target addr + 0x10 with a libc addr
- some common errors:
```C
if (__glibc_unlikely (size <= CHUNK_HDR_SZ)
  || __glibc_unlikely (size > av->system_mem))
	malloc_printerr ("malloc(): invalid size (unsorted)");
if (__glibc_unlikely (chunksize_nomask (next) < CHUNK_HDR_SZ)
  || __glibc_unlikely (chunksize_nomask (next) > av->system_mem))
	malloc_printerr ("malloc(): invalid next size (unsorted)");
if (__glibc_unlikely ((prev_size (next) & ~(SIZE_BITS)) != size))
	malloc_printerr ("malloc(): mismatching next->prev_size (unsorted)");
if (__glibc_unlikely (bck->fd != victim)
  || __glibc_unlikely (victim->fd != unsorted_chunks (av)))
	malloc_printerr ("malloc(): unsorted double linked list corrupted");
if (__glibc_unlikely (prev_inuse (next)))
	malloc_printerr ("malloc(): invalid next->prev_inuse (unsorted)");
```
#### unsorted bin poisoning to alloc on stack
- set up: **chunk A (0x420)** - chunk 0x18 - **chunk B (0x420)** - chunk 0x18
- free A, B => 
```C
A->fd = main_arena           |         A->bk = B
B->fd = A                    |         B->bk = main_arena
```
  - if u can create 2 unsorted bins on heap, fake another 2 chunks on stack, for eg, chunk headers: **fake_chunk - 0x421** + **chunk D - 0x50 (prev_size = 0x420)**
  - or else you need 3 fake chunks on stack, not necessarily unsorted bin chunk size, but must have `fd`/`bk` ptr
  - now we modify `fd` and `bk` ptr so that fake_chunk is btw chunk A and B
```C
fake_chunk->fd  = A
fake_chunk->bk  = B
A->bk = fake_chunk
B->fd = fake_chunk
```
- malloc 0x420 again and we get a chunk on stack
## 2. largebin
#### older glibc
- with largebin, we need to abuse unsorted bin too
- set up 3 chunk A 0x500, B C 0x600, for eg, and add 3 chunks 0x20 in between to prevent consolidation. free A and B, both in unsorted bin
- malloc 0x20, it will search through bins, in unsorted bin it approaches chunk B first but not satisfy 0x20 so at hand sort B in large bin. chunk A will be remaindered to malloc 0x20
- free C in unsorted bin. now `unsorted bin: chunk C, A+0x30` ; `largebin: chunk B`
- overwrite metadata of chunk B: size to 0x300, `fd` = 0x0, `bk` = target - 0x10
- malloc 0x20 again, it goes in unsorted bin, take chunk C out to sort it in largebin
- largebin sorts by size, chunk B's size now is 0x300, so it will insert chunk C (`victim`) before chunk B (`fwd`)
- in this process, it also execv partial unlink
```C
bck = fwd->bk; 
bck->fd = victim;
```
- now at target addr is a heap addr, which is chunk C
#### newer glibc
- ***with modern glibc >= 2.30,*** there is a safe check in unlink process `if (__glibc_unlikely (fwd->bk->fd != fwd))`, which will occur `malloc(): largebin double linked list corrupted (forward)`
- but largbin is more complicated than other bins, as it holds different chunk sizes, it has another doubly-linked list (using `fd_nextsize` and `bk_nextsize`) to link these "different-size" chunks
- when sort `victim` chunk in largebin, and its size is smaller than others (`fwd`), glibc will execv:
```C
victim->fd_nextsize = fwd;
victim->bk_nextsize = fwd->bk_nextsize;
if (__glibc_unlikely (fwd->bk_nextsize->fd_nextsize != fwd))
    malloc_printerr ("malloc(): largebin double linked list corrupted (nextsize)");
fwd->bk_nextsize = victim;
victim->bk_nextsize->fd_nextsize = victim;    // what we care for
```
- set up: chunk A (`fwd`) 0x420 in largebin, chunk B (`victim`) 0x400 in unsorted bin (chunk B must be smaller than A)
- modify chunk A's metadata: `A->bk_nextsize = target_addr - 0x20`, 0x20 is `fd_nextsize` offset
- malloc to sort chunk B in largebin, we get:
```C
B->bk_nextsize = target_addr - 0x20;
(target_addr - 0x20)->fd_nextsize = B;
or target_addr = B;
```
#### largebin linked poisoning to alloc on stack / ***pwnme ctf 2025***
- set up: **chunk A (0x420)** - chunk 0x18 - **chunk B (0x420)** - chunk 0x18
- free A, B -> malloc 0x430 to sort 2 chunks into largebin => `[largebin 0x400-0x430]: chunkA -> chunkB`
- fake another 2 chunks on stack, for eg, chunk headers: **fake_chunk - 0x421** + **chunk D - 0x50 (prev_size = 0x420)**
- now we modify `fd` and `bk` ptr so that fake_chunk is btw chunk A and B `[largebin 0x400-0x430]: chunkA -> fake_chunk -> chunkB`
```C
fake_chunk->fd          = B             |    fake_chunk->bk          = A
fake_chunk->fd_nextsize = 0x0           |    fake_chunk->bk_nextsize = 0x0
A->fd                   = fake_chunk    |    B->bk                   = fake_chunk
```
- malloc 0x420 again and we get a chunk on stack
#### largebin skiplist poisoning to alloc on stack
- set up: **chunk A (0x450)** - chunk 0x18 - **chunk B (0x460)** - chunk 0x18
-  free A, B -> malloc 0x470 to sort 2 chunks into largebin => `[largebin 0x440-0x470]: chunkB -> chunkA` (largebin sorts from largest to smallest)
- on stack:
```C
0x7fffffffdae0: 0xfffffffffffffff0                 |  0x0000000000000041
0x7fffffffdaf0: 0x0000000000000000                 |  0xfffffffffffffff1
0x7fffffffdb00: fake_chunk->fd          = chunk A  |  fake_chunk->bk          = chunk B
0x7fffffffdb10: fake_chunk->fd_nextsize = chunk A  |  fake_chunk->bk_nextsize = chunk B
```
- on heap:
```C
A->bk = fake_chunk
A->bk_nextsize = fake_chunk
B->fd = fake_chunk
B->fd_nextsize = fake_chunk
```
- malloc 0x460 again and we get a chunk on stack
- ***explain: to bypass `check size(fake_chunk) == prev_size(next_chunk_after_our_fake_chunk)`, `0xfffffffffffffff0` in system 64 means `-0x10`, therefore when checking size of fake chunk, it will subtract 0x10, which is 0x41 on stack, and check prev_size = 0xfffffffffffffff0***
## note
- to trigger largebin, you need to have EITHER at least 2 unsorted bin chunks and allocate OR 1 unsorted bin chunks and allocate a larger chunk
- **don't touch `fd`/`bk` pointers of unsorted bin and keep `prev_size`/`size` of next chunk to prevent "malloc(): mismatching next->prev_size"**
- overwrite data from offset 0x20 of largebin, or else its ptrs will destroy fake struct
- if overwrite stdout on bss, can use `flag = b" sh\x00\x00\x00\x00"` / ***ma11oc - dreamhack***