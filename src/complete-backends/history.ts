import { CompleteBackend, CompleteItem } from '../complete-engine';

// @ts-ignore
import executable from 'executable';
import path from 'path';
import shell, { exec } from 'shelljs';

import _ from 'lodash';
import fs from 'fs';
import colors from 'ansi-colors';
import QSH from '../qsh';
import { replaceEnvPATH } from '../utils';
import { lsFilesToComplete, prefixFromPath } from './utils';
import memoizee from 'memoizee';

export default class HistoryCompleteBackend extends CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        if (triggerPos === 0 || line[triggerPos - 1] === ' ') {
            return true;
        }
        return false;
    }

    public async complete(
        line: string,
        triggerPos: number,
        pos: number
    ): Promise<CompleteItem[]> {
        const stringToReplace = line.slice(triggerPos, pos);

        if (pos === 0) {
            return [];
        }

        const realLine = line.toLowerCase();

        const items = this._qsh.history
            .filter(item => item.toLowerCase().startsWith(realLine) && item.toLowerCase() !== realLine);

        if (items.length > 0) {
            return _.uniq(items).map(item => {
                return {
                    icon: this._qsh.helper.awesomeSymbol('icon-history'),
                    text: item.slice(triggerPos),
                    value: item.slice(triggerPos),
                    weight: 999,
                };
            });
        } else {
            return [];
        }

    }
}
