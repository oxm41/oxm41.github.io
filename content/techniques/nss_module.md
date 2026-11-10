- source code:
```C
void
__nss_module_freeres (void)
{
  struct nss_module *current = nss_module_list;
  while (current != NULL)
    {
      /* Ignore built-in modules (which have a NULL handle).  */
      if (current->state == nss_module_loaded
	  && current->handle != NULL)
        __libc_dlclose (current->handle);

      struct nss_module *next = current->next;
      free (current);
      current = next;
    }
  nss_module_list = NULL;
}



```
- struct:
```C
struct nss_module
{
  /* Actual type is enum nss_module_state.  Use int due to atomic
     access.  Used in a double-checked locking idiom.  */
  int state;

  /* The function pointers in the module.  */
  union
  {
    struct nss_module_functions typed;
    nss_module_functions_untyped untyped;
  } functions;

  /* Only used for __libc_freeres unloading.  */
  void *handle;

  /* The next module in the list. */
  struct nss_module *next;

  /* The name of the module (as it appears in /etc/nsswitch.conf).  */
  char name[];
};
```