- goal: bypass modern safe unlink mitigation to achieve an arbitrary write
- prerequisite: known memory addr (.bss) that stores pointer of allocated chunk
- same as [[unsafe unlink]], but system adds safe mitigation:
	```C
     1459   if (__builtin_expect (fd->bk != p || bk->fd != p, 0))
	 ► 1460     malloc_printerr ("corrupted double-linked list");
	
	#define unlink(P, BK, FD)
	{
	    FD = P->fd;
	    BK = P->bk;
	    FD->bk = BK; // FD->bk or FD+0x18 = target_addr = desired_addr
	    BK->fd = FD; // BK->fd or BK+0x10 = desired_addr + 0x10 = target_addr-0x18
	}
	```
- one sample path:
	- forge pointers: set `fd = target_addr - 0x18` and `bk = target_addr - 0x10` (where target_addr is the addr storing chunk A's pointer)
	- overflow: overflow from chunk A into chunk B's header. modify `B->prev_size` to point back to fake chunk, for eg `prev_size-0x10`, and clear B->size's `PREV_INUSE` bit. fake chunk by starting w, for eg, `0x0` and  `chunk_size` bc pointer will save as chunk A + 0x10
	- trigger unlink: call `free(B)`. `malloc` sees chunk A is "free", triggers backward consolidation, and unlinks chunk A
	- arbitrary write: unlink macro executes (`FD->bk = BK; BK->fd = FD`) and safely overwrites pointer in .bss w addr `target_addr - 0x18`
	- continue arbitrary write: edit chunk A (`target_addr - 0x18`) by padding 0x18 bytes + actual target addr (GOT like `__free_hook`, or `__free_hook - 0x8`). edit chunk A again to write directly to victim's addr, for eg `b'/bin/sh\x00' + system()` 