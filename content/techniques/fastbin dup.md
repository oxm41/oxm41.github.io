- goal: double free a chunk in fastbin (<= 0x78 bytes) to trick `malloc` into returning a pointer to an arbitrary target addr
- fastbin mitigation only checks if freed chunk is the exact same as the chunk currently at the top/head of the bin `(if (old == p))` -> malloc more than one chunk -> free all -> free a different chunk in between again -> [[double free]]
- and remember when allocate chunk from fake addr, we have to ***set up heap metadata first (chunk size field)***
- one sample path:
	- allocate: `A = malloc(size); B = malloc(size);`
	- double free: `free(A); free(B); free(A);`
		*fastbin state: `head -> A -> B -> A`*
	- poison `fd` pointer: call `malloc(size)` (this returns chunk A. write your` fake_chunk_addr` into A's user data. bc A is still linked in fastbin, writing to its user data overwrites its `fd` pointer)
		*fastbin state: `head -> B -> A -> fake_chunk_addr`*
	- flush bin: call `malloc(size)` -> returns B. call `malloc(size)` -> returns A (again)
		*fastbin state: `head -> fake_chunk_addr`*
	- arbitrary allocation-write: call `malloc(size)` -> `malloc` allocates and returns your `fake_chunk_addr` -> write payload into this chunk
##### ***advanced tricks*** *(check **heaplab** challs for more details)*
1. fake size forging (target alignment)
	- context: when redirecting a fastbin chunk to an arbitrary target (like `malloc_hook`), malloc checks if chunk's size field matches fastbin idx
	- trick: scan memory slightly above target for bytes that look like a valid size. for eg, a `0x7f `byte is commonly found near `malloc_hook` in libc
	- execution: set `fake_chunk_addr` to `misaligned_addr - 0x8` so malloc parses that `0x7f` as chunk size. once allocated, pad payload to reach actual target addr
2. direct `main_arena` hijacking
	- fastbins: we can bypass need for a traditional double-free by overwriting fastbin head pointers stored directly inside `main_arena`. this allows to point the bin at fake chunk
	- top chunk (older glibc): we can control exactly where new chunks are allocated by overwriting the `top_chunk` addr pointer inside `main_arena`. this instantly teleports the "top of the heap" to an arbitrary addr
3. `one_gadget` constraint bypass (`dash` fallback)
	- error: sometimes `one_gadget` fails bc a reg constraint isn't perfectly met (eg, a reg != `NULL`). system will fall back to an `execve` thread called `dash` (standard ubuntu command interpreter)
	- cause: `dash` looks at `arg[1]`. if payload padded that space w garbage (like `b'GGGG'`), dash thinks it's a filename, tries to open it, fails, and crashes
	- fix: change padding data from garbage to `b'-s\0'`. when `dash` exev, it reads `arg[1] = -s` and switches to read mode (**stdin**). this forces shell to open and wait for input
	![[fastbin_dup-1.png]]![[fastbin_dup-2.png]]