// @ts-check

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "PeterPortal API Docs",
  tagline: "An API that provides easy access to public data from UC Irvine",
  favicon: "img/favicon.png",
  url: "https://docs.api-next.peterportal.org",
  baseUrl: "/",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/icssc/peterportal-api-next/tree/documentation/docs/",
          showLastUpdateTime: true,
          remarkPlugins: [[require("@docusaurus/remark-plugin-npm2yarn"), { sync: true }]],
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-dotenv",
      {
        systemvars: true,
        silent: true,
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "PeterPortal API",
        logo: {
          alt: "PeterPortal Logo",
          src: "img/favicon.png",
        },
        items: [
          {
            type: "doc",
            docId: "developers-guide/getting-started",
            position: "left",
            label: "Developer's Guide",
          },
          {
            type: "doc",
            docId: "contributors-guide/getting-started",
            position: "left",
            label: "Contributor's Guide",
          },
          {
            position: "left",
            label: "Sandbox",
            href: "/sandbox",
          },
          {
            href: "https://github.com/icssc/peterportal-api-next",
            className: "header-github-link",
            "aria-label": "GitHub repository",
            position: "right",
          },
        ],
      },
      footer: {
        logo: {
          src: "img/icssc.png",
          alt: "ICS Student Council Logo",
          href: "https://icssc.club",
        },
        style: "dark",
        links: [
          {
            label: "Discord",
            href: "https://discord.gg/Zu8KZHERtJ",
          },
          {
            label: "Fellowship",
            href: "https://fellowship.icssc.club",
          },
          {
            label: "GitHub",
            href: "https://github.com/icssc",
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ICSSC Projects. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
