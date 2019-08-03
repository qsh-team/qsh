import _ from 'lodash';

export interface CompleteItem {
    text: string;
    value: string;
    score?: number;
}

export class CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        return false;
    }

    public async complete(line: string, triggerPos: number, pos: number): Promise<CompleteItem[]> {
        return [];
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