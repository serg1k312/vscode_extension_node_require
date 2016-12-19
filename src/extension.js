const vscode = require('vscode'); // eslint-disable-line
const path = require('path');
const os = require('os');
const _ = require('lodash');
const commonNames = require('./common-names');
const getCoreModules = require('./get-core-modules');
const getPackageDeps = require('./get-package-deps');
const getPosition = require('./get-position');

const TYPE_REQUIRE = 0;
const TYPE_IMPORT = 1;

function activate(context) {
    const config = vscode.workspace.getConfiguration('quickrequire') || {};
    const includePattern = `/**/*.{${config.include.toString()}}`;
    const excludePattern = `**/{${config.exclude.toString()}}`;

    const startPick = function(type) {
        vscode.workspace.findFiles(includePattern, excludePattern, 100).then((result) => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                return;
            }

            const items = [];

            getPackageDeps().forEach((dep) => {
                items.push({
                    label: dep,
                    description: 'package dependency',
                    fsPath: null,
                });
            });

            getCoreModules().forEach((dep) => {
                items.push({
                    label: dep,
                    description: 'core module',
                    fsPath: null,
                });
            });

            result.forEach((dep) => {
                items.push({
                    label: path.basename(dep.path),
                    description: dep.fsPath.replace(vscode.workspace.rootPath, '').replace(/\\/g, '/'),
                    fsPath: dep.fsPath,
                });
            });

            vscode.window.showQuickPick(items, { placeHolder: 'select file' }).then((value) => {
                if (!value) {
                    return;
                }

                let relativePath;
                let importName;

                if (value.fsPath) {
                    const dirName = path.dirname(editor.document.fileName);
                    relativePath = path.relative(dirName, value.fsPath);
                    relativePath = relativePath.replace(/\\/g, '/');
                    importName = _.camelCase(path.basename(value.fsPath).split('.')[0]);

                    if (relativePath.indexOf('../') === -1) {
                        relativePath = `./${relativePath}`;
                    }

                    relativePath = relativePath.replace('.js', '');
                } else {
                    relativePath = value.label;
                    const commonName = commonNames(value.label);
                    importName = commonName || _.camelCase(value.label);
                }

                let script;

                if (type === TYPE_REQUIRE) {
                    script = `const ${importName} = require('${relativePath}');`;
                } else {
                    script = `import ${importName} from '${relativePath}';`;
                }

                const codeBlock = editor.document.getText().split(os.EOL);
                const lineStart = getPosition(editor.document.getText().split(os.EOL));
                const alreadyImported = codeBlock.some(line => line === script);

                if (alreadyImported) return;

                editor.edit((editBuilder) => {
                    const position = new vscode.Position(lineStart, 0);
                    editBuilder.insert(position, `${script}\n`);
                });
            });
        });
    };

    context.subscriptions.push(vscode.commands.registerCommand('extension.quickRequire', () => {
        startPick(TYPE_REQUIRE);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.quickRequire_import', () => {
        startPick(TYPE_IMPORT);
    }));
}

exports.activate = activate;

function deactivate() {
}

exports.deactivate = deactivate;
