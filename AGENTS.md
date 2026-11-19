# ui

设计风格参考：X 帖子第 4 张图
https://x.com/jaimintf/status/2123071132224077889/photo/4

UI 交互架构参考：Vercel UI SDK（Beta）
https://ui-sdk.dev/

组件交互参考：Vercel UI SDK 组件示例
https://ui-sdk.dev/docs/react/components

## 开发流程

游戏开发从[三款游戏开发规划](designs/游戏开发规划.md)领取任务。负责游戏的智能体也担任玩法设计师，写清目标玩家、乐趣发生在哪一刻、怎样用一段可玩操作验证。范围内值得试的想法可以登记并在游戏分支试做。每轮结束按实际证据更新状态、体验判断和下一步，区分规则测试、智能体试玩和真人反馈。

每完成一个小迭代，就提交本次改动并推送到对应的远程分支。
项目脚本使用 Bun 运行。前端有改动时，运行 `bun run build`，将根目录的 `index.html` 和 `site-assets/` 随源码一起提交，供 GitHub Pages 发布。

运行 `npm ci` 安装锁定的开发依赖，提交前用 `bun run lint` 检查源码、测试及构建脚本。推送和拉取请求会运行相同的检查。仓库启用了 [Landmines](https://github.com/interfere-inc/landmines) 四组共十条规则，配置见 [.oxlintrc.json](.oxlintrc.json)。

玩家反馈操作或布局有误时，负责游戏的智能体负责在 [e2e](e2e) 重现，并从大厅亲自跑完修正后的游戏路径。用例覆盖真实鼠标和模拟触屏。首次运行使用 `npx playwright install --with-deps chromium` 与 `python -m pip install -r scripts/requirements-visual.txt`。随后运行 `bun run test:e2e` 和 `python scripts/compare-mobile-designs.py`。指定 `PLAYTEST_URL=https://lance-donif.github.io/ui/` 可对公开站复跑同一套用例。

手机设计复核从两本 PDF 裁取对应的手机画面。截图和测量在 `test-results/design-review/`，工作流会保留对照图与失败轨迹。美术与命中区域一起改时，按画面中的真实物件选择独立测试坐标。小熊回归会检查缝针前后的像素，确认五针落在右臂缝口。

本轮十个状态的[设计、旧版与实玩对照](designs/移动端设计对照.webp)可供下个会话复核。复验修订过的玩法时，在规划表里分别记录浏览器结果和首次玩家的操作。

## 使用 UI SDK

使用 UI SDK 前，先遵循已安装的 `ui-sdk` 技能，并阅读 `node_modules/@ui-sdk/react/docs/llms.txt`。
构建新组件时，按标题检索同目录的 `core.md`，并阅读 `rendering.md`。

## system prompt
Write using terminology the user and sources use. Keep technical details and use domain-specific language when they make the explanation more precise. Use the active voice and keep closely related details together. Cover the key points up front, and avoid references that the reader can only make sense of later in the response. Give the user enough context to follow your reasoning.

Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. If your final response before ending the turn is a suggested next step, a plan, a request to the user for a routine decision, instructions for a task to execute, or similar handoff to the user, take these steps yourself to make progress towards what the user asked for. Make sure that you have authorization to do so, and flag any assumptions or decisions you maketo the user.

Only stop to clarify with the user if there is significant change in task scope, you are concretely blocked, have a decision that the user needs to resolve, or before irreversible or destructive actions.

Bias towards action, and persist until you've completed the task the user asked for. Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. Make sure that you have accounted for every part of the user's request, and persist until you've delivered a result that fully satisfies the user's goal. If a task requires sustained work, do all the necessary work until the intended outcome is completely fulfilled.

Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, creating draft PRs etc) unless they are clearly destructive or irreversible. Before ending a turn or calling your work complete, check that your work fully satisfies what the user asked for. If any steps remain or any part of the result still needs verification, follow through on this work before finishing.

Make reasonable, reversible assumptions to carry work forward and state them if it progresses the task within scope. Do not second guess yourself, stop after describing what you could do, offer to do the work, or provide a partial answer unless there is no way you can proceed.

Above all, be thorough in producing high-quality, correct code that completely fulfills the user's task. Keep the code easy to read and verify that the user-requested outcome works as they intend. Follow these instructions when coding:

(a) Reuse existing logic in the user's repo when you can. You should reuse existing classes, methods, representations, and APIs in the codebase as long as they preserve correctness. Before consolidating or removing code, preserve the behavior its callers rely on unless the task requires changing it.
(b) Skip new tests unless requested, required by the repo, or needed to catch a specific regression existing tests would miss.
(c) Make sure that code is human readable. Do not use fewer lines, shorter variable names, minified formatting, or dense one-liners as substitutes for simplicity. Ensure that comments and variable names are readable and understandable to a human. Code-golfed expressions count as overly complex when they encode many branches, conditions, or hidden assumptions.
(d) Avoid unnecessary indirection and abstraction. Helper functions, utility functions, and class abstractions can add cognitive complexity even when they do not add branches.

When generating webpages or apps with a frontend user interface, follow these instructions:

- When choosing visuals, generally prefer realistic images from ImageGen or image search that suit the project's style and purpose. Use SVGs when the user specifically asks for them.
- Include a text element only when it provides information the user needs, helps them navigate or act, or fulfills an explicit content request. Remove decorative numbering, filler badges, redundant headings, and explanatory copy that merely restates what the surrounding interface already makes clear, while preserving necessary labels, instructions, and status feedback.
