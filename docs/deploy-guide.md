# 世界圣典 — Cloudflare 部署指南

完整的从零开始的部署流程，适合第一次操作。

---

## 前提条件

- 一个 Cloudflare 账号（免费即可）
- 项目代码已构建通过（`tsc --noEmit` + `vite build` 无报错）

---

## Step 1: 登录 Cloudflare（终端操作）

在项目根目录执行：

```bash
npx wrangler login
```

执行后会自动打开浏览器，跳转到 Cloudflare 授权页面：
1. 点击 **Allow** 授权
2. 终端显示 `Successfully logged in` 即成功

验证：
```bash
npx wrangler whoami
```
应该显示你的账号信息。

---

## Step 2: 创建 D1 数据库

```bash
npx wrangler d1 create zzworld-db
```

**重要**：命令执行后会输出类似这样的内容：

```
✅ Successfully created DB 'zzworld-db'

[[d1_databases]]
binding = "DB"
database_name = "zzworld-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 复制这个 ID
```

**复制 `database_id` 的值**，然后打开 `wrangler.toml`，把 `TODO_REPLACE_WITH_ACTUAL_DATABASE_ID` 替换为实际的 ID。

---

## Step 3: 创建数据表

```bash
npx wrangler d1 execute zzworld-db --remote --file=./schema.sql
```

验证表是否创建成功：
```bash
npx wrangler d1 execute zzworld-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```
应该看到 `worlds`、`chronicles`、`sync_meta` 三张表。

---

## Step 4: 部署到 Cloudflare Pages

### 方式 A：命令行部署（推荐，最快）

```bash
# 1. 构建项目
npm run build

# 2. 首次部署（创建 Pages 项目）
npx wrangler pages project create realmkit --production-branch=main

# 3. 部署
npx wrangler pages deploy dist --project-name=realmkit
```

部署成功后终端会输出一个 URL，类似：
```
✨ Deployment complete!
https://xxxx.realmkit.pages.dev
```

**这个 URL 就是你的应用地址。记住它，下一步配置 Access 需要用。**

### 方式 B：通过 Git 连接（可选，适合后续持续部署）

1. 将代码推送到 GitHub
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. 选择仓库，配置：
   - Build command: `npm run build`
   - Build output: `dist`
4. 部署完成后获得 Pages URL

---

## Step 5: 配置 Cloudflare Access（认证/登录）

这一步让你的应用只有你（和你授权的人）能访问。

### 5.1 进入 Zero Trust 控制台

1. 打开 Cloudflare Dashboard：**https://dash.cloudflare.com/**
2. 左侧导航栏找到 **Zero Trust**（有个盾牌图标），点击进入
3. 如果是首次使用 Zero Trust：
   - 系统会要求你设置一个**团队名称**（如 `my-team`），这个名称会出现在登录页 URL 中
   - 选择 **Free** 计划即可（足够使用）
   - 完成后进入 Zero Trust 主界面

### 5.2 添加 One-time PIN（邮箱验证码）登录方式

> 建议先配置登录方式，再创建应用。

1. 在 Zero Trust 左侧菜单中，找到 **Integrations**（集成）部分
2. 点击 **Identity providers**（身份提供者）
3. 在 **Your identity providers** 区域，点击 **Add new identity provider**
4. 选择 **One-time PIN**
5. 保存 — 无需额外配置

> 这样用户就可以通过"输入邮箱 → 收到验证码 → 输入验证码"的方式登录。

### 5.3 添加 Google 登录方式（可选，推荐）

> One-time PIN 已经够用，但如果你希望用 Google 账号一键登录，需要先在 Google Cloud Console 创建 OAuth 客户端。
> 如果你只看到 `Error 401: invalid_client` 错误，就是这一步没做。

#### 5.3.1 Google Cloud Console 创建项目

1. 打开 **https://console.cloud.google.com/**
2. 顶部导航栏点击项目下拉 → 点击 **新建项目**
3. 项目名称填 `Cloudflare Access`（或你喜欢的名字）→ 点击 **创建**
4. 确保左上角已切换到这个新项目

#### 5.3.2 配置 OAuth 同意屏幕

1. 左侧菜单 → **API 和服务** → **OAuth 同意屏幕**
2. 选择用户类型：**外部**（External）→ 点击 **创建**
3. 填写必填信息：
   - **应用名称**：`世界圣典`
   - **用户支持电子邮件**：你的 Gmail
   - **开发者联系信息**：你的邮箱
4. 其他全部跳过，点击 **保存并继续** 直到完成

#### 5.3.3 创建 OAuth 客户端凭据

1. 左侧菜单 → **API 和服务** → **凭据**
2. 点击顶部 **+ 创建凭据** → **OAuth 客户端 ID**
3. 应用类型选 **Web 应用**
4. 名称填 `Cloudflare Access Login`
5. **已获授权的重定向 URI**（最关键的一步！）：
   - 点击 **添加 URI**
   - 填入：`https://<你的团队名称>.cloudflareaccess.com/cdn-cgi/access/callback`
   - 团队名称就是你在 Step 5.1 设置 Zero Trust 时选的那个（如 `my-team`）
   - 完整示例：`https://my-team.cloudflareaccess.com/cdn-cgi/access/callback`
6. 点击 **创建**
7. 弹出窗口会显示 **客户端 ID** 和 **客户端密钥** → **复制保存**

#### 5.3.4 把凭据配置到 Cloudflare Zero Trust

1. 打开 **https://dash.cloudflare.com/** → 左侧 **Zero Trust**
2. 左侧菜单 → **Integrations** → **Identity providers**
3. 找到 **Google**（之前添加过的直接编辑，没有则点击 **Add new identity provider** → 选 **Google**）
4. 填入：
   - **Client ID**：粘贴上一步获取的客户端 ID
   - **Client Secret**：粘贴上一步获取的客户端密钥
5. 点击 **保存**

> 配置完成后，Access 登录页面就会出现 Google 登录按钮。

### 5.4 添加 Access 应用（保护你的 Pages 站点）

1. 在 Zero Trust 左侧菜单中，找到 **Access controls**（访问控制）部分
2. 点击 **Applications**
3. 点击右上角 **Create new application**
4. 选择 **Self-hosted and private**
5. 填写应用信息：

   | 字段 | 填什么 |
   |------|--------|
   | Application name | `世界圣典 ZZWorld` |
   | Session Duration | `24 hours`（或你喜欢的时长） |

6. 点击 **Add public hostname**，配置域名：
   - **Domain** 下拉选择你的 Pages 域名（如 `realmkit.pages.dev`）
   - 或者手动输入你的 Pages 域名

7. 配置访问策略（Policy）：
   - 点击 **Create policy** 或选择已有策略
   - **Policy name**: `允许访问`
   - **Action**: **Allow**
   - 在 **Include** 规则中：
     - Selector 选择 **Emails**
     - Value 填入你要允许访问的邮箱地址（你的邮箱）
   - 保存策略

8. 确认 Identity providers 中勾选了 **One-time PIN**
9. 点击 **Create** 完成创建

> 配置完成后，访问你的 Pages URL 就会被 Access 拦截要求登录了。

---

## Step 6: 验证整个流程

1. **打开你的 Pages URL**（如 `https://xxxx.realmkit.pages.dev`）
2. **首次访问**会被 Cloudflare Access 拦截，要求登录
3. **输入你的邮箱** → 收到验证码 → 输入验证码 → 登录成功
4. **页面正常加载** → SyncLoader 显示"正在同步世界数据..."
5. **在页面上编辑一些数据**（如修改世界名称）
6. **等待 2 秒**（debounce），检查 D1 数据是否写入：
   ```bash
   npx wrangler d1 execute zzworld-db --remote --command="SELECT user_id, updated_at FROM worlds"
   ```
   应该能看到你的邮箱和更新时间

7. **测试跨设备**：
   - 打开另一个浏览器（或无痕模式）
   - 访问同一个 URL
   - 通过 Access 登录
   - 应该能看到之前编辑的数据自动加载

---

## 常用运维命令

```bash
# 重新部署（修改代码后）
npm run build
npx wrangler pages deploy dist --project-name=realmkit

# 查看 D1 中的数据
npx wrangler d1 execute zzworld-db --remote --command="SELECT * FROM worlds"
npx wrangler d1 execute zzworld-db --remote --command="SELECT * FROM chronicles"

# 清空 D1 数据（谨慎！）
npx wrangler d1 execute zzworld-db --remote --command="DELETE FROM worlds"
npx wrangler d1 execute zzworld-db --remote --command="DELETE FROM chronicles"

# 查看 Pages 部署列表
npx wrangler pages deployment list --project-name=realmkit
```

---

## 故障排查

### 问题：`wrangler login` 打不开浏览器
手动获取授权 token：
```bash
npx wrangler login --no-browser
```
然后手动复制终端显示的 URL 到浏览器打开。

### 问题：Access 登录后仍然 401
确认 `cf-access-authenticated-user-email` header 是否启用：
1. Zero Trust → Access → Applications → 你的应用
2. 查看 Settings → 确保 **Identity providers** 包含你配置的登录方式
3. 该 header 默认启用，一般不需要额外配置

### 问题：D1 操作报错 "database not found"
确认 `wrangler.toml` 中的 `database_id` 是正确的：
```bash
npx wrangler d1 list
```
核对输出的 database_id 与 `wrangler.toml` 中的一致。

### 问题：Google 登录报 `Error 401: invalid_client — Client missing a project id`

**原因**：Cloudflare Zero Trust 里启用了 Google 登录，但 Google Cloud Console 里没有创建对应的 OAuth 客户端。

**解决**：按照 Step 5.3 完整操作一遍，确保：
1. Google Cloud Console 有项目 + OAuth 同意屏幕
2. 创建了 Web 应用类型的 OAuth 客户端
3. 重定向 URI 填的是 `https://<团队名>.cloudflareaccess.com/cdn-cgi/access/callback`
4. Client ID 和 Secret 已粘贴到 Cloudflare Zero Trust → Identity providers → Google 配置中

### 问题：API 请求 404
确认 `public/_redirects` 文件内容包含 `/api/*` 规则，且 `functions/api/` 目录已部署。
```bash
# 确认 dist 中包含 _redirects
cat dist/_redirects
# 确认 functions 目录存在
ls functions/api/
```

### 问题：SyncLoader 一直转圈
打开浏览器 DevTools → Network 面板，检查 `/api/world` 请求：
- 如果 404 → `_redirects` 配置有问题或 functions 未部署
- 如果 401 → Access 认证未通过，检查 cookie
- 如果 500 → D1 绑定可能有问题，检查 `wrangler.toml`
