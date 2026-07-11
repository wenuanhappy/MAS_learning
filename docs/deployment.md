# 项目部署文档

## 一、环境要求

服务器需预装以下环境：

- Node.js 20+
- Python 3.12+
- Java 21
- MySQL 8.0+
- Nginx

## 二、项目结构

```
final/
├── frontend/          # Angular 前端项目
├── workflow_backend/   # Java Spring Boot 后端（端口 8080）
└── backend/           # Python FastAPI 后端（端口 8000）
```

## 三、数据库初始化

### 1. 创建数据库

```sql
CREATE DATABASE logic_circuit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 导入表结构

```bash
mysql -u root -p logic_circuit < workflow_backend/src/SQLfiles/init.sql
```

### 3. 修改数据库配置

编辑 `workflow_backend/src/main/resources/application.properties`，将密码修改为你的 MySQL root 密码：

```properties
spring.datasource.password=你的密码
```

## 四、前端部署

### 1. 本地编译

```bash
cd frontend
npm install
npm run build
```

编译产物位于 `frontend/dist/frontend/browser/`。

### 2. 上传到服务器

```bash
scp -r frontend/dist/frontend/browser/* <user>@<IP>:/var/www/html/
```

## 五、Java 后端部署

### 1. 打包

```bash
cd workflow_backend
./mvnw clean package -DskipTests
```

### 2. 上传并启动

```bash
scp target/LogicCircuit-0.0.1-SNAPSHOT.jar <user>@<IP>:/opt/workflow_backend/
```

在服务器上：

```bash
cd /opt/workflow_backend
nohup java -jar LogicCircuit-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
```

## 六、Python 后端部署

### 1. 上传源码

上传源码和依赖文件：

```bash
scp -r backend/app backend/requirements.txt <user>@<IP>:/opt/backend/
```

### 2. 创建虚拟环境并安装依赖

```bash
cd /opt/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. 启动服务

```bash
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1 &
```

## 七、Nginx 配置

创建 `/etc/nginx/conf.d/logic-circuit.conf`：

```nginx
server {
    listen 80;
    server_name 47.116.179.155;

    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Java 后端代理
    location /api/webpj/ {
        proxy_pass http://127.0.0.1:8080/webpj/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Python FastAPI 后端代理
    location /pyapi/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

重载 Nginx：

```bash
nginx -t && systemctl reload nginx
```

## 八、验证部署

在服务器上执行，验证是否出现问题

| 服务 | 验证命令 |
|------|---------|
| Java 后端 | `curl -I http://127.0.0.1:8080/webpj/user/login` |
| Python 后端 | `curl http://127.0.0.1:8000/docs` |
| Nginx 代理 | `curl -I http://127.0.0.1/api/webpj/user/login` |
| 前端页面 | 浏览器访问 `http://47.116.179.155` |
