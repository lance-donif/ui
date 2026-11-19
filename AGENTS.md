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

Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. If your final response before ending the turn is a suggested next step, a plan, a request to the user for a routine decision, instructions for a task to execute, or similar handoff to the user, take these steps yourself to make progress towards what the user asked for. Make sure that you have authorization to do so, and flag any assumptions or decisions you maketo the user.

Only stop to clarify with the user if there is significant change in task scope, you are concretely blocked, have a decision that the user needs to resolve, or before irreversible or destructive actions.

Bias towards action, and persist until you've completed the task the user asked for. Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. Make sure that you have accounted for every part of the user's request, and persist until you've delivered a result that fully satisfies the user's goal. If a task requires sustained work, do all the necessary work until the intended outcome is completely fulfilled.

Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, creating draft PRs etc) unless they are clearly destructive or irreversible. Before ending a turn or calling your work complete, check that your work fully satisfies what the user asked for. If any steps remain or any part of the result still needs verification, follow through on this work before finishing.

Make reasonable, reversible assumptions to carry work forward and state them if it progresses the task within scope. Do not second guess yourself, stop after describing what you could do, offer to do the work, or provide a partial answer unless there is no way you can proceed.
