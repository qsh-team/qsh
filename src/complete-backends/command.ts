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

function getExecsCompletes(qsh: QSH, searchDirs: string[], keepPrefix = false) {
    const files = _.flatten(searchDirs.map(dir => {
        try {
            return shell.ls(dir).map(item => path.join(dir, item));
        } catch (e) {
            return [];
        }
    }));

    const execFiles = files.filter(item => {
        try {
            return executable.sync(item);
        } catch (e) {
            return false;
        }
    });

    return execFiles.map((item: string) => {
        const name = (keepPrefix ? searchDirs[0] : '') + path.basename(item);
        return {
            value: name,
            text: name,
            icon: qsh.helper.awesomeSymbol('icon-terminal')
        };
    });
}

const cachedGetExecCompeletes = memoizee(getExecsCompletes, { maxAge: 1000 });

export default class CommandCompleteBackend extends CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        if (triggerPos === 0) {
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

        if (line.indexOf('/') === -1) {
            const pathEnv = process.env.PATH || '';
            const searchDirs = pathEnv.split(':').filter(item => fs.existsSync(item));

            return cachedGetExecCompeletes(this._qsh, searchDirs);
        } else {
            const prefix = prefixFromPath(stringToReplace);
            const final = cachedGetExecCompeletes(
                this._qsh,
                [path.join(prefix)],
                true
            );

            return final;
        }

    // return lsFilesToComplete('/bin/' + stringToReplace);
    }
}
