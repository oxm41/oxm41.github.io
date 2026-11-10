## 1. start
## 2. orw
## 3. calc
- ***bof -> ROP -> ret2syscall 32bit***
- if input "+XXX", it will jump to addr = `*buf + XXX*4`
- add "+"/"-" after will add/subtract the value at the addr
- so use one input to leak, one to modify value
## 4. 3x17
- ***ROP -> ret2syscall 64bit***
- overwrite `_fini_array` = main to get loop
- remember, `_fini_array` has 2 ptrs, and it will iterate backwards
- so `_fini_array` = `libc_csu_fini`, `_fini_array + 0x8` = `main`
- overwrite ROP chain from `_fini_array + 0x10`
- as we dont have libc addr, using gadget `mov [rdi], rdx; ret` to store binsh addr
- finally, overwrite `_fini_array` = `leave_ret` again to trigger ROP (bcoz in `libc_csu_fini`, `rbp` = `fini_start` = `_fini_array`, when `main` runs, it will push stack to `_fini_array + 0x10`)
## 5. dubblesort
- ***bof -> ROP -> [[ret2libc]] 32bit***
- bof by adding enough number of numbers
- input `name[28]` to leak libc (`libc.got.plt`)
- scanf "+" to pass canary
## 6. hacknote
- ***UAF -> [[fastbin dup]] -> arb read/write***
- typical heap chall: add (5 slots), free, print
- modify addr of content = a got addr -> leak libc (keep `print_content` func)
- overwrite `print_content` func = `system`, addr of content = `;sh\x00`
## 7. silver bullet
- ***OBN -> bof -> ROP -> ret2libc***
- OBN in `powerup` func -> overwrite len to create a bof bug
- leak libc by `puts(puts@got)` -> ret2main -> ret2libc
## 8. critical heap
- ***[[environment variable modification]] -> leak flag on heap -> fmtstr -> arb write/read***
- uninitialized name to leak libc/stack, but wont be used in this chall
- set env with name = "TZ", value = ":" + dir to flag, eg ":/home/critical_heap++/flag"
- trigger `localtime()` to write flag on heap
- abuse fmtstr to leak heap on bss and write out flag on heap
## 9. applestore
- buy at a specific price to get a stack ptr on heap, called `27`
- read buf is at the pos of `27->next_ptr->name`, or `28->name`
- b"4" or 0x34, coincidentally LSB of `_libc_start_main@got` -> input b"4" + 3 MSB of that got to leak libc
- leak stack via `environ`, `28->next_ptr` = libc addr has `environ` -> input b"4" + 3 MSB of that got + that libc addr
- stack pivot via `delete()`, which set `cur->next_ptr->prev_ptr` = `cur->prev_ptr`, `cur->prev_ptr->next_ptr` = `cur->next_ptr`
- set `28->next_ptr` = `delete()`'s `saved_rbp`-0xc -> `28->next_ptr->prev_ptr` or (`saved_rbp`-0xc)+0xc = a got addr -> `28->prev_ptr` must be that got addr
- read buf = saved_rbp - 0x22
- in `cart()` it calls `atoi()` first -> overwrite `*atoi@got` = `system` + `b";sh\x00"` -> `saved rbp` = `atoi@got + 0x22` to set read buf = `atoi@got` -> `28->prev_ptr` = `atoi@got + 0x22`
## 10. re-alloc
- UAF [[heap trick|(#15)]]
- 4 steps:
	- `realloc_func()` doesnt check valid size -> realloc ptr with size = 0 to free that chunk w/o reset ptr in bss = null
	- remember to `realloc(0x18)` again to clear key to double free
	- tcache poisoning with `realloc(0x18)`
	- `rfree()` doesnt check valid ptr -> realloc ptr = null to malloc w/o set ptr in bss (0x20 by default)
- *stage 1:* overwrite `atoll@got` = `printf@plt` to trigger fmtstr to leak libc
- dbf and tcache poisoning again
- in `realloc_func()`, idx = number of input character, size = hex number; in `rfree()` and `alloc()`, idx = hex number, size = number of input character
- *stage 2:* abuse fmtstr to reset `heap` ptr on bss to null (to use `rfree()` later)
- *stage 3:* overwrite `atoll@got` = `system@libc` and input idx = `/bin/sh\x00`
## 11. tcache-tear
- DBF -> fsop
- free 4 times to get 4 tcache chunks -> tcache `[4]: cur_chunk <- cur_chunk`
- alloc same size again to overwrite `fd` = stdout on bss -> tcache `[3]: cur chunk -> stdout -> _IO_2_1_stdout_`
- libc leak by blind leak, overwrite LSB of `_IO_write_base` to `\x00`  [[FSOP|(IV. stdout 0.5)]]
- now fsop in glibc 2.27, path following [here](https://faraz.faith/2020-10-13-FSOP-lazynote/). see note at [[FSOP|c. glibc 2.27 - II. advanced fsop attack]]
## 12. seethefile
- orw actions -> fsop glibc 2.23
- leak libc by `/proc/self/maps` (loop as read buf is limited)
- bof in name buf to fp ptr -> overwrite with fake fp addr
- path: `fclose(fp)` -> `_IO_new_fclose(fp)` -> `_IO_new_file_close_it(fp)` -> `fp->vtable->__close`
- overwrite `vtable.__close` = `system`; `flags` = `b"sh;\x00"`
- source code:
	```C
	int
	_IO_new_fclose (_IO_FILE *fp)
	{
	  int status;
	
	  CHECK_FILE(fp, EOF);
	
	  if (_IO_vtable_offset (fp) != 0)                             // vtable_offset == 0
	    return _IO_old_fclose (fp);
	#endif
	  ...
	  _IO_acquire_lock (fp);                                       // lock = [null]
	  if (fp->_IO_file_flags & _IO_IS_FILEBUF)                     // flag condition
	    status = _IO_file_close_it (fp);                           // HERE
	  ...
	}
	
	int
	_IO_new_file_close_it (_IO_FILE *fp)
	{
	  int write_status;
	  if (!_IO_file_is_open (fp))
	    return EOF;
	  ...
	  int close_status = ((fp->_flags2 & _IO_FLAGS2_NOCLOSE) == 0
			      ? _IO_SYSCLOSE (fp) : 0);                        // HERE
	  ...
	}
	
	#define _IO_SYSCLOSE(FP) JUMP0 (__close, FP)
	```
## 13. babystack
- over brute force lol
- leak `key1`, `key2` using `login()`. these serve as custom canary for later ROP

## 14. death-note
- No NX -> shellcode
- `add_note` has oob idx -> overwrite got with addr of shellcode
- shellcode restrictions: char > 0x1f and <= 0xf
- useful command: `push`, `pop`, `sub`, `jz/jnz`, `AND`
- to trigger `execve("/bin/sh", 0, 0)`:
	- eax = 0xb
	- ebx = addr of binsh
	- ecx, edx = 0
	- call int 0x80
- `free()` sets `ecx`, `edx` = 0, `eax` = addr of chunk, so the problem is `int 0x80`, or `\xcd\x80`
- to set ebx = addr of binsh, add a note with name "/bin/sh"
- free that chunk -> eax = addr of binsh -> `push eax` -> `pop ebx` -> ebx = addr of binsh
- replace `xor eax, eax` with `AND eax, 0x55555555 ; AND eax, 0x2a2a2a2a`
- cant use `jmp`, `call`; `jz/jnz` uses offset to jump -> must set `int 0x80` on heap (near shellcode addr)
- so we will set a value on heap, for eg 0x30303030 and use `sub [ebx + offset], eax` to get `\xcd\x80` on heap to jmp into later
## 15. spirited away
- ***bof -> fastbin poisoning on stack -> ROP -> ret2system 32bit***
- uninitialized var to leak libc + stack
- `sprintf()` will overwrite `name_size` to larger size when loop >= 0x100 times -> bof -> overwrite `name` ptr to fake chunk addr on stack (in `reason[80]` as its adjacent to saved rip)
- as it alloc using `malloc(0x3c)`, not `malloc(name_size)` -> re-alloc chunk w size 0x40 on stack for `name` but read 0x6e -> bof
- overwrite saved rip -> ret2system 
## 16. secret garden
- ***UAF -> fastbin dup -> one gadget***
- `remove()` free `name` chunk + set `is_planted` = 0, no check if `name` chunk is alr freed
- `clean()` free struct chunk + set struct ptr on bss = 0
- leak libc by removing name chunk and realloc again
- abuse UAF after `remove()` to create heap consolidation -> `name` ptr still available to dbf
- create fake chunk in that consolidated chunk so that the chunk size is in fastbin
- overwrite `__malloc_hook` with one gadget 
- normal malloc won't trigger as constraints aren't satisfied -> free `__malloc_hook` chunk
- as the addr of that chunk isn't aligned => `free` -> `_int_free` -> `malloc_printerr` -> `__libc_message` -> `backtrace` -> `malloc` -> `__malloc_hook` -> one gadget
## 17. book writer
- ***[[house of orange]]***
- be careful with stdin buffer, ideally use 0x18 chunk size
- leak heap via author's name
- set the 9th ptr = null -> overwrite 8th ptr's size = large num -> heap overflow
- overwrite top chunk size -> unsorted bin -> leak libc
- fake FILE struct:
	```python
	fd = 0xdeadbeef
	bk = libc.sym["_IO_list_all"] - 0x10
	size = 0x61
	flags = b'/bin/sh\x00'
	write_base = 0x1
	write_ptr = 0x10
	overflow = libc.sym.system
	mode = 0x0
	
	payload = b"x"*offset + flags + p64(size) +\
		p64(fd) + p64(bk) +\
		p64(write_base) + p64(write_ptr) +\
		p64(0x0)*18 + p32(mode) + p32(0x0) + p64(0x0) +\
		p64(overflow) + p64(heap + overflow_offset - 0x18) #in older glibc, fp->overflow at 0x18
	```
## 18. heap paradise
- ***#14. [[heap trick|stdout 0.5 - blind leak]]***
- super duper heap fengshui with limited (15) slots