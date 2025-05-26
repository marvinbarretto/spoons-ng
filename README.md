# Spoons

Gamified pub check-in app built with Angular + Firebase


## Workflow
`build:ssr` will build the project and start the server
`ng serve` will start the client for HMR development
`npm run test:watch` will run jest in watch mode
`release` will run standard-version and set the tags
`gpt` will push it up


## Local aliases
```bash
alias release="npm run release"
alias gs="git status"
alias gcm="git commit -m"
alias gp="git pull"
alias gpt="git push && git push --tags"
```

## Docker commands:
### Check and remove containers
```bash
docker ps -q | xargs docker stop
docker ps -q | xargs docker rm
```

### Remove all containers
```bash
docker container prune
```

### Run on port 4040 locally
```bash
docker build -t spoons .
docker run -p 4040:4000 spoons
```

### Redis
stale-while-revalidate pattern

`redis-cli MONITOR` to monitor redis

Flush redis cache
```bash
redis-cli DEL newsData
```
newsData
newsLastFetchDate
events:v1


