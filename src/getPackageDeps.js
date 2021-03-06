const vscode = require('vscode') // eslint-disable-line
const _ = require('lodash')

let warningShown = false

function resolveDeps(deps) {
  let keys = []

  deps.forEach(function(dep) {
    try {
      const reqResolved = require.resolve(dep.fsPath)
      if (require.cache[reqResolved]) delete require.cache[reqResolved]
      const pck = require(dep.fsPath) // eslint-disable-line import/no-dynamic-require, global-require
      const dependencies = Object.assign(
        {},
        pck.dependencies || {},
        pck.devDependencies || {}
      )
      keys = keys.concat(Object.keys(dependencies))
    } catch (err) {
      if (!warningShown) {
        vscode.window.showWarningMessage(
          'No package.json file in root folder. Only showing core modules and local files.'
        )
        warningShown = true
      }
    }
  })

  return _.uniq(keys)
}

module.exports = function() {
  const promiseOfPackageJsonFiles = vscode.workspace.findFiles(
    '**/package.json',
    '**/node_modules/**'
  )
  return promiseOfPackageJsonFiles.then(deps => resolveDeps(deps))
}
