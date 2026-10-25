import LoginForm from './LoginForm';

// 体系账号登录依赖服务端 SSO 配置。未配置的环境（比如还没开通 SSO 的生产）
// 整个入口都不渲染，避免用户点进去只拿到一段 JSON 报错。
// 五个变量缺一不可：缺 CLIENT_ID / CLIENT_LZTI_SECRET 时，
// 入口渲染出来点下去也是认证服务那边报 invalid_client。
export default function LoginPage() {
  const ssoEnabled = Boolean(
    process.env.AUTH_BASE_URL &&
    process.env.CLIENT_ID &&
    process.env.CLIENT_LZTI_SECRET &&
    process.env.LZTI_REDIRECT_URI &&
    process.env.JWT_ISSUER
  );

  return <LoginForm ssoEnabled={ssoEnabled} />;
}
