## 1. [[fastbin dup|direct main_arena hijacking]]
- fastbins: we can bypass need for a traditional double-free by overwriting fastbin head ptrs stored directly inside `main_arena`. this allows to point the bin at fake chunk
- top chunk (older glibc): we can control exactly where new chunks are allocated by overwriting the `top_chunk` addr ptr inside `main_arena`. this instantly teleports the "top of the heap" to an arbitrary addr
## 2. leak libc with heap overflow
- malloc more than one chunks with size > 0x78. we call chunk A, B, C, D (whatever size to prevent top chunk consolidation)
- now at .bss: `ptr[0] = A`, `ptr[1] = B`, `ptr[2] = C`
- free A, get libc addr pointing to `main_arena` at `fd` and `bk` ptr
- abuse heap overflow to fake prev_size chunk = bytes A+B and prev_size flag of chunk C = 0
- when free chunk C, it assumes chunk B is freed, consolidation occurs, we have only one chunk = total size of 3 chunks
- now bss still contain chunk B ptr, which can use to leak by malloc another chunk A to slide libc addr to chunk B
- to use double free, we use heap remainder and malloc a chunk starting at exact addr as one locates on bss which can perfom [[tcache poisoning]] or [[fastbin dup]]
- modern glibc prevents fake prev_size by checking prev_size vs first chunk size:
```C
if (!prev_inuse(p)) {
      prevsize = prev_size (p);
      size += prevsize;
      p = chunk_at_offset(p, -((long) prevsize));
      if (__glibc_unlikely (chunksize(p) != prevsize))                       // HERE
        malloc_printerr ("corrupted size vs. prev_size while consolidating");
      unlink_chunk (av, p);
    }
```
## 3. leak libc by overwriting top chunk
- shrink top chunk: use heap overflow to overwrite top chunk's size. new size must be page-aligned and have `prev_inuse` flag set to bypass `sysmalloc` asserts
- expand heap: call malloc() with a size larger than the shrunk top chunk. `sysmalloc()` will request more memory and automatically free the old top chunk into the unsorted bin (and create a new map for heap)
## 4. fake chunk size
- if cant free chunk twice, we can fake chunk size to a larger one and free it. it will assume next chunk as its part
- malloc again and again (heap remainder) with size that allows us to overwrite `fd` ptr of next chunk (make sure it's in tcache)
- eg: malloc chunk A, B -> free B -> modify size of chunk A = size of A+B -> free A -> malloc size of A+B and overwrite `fd` and/or `bk` ptr of chunk B -> maloc again to arb write
## 5. partial ptr overwrite
- have UAF but cant leak via `puts`, `printf`,...
- setup: malloc chunk A, B, C, target_fake_chunk
- free A, B -> tcache. now `fd_B` -> `A`
- overwrite `fd_B`'s MSB by UAF to target_fake_chunk addr
- malloc x2 to get target_fake_chunk
## 6. `global_max_fast` - unsorted bin attack / ***nightmare***
- if you can use unsorted bin attack, you can aim to attack `global_max_fast`, a libc var to store max size of fastbin
- overwrite `bk` ptr to `global_max_fast`'s addr - 0x10, and malloc again. now the max size of fastbin is a very big num ~ every freed chunk will be in fastbin
- now you can either perform [[fastbin dup]], as fastbin's max size is modified, besides `__malloc_hook-0x23`, youre also able to use `__free_hook-0x59`...
- ...or an OOB write: in `main_arena`, freed chunks in fastbin are stored in an array called `fastbinsY`, in which index is calculated by `idx = (size - 0x20) >> 4`
- normally, bc size of fastbin is limited by 0x80, so idx is 0-7
- but now you can use a large chunk to overwrite a farther addr
- for eg, malloc a chunk size = `0x3750`, idx = `(0x3750 - 0x20) >> 4 = 0x373`, and its addr is now `fastbinY + 0x373 * 0x8`!
## 7. `calloc()` bypass / ***hmq's orginal chall - test + yisf_hospital - dreamhack*** 
- `calloc()` skips chunks from tcache when allocate new chunk to ensure memory is zeroed
- to bypass, you will need to fill 7 tcache chunks, and free 8th chunk in fastbin or unsorted bin
- edit `PREV_INUSE` flag to `2` (`IS_MMAPPED`)
- `calloc()` assumes the memory was allocated via `mmap` (which the OS ensures is already zeroed) and bypasses the `memset(0)` call. this preserves `fd`/`bk` ptr or fake struct
- if have ***OFF-BY-NULL***, we can free chunk first, use OBN to reset `PREV_INUSE` and shrink size (fake) of chunk. `calloc` will only set chunk of fake size to 0, the left remains untouched. so how to abuse the remainder? 👇⬇️
## 8. heap consolidation trick / ***hmq's orginal chall - test***
- if there's no unsorted bin, free first 7 chunk in tcache, free many chunks to put it in small/fastbin (?) bins
- alloc a chunk w size that unsorted bin doesnt have suitable ones, it will scan fastbins and consolidate all and sort in unsorted bin
- if there's one unsorted bin, and a chunk which will be in tcache before, create fake chunk inside the smaller one, ***remember to set `fd`/`bk` and `PREV_SIZE`***
- abuse OBN and free larger chunk to trigger consolidation
## 9. modify `tcache_perthread` struct / ***pico ctf 2024***
- this will fake chunks in tcache (in case tcache chunks arent possible)
- first, `sysmalloc()` needs to trigger to extend top chunk with new `mmap()` (by overwriting top chunk and allocating very large one)
- this new area will also contains ***TLS***, in which there is `tcache_perthread` struct ptr
- fake counts + entries to add fake tcache chunks `p64(0x291) + p16(0x30)*64 + p64(target)*n`
- overwriting this ptr to control tcache bins and possibly perform [[tcache poisoning]] (if some entries have the same addr)
## 10. largebin `fd_next_size` trick - largebin stale reference / ***chall exit handler + nullshui - omni ctf 2026***
- in `unlink_chunk`, there's a condition checking if `p->fd_nextsize != NULL`
- if we clear `fd_nextsize`, chunk is successfully unlinked from the main `fd/bk` list but **skips being unlinked from the `nextsize` list**
- this leaves a stale reference in the largebin. allocator still thinks a chunk of this size exists here, allowing us to request it again
- this leads to unlimited primitive allocation (alias/overlapping chunks), which can be leveraged for [[tcache poisoning]]
```C
static void
unlink_chunk (mstate av, mchunkptr p)
{
  if (chunksize (p) != prev_size (next_chunk (p)))
    malloc_printerr ("corrupted size vs. prev_size");

  mchunkptr fd = p->fd;
  mchunkptr bk = p->bk;

  if (__builtin_expect (fd->bk != p || bk->fd != p, 0))
    malloc_printerr ("corrupted double-linked list");

  fd->bk = bk;
  bk->fd = fd;
  if (!in_smallbin_range (chunksize_nomask (p)) && p->fd_nextsize != NULL)     // HERE
    {
      if (p->fd_nextsize->bk_nextsize != p
	  || p->bk_nextsize->fd_nextsize != p)
	malloc_printerr ("corrupted double-linked list (not small)");

      if (fd->fd_nextsize == NULL)
	{
	  if (p->fd_nextsize == p)
	    fd->fd_nextsize = fd->bk_nextsize = fd;
	  else
	    {
	      fd->fd_nextsize = p->fd_nextsize;
	      fd->bk_nextsize = p->bk_nextsize;
	      p->fd_nextsize->bk_nextsize = fd;
	      p->bk_nextsize->fd_nextsize = fd;
	    }
	}
      else
	{
	  p->fd_nextsize->bk_nextsize = p->bk_nextsize;
	  p->bk_nextsize->fd_nextsize = p->fd_nextsize;
	}
    }
}
```
## 11. blind fake backward consolidation (bypassing `unlink` checks without heap leak) / ***unknown***
- if theres no heap leak, the only solution is to overlap -> perform largebin attack -> attack tcache ptr in TLS -> FSOP (stdout libc)
- to achieve chunk overlapping without leaks, use "blind fake backward consolidation" by exploiting an off-by-null (OBN) and leftover ptrs from the unsorted bin
- as OBN, abusing backwards consolidation of unsorted bins when freeing 2 adjacant unsorted bins and alloc a larger size for the above
- set up so that we can perform a partial overwrite LSB on the leftover ptrs, shifting them to point exactly to your forged fake chunk header. ideally you can set the fake chunk header at 00 (or other is fine, as long long u have the control over)
- so we have to groom heap to bypass "corrupted double-linked list" from condition `if (__builtin_expect (fd->bk != p || bk->fd != p, 0))`
- to satisfy, the order of freeing matters: free the chunk intended for `fd` setup first, then free the chunk for `bk` setup, ensuring the leftover ptrs naturally point near your target area
- to be specific, with `fd->bk = p` free victim (`p`) first, `bk->fd = p` free the other chunk first
- trigger fake backward consolidation by clearing `PREV_INUSE` bit w OBN and freeing victim chunk
- perform LBA to replace tcache ptr in TLS (search heap starter addr) -> fake counts + entries = stdout in libc
- ***REMINDER: alloc the smaller chunk again after LBA will trigger LBA again, making the larger (or the chunk in overlapping chunk) replaced in the target addr. no specific vector but u have to play it by ear by alloc***
## 12. fake unsorted bin chunk + tcache poisoning + no large chunk / ***just ctf 2025***
- if restricted to small alloc (eg `malloc(0x40)`), preventing libc leak through unsorted bin
- top chunk size only tracks remaining contiguous space; the memory region itself extends further and can be manipulated
- craft/overwrite a chunk header with an UB-eligible size, use tcache poisoning to create 2 fake chunks after that chunk to satisfy `_int_free()` 
## 13. fake GOT to fmtstr leak addr / ***sekai ctf 2025***
- if u can control `tcache perthread struct` + NO PIE, u can overwrite GOT (like `free@got`) to print to trigger `printf(data)` -> fmtstr arb read/write
## 14. stdout 0.5 - blind leak / ***shop - cyberspace ctf 2024***
#### a. basic setup
- *stage 1: unsorted bin consolidation*
	- alloc 9 chunks (0xe8) + 1 top chunk guard
	- free first 7 chunks into tcache
	- free chunk 9 -> unsorted bin
	- free chunk 8 -> unsorted bin (triggers backward consolidation into a large free chunk 8+9)
- *stage 2: setup tcache overlapping*
	- alloc 1 chunk (0xe8) to pop 1 entry from tcache (count: 6)
	- free chunk 9 into tcache (count: 7)
	- **note: free chunk 9 now to prevent its fd from being corrupted by overlapping later by a heap addr**
	- now chunk 9 is physically inside the unsorted bin but logically in the tcache
- *stage 3: unsorted bin split & fd overwrite*
	- alloc a chunk (~0xc8) to move the unsorted bin ptr forward
	- alloc another small chunk (0x28) to split the unsorted bin such that the `main_arena` leftover (`fd` and `bk`) lands **EXACTLY** on the `fd` of chunk 9
- *stage 4: partial overwrite & pop*
	- chunk 9 (currently in tcache) now has `fd` = `main_arena`
	- modify 2 LSB of chunk 9's `fd` to `stdout`
	- since tcache count is 7, simply alloc until hitting `stdout`
#### b. more ~~stupid~~ complex setup (mine lol)
- *stage 1: setup `main_arena` leftover*
	free large chunk into unsorted bin -> alloc small chunk from it to leave `main_arena` ptr on heap (victim chunk)
- *stage 2: partial overwrite (brute force)*
	fastbin dup to get overlapping chunk over the victim (don't forget to fake chunk header). modify 2 LSB of `main_arena` ptr to point to `stdout` (e.g., \xa0\x16). requires 1/16 brute force
- *stage 3: tcache count bypass & route to stdout*
	fastbin dup again (use 4-chunk free sequence like A -> B -> C -> A to buff tcache count). modify `fd` to the victim chunk (which now has `fd` = `stdout`)
- *stage 4: leak libc*
	alloc until `stdout`. overwrite `stdout` struct with fake `stdout` payload. read leak -> calc libc base
- *stage 5: arbitrary read (leak heap)*
	fastbin dup to `stdout` again. overwrite `stdout` struct with exact addr (`_IO_write_base` & `_IO_write_end` = libc TLS/tcache per-thread ptr) to leak heap base
## 15. `realloc()` / ***re-alloc - pwnable.tw*** 
- if size = 0 -> realloc(ptr, size) = free(ptr) 
- if ptr = null -> realloc(ptr, size) = malloc(size) (0x20 by default) 
- normally if the same size -> overwrite old data