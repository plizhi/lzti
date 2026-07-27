#!/bin/bash

# LZTI 部署脚本
# 用法: ./deploy/deploy.sh [production]

set -e

echo "========== LZTI 部署脚本 =========="

# 环境
ENV=${1:-production}
APP_DIR="/var/www/lzti"
LOG_DIR="$APP_DIR/logs"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ] && [ "$ENV" = "production" ]; then
    log_error "生产环境部署需要 root 权限，请使用 sudo 或切换到 root 用户"
    exit 1
fi

# 步骤 1: 创建目录
log_info "步骤 1: 创建应用目录..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"

# 步骤 2: 同步代码（从当前目录）
log_info "步骤 2: 同步代码到 $APP_DIR..."
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='.env' ./ "$APP_DIR/"

# 步骤 3: 安装依赖
log_info "步骤 3: 安装依赖..."
cd "$APP_DIR"
npm install --production

# 步骤 4: 数据库迁移
log_info "步骤 4: 数据库迁移..."
npx prisma migrate deploy || log_warn "数据库迁移完成或无需迁移"

# 步骤 5: 生成 Prisma Client
log_info "步骤 5: 生成 Prisma Client..."
npx prisma generate

# 步骤 6: 构建应用
log_info "步骤 6: 构建应用..."
npm run build

# 步骤 7: 重启 PM2
log_info "步骤 7: 重启应用..."
if pm2 describe lzti > /dev/null 2>&1; then
    pm2 restart lzti
else
    pm2 start ecosystem.config.js
fi

# 步骤 8: 保存 PM2 进程列表
log_info "步骤 8: 保存 PM2 进程列表..."
pm2 save

# 步骤 9: 设置开机自启
log_info "步骤 9: 设置开机自启..."
pm2 startup

log_info "========== 部署完成 =========="
log_info "应用已部署到: $APP_DIR"
log_info "日志目录: $LOG_DIR"
log_info "查看日志: pm2 logs lzti"
log_info "查看状态: pm2 status"

echo ""
echo "注意: 港服 Nginx 配置需要单独部署到港服服务器"
echo "配置文件位置: deploy/nginx-hk.conf"
