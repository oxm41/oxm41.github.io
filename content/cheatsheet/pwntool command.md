- `target = process("./challenge")`
- `target = remote("github.com", 9000)`
- `gdb.attach(target)`
- `gdb.attach(target, gdbscript='b *main')`
- `target.send(x)`
- `target.sendline(x)` : send but w a newline
- `print target.recvline()` : print single line from target
- `print target.recvuntil("out")` : print all text from target up to str "out"
- `elf.sys['<function_name>']` 
- convert data:
  ```python
	from pwn import *
	
	# 1. Start with a string
	s = "pwn!"
	# 2. Convert to Bytes
	b = s.encode()  
	print(f"Bytes: {b}") # b'pwn!'
	# 3. Convert to Hex using enhex
	h = enhex(b)
	print(f"Hex: {h}")   # 70776e21
	# 4. Convert to Integer using u32 (for 4 bytes)
	i = u32(b)
	print(f"Int (Decimal): {i}")      # 560887664
	print(f"Int (Hex): {hex(i)}")     # 0x216e7770
  ```