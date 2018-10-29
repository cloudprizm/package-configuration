import cosmiconfig, { Config as Cosmiconfig, CosmiconfigResult } from 'cosmiconfig'
import { Overwrite, $Keys } from 'utility-types'

import { HashMap, PackageJSON } from './types'
import { valid, coerce } from 'semver'
import { promises as fs } from 'fs'
import { resolve } from 'path'

import { ask, readerTaskEither, tryCatch } from 'fp-ts/lib/ReaderTaskEither'

import { some, option, none } from 'fp-ts/lib/Option'
import { getFoldableComposition } from 'fp-ts/lib/Foldable2v'
import { getObjectSemigroup } from 'fp-ts/lib/Semigroup'
import { array } from 'fp-ts/lib/Array'
import * as R from 'fp-ts/lib/Record'

export type ExtendableCosmiconfig<K = Cosmiconfig> =
  Overwrite<Exclude<CosmiconfigResult, null>, { config: K }>

/**
 * get comiconfig configuration
 * @param module 
 * @param searchFrom 
 */
export const getModuleConfigSync = <K>(pkgPart: string, searchFrom: string = '') =>
  cosmiconfig(pkgPart).searchSync(searchFrom) as ExtendableCosmiconfig<K>

/**
 * get comiconfig configuration
 * @param module 
 * @param searchFrom 
 */
export const getModuleConfig = (module: string, searchFrom: string = '') =>
  cosmiconfig(module).search(searchFrom)

/**
 * loading package.json file
 * @param location 
 */
export const getLocalPackageJson = (location: string = './package.json'): PackageJSON =>
  require(location)

export const getDependencyVersions = (pkg: Partial<PackageJSON>): HashMap => {
  const S = getObjectSemigroup<HashMap>()
  const S2 = getFoldableComposition(array, option)
  return S2.reduce([
    some(pkg).mapNullable(value => value.peerDependencies),
    some(pkg).mapNullable(value => value.devDependencies),
    some(pkg).mapNullable(value => value.dependencies),
  ], {} as HashMap, S.concat)
}

/**
 * Converting list of package dependencies to the latest
 */
type Version = string
const toSemVer = (version: Version) => {
  const v = coerce(version)
  return v ? some(valid(v)) : none
}
// compact
export const coerceVersions = (pkgVersions: HashMap<Version>) =>
  R.compact(R.map(pkgVersions, toSemVer))

interface VersionPersisterConfig {
  destinationPath?: string
  packagePath: string
  cwd?: string
}

type Config = VersionPersisterConfig
type IOResult = number | string
interface Content { }

export const resolvePath = (input: VersionPersisterConfig, prop: $Keys<VersionPersisterConfig>) =>
  input.cwd
    ? resolve(input.cwd, input.packagePath)
    : input.packagePath

export const resolveConfigPaths =
  ask<Config, IOResult>()
    .map(cfg => ({
      ...cfg,
      packagePath: resolvePath(cfg, 'packagePath'),
      destinationPath: resolvePath(cfg, 'destinationPath')
    }))

export const loadPackageFile = () =>
  resolveConfigPaths
    .chain(cfg => tryCatch(
      () => Promise.resolve(getLocalPackageJson(cfg.packagePath)),
      (reason) => (reason as Error).message
    ))

export const saveFile = (content: Content) =>
  ask<Config, IOResult>()
    .chain((config) =>
      tryCatch(() => fs
        // not sure how to make it not optional when chaining
        .writeFile(
          config.destinationPath
            ? config.destinationPath
            : '', content)
        .then(() => content),

        // not sure why reason is untyped
        (reason) => (reason as Error).message,
      )
    )

export const getDepsVersionsFromPackage = readerTaskEither
  .of<Config, IOResult, Content>({})
  .chain(loadPackageFile)
  .map(getDependencyVersions)
  .map(coerceVersions)

/**
 * Saving all dependencies to file from package.json as a map and converting semver to most recent one,
 * i.e. useful when resolving cdn dependencies from `https://unpkg.com`
 */
export const persistVersionsFromPackage = getDepsVersionsFromPackage
  .map(d => JSON.stringify(d))
  .chain(saveFile)

export {
  CosmiconfigResult as PackageConfigResult,
  Config as PackageConfig,
} from 'cosmiconfig'

export {
  PackageJSON,
  HashMap as DependencyVersions
} from './types'