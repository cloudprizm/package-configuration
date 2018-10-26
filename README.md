# `@hungry/package-configuration`
Super simple set of helpers for handling `package.json` in `typescript`. 
More `helpers` is coming.

## Install
```sh
yarn add @hungry/package-configuration
```

### API
```typescript
// get comiconfig configuration
export const getModuleConfig
// i.e.
const getPackageConfig = getModuleConfigSync<{ theme: string, externals: string }>('webpack')

// loading package.json file
export const getLocalPackageJson

// converting list of package dependencies to the latest
export const coerceVersions

// saving all dependencies to file from package.json as a map and converting semver to most recent one,
// i.e. useful when resolving cdn dependencies from `https://unpkg.com`
export const persistVersionsFromPackage
```