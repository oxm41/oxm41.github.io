- `checks`
  ![[inctf17_stupidrop_nightmare-1.png]]
- decompile:
  ```C
	int __fastcall main(int argc, const char **argv, const char **envp){
	  _BYTE v4[48]; // [rsp+0h] [rbp-30h] BYREF
	  setvbuf(_bss_start, 0LL, 2, 0LL);
	  alarm(32u);
	  gets(v4);
	  return 0;
	}
  ```
- NX on, no RAX gadget -> [[SROP]] via `alarm`
- 