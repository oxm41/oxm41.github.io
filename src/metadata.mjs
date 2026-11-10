// Optional per-note overrides. Keys are source filenames without .md.
// You can also put title/category/topic/tags/platform/arch/glibc/draft in Markdown frontmatter.
export const overrides = {
  heap: { title: 'Heap & memory allocator', description: 'arenas, malloc chunks, tcache, fastbins, and how glibc allocates memory.', topic: 'Heap', tags: ['heap', 'glibc', 'malloc'], featured: 1 },
  'FILE structure': { title: 'FILE structure', description: '_IO_FILE layout, vtables, and validation in glibc.', topic: 'FSOP & glibc', tags: ['glibc', 'file-structure', 'stdio'], featured: 5 },
  register: { title: 'Registers & memory', description: 'x86 registers, function arguments, and binary mitigations.', topic: 'Assembly & ABI', tags: ['assembly', 'registers', 'mitigations'], featured: 7 },
  'func epilogue': { title: 'Function prologue & epilogue', topic: 'Assembly & ABI', tags: ['assembly', 'stack', 'calling-convention'] },
  cpp: { title: 'C++ internals', topic: 'C++', tags: ['cpp', 'vtable', 'vector', 'string'] },
  'heap trick': { title: 'Heap tricks', category: 'techniques', description: 'overlapping chunks, blind leaks, consolidation, and tcache internals.', topic: 'Heap', tags: ['heap', 'glibc', 'heap-feng-shui'], featured: 8 },
  FSOP: { description: 'arbitrary reads and writes through FILE streams, wide vtables, and stdout.', topic: 'FSOP & glibc', tags: ['fsop', 'glibc', 'stdout'], featured: 2 },
  'tcache poisoning': { title: 'Tcache poisoning', description: 'tcache forward pointers, arbitrary allocation, and safe-linking.', topic: 'Heap', tags: ['heap', 'tcache', 'safe-linking'], featured: 3 },
  ret2libc: { description: 'libc leaks through the GOT, ROP chains, and stack alignment on x86 and x64.', topic: 'Stack & ROP', tags: ['stack', 'rop', 'ret2libc'], featured: 4 },
  'format string': { title: 'Format string', description: 'format specifiers, address leaks, and arbitrary reads and writes with printf.', topic: 'Format string', tags: ['format-string', 'printf', 'arbitrary-write'], featured: 6 },
  'exit handler': { title: 'Exit handler', topic: 'FSOP & glibc', tags: ['glibc', 'exit-handler', 'pointer-mangling'] },
  angelboy: { title: 'FILE stream arbitrary read/write', topic: 'FSOP & glibc', tags: ['fsop', 'file-structure', 'arbitrary-write'] },
  'heap seccomp orw': { title: 'Heap exploitation under seccomp', topic: 'FSOP & glibc', tags: ['heap', 'seccomp', 'orw', 'fsop'], glibc: ['2.31', '2.39'] },
  'nss_module': { title: 'NSS module internals', topic: 'FSOP & glibc', tags: ['glibc', 'nss'] },
  'malloc_par struct exploit': { title: 'malloc_par structure', topic: 'Heap', tags: ['heap', 'glibc', 'tcache'] },
  'environment variable modification': { title: 'Environment variable tricks', topic: 'other', tags: ['environment', 'glibc'] },
  'wrapper hijacking - binary replacement via symlink': { title: 'Wrapper hijacking via symlink', topic: 'other', tags: ['symlink', 'shellcode', 'wrapper'] },
  'gdb debug': { title: 'GDB / pwndbg', description: 'breakpoints, memory inspection, registers, and common debugging commands.', topic: 'Debugging', tags: ['gdb', 'pwndbg', 'debugging'] },
  'pwntool command': { title: 'Pwntools', topic: 'Tools', tags: ['pwntools', 'python'] },
  'kali command': { title: 'Linux & Kali commands', topic: 'Tools', tags: ['linux', 'kali', 'shell'] },
  'asm script': { title: 'Assembly snippets', topic: 'Assembly & ABI', tags: ['assembly', 'shellcode', 'syscall'] },
  'script template': { title: 'Exploit script template', topic: 'Tools', tags: ['pwntools', 'python', 'template'] },
  docker: { title: 'Docker', topic: 'Tools', tags: ['docker', 'gdb', 'environment'] },
  'kernel C': { title: 'Kernel C structures', topic: 'Kernel internals', tags: ['kernel', 'task-struct', 'credentials'] },
  mitigations: { title: 'Kernel mitigations', topic: 'Mitigations', tags: ['kernel', 'kaslr', 'smep', 'smap', 'kpti'] },
  'heap overflow': { title: 'Kernel heap overflow', topic: 'Kernel exploitation', tags: ['kernel', 'heap', 'heap-spray'] },
  ret2usr: { title: 'ret2usr & kernel ROP', topic: 'Kernel exploitation', tags: ['kernel', 'ret2usr', 'rop', 'kpti'] },
  cheatsheet: { title: 'Kernel debugging cheatsheet', topic: 'Kernel tools', tags: ['kernel', 'gdb', 'qemu'] },
  script: { title: 'Kernel scripts & QEMU', topic: 'Kernel tools', tags: ['kernel', 'qemu', 'initramfs'] },
  ebpf: { title: 'eBPF macros', topic: 'Kernel internals', tags: ['kernel', 'ebpf'] },
  primitives: { title: 'Kernel primitives', topic: 'Kernel exploitation', tags: ['kernel'] },
  'basic FSOP - dreamhack': { title: 'basic FSOP', platform: 'Dreamhack', tags: ['fsop', 'stdout', 'fake-file'], topic: 'FSOP & glibc', arch: 'amd64' },
  'operator - dreamhack': { title: 'operator', platform: 'Dreamhack', tags: ['bit-flip', 'stack-pivot', 'one-gadget'], topic: 'Stack & ROP', arch: 'amd64' },
  'pop rdi - dreamhack': { title: 'pop rdi', platform: 'Dreamhack', tags: ['stack-pivot', 'rop', 'one-gadget'], topic: 'Stack & ROP', arch: 'amd64' },
  'relay - HTB globlal 2026': { title: 'relay', platform: 'HTB', event: 'HTB Global 2026', tags: ['buffer-overflow', 'function-pointer', 'mips'], topic: 'Stack & ROP', arch: 'MIPS32 · big-endian' },
  'time lord I - BKSEC TTV 2026': { title: 'time lord I', platform: 'BKSEC', event: 'BKSEC TTV 2026', tags: ['out-of-bounds', 'got-overwrite', 'libc-leak'], topic: 'other', arch: 'amd64' },
  'character creation - BKSEC TTV 2026': { title: 'character creation', platform: 'BKSEC', event: 'BKSEC TTV 2026', tags: ['stack-pivot', 'rop', 'ret2libc'], topic: 'Stack & ROP', arch: 'amd64' },
  'factory_machine - umassctf2026': { title: 'factory_machine', platform: 'UMassCTF', event: 'UMassCTF 2026', tags: ['fork', 'brute-force', 'rop', 'ret2syscall'], topic: 'Stack & ROP', arch: 'amd64' },
  'goat - byuctf2025': { title: 'goat', platform: 'BYUCTF', event: 'BYUCTF 2025', tags: ['format-string', 'got-overwrite', 'libc-leak'], topic: 'Format string', arch: 'amd64' },
  'FSWn3d - breachctf2025': { title: 'FSWn3d', platform: 'BreachCTF', event: 'BreachCTF 2025', tags: ['format-string', 'ret2win', 'fexecve'], topic: 'Format string', arch: 'amd64' },
  'yet_another_fsb - 0xl4ugh2024': { title: 'yet_another_fsb', platform: '0xL4ugh', event: '0xL4ugh 2024', tags: ['format-string', 'rop', 'brute-force'], topic: 'Format string', arch: 'amd64' },
  'r0bob1rd - HTB': { title: 'r0bob1rd', platform: 'HTB', tags: ['format-string', 'got-overwrite', 'one-gadget'], topic: 'Format string' },
  dreamhack: { title: 'Dreamhack collection', platform: 'Dreamhack', tags: ['collection'], topic: 'collections' },
  'pwnable.tw': { title: 'pwnable.tw collection', platform: 'pwnable.tw', tags: ['collection', 'heap', 'rop', 'fsop'], topic: 'collections' },
  vcspp: { title: 'VCSPP collection', platform: 'VCSPP', tags: ['collection', 'heap', 'race-condition'], topic: 'collections' }
};

const heapNames = /heap|tcache|fastbin|unlink|unsorted|largebin|house of|use-after-free|double free|malloc_par/;
const stackNames = /ret2|ROP|SROP|stack pivot|egg hunter/;
export function inferMetadata(stem, text, category) {
  let title = stem;
  let tags = [];
  let topic = category === 'kernel' ? 'Kernel internals' : 'other';
  let platform = '';
  let arch = '';
  if (category === 'writeups') {
    const parts = stem.split(' - ');
    title = parts[0];
    const platformName = parts[1] || '';
    platform = /nightmare/i.test(platformName) ? 'Nightmare' : /JHT/.test(platformName) ? 'JHT' : /picoCTF/i.test(platformName) ? 'picoCTF' : /HTB/i.test(platformName) ? 'HTB' : platformName;
    if (/bof[1-9]/.test(stem)) {
      const num = Number(stem.match(/bof([1-9])/)[1]);
      tags = [['buffer-overflow'], ['buffer-overflow'], ['ret2win'], ['rop', 'ret2syscall'], ['shellcode'], ['shellcode', 'stack-leak'], ['ret2libc', 'rop'], ['stack-pivot'], ['stack-pivot']][num - 1];
      topic = 'Stack & ROP'; arch = 'amd64';
    } else {
      const names = [...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map(m => m[1]);
      for (const name of ['ROP', 'SROP', 'ret2libc', 'ret2win', 'ret2shellcode', 'stack pivot', 'fastbin dup']) if (names.includes(name)) tags.push(name.toLowerCase().replaceAll(' ', '-'));
      if (/format string/.test(stem)) tags.push('format-string');
      if (/heap 0/.test(stem)) tags.push('heap', 'buffer-overflow');
      topic = tags.includes('format-string') ? 'Format string' : tags.includes('heap') || tags.includes('fastbin-dup') ? 'Heap' : 'Stack & ROP';
    }
  } else if (heapNames.test(stem)) {
    topic = 'Heap'; tags = ['heap', stem.replaceAll(' ', '-').toLowerCase()];
  } else if (stackNames.test(stem)) {
    topic = 'Stack & ROP'; tags = ['stack', stem.replaceAll(' ', '-').toLowerCase()];
  } else if (/hook overwrite/.test(stem)) {
    topic = 'FSOP & glibc'; tags = ['glibc', 'hooks'];
  } else if (/out-of-bounds|race condition/.test(stem)) {
    tags = [stem.replaceAll(' ', '-')];
  }
  return { title, tags, topic, platform, arch, ...overrides[stem] };
}
