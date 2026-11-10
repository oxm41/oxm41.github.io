#### [[x86 64bit ccc.pdf|64bit]] vs [[x86 32bit ccc.pdf|32bit]]
- `call func` or (`sub rsp, 8` and `mov [rsp], <next_ins>` and `jmp func`) : push next ins to stack (saved rip)
- `push rbp` or (`sub rsp, 8` and `mov [rsp], rbp` ) : address value of rbp is now on top of stack
- `mov rbp, rsp` : set rbp = rsp address value
- `sub rsp, N` : space for local var, buf
- ... func runnning
- `leave` or (`mov rsp, rbp` and `pop rbp`) :
	- set rsp = rbp address value, which is saved rbp, to remove N bytes of local var, buf
	- `pop rbp` or (`mov rbp, [rsp]` and `add rsp, 8`) : set rbp = value at rsp, which is main's rbp address
- `ret` or (`mov rip, [rsp]` and `add rsp, 8`) : jump to saved rip