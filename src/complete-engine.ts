import _ from 'lodash';
import QSH from './qsh';
import colors from 'ansi-colors';
import fuzzy from 'fuzzy';

export interface CompleteItem {
    text: string;
    value: string;
    icon: string;
    weight?: number;
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
    private _qsh: QSH;

    public constructor(qsh: QSH) {
        this._qsh = qsh;
    }

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
            const completes = await item.complete(line, triggerPos, pos);
            return completes;
        });
        const result = _.flatten(await Promise.all(allComplete));

        const stringToReplace = line.slice(triggerPos, pos);
        const menu = _.sortBy(fuzzy.filter(stringToReplace, result, {
            pre: '\u001b[4m',
            post: '\u001b[24m',
            extract: (item) => item.text,
        }).map(item => {
            const score = item.original.text.startsWith(stringToReplace) ? (item.score * 3) : item.score;

            return {
                ...item,
                // give a start matcher a higher score
                score: score * (item.original.weight || 1),
            };
        }), item => -item.score);

        return menu.map(item => {
            return {
                text: item.string,
                value: item.original.value,
                icon: item.original.icon,
            };
        });
    }

}
