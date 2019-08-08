import QSH from './qsh';
// @ts-ignore
import parse from 'bash-parser';

import spawn from 'cross-spawn';
import { ChildProcess, exec } from 'child_process';
import fs, { WriteStream } from 'fs';
import { replaceEnvPATH } from './utils';

interface ExecInfo {
    execPromise: Promise<ChildProcess | void>;
    processExitPromise: Promise<ChildProcess | void>;
    sigint: () => void;
}



function execAST(ast: any, qsh: QSH): ExecInfo {
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
        let name = replaceEnvPATH(ast.name.text);
        // let args = (ast.suffix && ast.suffix.filter((item: any) => item.type === 'Word').map((item: any) => item.text)) || [];
        let args = [];
        let redirect: WriteStream | null = null;

        if (ast.suffix) {
            for (let suffic of ast.suffix) {
                if (suffic.type === 'Word') {
                    args.push(suffic.text);
                } else if (suffic.type === 'Redirect') {
                    if (suffic.op.type === 'great') {
                        redirect = fs.createWriteStream(replaceEnvPATH(suffic.file.text));
                    }
                }
            }
        }


        args = args.map((item: string) => replaceEnvPATH(item));
        const async = ast.async;

        const alias = qsh.alias[name];
        if (alias) {
            name = alias.split(' ')[0];
            args = alias.split(' ').slice(1).concat(args);
        }

        if (qsh.commands[name]) {
            const processExitPromise = qsh.commands[name](name, args);
            return {
                processExitPromise,
                execPromise: processExitPromise,
                sigint: () => {
                    // TODO
                }
            };
        }

        const childProcess = spawn(name, args, {
            stdio: !redirect ? 'inherit' : ['inherit', 'pipe', 'pipe'],
        });

        if (redirect) {
            childProcess.stdout && childProcess.stdout.pipe(redirect);
            childProcess.stderr && childProcess.stderr.pipe(redirect);
        }

        const processExitPromise: Promise<ChildProcess> = new Promise((resolve, reject) => {
            childProcess.on('exit', _ => {
                resolve(childProcess);
            });
            childProcess.on('error', e => {
                reject(e);
            });
        });

        return {
            processExitPromise,
            execPromise: processExitPromise,
            sigint: () => {
                process.kill(childProcess.pid, 'SIGINT');
            }
        };
    }
    throw new Error('Unsupport command');
}

export default function execCommand(qsh: QSH, cmd: string) {
    if (cmd.startsWith('>')) {
        const code = cmd.slice(1);
        // eslint-disable-next-line
        const result = eval(code);
        console.log(result);
        return {
            processExitPromise: Promise.resolve(),
            execPromise: Promise.resolve(),
            sigint: () => {
                // todo
            }
        };
    } else {
        const ast = parse(cmd);
        return execAST(ast, qsh);
    }
}
