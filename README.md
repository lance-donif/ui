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
