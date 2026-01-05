const chalk = require('chalk');

const logger = {
    info: (msg) => console.log(chalk.blue(' [INFO] ') + chalk.white(msg)),
    success: (msg) => console.log(chalk.green(' [SUCCESS] ') + chalk.white(msg)),
    warn: (msg) => console.log(chalk.yellow(' [WARN] ') + chalk.white(msg)),
    error: (msg) => console.log(chalk.red(' [ERROR] ') + chalk.white(msg)),
    system: (msg) => console.log(chalk.magenta(' [SYSTEM] ') + chalk.cyan(msg)),

    // Easir Branding Log
    banner: () => {
        console.log(chalk.cyan('=================================================='));
        console.log(chalk.bold.cyan('             EASIR API SERVICE v2.0               '));
        console.log(chalk.cyan('         Engineered by Easir Iqbal Mahi           '));
        console.log(chalk.cyan('=================================================='));
    }
};

module.exports = logger;
