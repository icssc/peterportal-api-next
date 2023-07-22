// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  developersGuideSidebar: [
    "developers-guide/getting-started",
    "developers-guide/fair-use-policy",
    {
      type: "category",
      label: "REST API",
      items: [
        "developers-guide/rest-api/overview",
        {
          type: "category",
          label: "Guides",
          items: ["developers-guide/rest-api/guides/typescript-integration"],
        },
        {
          type: "category",
          label: "Reference",
          items: [
            "developers-guide/rest-api/reference/grades",
            "developers-guide/rest-api/reference/larc",
            "developers-guide/rest-api/reference/websoc",
            "developers-guide/rest-api/reference/week",
          ],
        },
      ],
    },
    "developers-guide/graphql-api",
  ],
  contributorsGuideSidebar: [
    "contributors-guide/getting-started",
    {
      type: "category",
      label: "Application Architecture",
      link: { type: "doc", id: "contributors-guide/application-architecture/index" },
      items: [
        "contributors-guide/application-architecture/api",
        "contributors-guide/application-architecture/tools",
      ],
    },
  ],
};

module.exports = sidebars;
