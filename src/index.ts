import cosmiconfig from 'cosmiconfig'

import { HashMap, PackageJSON } from './types.d'
import { defaultTo, fromPairs, reduce, merge, map, toPairs, pipe, pick } from 'ramda'
import { valid, coerce } from 'semver'

import { ask, fromIO, readerTaskEither, tryCatch } from 'fp-ts/lib/ReaderTaskEither'
import { IO } from 'fp-ts/lib/IO'
import { promises } from 'fs'

export const getModuleConfigSync = (pkgPart: string, searchFrom: string = '') =>
  cosmiconfig(pkgPart).searchSync(searchFrom)

export const getModuleConfig = (module: string, searchFrom: string = '') =>
  cosmiconfig(module).search(searchFrom)

export const getLocalPackageJson = (packageJSON: string = './package.json'): PackageJSON =>
  require(packageJSON)

type ToDependencies = Pick<PackageJSON, 'peerDependencies' | 'devDependencies' | 'dependencies'>
type Deps = HashMap<HashMap<string>>
type toDependenciesPairs = ReadonlyArray<[string, Deps]>

export const getDependencyVersions =
  pipe<PackageJSON, ToDependencies, toDependenciesPairs, ReadonlyArray<Deps>, HashMap>(
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
  destinationPath: string
  packagePath: string
  cwd?: string
}

type Config = VersionPersisterConfig
type IOActions = number | string
interface Content {}

const loadPackageFile = () =>
  ask<Config, IOActions>()
    .chain(d => fromIO(new IO(() => getLocalPackageJson(d.packagePath))))

const saveFile = (content: Content) =>
  ask<Config, IOActions>()
    .chain((config) =>
      tryCatch(() => promises
        .writeFile(config.destinationPath, content)
        .then(() => content),
               (reason) => (reason as Error).message, // not sure why reason is untyped
      )
    )

export const persistVersionsFromPackage = readerTaskEither
  .of<Config, IOActions, Content>({})
  .chain(loadPackageFile)
  .map(getDependencyVersions)
  .map(coerceVersions)
  .map(d => JSON.stringify(d))
  .chain(saveFile)

export {
  CosmiconfigResult as PackageConfigResult,
  Config as PackageConfig,
} from 'cosmiconfig'

export {
  PackageJSON
} from './types.d'