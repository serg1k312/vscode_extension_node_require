const vscode = require('vscode')
const path = require('path')
const Promise = require('bluebird')
const insertRequire = require('./insertRequire')
const getProjectFiles = require('./getProjectFiles')
const getCoreModules = require('./getCoreModules')
const getPackageDeps = require('./getPackageDeps')

function activate(context) {
  const config = vscode.workspace.getConfiguration('node_require')

  const startPick = function(
    { insertAtCursor = false, multiple = false } = {}
  ) {
    Promise.join(
      getPackageDeps(),
      getProjectFiles(config)
    ).then(([packageDepsArray = [], projectFiles = []]) => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return
      const items = []
      packageDepsArray.sort().forEach(dep => {
        items.push({
          label: dep,
          description: 'module',
          fsPath: null
        })
      })

      getCoreModules().forEach(dep => {
        items.push({
          label: dep,
          description: 'core module',
          fsPath: null
        })
      })

      projectFiles.forEach(dep => {
        const rootRelative = dep.fsPath
          .replace(vscode.workspace.rootPath, '')
          .replace(/\\/g, '/')

        const label = path.basename(dep.path).match(/index\.(j|t)sx?/)
          ? `${path.basename(path.dirname(dep.path))}/${path.basename(
              dep.path
            )}`
          : path.basename(dep.path)

        // don't allow requiring of the file being edited
        if (editor.document.fileName === dep.fsPath) return
        items.push({
          label,
          detail: rootRelative,
          description: 'project file',
          fsPath: dep.fsPath
        })
      })

      if (multiple) {
        items.unshift({
          label: 'Finalize Selections',
          finish: true
        })
      }

      const values = []
      const finalizeMultiple = () => {
        Promise.mapSeries(values, value => {
          return insertRequire(value, insertAtCursor, config)
        })
      }

      const showSelectionWindow = items => {
        vscode.window
          .showQuickPick(items, {
            placeHolder: 'Select dependency',
            matchOnDescription: true,
            matchOnDetail: true
          })
          .then(value => {
            if (!value) return
            if (multiple) {
              if (value.finish) return finalizeMultiple()
              values.push(value)
              items = items.filter(i => i.label !== value.label)
              showSelectionWindow(items)
            } else {
              insertRequire(value, insertAtCursor, config)
            }
          })
      }

      showSelectionWindow(items)
    })
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('node_require.require', () => {
      startPick()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('node_require.requireAndInsert', () => {
      startPick({ insertAtCursor: true })
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('node_require.requireMultiple', () => {
      startPick({ multiple: true })
    })
  )
}

exports.activate = activate

function deactivate() {}

exports.deactivate = deactivate
