goal: arb write or get shell without `free` via heap overflow, [[unsorted bin - largebin attack|unsorted bin attack]]and [[FSOP]] to hijack `_IO_flush_all` of the `abort()`
#### 1. create a free chunk (skip if `free()` is available)
- shrink top chunk: use heap overflow to overwrite top chunk's size. new size must be page-aligned and have `prev_inuse` flag set to bypass `sysmalloc` asserts
- expand heap: call malloc() with a size larger than the shrunk top chunk. `sysmalloc()` will request more memory and automatically free the old top chunk into the unsorted bin (and create a new map for heap)
#### 2. setup unsorted bin attack & fake `_IO_file`
- modify metadata: use a second overflow to overwrite the chunk in the unsorted bin. change its size to 0x61 to force malloc to sort it into smallbin 0x60
- unsorted bin attack: overwrite the bk ptr to `_IO_list_all - 0x10`
- fake file stream: construct a fake `_IO_file` struct overlapping this chunk:
	- set `_IO_write_base` = 1, `_IO_write_ptr` = 2, and `_mode` = 0 to bypass buffer flush checks
	- set `_flags` (first 8 bytes) to the string "/bin/sh\x00"
	- set the vtable ptr to a fake vtable, replacing `_overflow` ptr with `system()` addr
#### 3. the trigger
- trigger unsorted bin attack: call malloc(0x20). the size does not match, so malloc sorts this chunk into smallbin 0x60. this triggers the unsorted bin attack, writing the addr of `main_arena` into `_IO_list_all`
- cause a crash: malloc continues traversing the unsorted bin using the corrupted `bk` ptr, fails the size sanity check, calls `malloc_printerr()`, and triggers `abort()`
- FSOP hijack: `abort()` tries to flush all file streams starting from `_IO_list_all` (which is now `main_arena`). since `main_arena` fails the flush checks, it moves to the next stream via the `_chain ptr (at offset 0x68)`
- execution: offset 0x68 of `main_arena` perfectly aligns with the `bk` ptr of smallbin 0x60, leading directly to your fake file stream on the heap. this fake stream passes the checks and calls `vtable->__overflow(fp)`. since fp contains "/bin/sh", this executes system("/bin/sh") and spawns a shell
#### note: the` _mode` value of `main_arena` is affected by ASLR. it can sometimes be positive, which will corrupt the execution flow