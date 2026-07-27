# LZTI 部署指南

## 架构说明

```
用户浏览器
    │
    ▼
港服 (lg.nzyy.cc) - Nginx 反向代理
    │  (SSL 终止, 域名 lzti.nzyy.cc)
    ▼
乌服 (内网) - Next.js 应用 + PostgreSQL
```

## 部署步骤

### 第一步：在乌服部署

1. **上传代码到乌服**
```bash
scp -r ./lzti user@wu-server:/var/www/
```

2. **配置环境变量**
```bash
cd /var/www/lzti
cp .env.example .env
vim .env  # 编辑 DATABASE_URL 和 JWT_SECRET
```

3. **运行部署脚本**
```bash
chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh production
```

4. **配置 Nginx（乌服）**
```bash
sudo cp deploy/nginx-wu.conf /etc/nginx/sites-available/lzti
sudo ln -s /etc/nginx/sites-available/lzti /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. **安装并配置 PM2**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 按提示设置开机自启
```

### 第二步：在港服部署

1. **安装 Nginx**
```bash
sudo apt install nginx
```

2. **配置 SSL 证书（可选但推荐）**
```bash
sudo apt install certbot
sudo certbot --nginx -d lzti.nzyy.cc
```

3. **部署港服 Nginx 配置**
```bash
sudo cp deploy/nginx-hk.conf /etc/nginx/sites-available/lzti-hk
# 编辑文件，替换乌服内网 IP
sudo vim /etc/nginx/sites-available/lzti-hk
sudo ln -s /etc/nginx/sites-available/lzti-hk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 目录结构

```
/var/www/lzti/           # 应用目录
├── .env                  # 环境变量（不提交）
├── ecosystem.config.js    # PM2 配置
├── prisma/
│   └── schema.prisma      # 数据库模型
├── deploy/
│   ├── deploy.sh         # 部署脚本
│   ├── nginx-wu.conf     # 乌服 Nginx 配置
│   └── nginx-hk.conf     # 港服 Nginx 配置
└── logs/
    ├── error.log
    ├── out.log
    └── combined.log
```

## 常用命令

### 乌服
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs lzti

# 重启应用
pm2 restart lzti

# 停止应用
pm2 stop lzti

# 查看数据库连接
psql $DATABASE_URL -c "SELECT 1"
```

### 港服
```bash
# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/lzti_access.log
```

## 故障排查

1. **应用无法启动**
```bash
pm2 logs lzti --err
# 检查 .env 配置是否正确
# 检查数据库连接
```

2. **502 Bad Gateway（港服）**
```bash
# 检查乌服服务是否运行
pm2 status
# 检查乌服 Nginx 是否正常
curl http://localhost:3000/health
```

3. **港服无法连接乌服**
```bash
# 检查内网连通性（从港服到乌服）
telnet <乌服内网IP> 3000
# 检查防火墙规则
sudo iptables -L -n | grep 3000
```

## SSL 证书自动续期（港服）

如果使用 certbot，证书会自动续期。否则需要手动：
```bash
sudo certbot renew
```
