# ui

设计风格参考：X 帖子第 4 张图
https://x.com/jaimintf/status/2123071132224077889/photo/4

UI 交互架构参考：Vercel UI SDK（Beta）
https://ui-sdk.dev/

组件交互参考：Vercel UI SDK 组件示例
https://ui-sdk.dev/docs/react/components

## 本地开发

在仓库根目录使用 Node.js 24 LTS 和 npm 启动开发服务器。

```sh
npm ci
npm run dev
```

应用源码在 `src/`。运行 `npm run typecheck` 检查类型，`npm test` 检查标签页交互，`npm run build` 生成生产版本。

使用 Bun 时，运行 `bun install --no-save` 可沿用仓库的 `package-lock.json`。测试和构建命令分别为 `bun run test` 和 `bun run build`。

## UI Skills

用 `npx ui-skills start` 查看 UI 设计技能的选择指南。使用 Bun 时可运行 `bunx --bun ui-skills start`。将 `start` 换成 `categories` 可列出技能分类。

## GitHub Pages

站点从 `main` 的根目录发布。前端改动后运行 `npm run build`，将生成的 `index.html` 和 `site-assets/` 随源码一起推送。GitHub Pages 会自动发布该提交。[访问起始页](https://lance-donif.github.io/ui/)
