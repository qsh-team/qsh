import LsCompleteBackend from './ls';
import CompleteEngine from '../complete-engine';
import QSH from '../qsh';
import CommandCompleteBackend from './command';

export function initCompleteBackends(qsh: QSH, completeEngine: CompleteEngine) {
    completeEngine.registerBackend(new LsCompleteBackend({
        qsh
    }));

    // completeEngine.registerBackend(new CommandCompleteBackend({
    //     qsh
    // }));
}
