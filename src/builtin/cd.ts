import QSH from "../qsh";
import shell from 'shelljs';

export default function initCd(qsh: QSH) {
    qsh.event.on('init', () => {
        qsh.registerCommand('cd', async (commandName: string, args: string[]) => {
            shell.cd(args[0]);
        });
    });
}