import { Tabs, TabsList, TabsPanel, TabsTab, TabsTabIcon } from "@ui-sdk/react/tabs";

const resources = [
  {
    value: "guide",
    label: "入门",
    icon: "🧭",
    title: "React 快速入门",
    detail: "查看安装命令、环境要求和给开发代理的提示词。",
    link: "阅读指南",
    url: "https://ui-sdk.dev/docs/react#quick-start",
  },
  {
    value: "components",
    label: "组件",
    icon: "🧩",
    title: "React 组件目录",
    detail: "从标签页、菜单到选择器，查看组件用法和交互示例。",
    link: "浏览组件",
    url: "https://ui-sdk.dev/docs/react/components",
  },
  {
    value: "source",
    label: "源码",
    icon: "🗂️",
    title: "lance-donif/ui",
    detail: "查看游戏源码、设计图和开发规划。",
    link: "打开 GitHub",
    url: "https://github.com/lance-donif/ui",
  },
];

export function Resources() {
  return (
    <main className="guide">
      <h1>项目资源</h1>
      <Tabs defaultValue="guide" aria-label="项目资源">
        <TabsList className="dock" aria-label="选择项目资源">
          {resources.map(({ value, label, icon }) => (
            <TabsTab className="tab" key={value} value={value}>
              <TabsTabIcon className="sticker">{icon}</TabsTabIcon>
              {label}
            </TabsTab>
          ))}
        </TabsList>
        {resources.map(({ value, title, detail, link, url }) => (
          <TabsPanel className="panel" key={value} value={value}>
            <h2>{title}</h2>
            <p>{detail}</p>
            <a href={url}>{link}<span aria-hidden="true">↗</span></a>
          </TabsPanel>
        ))}
      </Tabs>
    </main>
  );
}
