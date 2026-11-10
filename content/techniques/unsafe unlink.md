- goal: unlink victim's chunk by forging `prev_size` and `flags` indicating prev chunk not used, modify `fd` and `bk` pointers so that it will overwrite value at `fd+0x18` = `bk`
- `unlink` macro is called when a chunk is removed from a bin
	```C
		#define unlink(P, BK, FD)
	{
	    FD = P->fd;
	    BK = P->bk;
	    FD->bk = BK;
	    BK->fd = FD;
	}
	```
- if we set `FD = target_addr-0x18`, `BK = desired_addr`, after unlink:
	```C
	FD->bk or FD+0x18 = target_addr = desired_addr
	BK->fd or BK+0x10 = desired_addr + 0x10 = target_addr-0x18
	```
- since `BK->fd = FD` will corrupt asm code -> use `jmp` to skip
- one sample path:
	- setup: malloc chunk A, B
	- edit chunk A: set forged pointers: `fd = target_addr - 0x18` and `bk = shellcode_addr`; write shellcode starting w `jmp`
	- overwrite: modify chunk B's header w `prev_size = prev chunk's size; cur_size = B's size` and clear `prev_inuse` bit (flags = 0)
	- trigger unlink: `free(chunk_B)`, `malloc` checks flags, assumes chunk A alr freed, consolidates backwards by calling `unlink(chunk_A)`
	- arbitrary write: macro successfully overwrites `target_addr = shellcode_addr`
	- execution: trigger hijacked GOT entry