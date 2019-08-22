# Proton Bundler

CLI tools to bundle Proton web clients for deploys.

Default tasks:
- Save dependencies (_update package-lock.json when we deploy a QA version or release_) cf `--default-branch`
- Clear previous dist dir
- Lint app before bundler (_we can disable this via_ `--no-lint`) [How to setup](https://github.com/ProtonMail/proton-bundler#Lint-the-app)
- Setup config for the app
- Extract current git env (_origin branch,tag,commit_)
- Pull deploy branch to the dist dir
- Copy htaccess
- [beta/prod] Upgrade translations inside the app (_json files_) [How to setup](https://github.com/ProtonMail/proton-bundler#Sync-i18n)
- Build the app [How to setup](https://github.com/ProtonMail/proton-bundler#Build-the-app)
- Push to the deploy branch
- Upgrade crowdin with latest translations from the app [How to setup](https://github.com/ProtonMail/proton-bundler#Sync-i18n)

## How to install ?

```sh
$ npm i -D github:ProtonMail/proton-bundler.git#semver:^1.0.0
``` 

## Commands

```sh
$ proton-bundler [action:optional] <--api> <--branch> <--flow> <--i18n> <--appMode> <--default-branch>
``` 

### Actions

:warning: Default no action to bundle the app

- `hosts` : to create new deploy targets (branch) on a repository

### flags
- `--remote`: Build the current app from master via a git clone
- `--branch`: **Mandatory** ex: deploy-settings 
- `--api`: Typeof branch to deploy (dev/beta/build/etc.)
- `--flow`: Type of flow (_Usefull only for WebClient_)
- `--localize`: To force the upgrade i18n task inside the app during any deploy (default only for prod/beta if not ci and not with --no-i18n)
- `--no-lint`: Ignore lint task on deploy
- `--no-i18n`: Ignore i18n tasks on deploy
- `--appMode`: Type of bundle for the app (ex: standalone is an option for protonmail-settings)
- `--default-branch`: Default master, What's the default branch on your repository (usually master, usefull for the package-lock update)


## How to configure

You can create a custom deploy task by using a file `proton.bundler.js` at the root of your app.

### Commands

#### Lint the app (to ignore --no-lint)

You must have `$ npm run lint` available inside your app

#### Build the app

You must have `$ npm run build` available inside your app

#### Sync i18n (to ignore --no-i18n)

You must have `$ npm run i18n:getlatest` available inside your app.
You must have `$ npm run i18n:upgrade` available inside your app.

### Documentation

We use tasks from [Listr](https://github.com/SamVerschueren/listr#usage)

Format:

```js
(argv) => {

    const tasks = (deployConfig) => ({
        hookPreTasks: [...task]
        hookPostTasks: [...task]
        hookPostTaskClone: [...task]
        hookPostTaskBuild: [...task]
    });

    const config = {
        EXTERNAL_FILES: [...<String>],
        apiUrl: <String>
    };

    return { tasks, config };
}
```

deployConfig:

- `branch: <String>` ~ branch's name
- `appMode: <String>` ~ Type of app we build, standalone or bundle (default)
- `isCI: <Boolean>`
- `flowType: <String>` ~ Type of deploy ('single', or 'many')
- `forceI18n: <Boolean>` ~ Force run the i18n task
- `runI18n: <Boolean>` ~ Should we run the i18n tasks ?
- `isRemoteBuild: <Boolean>` ~ Is it the deploy of a remote build ?

We have a context available for tasks inside ( _hookPostTasks, hookPostTaskClone, hookPostTaskBuild_ ):

- originCommit: Commit from where we create the deploy
- originBranch: Branch from where we create the deploy
- tag: Tag from where we deploy (usefull for prod)

### Ex

We want to:
- Prevent the deploy to a branch X
- Load a custom config when we deploy
- Use a custom config env when we deploy (ex: _the WebClient is using an old standard_)

```js
const path = require('path');
const { bash } = require('proton-bundler');

const { externalFiles, getDeployApi } = require('./appConfig');

function main(argv) {
    const { apiUrl } = getDeployApi(branch, argv);

    function tasks({ branch }) {

        if (/monique/.test(branch)) {
            throw new Error('You cannot deploy to this branch.');
        }

        return {
            customConfigSetup: [
                {
                    title: 'Setup config custom',
                    async task(ctx) {
                        return bash('./tasks/setupConfig.js ', process.argv.slice(2));
                    }
                }
            ]
        };
    }

    const config = {
        apiUrl,
        branch,
        EXTERNAL_FILES: externalFiles
    };

    return { config, tasks };
}

module.exports = main;
```

### Output demo

```shell
[atlas]:~/dev/taf/Angular [feat/protonBundler]
$ deploy dev

> protonmail-web@3.16.0 deploy /home/dhoko/dev/taf/Angular
> cross-env NODE_ENV=dist proton-bundler --default-branch v3 "--branch=deploy-demo" "--api=dev"

[proton-bundler] ✔ Found proton.bundler.js, we can extend the deploy
➙ branch: deploy-demo
➙ apiUrl: https://mail.protonmail.com/api
➙ appMode: bundle
➙ SENTRY: undefined

  ✔ Check env
  ✔ Check dependencies
  ✔ Clear previous dist
  ✔ Lint sources
  ✔ Setup config custom
  ✔ Extract git env for the bundle
  ✔ Pull dist branch deploy-demo
  ✔ Copy some files
  ✔ Build the application
  ✔ Generate the changelog
  ✔ Generate the version info
  ✔ Push dist to deploy-demo
 [proton-bundler] ✔ App deployment done (01:19)
```
