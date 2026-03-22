# PPeyes 极空间 Docker 部署（x86-64）

## 已准备内容

- Next.js 多阶段构建，运行时镜像更小
- `output: "standalone"`，生产容器直接 `node server.js`
- 本地状态目录持久化到 `/app/data`
- Compose 默认平台固定为 `linux/amd64`（x86-64）

## 需要的文件

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `scripts/build-jspace-x86.sh`

## 1. 准备环境变量

在项目根目录复制并填写 `.env`：

```bash
cp .env.example .env
```

关键变量：

- `PPEYES_PORT`：容器对外端口
- `PPEYES_PLATFORM`：默认 `linux/amd64`
- `PPEYES_IMAGE_TAG`：默认 `x86_64`
- `GEMINI_BASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## 2. 方案 A：在极空间上直接构建并启动

建议项目目录：

```text
/volume1/docker/ppeyes
```

上传完整项目后，在极空间 Docker -> Compose 中导入 `docker-compose.yml` 并启动。

等价命令：

```bash
docker compose build
docker compose up -d
docker compose logs -f
```

访问地址：

```text
http://<NAS-IP>:<PPEYES_PORT>
```

## 3. 方案 B：先构建 x86-64 镜像 tar，再导入极空间

如果你想先在本机构建好镜像，再导入极空间镜像库，用：

```bash
npm run docker:build:jspace:x86
```

脚本会生成：

```text
dist/ppeyes-x86_64.tar
```

然后在极空间 Docker 的镜像导入页面导入该 tar，再用同样的环境变量与挂载参数创建容器。

## 4. 数据持久化

应用状态文件：

```text
/app/data/app-state.json
```

Compose 已配置挂载：

```text
./data:/app/data
```

容器重建后 watchlist 和机会数据会保留。

## 5. 升级更新

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 6. 故障排查

### AI 分析失败

检查：

- `GEMINI_API_KEY` 是否正确
- `GEMINI_BASE_URL` 是否可从 NAS 访问
- `GEMINI_MODEL` 是否有效

### 重启后数据丢失

检查极空间目录中是否存在：

```text
data/app-state.json
```

### 无法访问页面

检查：

- `PPEYES_PORT` 是否冲突
- 容器是否监听 `0.0.0.0:3000`
- 极空间防火墙或端口映射是否正确
