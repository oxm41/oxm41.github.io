- `cat /proc/kallsyms | grep -w -E "commit_creds|prepare_kernel_cred"`
- `rp++ -f ./vmlinux --rop 6 | grep -Ei 'pop rdi ; ret|mov rdi, rax|swapgs|iretq'`
- `gcc -static -g -O0 -no-pie -o exploit exploit.c`
- `symbol-file ./vmlinux` | `file ./initramfs/exploit`
- `add-symbol-file ./initramfs/hackme.ko 0 -s .text.hackme_read addr1 -s .text.hackme_write addr2`
- `/sbin/modprobe` : search modprobe path in python
- `cat /proc/sys/kernel/modprobe`
- `cat /proc/sys/kernel/core_pattern`
- `cat /proc/kallsyms | grep startup_64`
- `add-symbol-file ./rootfs/vuln.ko 0xffffffffc0000000`: add addr base 
- `cat /sys/module/vuln/sections/.text` / doc `cat /proc/modules | grep vuln` : get the addr base (remember to get new whenever boot if kaslr is on)
- `echo 0 > /proc/sys/kernel/kptr_restrict`: reveal the addr
- `find /b 0xffffffff87800000, 0xffffffff88201000, 0x5f, 0xc3`: search `pop rdi ; ret` from... to
- find `modprobe_path` addr
  ```Python
	from pwn import *
	elf = ELF('./vmlinux')
	print(hex(next(elf.search(b'/sbin/modprobe\x00'))))
  ```
- `docker run -it --name kernel_pwn -v $(pwd):/work ubuntu:20.04 bash` : build container