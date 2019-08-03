import LsCompleteBackend from './ls';
import CompleteEngine from '../complete-engine';

export function initCompleteBackends(completeEngine: CompleteEngine) {
    completeEngine.registerBackend(new LsCompleteBackend());
}