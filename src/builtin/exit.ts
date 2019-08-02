import QSH from '../qsh';

export default function initExit(qsh: QSH) {
    qsh.event.on('init', () => {
        qsh.registerCommand('exit', () => {
            qsh.event.emit('exit');
            return Promise.resolve();
        });
    });
}
