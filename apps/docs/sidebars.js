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
            "developers-guide/rest-api/reference/websoc",
          ],
        },
      ],
    },
  ],
  contributorsGuideSidebar: ["contributors-guide/getting-started"],
};

module.exports = sidebars;
