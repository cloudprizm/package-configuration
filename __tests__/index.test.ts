import fs from 'fs'
jest.mock('fs')

import {
  coerceVersions,
  getLocalPackageJson,
  getDependencyVersions,
  persistVersionsFromPackage
} from '../src/index'

test('get deps versions', () => {
  const pkg = getLocalPackageJson('../package.json')
  const originalVersions = getDependencyVersions(pkg)
  const cdnVersions = coerceVersions(originalVersions)

  // yeah yeah laziness
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
