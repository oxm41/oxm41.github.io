## I. 2024
### 1. pwn1
- ret2win
- HOF in `update_owner` -> overwrite data ptr to leak stack, canary, binary addr
- BOF in `update_message` -> overwrite saved rip -> ret2win
### 2. pwn2
- UAF
- `view_note()` will call `found idx` -> overwrite id var in NOTE struct with `win()` addr
- create 2 notes with a content size = size of NOTE struct
- free both: note2 -> content2 -> note1 -> content1
- create new note with different content size so that it only takes out note2 chunk
- create new note with same content size so that new note chunk = content2, new note content chunk = note1
- view note1 to call `win()`
### 3. pwn3
- uninitialized stack
- if last 7 bytes of `name` = a got addr -> that's also the ptr of a Data struct
- so Data->content also points to a got addr -> leak libc
- overwrite `scanf@got` = one gadget
## II. 2025
### 1. pwn1
- HOF in `Read_Graph()`
- first create new node and read data size < 0x10 -> later, read buf will begin at the last data size + 1
- overwrite `func_ptr` ptr = `call_me()` 
### 2. pwn2
- `strdup` in `add_user()` without memset -> leak libc 
- HOF in `edit_user()` as read 0x100, not prev data size
- create 2 users, abuse HOF in user 1 to overwrite content ptr of user 2 with `_IO_2_1_stdout`
- fsop
### 3. pwn3
- race condition - toctou
- buy 4 pokemons
- brute force to get `sleep(2)` in `use_item` (item "Auto Pokemon Finder") -> 2 concurrent processing threads 
- `start_routine` thread will add one pokemon ptr on bss, in the same time, in parent thread, also buy one pokemon -> pokemon count = 6, while max limits at 5
- the 6th pokemon ptr will overwrite trainer ptr on bss -> now trainer ptr = 6th pokemon ptr
- leak binary addr as POKEMON struct include a func ptr (sound func) in the pos of quote in TRAINER struct
- overwrite sound func of POKEMON struct with `puts@plt` as rdi = `fun_file`, a libc addr -> leak libc
- now overwrite sound func with one gadget
