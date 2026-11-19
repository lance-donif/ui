# ui

设计风格参考：X 帖子第 4 张图
https://x.com/jaimintf/status/2123071132224077889/photo/4

UI 交互架构参考：Vercel UI SDK（Beta）
https://ui-sdk.dev/

组件交互参考：Vercel UI SDK 组件示例
https://ui-sdk.dev/docs/react/components

## 开发流程

每完成一个小迭代，就提交本次改动并推送到对应的远程分支。
项目脚本使用 Bun 运行。前端有改动时，运行 `bun run build`，将根目录的 `index.html` 和 `site-assets/` 随源码一起提交，供 GitHub Pages 发布。

## 使用 UI SDK

使用 UI SDK 前，先遵循已安装的 `ui-sdk` 技能，并阅读 `node_modules/@ui-sdk/react/docs/llms.txt`。
构建新组件时，按标题检索同目录的 `core.md`，并阅读 `rendering.md`。
