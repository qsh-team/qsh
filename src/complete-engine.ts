import _ from 'lodash';
import QSH from './qsh';

export interface CompleteItem {
    text: string;
    value: string;
    score?: number;
}

export interface CompleteBackendOption {
    qsh: QSH;
}
export class CompleteBackend {
    protected _qsh: QSH;

    public constructor({
        qsh,
    }: CompleteBackendOption) {
        this._qsh = qsh;
    }
    public trigger(line: string, triggerPos: number): boolean {
        throw new Error('trigger should be implemenet');
    }

    public async complete(line: string, triggerPos: number, pos: number): Promise<CompleteItem[]> {
        throw new Error('complete should be implemenet');
    }
}

export default class CompleteEngine {
    private _backends: CompleteBackend[] = [];
    private _triggeredBackends: CompleteBackend[] = [];

    public registerBackend(backend: CompleteBackend) {
        this._backends.push(backend);
    }


    public trigger(line: string, triggerPos: number): boolean {
        // reject will resolve false
        this._triggeredBackends = this._backends.filter((item) => {
            return item.trigger(line, triggerPos);
        });
        return this._triggeredBackends.length > 0;
    }

    public async complete(line: string, triggerPos: number, pos: number): Promise<CompleteItem[]> {
        const allComplete = this._triggeredBackends.map(async item => {
            try {
                return await item.complete(line, triggerPos, pos);
            } catch (e) {
                return [];
            }
        });
        const result = await Promise.all(allComplete);
        return _(result).flatten().sort().value();
    }

}