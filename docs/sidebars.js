// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    { type: "doc", id: "getting-started", label: "Getting Started" },
    { type: "doc", id: "fair-use-policy", label: "Fair Use Policy" },
    {
      type: "category",
      label: "REST API",
      items: [
        {
          type: "doc",
          id: "rest-api/getting-started",
          label: "Getting Started",
        },
      ],
    },
  ],
};

module.exports = sidebars;
