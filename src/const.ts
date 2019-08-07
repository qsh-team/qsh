import path from 'path';

export const HOME_DIR = process.env.HOME || '/tmp';

export const QSH_ROOT_DIR = path.join(HOME_DIR, 'qsh_config');
export const QSH_HISTORY_FILE = path.join(QSH_ROOT_DIR, '.qsh_history');
export const QSH_LOG_FILE = path.join(QSH_ROOT_DIR, '.qsh_logs');