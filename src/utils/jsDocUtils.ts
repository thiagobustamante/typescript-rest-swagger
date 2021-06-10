import * as ts from 'typescript';

export function getJSDocDescription(node: ts.Node) {
    const jsDocs = (node as any).jsDoc as Array<ts.JSDoc>;
    if (!jsDocs || !jsDocs.length) { return ''; }

    return jsDocs[0].comment as string || '';
}

export function getJSDocTag(node: ts.Node, tagName: string) {
    const tags = getJSDocTags(node, tagName);
    if (!tags || !tags.length) {
        return undefined;
    }
    return tags[0].comment as string;
}

export function isExistJSDocTag(node: ts.Node, tagName: string) {
    const tags = getJSDocTags(node, tagName);
    if (!tags || !tags.length) {
        return false;
    }
    return true;
}

function getJSDocTags(node: ts.Node, tagName: string) {
    return getMatchingJSDocTags(node, t => t.tagName.text === tagName);
}

export function getFirstMatchingJSDocTagName(node: ts.Node, isMatching: (t: ts.JSDocTag) => boolean) {
    const tags = getMatchingJSDocTags(node, isMatching);
    if (!tags || !tags.length) { return undefined; }

    return tags[0].tagName.text;
}

function getMatchingJSDocTags(node: ts.Node, isMatching: (t: ts.JSDocTag) => boolean) {
    const jsDocs = (node as any).jsDoc as Array<ts.JSDoc>;
    if (!jsDocs || !jsDocs.length) { return undefined; }

    const jsDoc = jsDocs[0];
    if (!jsDoc.tags) { return undefined; }

    return jsDoc.tags.filter(isMatching);
}
