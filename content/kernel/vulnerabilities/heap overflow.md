## 1. general
- most of modules will alloc memory on heap via `kmalloc()`
- 3 distributors:
	- SLAB
	- SLUB (only obj of same size will be allocated from the same `kmem_cache` region)
	- SLOB
- kernel heap is shared universally by drives and kernel -> a vuln in ONE driver can be used to corrupted another obj in kernel space
- for eg: 0x400 - `tty_struct` (~0x2c0) using `/dev/ptmx` (as vuln module alloc from kmalloc-1024 region)
	```C
	struct tty_struct {
		int	magic;
		struct kref kref;
		struct device *dev;	/* class device or NULL (e.g. ptys, serdev) */
		struct tty_driver *driver;
		const struct tty_operations *ops;
		    // ...
	} __randomize_layout;
	
	struct tty_operations {
		struct tty_struct * (*lookup)(struct tty_driver *driver, struct file *filp, int idx);
		int  (*install)(struct tty_driver *driver, struct tty_struct *tty);
		void (*remove)(struct tty_driver *driver, struct tty_struct *tty);
		int  (*open)(struct tty_struct * tty, struct file * filp);
		void (*close)(struct tty_struct * tty, struct file * filp);
		void (*shutdown)(struct tty_struct *tty);
		void (*cleanup)(struct tty_struct *tty);
		ssize_t (*write)(struct tty_struct *tty, const u8 *buf, size_t count);
		int  (*put_char)(struct tty_struct *tty, u8 ch);
		void (*flush_chars)(struct tty_struct *tty);
		unsigned int (*write_room)(struct tty_struct *tty);
		unsigned int (*chars_in_buffer)(struct tty_struct *tty);
		int  (*ioctl)(struct tty_struct *tty, unsigned int cmd, unsigned long arg);
			//...
	} __randomize_layout;
	```
## 2. explanation
- the idea is to spray the vuln module in between blocks of other same-size structs on heap -> hof will overwrite some important ptr of struct below -> AAR/AAW
- to find which ptr, can check source code. in this case, it is `ops` and `ops->ioctl`
## 3. paths
- aaw/aar: control rdx rcx, using gadgets  mov [rdx], rcx ; mov eax, [rdx]