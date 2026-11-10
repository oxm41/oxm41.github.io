## jump to another func n return to main func
### 1. redirect
- goal: override the value of saved rbp of sub func -> rsp becomes controlled -> ret takes new RIP from fake stack (saved rip is next instruction after func ret)
- note: it is the VALUE of saved rbp, otherwise if it of rip, same as ret2win
- bc [[func epilogue]]:
	- `leave` or (`mov rsp, rbp` and `pop rbp`) : set rsp = rbp address value, which is saved rbp, to remove N bytes of local var, buf
		- `pop rbp` or (`mov rbp, [rsp]` and `add rsp, 8`) : set rbp = value at rsp, which is main's rbp address
	- `ret` or (`mov rip, [rsp]` and `add rsp, 8`) : jump to saved rip
### 2. change var
- actually it is redirecting rip to address that save new value (above)
### 3. off-by-one
- overwrite LSB of saved rbp using `null` byte, or `\x00`

## note
1. `pop rsp` - direct pivot: use when can't overwrite directly on stack, jump to fake ROP immediately
2. `pop rbp` - indirect pivot w `leave; ret`: able to overwrite `saved_rbp` n `saved_rip` on stack
- require: 2 consecutive `leave`, `saved_rbp` = addr of fake stack, `saved_rip` = `leave; ret`
- flow:
	- `leave 1` (function): pops `addr_of_fake_stack` into `rbp` (poisons `rbp`)
	- `ret 1`: jumps to the `leave; ret` gadget
	- `leave 2` (gadget): exec `mov rsp, rbp` -> `rsp` is officially pivoted to the fake stack. 
	- _(note: fake stack needs 8 bytes of padding at the start to absorb the `pop rbp` that immediately follows)
	- `ret 2`: exec the ROP chain on the fake stack