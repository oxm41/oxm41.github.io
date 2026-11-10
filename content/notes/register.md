### 1. x86 register

```
MSB                                   LSB 
+----------------------------------------+ 
|                  rax                   |
+--------------------+-------------------+
                     |        eax        |
                     +---------+---------+
                               |    ax   |
                               +----+----+
                               | ah | al |
							   +----+----+
```

```
+-----------------+---------------+---------------+------------+
| 8 Byte Register | Lower 4 Bytes | Lower 2 Bytes | Lower Byte |
+-----------------+---------------+---------------+------------+
|   rbp           |     ebp       |     bp        |     bpl    |
|   rsp           |     esp       |     sp        |     spl    |
|   rip           |     eip       |               |            |
|   rax           |     eax       |     ax        |     al     |
|   rbx           |     ebx       |     bx        |     bl     |
|   rcx(4th arg)  |     ecx       |     cx        |     cl     |
|   rdx(3rd arg)  |     edx       |     dx        |     dl     |
|   rsi(2nd arg)  |     esi       |     si        |     sil    |
|   rdi(1st arg)  |     edi       |     di        |     dil    |
|   r8(5th arg)   |     r8d       |     r8w       |     r8b    |
|   r9(6th arg)   |     r9d       |     r9w       |     r9b    |
|   r10           |     r10d      |     r10w      |     r10b   |
|   r11           |     r11d      |     r11w      |     r11b   |
|   r12           |     r12d      |     r12w      |     r12b   |
|   r13           |     r13d      |     r13w      |     r13b   |
|   r14           |     r14d      |     r14w      |     r14b   |
|   r15           |     r15d      |     r15w      |     r15b   |
+-----------------+---------------+---------------+------------+
```
- `ssize_t read(int fd, void *buf, size_t count);`
	fd : `rdi`
	buf : `rsi`
	count : `rdx`
- `read` doesn't automatically add null byte `\x00` at the end of input -> able to leak data (stack canary or saved rip...)
  ```
  #initialized buf
  |  buf (8 bytes)  |  Secret (8 bytes) |
  | 00 00 00 00 ... |  DE AD BE EF ...  |
  #using scanf
  | 41 42 43 00 ... |  DE AD BE EF ...  |
   ^ buf     ^ null byte to stop when printf
  #using read
  | 41 41 41 41 41 41 41 41 | DE AD BE EF ... |
   ^ buf                   ^ no null byte to stop when printf
  ```
### 3. file
- NX: prevent shellcode in stack
- PIE: randomize binary location for ***code (.text, .plt, .got) and data (.bss, .data)***
- canary: prevent RIP overwrite
- ASLR: randomize memory layout (stack/libc/heap)
- leak: print runtime addr
- unleak: find real addr via offset