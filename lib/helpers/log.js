const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');

module.exports = (scope) => {
    const IS_VERBOSE = argv.v || argv.verbose;

    const warn = (msg) => {
        console.log();
        console.log(`[${scope}] ${chalk.magenta('⚠')} ${chalk.magenta(msg)}.`);
        console.log();
    };

    const success = (msg, { time, space = false } = {}) => {
        const txt = chalk.green(chalk.bold('✔ '));
        const message = [`[${scope}] `, txt, msg, time && ` (${time})`].filter(Boolean).join('');
        space && console.log();
        console.log(message);
    };

    const title = (msg) => {
        console.log('~', chalk.bgYellow(chalk.black(msg)), '~');
        console.log();
    };

    const json = (data, output, noSpace) => {
        // only output for a command
        if (output) {
            return console.log(JSON.stringify(data, null, 2));
        }
        !noSpace && console.log();
        !noSpace && console.log(`[${scope}]`, JSON.stringify(data, null, 2));
        noSpace && console.log(JSON.stringify(data, null, 2));
        console.log();
    };

    const error = (e) => {
        console.log(`[${scope}] ${(chalk.red(' ⚠'), chalk.red(e.message))}`);
        console.log();
        console.error(e);
        process.exit(1);
    };

    function debug(item, message = 'debug') {
        if (!IS_VERBOSE) {
            return;
        }
        if (Array.isArray(item) || typeof item === 'object') {
            console.log(`[${scope}]`, message);
            return json(item, false, true);
        }
        console.log(`[${scope}] ${message} \n`, item);
    }

    function about(config) {
        Object.keys(config).forEach((key) => {
            console.log(`➙ ${key}: ${chalk.bgYellow(chalk.black(config[key]))}`);
        });
        console.log('');
    }

    return {
        success,
        about,
        debug,
        title,
        error,
        json,
        warn,
        IS_VERBOSE
    };
};
