import LsCompleteBackend from './ls';
import CompleteEngine from '../complete-engine';
import QSH from '../qsh';

export function initCompleteBackends(qsh: QSH, completeEngine: CompleteEngine) {

    completeEngine.registerBackend(new LsCompleteBackend({
        qsh,
    }));

}
