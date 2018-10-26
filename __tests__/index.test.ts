import fs from 'fs'
jest.mock('fs')

import {
  coerceVersions,
  getLocalPackageJson,
  getDependencyVersions,
  persistVersionsFromPackage,
  PackageJSON
} from '../src/index'

const pkgJSON: Partial<PackageJSON> = {
  'dependencies': {
    'cosmiconfig': '^5.0.6',
    '@types/cosmiconfig': '^5.0.3',
    'ramda': '^0.25.0',
    'fp-ts': '^1.10.0',
    'semver': '^5.6.0',
    'utility-types': '^2.1.0'
  },
  'devDependencies': {
    'typedoc': '^0.13.0',
    'gh-pages': '^2.0.1',
    '@babel/cli': '^7.1.2',
    '@babel/core': '^7.1.2',
    '@hungry/babel-preset-cli': '^0.1.1',
    'babel-core': '7.0.0-bridge.0',
    'babel-jest': '^23.6.0',
    'concurrently': '^4.0.1',
    'jest': '^23.6.0',
    'typescript': '^3.1.3'
  }
}

test('get deps versions', () => {
  // const pkg = getLocalPackageJson('../package.json')
  const originalVersions = getDependencyVersions(pkgJSON)
  const cdnVersions = coerceVersions(originalVersions)
  expect(cdnVersions).toMatchSnapshot()
})

test('save version to file - if all ok', () => {
  const writeFile = jest
    .fn()
    .mockResolvedValue('all good')

  // @ts-ignore
  fs.promises = {
    writeFile
  }

  const config = {
    packagePath: '../package.json',
    destinationPath: 'versions.json'
  }

  return persistVersionsFromPackage
    .run(config)
    .then(d => {
      if (d.isRight()) {
        expect(writeFile).toHaveReturned()
        expect(writeFile).toHaveBeenCalledWith(config.destinationPath, d.value)
      } else fail('should be right')
    })
})

test('save version to file - if there is a problem', () => {
  const errorMessage = 'ulala sth is wrong'
  const writeFile = jest
    .fn()
    .mockRejectedValue(new Error(errorMessage))

  // @ts-ignore
  fs.promises = {
    writeFile
  }

  const config = {
    packagePath: '../package.json',
    destinationPath: 'versions.json'
  }

  return persistVersionsFromPackage
    .run(config)
    .then(d => {
      if (d.isLeft()) expect(d.value).toBe(errorMessage)
      else fail('should be left')
    })
})
import { pipe as pipeP, flip, curry, applyFlipped } from 'fp-ts/lib/function'
import * as R from 'fp-ts/lib/Record'
import { option, some } from 'fp-ts/lib/Option'

test('fuck you ramda', () => {
  // export const getDependencyVersions =
  //   pipe<PackageJSON, ToDependencies, toDependenciesPairs, ReadonlyArray<Deps>, HashMap>(
  //     pick(['peerDependencies', 'devDependencies', 'dependencies']),
  //     toPairs,
  //     map(([_, deps]) => deps),
  //     reduce(merge, {})
  //   )

  // toPairs R.toArray
  // fromPairs R.fromFoldable

  const pkgJson = pkgJSON
  // const traverse_ = curry(R.traverseWithKey(option))
  // traverse_({})((d) => some(1))

  // const traverse_ = R.traverseWithKey(option)
  // traverse_({ dupa: true }, (a, b) => {
  //   return some(1)
  // })

  // const flipped_ = flip(curry<boolean, any, any>(R.traverseWithKey(option)))
  // flipped_((a, b) => {
  //   return some(1)
  // })({ dupa: true })

  // const getDepsVersion = pipeP(
  //   R.filter()
  //   R.map()
  // )
})