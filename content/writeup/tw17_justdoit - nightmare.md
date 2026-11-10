- `file ./just_do_it` -> `checksec --file ./just_do_it`
  ![[tw17_justdoit_nightmare-1.png]]
- decompile
  ![[tw17_justdoit_nightmare-2.png]]
  ![[tw17_justdoit_nightmare-3.png]]
- goal: set s = 'P@SSW0RD'
- but we need `sendlineafter` or newline to input less than 31 bytes -> add `\x00` at the end
- payload:
  ```python
	p.sendlineafter(b'Input the password.\n', b"P@SSW0RD" + b'\x00')
  ```