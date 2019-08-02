import QSH from './qsh';
// @ts-ignore
import parse from 'bash-parser';

import spawn from 'cross-spawn';
import { ChildProcess, exec } from 'child_process';

interface IExecInfo {
    execPromise: Promise<ChildProcess|void>;
    processExitPromise: Promise<ChildProcess|void>;
}

// $PWD/test => /real/path/to/pwd/test
// ~/test => /path/to/home/test
function replaceEnvPATH(raw: string) {
    return raw.replace(/^~/, process.env.HOME || '').replace(/\$([^/ ]+)/g, (_, n) => process.env[n] || '');
}

function execAST(ast: any, qsh: QSH): IExecInfo {
    if (ast.type === 'Script') {
        let last;
        for (let command of ast.commands) {
            last = execAST(command, qsh);
        }
        if (!last) {
            throw new Error('unkown commands');
        }
        return last;
    } else if (ast.type === 'Command') {
        const name = replaceEnvPATH(ast.name.text);
        let args = ast.suffix && ast.suffix.map((item: any) => item.text) || [];

        args = args.map((item: string) => replaceEnvPATH(item));
        const async = ast.async;


        if (qsh.commands[name]) {
            const processExitPromise = qsh.commands[name](name, args);
            return {
                processExitPromise,
                execPromise: processExitPromise,
            };
        }

        const childProcess = spawn(name, args, {
            stdio: 'inherit',
        });


        const processExitPromise: Promise<ChildProcess> = new Promise((resolve, reject) => {
            childProcess.on('exit', _ => {
                resolve(childProcess);
            });
            childProcess.on('error', (e) => {
                reject(e);
            });
        });

        return {
            processExitPromise,
            execPromise: processExitPromise,
        };
    }
    throw new Error('Unsupport command');
}

export default function execCommand(qsh: QSH, cmd: string) {
    const ast = parse(cmd);
    return execAST(ast, qsh);
}