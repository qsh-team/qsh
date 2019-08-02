import spawn from 'cross-spawn';
import path from 'path';
import QSH from '../qsh';

import _ from 'lodash';
import fs from 'fs';

import shell from 'shelljs';
import utils from 'util';

const copyFile = utils.promisify(fs.copyFile);
const chmod = utils.promisify(fs.chmod);

export interface IAutoComplete {
    text: string;
    full: string;
}

export function autoComplete(
    inputString: string,
    qsh: QSH
): Promise<IAutoComplete[]> {
    return new Promise((resolve, reject) => {
        const child = spawn(
            path.join(__dirname, '../../vendor/capture.zsh'),
            [inputString],
            {
                env: process.env
            }
        );
        let output = '';
        child.stdout &&
      child.stdout.on('data', data => {
          output += data.toString();
      });

        child.stderr &&
      child.stderr.on('error', e => {
          // console.error('error', e);
          reject(e);
      });

        child.on('exit', () => {
            const result = (output.toString().split('\r\n') as string[]) || [];
            const noDuplicateResult = result.filter((item, index) => result.indexOf(item) === index && item !== '');

            let prefix = inputString;
            for (let i = inputString.length - 1; i >= 0; i--) {
                if (inputString[i] !== ' ') {
                    prefix = prefix.slice(0, i);
                } else {
                    break;
                }
            }

            const toReturn = noDuplicateResult.map(item => {
                return {
                    text: item,
                    full: prefix + item
                };
            });
            // history
            const historyItem = qsh.history.find(item => item.startsWith(inputString));
            if (historyItem) {
                toReturn.unshift({
                    text: historyItem,
                    full: historyItem
                });
            }

            if (toReturn.length > 0) {
                resolve(toReturn);
            }
        });
    });
}
