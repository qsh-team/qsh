import { CompleteBackend, CompleteItem } from '../complete-engine';

import path from 'path';
import shell from 'shelljs';

import _ from 'lodash';
import fs from 'fs';
import colors from 'ansi-colors';
import QSH from '../qsh';
import { replaceEnvPATH } from '../utils';

export default class LsCompleteBackend extends CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        if (line[triggerPos] === ' ') {
            return true;
        }
        return false;
    }

    public async complete(
        line: string,
        triggerPos: number,
        pos: number
    ): Promise<CompleteItem[]> {
        let result: string[] = [];

        const stringToReplace = line.slice(triggerPos + 2, pos + 1);

        let pathPrefix = '';
        let word = '';

        if (stringToReplace.indexOf('/') !== -1) {
            for (let i = stringToReplace.length - 1; i >= 0; i--) {
                const ch = stringToReplace[i];
                if (ch !== '/') {
                    word = ch + word;
                } else {
                    break;
                }
            }
        } else {
            word = stringToReplace;
        }

        pathPrefix = stringToReplace.slice(0, stringToReplace.length - word.length);

        try {
            const all = shell.ls('-A', [pathPrefix]);
            if (word.length > 0) {
                result = all.filter(item => item.toLowerCase().startsWith(word.toLowerCase()));
            } else {
                result = all;
            }
        } catch (e) {}



        const genIcon = (pathname: string) => {
            const ext = path.extname(pathname);

            const fileNameTable: { [name: string]: string } = {
                Dockerfile: colors.blueBright(''),
                '.git': colors.redBright(''),
                node_modules: colors.redBright(''),
                gitignore: colors.redBright('')
            };
            const extIconTable: { [name: string]: string } = {
                '.ts': colors.blueBright('ﯤ'),
                '.tsx': colors.blueBright('ﯤ'),
                '.json': 'ﬥ',
                '.js': ''
            };
            let result = fileNameTable[path.basename(pathname)] || extIconTable[ext];

            if (!result) {
                try {
                    if (fs.lstatSync(path.join(pathname)).isDirectory()) {
                        result = colors.yellowBright('');
                    } else {
                        result = '';
                    }
                } catch {
                    result = '';
                }
            }

            return ' ' + result + ' ';
        };


        return result.map(item => {
            return {
                value: pathPrefix + path.basename(item),
                text: genIcon(item) + pathPrefix + path.basename(item),
                score: 0,
            };
        });
        // return final.map((item: string) => ({
        //     value: pathPrefix + path.basename(item),
        //     text: genIcon(item) + pathPrefix + path.basename(item),
        //     score: 0
        // }));
    }
}
