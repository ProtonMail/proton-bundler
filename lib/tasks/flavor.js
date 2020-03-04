const os = require('os');

const { isWebClientLegacy } = require('../config');
const { bash, script } = require('../helpers/cli');
const { debug, info, warn } = require('../helpers/log')('proton-bundler');

/**
 *  Get SRIs for all files !index.js
 *  @return {Promise<Object>} <key:file> => <value:sri>
 */
// async function getSRI(type = 'prod') {
//     const { stdout = '' } = await script(`manageSRI.sh get-${type}`);
//     debug(stdout, `sri for ${type}`);
//     return JSON.parse(stdout);
// }

/**
 * Get the configuration for a deployement
 *     [Warning] you must have  NODE_ENV=production
 * @param  {Array} flags flags used to bundle
 * @return {Object}       app's config
 */
async function getNewConfig(flags = process.argv.slice(3), api) {
    if (isWebClientLegacy()) {
        const { stdout = '' } = await bash('./tasks/setupConfig.js', [
            '--print-config',
            `--branch deploy-${api}`,
            ...flags
        ]);
        debug(stdout, 'stdout config angular');
        return JSON.parse(stdout);
    }

    const { stdout = '' } = await bash('npx proton-pack print-config', flags);
    debug(stdout, 'stdout config app');
    return JSON.parse(stdout);
}

function sed(rule, files) {
    // Because for the lulz. cf https://myshittycode.com/2014/07/24/os-x-sed-extra-characters-at-the-end-of-l-command-error/
    if (os.platform() === 'darwin') {
        return bash(`sed -i '' '${rule}' $(${files})`);
    }
    return bash(`sed -i '${rule}' "$(${files})"`);
}

/**
 * Create a new bundle from an existing one
 * To validate the bundle, we use SRI <3 <3 <3 it's easy to validate a new build with them.
 * They crash if it doesn't match <3 <3 <3
 *     - Generate hash for files with the modifications
 *     - Replace them inside index.js
 *     - Then we replace the SRI of index.js inside index.html
 * @return {Promise}
 */
async function main({ api }) {
    warn('move to +proxy when we bundle so we do not need to change the API');

    // // await bash('rm -rf distProd || true && cp -r dist-b distProd'); // only dev
    await bash('cp -r dist distProd'); // Final version
    info('made a copy of the current dist');

    const {
        sentry: { dsn: currentSentryDSN },
        secureUrl: currentSecureURL
    } = await getNewConfig(['--api prod+proxy']);
    const {
        apiUrl,
        sentry: { dsn: newSentryDSN },
        secureUrl: newSecureURL
    } = await getNewConfig();

    await sed(`s#="/api"#="${apiUrl}"#;`, "find dist -type f  -name 'index*.js'");
    info(`replace current api by ${apiUrl} inside the main index`);

    await sed(`s#="${currentSentryDSN}"#="${newSentryDSN}"#;`, "find dist -type f  -name 'index*.js'");
    info('replace sentry config inside the main index');

    await sed(`s#="${currentSecureURL}"#="${newSecureURL}"#;`, "find dist -type f  -name 'index*.js'");
    info('replace secureURL config inside the main index');

    const { stdout } = await script('manageSRI.sh write-html');
    info('update new index.html');
    debug(stdout, 'write new SRIs HTML');

    /**
     * Check if the sub-build is valid
     *     - Correct SRI for updated files
     *     - Correct SRI for the index
     *     - Right config for A/B
     *     - Right config for Sentry
     * Stop the process if it fails
     */
    await script('manageSRI.sh validate', [api]);
}

module.exports = main;
