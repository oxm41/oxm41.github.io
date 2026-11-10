- `docker build . -t <name_image>` : build image
- `docker run -it <name_image> /bin/bash` : run image
- `docker run --rm -p<port>:<port> -it <name_image>` - `nc localhost(0) <port>` : connect local server
- `docker-compose up --build` 
- `docker ps`
- `docker rm -f <name_docker>(<docker_id>)`
- `cp /lib/x86_64-linux-gnu/libc.so.6 .`
- `cat /proc/self/maps` -> `docker cp <container_id>:/home/oob/libc.so.6 .`
- `docker ps -aq | xargs docker rm -f`: rm container
- `docker images -q | grep -v 5331d0af1395 | xargs docker rmi -f`: rm docker
- `docker system prune -a -f`: rm cache + dangling
- add in Docker: `RUN apt-get update && apt-get install -y socat gdbserver procps`
- `docker run --rm -it --cap-add=SYS_PTRACE --security-opt seccomp=unconfined -p 1337:1337 -p 7777:7777 <image_name> /bin/bash`: setup to gdb docker
- in another terminal: `docker exec -u root -it <container_name> bash`
- in docker: 
```bash
socat TCP-LISTEN:1337,reuseaddr,fork EXEC:./prob,pty,stderr,echo=0
ps aux | grep prob
gdbserver --attach 0.0.0.0:7777 <pid>
```
