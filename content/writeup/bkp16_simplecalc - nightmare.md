- `checksec`
  ![[bkp16_simplecalc_nightmare-1.png]]
- NX on, no canary -> [[bof4 - JHT|ret2syscall]] using [[ROP]] 
- decompile:
  ![[bkp16_simplecalc_nightmare-2.png]]
- test:
  ![[bkp16_simplecalc_nightmare-3.png]]
  ![[bkp16_simplecalc_nightmare-4.png]]
- so each res of a cal will be put in stack as 32bit/ 4 bytes, we will find offset:
  ![[bkp16_simplecalc_nightmare-5.png]]
- so padding will include 18 cal + ROP