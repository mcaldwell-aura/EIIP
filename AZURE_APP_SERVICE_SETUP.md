# Azure App Service Setup

This project is an Angular SSR application with an Express server, so deploy it to Azure App Service as a Node application.

## Recommended Azure configuration

Use these settings when creating the Web App:

```text
Publish: Code
Runtime stack: Node 20 LTS
Operating system: Linux
Region: your preferred region
```

## Build and startup configuration

Set these values in Azure App Service:

```text
Build command: npm ci && npm run build
Startup command: npm run serve:ssr:EIIP
```

Set this App Setting:

```text
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## Why these values are correct

- Production build script: [package.json](package.json)
- Production server script: [package.json](package.json)
- SSR Express server: [src/server.ts](src/server.ts)
- Azure-compatible `PORT` handling: [src/server.ts](src/server.ts)

## Fastest path once the repo is on GitHub

1. Push the repo to GitHub.
2. In Azure Portal, create a new App Service.
3. Open Deployment Center.
4. Choose GitHub as the source.
5. Select the repo and branch.
6. Add the build and startup commands above.
7. Save and let Azure deploy.
8. Open the generated `https://<app-name>.azurewebsites.net` URL.

## What your team will use

After deployment, your team only needs the App Service URL. They do not need to:

- install Node
- clone the repo
- run `npm install`
- run the app locally

## Local note

Your local preview may currently be on a forwarded port such as `http://localhost:57152/`. That is only for your local machine and is not the link you will share with your team.