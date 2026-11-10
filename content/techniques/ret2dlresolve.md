### mitigation/condition
- partial relro, PIE off, NX on, only `read`/`scanf`/`gets`, no leak libc
### [[ret2libc|PLT]] check
- `readelf -d ./chall | egrep "STRTAB|SYMTAB|JMPREL"`
``` bash
0x0000000000000005 (STRTAB)             0x400430
0x0000000000000006 (SYMTAB)             0x4003d0
0x0000000000000017 (JMPREL)             0x4004e0
```
- `readelf -d ./chall`
```bash
Dynamic section at offset 0x2e20 contains 24 entries:
  Tag        Type                         Name/Value
 0x0000000000000005 (STRTAB)             0x400430
 0x0000000000000006 (SYMTAB)             0x4003d0
 0x0000000000000017 (JMPREL)             0x4004e0
 0x0000000000000007 (RELA)               0x4004b0
```
- `readelf -S ./chall`
```bash
There are 31 section headers, starting at offset 0x3670:

Section Headers:
[Nr] Name              Type             Address           Offset
   Size              EntSize          Flags  Link  Info  Align
[6]  .dynsym           DYNSYM           00000000004003d0  000003d0
   0000000000000060  0000000000000018   A       7     1     8
[7]  .dynstr           STRTAB           0000000000400430  00000430
   0000000000000048  0000000000000000   A       0     0     1
[10] .rela.dyn         RELA             00000000004004b0  000004b0
   0000000000000030  0000000000000018   A       6     0     8
[11] .rela.plt         RELA             00000000004004e0  000004e0
   0000000000000018  0000000000000018  AI       6    24     8
[26] .bss              NOBITS           0000000000404030  00003030
   0000000000000008  0000000000000000  WA       0     0     1
[28] .symtab           SYMTAB           0000000000000000  00003060
   0000000000000348  0000000000000018          29    18     8
[29] .strtab           STRTAB           0000000000000000  000033a8
   00000000000001a5  0000000000000000           0     0     1
[30] .shstrtab         STRTAB           0000000000000000  0000354d
   000000000000011f  0000000000000000           0     0     1
```
  - `readelf -r ./chall` (JMPREL - .rela.plt for func relocation)
```bash
Relocation section '.rela.plt' at offset 0x4e0 contains 1 entry:
Offset          Info           Type           Sym. Value    Sym. Name + Addend
000000404018  000200000007 R_X86_64_JUMP_SLO 0000000000000000 read@GLIBC_2.2.5 + 0
```
### gdb check
#### JMPREL
- struct IDA
```C
00000000 struct Elf64_Rela // sizeof=0x18
00000000 {                                       // XREF: LOAD:00000000004004B0/r
00000000                                         // LOAD:00000000004004C8/r ...
00000000     unsigned __int64 r_offset;
00000008     unsigned __int64 r_info;
00000010     __int64 r_addend;
00000018 };
```
- `x/3gx <JMPREL>`
```D
pwndbg> x/3gx 0x4004e0
0x4004e0:       0x0000000000404018      0x0000000200000007 #r_offset #r_info
0x4004f0:       0x0000000000000000                         #got      #sym_num&type
```
- r_info:
	- `sym_num = 0x0000000200000007 >> 32` = 2 
	- `type = 0x0000000200000007 & 0xffffffff = 7 = R_X86_64_JUMP_SLOT`
- `x/gx <r_offset>` = `x/gx <read@got>`
```D
pwndbg> x/gx 0x0000000000404018
0x404018 <read@got.plt>:        0x0000000000401030
```
#### SYMTAB
- struct IDA
```C
00000000 struct Elf64_Sym // sizeof=0x18
00000000 {                                       // XREF: LOAD:00000000004003D0/r
00000000                                         // LOAD:00000000004003E8/r ...
00000000     unsigned __int32 st_name __offset(OFF64,0x400430);
00000004     unsigned __int8 st_info;
00000005     unsigned __int8 st_other;
00000006     unsigned __int16 st_shndx;
00000008     unsigned __int64 st_value __off;
00000010     unsigned __int64 st_size;
00000018 };
```
- `x/3xg <SYMTAB> + <sym_num> * 24`
```D
pwndbg> x/3gx 0x4003d0+2*24
0x400400:       0x0000001200000001      0x0000000000000000
0x400410:       0x0000000000000000
```
- `st_name = 0x00000001`
#### STRTAB
- `x/s <STRTAB> + <st_name>`
```D
pwndbg> x/s 0x1+0x400430
0x400431:       "read"
```

#### analysis
```D
pwndbg> x/gx 0x000000404018
   0x404018 <read@got.plt>:        0x0000000000401030
pwndbg> x/3i 0x0000000000401030
   0x401030:    endbr64
   0x401034:    push   0x0
   0x401039:    bnd jmp 0x401020
pwndbg> x/5i 0x401020
   0x401020:    push   QWORD PTR [rip+0x2fe2]        # 0x404008
   0x401026:    bnd jmp QWORD PTR [rip+0x2fe3]       # 0x404010 
   0x40102d:    nop    DWORD PTR [rax]
   0x401030:    endbr64
   0x401034:    push   0x0
```
- `0x404008 = pointer of link_map`
- `0x404010 = pointer of _dl_runtime_resolve_xsavec`
```D
pwndbg> x/xg 0x404008
0x404008:       0x00007ffff7ffe310
pwndbg> x/xg 0x404010
0x404010:       0x00007ffff7fd9610
pwndbg> x/32xg 0x00007ffff7ffe310
0x7ffff7ffe310: 0x0000000000000000      0x00007ffff7ffe8e8
                # l_addr                # l_name
0x7ffff7ffe320: 0x0000000000403e20      0x00007ffff7ffe8f0
                # l_ld                  # l_next
0x7ffff7ffe330: 0x0000000000000000      0x00007ffff7ffe310
                # l_prev                # l_real
0x7ffff7ffe340: 0x0000000000000000      0x00007ffff7ffe8d0
                # l_ns                  # l_libname
0x7ffff7ffe350: 0x0000000000000000      0x0000000000403e20
                # l_info[0]             # l_info[1]
0x7ffff7ffe360: 0x0000000000403f00      0x0000000000403ef0
                # l_info[2]             # l_info[3]
0x7ffff7ffe370: 0x0000000000000000      0x0000000000403ea0
                # l_info[4]             # l_info[DT_STRTAB]
0x7ffff7ffe380: 0x0000000000403eb0      0x0000000000403f30
                # l_info[DT_SYMTAB]     # l_info[7]
0x7ffff7ffe390: 0x0000000000403f40      0x0000000000403f50
0x7ffff7ffe3a0: 0x0000000000403ec0      0x0000000000403ed0
0x7ffff7ffe3b0: 0x0000000000403e30      0x0000000000403e40
0x7ffff7ffe3c0: 0x0000000000000000      0x0000000000000000
0x7ffff7ffe3d0: 0x0000000000000000      0x0000000000000000
0x7ffff7ffe3e0: 0x0000000000000000      0x0000000000000000
0x7ffff7ffe3f0: 0x0000000000403f10      0x0000000000403ee0
0x7ffff7ffe400: 0x0000000000000000      0x0000000000403f20
                # l_info[22]            # l_info[DT_JMPREL]
pwndbg> x/10i 0x00007ffff7fd9610
   0x7ffff7fd9610 <_dl_runtime_resolve_xsavec>: push   rbx
   0x7ffff7fd9611 <_dl_runtime_resolve_xsavec+1>:       mov    rbx,rsp
   0x7ffff7fd9614 <_dl_runtime_resolve_xsavec+4>:       and    rsp,0xffffffffffffffc0
   0x7ffff7fd9618 <_dl_runtime_resolve_xsavec+8>:       sub    rsp,QWORD PTR [rip+0x23631]        # 0x7ffff7ffcc50 <_rtld_global_ro+464>
 .
 .
 .
   0x7ffff7fd9681 <_dl_runtime_resolve_xsavec+113>:     mov    rdi,QWORD PTR [rbx+0x8]
   0x7ffff7fd9685 <_dl_runtime_resolve_xsavec+117>:     call   0x7ffff7fd7250 <_dl_fixup>
```
- func `_dl_runtime_resolve_xsavec` call `_dl_fixup(link_map, reloc_arg)`
- `reloc_arg` = idx of JMPREL
- `x/2xg <DT_STRTAB>`
```D
pwndbg> x/2gx 0x0000000000403ea0
0x403ea0:       0x0000000000000005      0x0000000000400430 # STRTAB
```
- `x/2xg <DT_JMPREL>`
```D
pwndbg> x/2xg 0x0000000000403f20
0x403f20:       0x0000000000000017      0x00000000004004e0 # JMPREL
```
- since `0x401034: push 0x0` -> `reloc_arg = 0`
- `x/3xg <JMPREL> + <reloc_arg>*24`
```D
pwndbg> x/3xg 0x00000000004004e0 + 0*24
0x4004e0:       0x0000000000404018      0x0000000200000007
0x4004f0:       0x0000000000000000
```
- `x/3xg <SYMTAB> + <sym_num> * 24`
```D
pwndbg> x/3xg 0x00000000004003d0 + 2*24
0x400400:       0x0000001200000001      0x0000000000000000
0x400410:       0x0000000000000000
```
### exploit
- recall func `_dl_runtime_resolve_xsavec` call `_dl_fixup(link_map, reloc_arg)`
- so if we fake `link_map` or `reloc_arg` or both of them, to fake string name of a func so when it resolves, it will find the func correspond to string name
#### fake `reloc_arg`
-  `<addr of Elf64_Sym> = <SYMTAB> + <sym_num> * 24` 
-> `<sym_num> = (<addr of Elf64_Sym> - <SYMTAB>)/24`
- `<addr of Elf64_Rela> = <JMPREL> + <reloc_arg> * 24`
-> `<reloc_arg> = (<addr of Elf64_Rela> - <JMPREL>)/24
- `STRTAB_addr = <random_addr>` -> `<st_name> = <STRTAB_addr> - <STRTAB>`
#### fake structure
- struct `Elf64_Sym`
```C
00000000 struct Elf64_Sym // sizeof=0x18
00000000 {
00000000     unsigned __int32 st_name __offset(OFF64,0x400430);
00000004     unsigned __int8 st_info;
00000005     unsigned __int8 st_other;
00000006     unsigned __int16 st_shndx;
00000008     unsigned __int64 st_value __off;
00000010     unsigned __int64 st_size;
00000018 };
```
- `0x0000001200000001 = p32(0x00000001) + p8(0x12) + p8(00) + p16(0x0000) + p64(0) + p64(0)` 
- struct `Elf_Rela`
```C
00000000 struct Elf64_Rela // sizeof=0x18
00000000 {
00000000     unsigned __int64 r_offset;
00000008     unsigned __int64 r_info;
00000010     __int64 r_addend;
00000018 };
```