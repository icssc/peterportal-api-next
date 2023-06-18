// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'getting-started',
    'fair-use-policy',
    {
      type: 'category',
      label: 'REST API',
      items: [
        'rest-api/overview',
        {
          type: 'category',
          label: 'Guides',
          items: ['rest-api/guides/typescript-integration'],
        },
        {
          type: 'category',
          label: 'Reference',
          items: ['rest-api/reference/grades', 'rest-api/reference/websoc'],
        },
      ],
    },
  ],
}

module.exports = sidebars
