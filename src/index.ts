import cosmiconfig, { Config as Cosmiconfig, CosmiconfigResult } from 'cosmiconfig'
import { Overwrite, $Keys } from 'utility-types'

import { HashMap, PackageJSON } from './types'
import { defaultTo, fromPairs, reduce, merge, map, toPairs, pipe, pick } from 'ramda'
import { valid, coerce } from 'semver'

import { ask, fromIO, readerTaskEither, tryCatch } from 'fp-ts/lib/ReaderTaskEither'
import { IO } from 'fp-ts/lib/IO'
import { promises as fs } from 'fs'
import { resolve } from 'path'

export type ExtendableCosmiconfig<K = Cosmiconfig> = Overwrite<Exclude<CosmiconfigResult, null>, { config: K }>
export const getModuleConfigSync = <K>(pkgPart: string, searchFrom: string = '') =>
  cosmiconfig(pkgPart).searchSync(searchFrom) as ExtendableCosmiconfig<K>

export const getModuleConfig = (module: string, searchFrom: string = '') =>
  cosmiconfig(module).search(searchFrom)

export const getLocalPackageJson = (packageJSON: string = './package.json'): PackageJSON =>
  require(packageJSON)

export type PackageJSONDeps = Pick<PackageJSON, 'peerDependencies' | 'devDependencies' | 'dependencies'>
type Deps = HashMap<HashMap<string>>
type toDependenciesPairs = ReadonlyArray<[string, Deps]>

export const getDependencyVersions =
  pipe<PackageJSON, PackageJSONDeps, toDependenciesPairs, ReadonlyArray<Deps>, HashMap>(
    pick(['peerDependencies', 'devDependencies', 'dependencies']),
    toPairs,
    map(([_, deps]) => deps),
    reduce(merge, {})
  )

type DependencyT = [string, string]

const resolveSemVer = pipe(
  coerce,
  defaultTo(''),
  valid,
)

export const coerceVersions =
  pipe<HashMap, ReadonlyArray<[string, string]>, DependencyT[], HashMap>(
    toPairs,
    map(([dep, version]) => [dep, resolveSemVer(version)] as DependencyT),
    fromPairs,
  )

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

export const resolvePaths = ask<Config, IOResult>()
  .map(cfg => ({
    packagePath: resolvePath(cfg, 'packagePath'),
    destinationPath: resolvePath(cfg, 'destinationPath')
  }))

export const loadPackageFile = () =>
  resolvePaths
    .chain(d => fromIO(new IO(() => getLocalPackageJson(d.packagePath))))

export const saveFile = (content: Content) =>
  ask<Config, IOResult>()
    .chain((config) =>
      tryCatch(() => fs
        // not sure how to make it not optional when chaining
        .writeFile(config.destinationPath ? config.destinationPath : '', content).then(() => content),
        // not sure why reason is untyped
               (reason) => (reason as Error).message,
      )
    )

export const getDepsVersionsFromPackage = readerTaskEither
  .of<Config, IOResult, Content>({})
  .chain(loadPackageFile)
  .map(getDependencyVersions)
  .map(coerceVersions)

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