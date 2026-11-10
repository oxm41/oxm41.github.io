## 1. [[pop rdi - dreamhack|pop rdi]]
- double pivot to `.bss` to get a libc leak after `scanf()`
- set up payload on `.bss` so that we can control `rbx`, `rbp` with `pop rbx`, `pop rbp` in `puts()`
- then use `add dword ptr [rbp - 0x3d], ebx ; nop ; ret` gadget to modify that leaked libc addr to one gadget
## 2. [[operator - dreamhack|operator]]
## 3. [[validator-revenge - dreamhack|validator-revenge]]
## 4. [[basic FSOP - dreamhack|basic FSOP]]
- modify `_chains` -> fsop through `_IO_list_all` (path pwn_college - win and leak)
## 5. baby-rop
- 0x10 bof, limited gadgets
