## I. format specifier
### 1. leak
- `%<number>$p` : read <num_ber>th address (0x) on stack. first 5 `%p` will print 5 value in 5 reg, stack begin at 6th `%p`
- `%x`/`%X` : value as hexa
- `%d`/`%ld` : value as (long) decimal
- `%u`/`%lu` : value as long unsigned
### 2. attack
#### a. arbitrary read
- `%<offset>$s` : print value of pointer at <off_set> address until `\x00`
- `%<offset>$p` : print value at <off_set> address until `\x00`
#### b. arbitrary write
- `%<val>c%<offset+1>$n`: write 4/8 bytes value
- `%<val>c%<offset+1>$hn` : write 2 bytes
- `%<val>c%<offset+1>$hhn` : write 1 byte
- `%*<offset_1>c%<offset_2+1>$n/hn/hhn` : write number of padding = value at offset_1 to offset_2+1 

## II. 
### 1. put dest_addr at the end of payload bc `printf` will end when meet `null` byte
### 2. offset = ((? - $rsp)/8 + 6)
### 3. overwrite printf.got | strlen.got by system.plt
### 4. `*` to print padding
### 5. format string full form (overwrite ultimate data)>< short form (overwrite a pointer points to another (2nd))
### 6. priority sequence: full form -> short form
## remind: to write arb, we need to know the target addr, since offset will take that value on stack, use it as an addr to write in