import { CompleteBackend, CompleteItem } from '../complete-engine';

import path from 'path';
import shell from 'shelljs';

export default class LsCompleteBackend extends CompleteBackend {
    public trigger(line: string, triggerPos: number): boolean {
        if (line[triggerPos] === ' ' && line.trim().endsWith('ls')) {
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

        const wordArray = line.slice(triggerPos + 2, pos + 1).split('/');
        const word = wordArray.pop() || '';
        const pathPrefix = wordArray.join('/');

        try {
            const all = shell.ls(path.join(process.cwd(), pathPrefix));
            result = all.filter(item => item.toLowerCase().startsWith(word.toLowerCase()));
        } catch (e) {}

        return result.map(item => ({
            value: path.basename(item),
            text: path.basename(item),
            score: 0
        }));
    }
}
