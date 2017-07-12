'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
function normalizePath(path) {
    if (!path) {
        return path;
    }
    var parts = path.split('/');
    parts = parts.map(function (part) { return part.startsWith(':') ? "{" + part.slice(1) + "}" : part; });
    return parts.join('/');
}
exports.normalizePath = normalizePath;
//# sourceMappingURL=pathUtils.js.map