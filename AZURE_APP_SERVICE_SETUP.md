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

## Startup configuration

Set this startup command in Azure App Service:

```text
Startup command: npm run serve:ssr:EIIP
```

## GitHub Actions deployment setup

This repo includes [deploy-azure-webapp.yml](.github/workflows/deploy-azure-webapp.yml), which builds the SSR app, trims dev dependencies, and deploys the runnable package to Azure App Service.

After you create the Web App in Azure:

1. In Azure Portal, open the App Service.
2. Open Get publish profile and download the file.
3. In GitHub, open Settings > Secrets and variables > Actions.
4. Add a repository secret named `AZURE_WEBAPP_PUBLISH_PROFILE` and paste in the publish profile XML.
5. Add a repository variable named `AZURE_WEBAPP_NAME` with your App Service name.
6. Push to `master` or run the workflow manually from the Actions tab.

## Optional App Service setting

You do not need an Azure build command when using the workflow above.

If you later switch to Azure Deployment Center building directly from the repo instead of GitHub Actions, set this App Setting:

```text
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## Why these values are correct

- Production build script: [package.json](package.json)
- Production server script: [package.json](package.json)
- SSR Express server: [src/server.ts](src/server.ts)
- Azure-compatible `PORT` handling: [src/server.ts](src/server.ts)
- Deployment workflow: [.github/workflows/deploy-azure-webapp.yml](.github/workflows/deploy-azure-webapp.yml)

## Fastest path

1. Push the repo to GitHub.
2. In Azure Portal, create a new App Service.
3. Set the startup command above.
4. Download the publish profile from Azure.
5. Add the GitHub secret and variable listed above.
6. Push to `master` or run the GitHub Actions workflow manually.
7. Open the generated `https://<app-name>.azurewebsites.net` URL.

## What your team will use

After deployment, your team only needs the App Service URL. They do not need to:

- install Node
- clone the repo
- run `npm install`
- run the app locally

## Local note

Your local preview may currently be on a forwarded port such as `http://localhost:57152/`. That is only for your local machine and is not the link you will share with your team.
