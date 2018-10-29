import fs from 'fs'
jest.mock('fs')

import {
  coerceVersions,
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
  const originalVersions = getDependencyVersions(pkgJSON as PackageJSON) // need to think about it
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

const packageVersions: Partial<PackageJSON> = {
  devDependencies: {
    "dep1": "~0.0.1"
  },
  peerDependencies: {
    "dep2": "~0.0.1"
  },
  dependencies: {
    "dep3": "~0.0.1"
  }
}

test('get dependency version from package', () => {
  expect(getDependencyVersions(packageVersions)).toMatchSnapshot()
})

import { some } from 'fp-ts/lib/Option'
import { HashMap } from '../src/types'
import { getObjectSemigroup } from 'fp-ts/lib/Semigroup'

test('get deps versions - alternative', () => {
  const getPeerDeps = (pkg: Partial<PackageJSON>) =>
    some(pkg)
      .mapNullable((value) => value.peerDependencies)
      .alt(some({}))

  const getDevDeps = (pkg: Partial<PackageJSON>) =>
    some(pkg)
      .mapNullable((value) => value.devDependencies)
      .alt(some({}))

  const getDeps = (pkg: Partial<PackageJSON>) =>
    some(pkg)
      .mapNullable((value) => value.dependencies)
      .alt(some({}))

  const S = getObjectSemigroup<HashMap>()
  const getDepsVersions = (pkg: Partial<PackageJSON>) =>
    getDevDeps(pkg).chain(dev =>
      getPeerDeps(pkg).chain(peer =>
        getDeps(pkg).chain(deps =>
          some(S.concat(deps, S.concat(dev, peer)))
        ))
    )

  expect(getDepsVersions(packageVersions).toNullable())
    .toEqual(getDependencyVersions(packageVersions))
})