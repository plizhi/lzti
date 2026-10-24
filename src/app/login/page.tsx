import LoginForm from './LoginForm';

// 体系账号登录依赖服务端 SSO 配置。未配置的环境（比如还没开通 SSO 的生产）
// 整个入口都不渲染，避免用户点进去只拿到一段 JSON 报错。
export default function LoginPage() {
  const ssoEnabled = Boolean(process.env.AUTH_BASE_URL && process.env.LZTI_REDIRECT_URI);

  return <LoginForm ssoEnabled={ssoEnabled} />;
}
