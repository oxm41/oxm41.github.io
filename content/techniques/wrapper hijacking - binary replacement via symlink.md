## ***shellcode - bkisc ctf 2026***
- context: `execv` / ORW syscall seccomp and wrapper script (use the same file despite reconnecting)
- goal: link binary file with `/bin/sh` so that when wrapper calls chall, it will spawn shell
- step:
	- unlink old `cmdline` with `rax = 87`, `rdi = &cmdline`
	- link `cmdline` -> `/proc/self/environ` with `rax = 88`, `rdi = &environ`, `rsi = &cmdline` (flag is put in environ) OR `ln -s /proc/self/environ cmdline`
	- unlink old chall with `rax = 87`, `rdi = &chall`
	- link to `/bin/sh` with `rax = 88`, `rdi = &binsh`, `rsi = chall` OR `ln -s /bin/sh chall`
	- call `exit(0)` with `rax = 60`, `rdi = 0`
