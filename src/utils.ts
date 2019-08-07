// $PWD/test => /real/path/to/pwd/test
// ~/test => /path/to/home/test
export function replaceEnvPATH(raw: string) {
    return raw
        .replace(/^~/, process.env.HOME || '')
        .replace(/\$([^/ ]+)/g, (_, n) => process.env[n] || '');
}