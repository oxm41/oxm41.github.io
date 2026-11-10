## I. ***s3idc3rt - kma ctf 2026***
- set env `GLIBC_TUNABLES` = value `glibc.malloc.perturb=XX`, which XX is a non-zero byte value (such as an ASCII character), to set default heap padding is different from null -> leak data
- `GLIBC_TUNABLES=glibc.malloc.perturb=XX`
## II. ***critical heap - pwnable.tw***
- set env with name = `"TZ"` (timezone), value = ":" + dir to flag, eg value = `":/home/critical_heap++/flag"`
- trigger `localtime()` to parse custom timezone (flag) on heap
- `TZ=":/home/critical_heap++/flag"`