### 1. KASLR
- like ASLR
- >= v4.12
### 2. SMEP
- like NX
- supervisor mode execution prevention
- prevent kernel space executing userspace's code
- >= v3.0
### 3. SMAP
- supervisor mode access prevention
- prevent kernel space access to userspace's memory
- ensure execution in userspace wont access (read/write) privileged krnel memory
- >= v3.7
### 4. KPTI
- kernel page table isolation
- split page tables in two separate sets, one for userspace and one for kernel space
- handle `meltdown` bug
- >= v4.15
![[mitigations-1.png]]
### 5. SSP
- stack smashing protector
- prevent stack bof with random canary value
- >= v2.6
### 6. CFI
- control flow integrity
- prevent OP - oriented programming techniques
- >= v5.13
### 7. KASAN
- kernel address sanitizer 
- detect OOB, UAF
- >= v4.9