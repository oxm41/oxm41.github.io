- goal: overwrite top chunk's size field w massive value -> trick `malloc` into wrapping around virtual addr to reach target at a lower/higher addr -> arbitrary write
- prerequisite: heap (top chunk) + libc/binary leak (GOT)
![[house_of_force-1.png]]
- one sample path:
	- leak target addr: GOT, `__malloc_hook`, `__free_hook`,...
	- use heap overflow to overwrite top chunk size w large value: -1 or 0xfffffffff
	- find dist btw target addr - 0x20 and top chunk size addr - 0x8 *(bc new chunk will be allocated at addr of top chunk size - 0x8 and target addr -> have to put new top chunk size addr at target addr - 0x8 and target addr - 0x20 is for 0x10 chunk metadata)*
	- call `malloc()` to fill in offset
	- call `malloc(size)` once again. this new chunk is allocated exactly over target addr
	- arbitrary write: write payload