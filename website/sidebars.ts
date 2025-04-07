import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "はじめに",
    },
    {
      type: "doc",
      id: "tools",
      label: "使い方の例",
    },
    {
      type: "doc",
      id: "faq",
      label: "FAQ",
    },
  ],
};

export default sidebars;
