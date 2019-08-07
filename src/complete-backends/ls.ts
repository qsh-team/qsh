import { CompleteBackend, CompleteItem } from '../complete-engine';

import path from 'path';
import shell from 'shelljs';

import _ from 'lodash';
import fs from 'fs';
import colors from 'ansi-colors';
import QSH from '../qsh';
import { replaceEnvPATH } from '../utils';
import { lsFilesToComplete } from './utils';

export default class LsCompleteBackend extends CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        if (line[triggerPos - 1] === ' ' && triggerPos !== 0) {
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

        return lsFilesToComplete(stringToReplace);
    }
}
