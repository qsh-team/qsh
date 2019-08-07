import { CompleteBackend, CompleteItem } from '../complete-engine';

import path from 'path';
import shell from 'shelljs';

import _ from 'lodash';
import fs from 'fs';
import colors from 'ansi-colors';
import QSH from '../qsh';

//
export function prefixFromPath(stringToReplace: string) {
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

    return pathPrefix;
}

export function lsFilesToComplete(stringToReplace: string) {
    let result: string[] = [];

    const pathPrefix = prefixFromPath(stringToReplace);

    // const {
    //     word,
    //     prefix: pathPrefix,
    // } = splitPath(stringToReplace);

    try {
        const all = shell.ls('-A', [pathPrefix]);
        result = all;
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

        return result;
    };

    return result.map(item => {
        return {
            value: pathPrefix + path.basename(item),
            text: String(pathPrefix) + path.basename(item),
            icon: genIcon(item)
        };
    });
}
