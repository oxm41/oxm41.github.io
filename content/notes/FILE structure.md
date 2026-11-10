- data type in glibc to make file operation faster by using a buf (`kernel buffer`) reducing num of IO syscall
- eg: when write new data to file, instead of using `write` syscall every single time, stdio will first manage all data in buf (in memory), then move it to hard disk via `syscall` (`fwrite`)
### 1. `_IO_FILE` struct:
```C
struct _IO_FILE
{
  int _flags;		/* High-order word is _IO_MAGIC; rest is flags. */

  /* The following pointers correspond to the C++ streambuf protocol. */
  char *_IO_read_ptr;	/* Current read pointer */
  char *_IO_read_end;	/* End of get area. */
  char *_IO_read_base;	/* Start of putback+get area. */
  char *_IO_write_base;	/* Start of put area. */
  char *_IO_write_ptr;	/* Current put pointer. */
  char *_IO_write_end;	/* End of put area. */
  char *_IO_buf_base;	/* Start of reserve area. */
  char *_IO_buf_end;	/* End of reserve area. */

  /* The following fields are used to support backing up and undo. */
  char *_IO_save_base; /* Pointer to start of non-current get area. */
  char *_IO_backup_base;  /* Pointer to first valid character of backup area */
  char *_IO_save_end; /* Pointer to end of non-current get area. */

  struct _IO_marker *_markers;
  struct _IO_FILE *_chain; /* Link to other FILE type */

  int _fileno;
  int _flags2;
  __off_t _old_offset; /* This used to be _offset but it's too small.  */

  /* 1+column number of pbase(); 0 is unknown. */
  unsigned short _cur_column;
  signed char _vtable_offset;
  char _shortbuf[1];

  _IO_lock_t *_lock;
  __off64_t _offset;
  struct _IO_codecvt *_codecvt;
  struct _IO_wide_data *_wide_data; /* Point to struct similar to vtable */
  struct _IO_FILE *_freeres_list;
  void *_freeres_buf;
  size_t __pad5;
  int _mode;
  char _unused2[20];
};
```
- offset:
```C
  ```C
  pwndbg> ptype /ox FILE
	type = struct _IO_FILE {
	/* 0x0000      |  0x0004 */    int _flags;
	/* XXX  4-byte hole      */
	/* 0x0008      |  0x0008 */    char *_IO_read_ptr;
	/* 0x0010      |  0x0008 */    char *_IO_read_end;
	/* 0x0018      |  0x0008 */    char *_IO_read_base;
	/* 0x0020      |  0x0008 */    char *_IO_write_base;
	/* 0x0028      |  0x0008 */    char *_IO_write_ptr;
	/* 0x0030      |  0x0008 */    char *_IO_write_end;
	/* 0x0038      |  0x0008 */    char *_IO_buf_base;
	/* 0x0040      |  0x0008 */    char *_IO_buf_end;
	/* 0x0048      |  0x0008 */    char *_IO_save_base;
	/* 0x0050      |  0x0008 */    char *_IO_backup_base;
	/* 0x0058      |  0x0008 */    char *_IO_save_end;
	/* 0x0060      |  0x0008 */    struct _IO_marker *_markers;
	/* 0x0068      |  0x0008 */    struct _IO_FILE *_chain;         // STOP
	/* 0x0070      |  0x0004 */    int _fileno;
	/* 0x0074      |  0x0004 */    int _flags2;
	/* 0x0078      |  0x0008 */    __off_t _old_offset;
	/* 0x0080      |  0x0002 */    unsigned short _cur_column;
	/* 0x0082      |  0x0001 */    signed char _vtable_offset;
	/* 0x0083      |  0x0001 */    char _shortbuf[1];
	/* XXX  4-byte hole      */
	/* 0x0088      |  0x0008 */    _IO_lock_t *_lock;
	/* 0x0090      |  0x0008 */    __off64_t _offset;
	/* 0x0098      |  0x0008 */    struct _IO_codecvt *_codecvt;
	/* 0x00a0      |  0x0008 */    struct _IO_wide_data *_wide_data;
	/* 0x00a8      |  0x0008 */    struct _IO_FILE *_freeres_list;
	/* 0x00b0      |  0x0008 */    void *_freeres_buf;
	/* 0x00b8      |  0x0008 */    size_t __pad5;
	/* 0x00c0      |  0x0004 */    int _mode;
	/* 0x00c4      |  0x0014 */    char _unused2[20];
  ```
```
- flag useful values:
```C
#define _IO_MAGIC         0xFBAD0000 /* Magic number */
#define _IO_MAGIC_MASK    0xFFFF0000
#define _IO_USER_BUF          0x0001 /* Don't deallocate buffer on close. */
#define _IO_UNBUFFERED        0x0002
#define _IO_NO_READS          0x0004 /* Reading not allowed.  */
#define _IO_NO_WRITES         0x0008 /* Writing not allowed.  */
#define _IO_EOF_SEEN          0x0010
#define _IO_ERR_SEEN          0x0020
#define _IO_DELETE_DONT_CLOSE 0x0040 /* Don't call close(_fileno) on close.  */
#define _IO_LINKED            0x0080 /* In the list of all open files.  */
#define _IO_IN_BACKUP         0x0100
#define _IO_LINE_BUF          0x0200
#define _IO_TIED_PUT_GET      0x0400 /* Put and get pointer move in unison.  */
#define _IO_CURRENTLY_PUTTING 0x0800
#define _IO_IS_APPENDING      0x1000
#define _IO_IS_FILEBUF        0x2000 /* 0x4000  No longer used, reserved for compat.  */
#define _IO_USER_LOCK         0x8000
```
### 2. `_IO_FILE_plus` struct:
```C
struct _IO_FILE_plus
{
  FILE file;
  const struct _IO_jump_t *vtable;
};
```
- `_IO_FILE_plus` = `_IO_FILE` + `vtable`, in which `vtable` = virtual table = array of pointers to helper func during executing I/O operation
- `_IO_jump_t vtable`
```C
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
- this struct contains pointers to necessary I/O method during file procession. for eg, open a file via `fopen()`, the os will:
	- malloc FILE struct
	- add `vtable` to FILE struct
	- initialize FILE struct
	- link FILE struct to `_IO_list_all`
	- call `fopen()`
- look more closely to `fopen()` src code:
	- `vtable` is initialized with an existed one called `_IO_file_jumps`
	```C
	#define _IO_JUMPS(THIS) (THIS)->vtable
	...
	_IO_FILE *__fopen_internal (const char *filename, const char *mode, int is32)
	{
	...
	  _IO_JUMPS (&new_f->fp) = &_IO_file_jumps;
	...
	}
	```
	- when excv `_IO_FINISH(FP)`
	```C
	# define _IO_JUMPS_FUNC(THIS) (IO_validate_vtable (_IO_JUMPS_FILE_plus (THIS)))
	...
	#define JUMP1(FUNC, THIS, X1) (_IO_JUMPS_FUNC(THIS)->FUNC) (THIS, X1)
	...
	/* The 'finish' function does any final cleaning up of an _IO_FILE object.
	   It does not delete (free) it, but does everything else to finalize it.
	   It matches the streambuf::~streambuf virtual destructor.  */
	typedef void (*_IO_finish_t) (_IO_FILE *, int); /* finalize */
	#define _IO_FINISH(FP) JUMP1 (__finish, FP, 0)
	```
### 3. validation
- from glibc 2.24, program will validate `vtable` addr before calling it, so overwriting `vtable` no longer works, `IO_validate_vtable` and `_IO_vtable_check` were added
```C
static inline const struct _IO_jump_t *
IO_validate_vtable (const struct _IO_jump_t *vtable)
{
  /* Fast path: The vtable pointer is within the __libc_IO_vtables
     section.  */
  uintptr_t section_length = __stop___libc_IO_vtables - __start___libc_IO_vtables;
  const char *ptr = (const char *) vtable;
  uintptr_t offset = ptr - __start___libc_IO_vtables;
  if (__glibc_unlikely (offset >= section_length))
    /* The vtable pointer is not in the expected section.  Use the
       slow path, which will terminate the process if necessary.  */
    _IO_vtable_check ();
  return vtable;
}

void attribute_hidden
_IO_vtable_check (void)
{
#ifdef SHARED
  /* Honor the compatibility flag.  */
  void (*flag) (void) = atomic_load_relaxed (&IO_accept_foreign_vtables);
#ifdef PTR_DEMANGLE
  PTR_DEMANGLE (flag);
#endif
  if (flag == &_IO_vtable_check)
    return;

  /* In case this libc copy is in a non-default namespace, we always
     need to accept foreign vtables because there is always a
     possibility that FILE * objects are passed across the linking
     boundary.  */
  {
    Dl_info di;
    struct link_map *l;
    if (_dl_open_hook != NULL
        || (_dl_addr (_IO_vtable_check, &di, &l, NULL) != 0
            && l->l_ns != LM_ID_BASE))
      return;
  }

#else /* !SHARED */
  /* We cannot perform vtable validation in the static dlopen case
     because FILE * handles might be passed back and forth across the
     boundary.  Therefore, we disable checking in this case.  */
  if (__dlopen != NULL)
    return;
#endif

  __libc_fatal ("Fatal error: glibc detected an invalid stdio handle\n");
}
```
### 4. `_IO_list_all`
- `_IO_list_all` contains linked lists of all 3 FILE types: `_IO_2_1_stderr`, `_IO_2_1_stdout`, `_IO_2_1_stdin` 
![[FILE_structure-1.png]]
![[FILE_structure-2.png]]
- `struct _IO_FILE_plus` * `_IO_list_all` = `&_IO_2_1_stderr_`
- `stdout` can be in 3 buffering modes:
	- unbuffered (`_IONBF`): data is transmitted to the sys as soon as it is written
	- line-buffered (`_IOLBF`): data is stored in a buffer until a `\n` is encountered, at which point the entire line is flushed
	- fully-buffered (`_IOFBF`): data is saved up and only written to the dest in large blocks
### 5. [[FSOP|exploitation paths]]
- `_IO_lock_t *_lock`: set `_lock` to a writable addr with its value = NULL
- `struct _IO_FILE *_chain`: set `_chain` to fake FILE stream
- `struct _IO_wide_data *_wide_data`: set `_wide_data->vtable` = `fake_vtable`
- `JUMP_FIELD(_IO_xsputn_t, __xsputn)`
- `JUMP_FIELD(_IO_overflow_t, __overflow)` ([[house of orange]])

