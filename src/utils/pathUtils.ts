'use strict';

export function normalizePath(path?: string) {
    if (!path) {
        return path;
    }

    let parts = path.split('/');
    parts = parts.map(part => part.startsWith(':')?`{${part.slice(1)}}`:part);
    return parts.join('/');
}
