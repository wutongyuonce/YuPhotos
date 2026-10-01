# YuPhotos

梧桐雨的独立相册，基于 [Afilmory](https://github.com/Afilmory/afilmory)。源码仓库为 [wutongyuonce/YuPhotos](https://github.com/wutongyuonce/YuPhotos)，保留上游源码、许可证和界面署名；`origin` 指向个人仓库，`upstream` 指向 Afilmory。

## 部署结构

| 地址                            | 用途                       | 托管服务               |
| ------------------------------- | -------------------------- | ---------------------- |
| `https://photos.wutongyu.site/` | 相册网页、缩略图、RSS      | GitHub Pages           |
| `https://images.wutongyu.site/` | 照片原图与 Live Photo 视频 | Cloudflare R2 Standard |
| `https://www.wutongyu.site/`    | 博客                       | 独立于本项目           |

访客打开相册后，浏览器自动读取图片域名。两个子域名共用现有 `wutongyu.site`，无需另购域名。这里部署的是静态 SPA，不需要后台、数据库或 SSR。

相册已通过 GitHub Actions 发布到 `https://photos.wutongyu.site/`，使用 GitHub Pages 自定义域名证书并强制 HTTPS。`photos` DNS 为指向 `wutongyuonce.github.io` 的 CNAME，保持 DNS only；`images` 由 R2 自定义域名提供图片。

R2 只读连接、图片域名 CORS、静态产物、线上 RSS，以及桌面和手机空相册已验证。目前桶中没有照片，真实照片处理、原图查看及照片深链接尚待验收。博客中的相册占位入口在照片验收后替换为正式地址。

## 配置入口

先读 `AGENTS.md`；修改界面前读 `DESIGN.md`。仓库使用根 `package.json` 指定的 pnpm 版本。

| 内容                       | 权威入口                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| 站点名称、作者、域名、社交 | `config.example.json`；安装时复制为忽略提交的 `config.json`，由 `site.config.ts` 合并            |
| R2 来源与处理并发          | `builder.config.default.ts`；安装时复制为忽略提交的 `builder.config.ts`                          |
| 本地凭据                   | `.env`，字段参考 `.env.example`，不提交                                                          |
| 浏览器跨域读取             | `r2-cors.json`，粘贴到 R2 桶的 CORS 设置                                                         |
| Web UI                     | `apps/web`                                                                                       |
| 清单和缩略图               | `packages/builder` 生成 `apps/web/src/data/photos-manifest.json` 与 `apps/web/public/thumbnails` |
| 发布流程与验收             | `.github/workflows/build.yml`、`scripts/verify-yuphotos-build.mjs`                               |
| 自定义域名产物             | `apps/web/public/CNAME`                                                                          |

GitHub Actions 默认使用模板配置。本地模板更新后，需要同步已有的 `config.json` 和 `builder.config.ts`；安装脚本不会覆盖它们。照片、缩略图、清单和构建产物由流水线重新生成，不提交到源码仓库。

## Cloudflare 与 GitHub 设置

1. 在管理 `wutongyu.site` 的 Cloudflare 账户中开通 R2，创建 Standard 桶，例如 `yuphotos`，上传准备公开的照片。
2. 在桶的 Settings → Custom Domains 中添加 `images.wutongyu.site`，等待 Active。不要将 S3 API 地址当作浏览器图片地址。
3. 将 `r2-cors.json` 应用到桶的 CORS 设置。它允许线上相册以及本地 `1924` 端口执行 GET/HEAD；CORS 控制跨域读取，不为公开照片提供访问鉴权。
4. 创建限定到该桶的 **Object Read only** R2 API 凭据。builder 只读原图，生成的缩略图放到 Pages；无需存储写入权限。照片上传通过 Cloudflare 控制台或自己的上传工具完成。
5. 在仓库 Settings → Secrets and variables → Actions 中配置下表。密钥同时保存在本地 `.env`，不要放入站点 JSON、源码或聊天消息。

| 名称                   | GitHub 配置类型 | 内容                                                       |
| ---------------------- | --------------- | ---------------------------------------------------------- |
| `S3_BUCKET_NAME`       | Variable        | 桶名称                                                     |
| `S3_ENDPOINT`          | Variable        | 控制台中的 `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_PREFIX`            | Variable，可选  | 仅扫描桶内某个目录，例如 `photos/`；空值扫描整个桶         |
| `S3_ACCESS_KEY_ID`     | Secret          | R2 Access Key ID                                           |
| `S3_SECRET_ACCESS_KEY` | Secret          | R2 Secret Access Key                                       |

6. 在 Cloudflare DNS 添加 `photos` CNAME，目标为 `wutongyuonce.github.io`，初次配置使用 DNS only。在 GitHub Settings → Pages 保存 Custom domain `photos.wutongyu.site`，证书可用后启用 Enforce HTTPS。
7. 在 Actions 手动运行 **Deploy YuPhotos to GitHub Pages**。构建和部署成功、域名及照片验收通过后，再把 YuBlog 的相册占位链接改为正式地址。

参考：[R2 API 凭据](https://developers.cloudflare.com/r2/api/tokens/)、[R2 自定义域名](https://developers.cloudflare.com/r2/buckets/public-buckets/)、[R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)、[GitHub Pages 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

## 本地运行与发布

```bash
pnpm --filter '@afilmory/web...' --filter '@afilmory/monorepo...' install --frozen-lockfile
# 填写 .env 后，读取 R2，生成清单和缩略图
pnpm build:manifest -- --no-ui
# 开发入口会自动再运行 builder
pnpm --filter @afilmory/web dev
```

静态发布与流水线使用相同入口：

```bash
pnpm exec tsx --test scripts/yuphotos-config.test.ts
pnpm build:manifest -- --no-ui
pnpm --filter @afilmory/web exec vite build
pnpm --filter @afilmory/web type-check
cp apps/web/dist/index.html apps/web/dist/404.html
node scripts/verify-yuphotos-build.mjs
```

根目录 `pnpm build` 构建上游 SSR，不用于 GitHub Pages。直接调用 Vite 可以避免 Web build 脚本重复运行 builder；凭据只传给 builder 步骤，前端使用生成后的公开清单。

`main` 推送和手动运行都会从 R2 重新生成相册并发布 `apps/web/dist/`。新增或删除照片后，重新运行工作流；仅上传到 R2 不会自动更新网页清单。每次托管构建没有持久化照片缓存，会重新扫描和处理桶内照片。

清单缺失、RSS/站点地图缺失、清单注入与 builder 输出不一致，或域名、分享图片、照片深链接入口不完整时，验收步骤会失败并阻止发布。GitHub Pages 使用 `404.html` 加载 SPA 来打开 `/photos/:id` 直接链接；直接访问时 HTTP 状态仍为 404，这是静态 Pages 的限制。
